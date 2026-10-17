import { describe, expect, it } from "vitest";
import luaparse from "luaparse";
import {
  allocateCountKeys,
  compileCard,
  validateProject,
} from "../src/domain/compiler";
import { createCard, createEffect, createProject } from "../src/domain/model";
import type {
  Card,
  CardProject,
  EffectBlock,
  TemplateId,
} from "../src/domain/model";
import { TEMPLATES } from "../src/domain/catalog";

function setup(template: TemplateId = "search") {
  const card = createCard(100000001),
    project = createProject();
  card.name = "Test Scout";
  card.art = "data:image/png;base64,AA";
  const block = createEffect(template, card);
  card.effects = [block];
  project.cards = [card];
  return { card, project, block };
}
const errors = (card: Card, project: CardProject) =>
  compileCard(card, project).diagnostics.filter((d) => d.severity === "error");

describe("OCG template compilation", () => {
  it.each(TEMPLATES.map((t) => [t.id]))(
    "emits parseable Lua with a real effect for %s",
    (template) => {
      const { card, project } = setup(template);
      const output = compileCard(card, project);
      expect(output.diagnostics.filter((d) => d.severity === "error")).toEqual(
        [],
      );
      expect(() =>
        luaparse.parse(output.lua, { luaVersion: "5.3" }),
      ).not.toThrow();
      expect(output.lua).toContain("c:RegisterEffect(e1)");
      expect(output.strings).toHaveLength(1);
    },
  );
  it("produces a set search with the chosen race, level and name exclusion", () => {
    const { card, project, block } = setup();
    block.filter = {
      kind: "monster",
      setcode: 0x123,
      race: 1,
      maxLevel: 4,
      excludeSelfName: true,
    };
    const result = compileCard(card, project);
    expect(result.lua).toContain("c:IsSetCard(0x123)");
    expect(result.lua).toContain("c:IsLevelBelow(4)");
    expect(result.lua).toContain("not c:IsCode(id)");
    expect(result.lua).toContain("Duel.ConfirmCards(1-tp,g)");
    expect(result.lua).not.toContain("Duel.SelectTarget");
    expect(result.lua).toContain("Duel.SelectMatchingCard");
  });
  it("keeps grave targeting and resolution selection distinct and guards Necrovalley", () => {
    const { card, project } = setup("revive");
    let result = compileCard(card, project);
    expect(result.lua).toContain("Duel.SelectTarget");
    expect(result.lua).toContain("tc:IsRelateToEffect(e)");
    expect(result.lua).toContain("aux.NecroValleyFilter()(tc)");
    expect(result.lua).toContain("Duel.GetLocationCount(tp,LOCATION_MZONE)<=0");
    card.effects = [createEffect("summon", card)];
    result = compileCard(card, project);
    expect(result.lua).not.toContain("Duel.SelectTarget");
    expect(result.lua).toContain("aux.NecroValleyFilter(s.e1filter)");
    expect(result.lua).toContain(
      "Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)",
    );
  });
  it("does not require a destroy target to be destructible", () => {
    const { card, project } = setup("destroy");
    const { lua } = compileCard(card, project);
    expect(lua).not.toContain("IsDestructable");
    expect(lua).toContain("Duel.Destroy(tc,REASON_EFFECT)");
  });
  it("distinguishes discarding costs from send-to-GY costs", () => {
    const { card, project, block } = setup();
    block.cost = "discard";
    expect(compileCard(card, project).lua).toContain(
      "REASON_COST+REASON_DISCARD",
    );
    block.cost = "send-hand";
    const { lua } = compileCard(card, project);
    expect(lua).toContain("Card.IsAbleToGraveAsCost");
    expect(lua).not.toContain("REASON_DISCARD");
  });
  it("keeps Special Summon procedures out of the chain", () => {
    const { card, project, block } = setup("self-summon");
    block.condition = "opponent-only";
    const { lua } = compileCard(card, project);
    expect(lua).toContain("EFFECT_SPSUMMON_PROC");
    expect(lua).toContain("if c==nil then return true end");
    expect(lua).not.toContain("EVENT_FREE_CHAIN");
    expect(lua).not.toContain("Duel.SpecialSummon(");
  });
  it("only allows explicitly supported source/count combinations", () => {
    const { card, project, block } = setup("revive");
    block.amount = 2;
    expect(
      errors(card, project).some((d) => d.message.includes("支持 1 张")),
    ).toBe(true);
    block.amount = 1;
    block.source = "deck";
    expect(
      errors(card, project).some((d) => d.message.includes("来源须为墓地")),
    ).toBe(true);
    expect(compileCard(card, project).lua).toBe("");
  });
  it("generates supported extra procedures with correct material counts", () => {
    const { card, project } = setup();
    card.kind = "synchro";
    card.level = 8;
    card.procedure = {
      mode: "synchro",
      min: 2,
      max: 4,
      materialLevel: 4,
      materialCodes: [],
    };
    expect(compileCard(card, project).lua).toContain(
      "aux.AddSynchroProcedure(c,nil,aux.NonTuner(nil),1,3)",
    );
    card.kind = "fusion";
    card.procedure.mode = "fusion";
    card.procedure.materialCodes = [100000002, 100000003];
    expect(compileCard(card, project).lua).toContain(
      "aux.AddFusionProcMix(c,true,true,100000002,100000003)",
    );
    card.kind = "xyz";
    card.level = 4;
    card.procedure.mode = "xyz";
    card.procedure.min = 2;
    card.procedure.max = 2;
    expect(compileCard(card, project).lua).toContain(
      "aux.AddXyzProcedure(c,nil,4,2)",
    );
    card.kind = "link";
    card.level = 2;
    card.linkMarkers = [1, 4];
    card.procedure.mode = "link";
    expect(compileCard(card, project).lua).toContain(
      "aux.AddLinkProcedure(c,nil,2,2)",
    );
  });
  it("supports a non-effect extra deck monster with a procedure only", () => {
    const { card, project } = setup();
    card.kind = "xyz";
    card.hasEffect = false;
    card.effects = [];
    card.text = "2 Level 4 monsters";
    card.procedure.mode = "xyz";
    const output = compileCard(card, project);
    expect(output.diagnostics).toEqual([]);
    expect(output.lua).toContain("aux.AddXyzProcedure");
  });
  it("generates a real pendulum procedure and PZONE effects", () => {
    const { card, project, block } = setup();
    card.pendulum = true;
    block.scope = "pendulum";
    const { lua } = compileCard(card, project);
    expect(lua).toContain("aux.EnablePendulumAttribute(c,true)");
    expect(lua).toContain("SetRange(LOCATION_PZONE)");
    expect(lua).toContain("SetType(EFFECT_TYPE_IGNITION)");
  });
  it("rejects mismatched or absent procedures and conflicting activation blocks", () => {
    const { card, project } = setup();
    card.kind = "link";
    expect(errors(card, project).length).toBeGreaterThan(0);
    card.kind = "spell";
    card.effects = [createEffect("draw", card), createEffect("search", card)];
    expect(
      errors(card, project).some((d) => d.message.includes("一个卡的发动")),
    ).toBe(true);
  });
});

describe("count limit allocation", () => {
  it("is deterministic across project order, avoids card IDs and reserves internal code 1", () => {
    const { card, project, block } = setup();
    block.count = "name-use";
    const other = createCard(100000002);
    other.name = "Test Return";
    other.effects = [createEffect("recover", other)];
    other.effects[0].count = "name-use";
    project.cards.push(other);
    const first = allocateCountKeys(project);
    const collision = [...first.values()][0];
    const inserted = createCard(collision);
    inserted.kind = "normal";
    project.cards.push(inserted);
    const allocated = allocateCountKeys(project);
    expect([...allocated.values()]).not.toContain(collision);
    expect([...allocated.values()]).not.toContain(1);
    expect(
      new Map([
        ...allocateCountKeys({
          ...project,
          cards: [...project.cards].reverse(),
        }),
      ]),
    ).toEqual(allocated);
    expect([...allocated.values()].every((n) => n > 1 && n < 0x10000000)).toBe(
      true,
    );
  });
  it("shares cloned summon events and explicit groups while separating numbered effects", () => {
    const { card, project, block } = setup();
    block.trigger = "summon-or-special";
    block.count = "name-use";
    const second = createEffect("draw", card);
    second.count = "name-use";
    card.effects.push(second);
    const compiled = compileCard(card, project);
    expect(compiled.lua).toContain("local e1b=e1:Clone()");
    expect(compiled.lua).toContain("e1b:SetCode(EVENT_SPSUMMON_SUCCESS)");
    expect(allocateCountKeys(project).size).toBe(2);
    block.count = second.count = "shared-use";
    block.countGroup = second.countGroup = "Scouts";
    expect(allocateCountKeys(project).size).toBe(1);
  });
  it("uses OATH only for activation-count semantics", () => {
    const { card, project, block } = setup();
    block.count = "name-activate";
    expect(compileCard(card, project).lua).toContain("+EFFECT_COUNT_CODE_OATH");
    block.count = "name-use";
    expect(compileCard(card, project).lua).not.toContain(
      "EFFECT_COUNT_CODE_OATH",
    );
  });
  it("allocates count keys for an immutable edited card even if the project snapshot is older", () => {
    const { card, project, block } = setup();
    const edited = {
      ...card,
      name: "Renamed Scout",
      effects: [{ ...block, count: "name-use" as const }],
    };
    expect(compileCard(edited, project).lua).toMatch(/SetCountLimit\(1,\d+\)/);
  });
});

describe("export diagnostics", () => {
  it.each([
    ["spell", "counter"],
    ["trap", "quick-play"],
    ["trap", "field"],
    ["trap", "equip"],
    ["trap", "ritual"],
  ] as const)(
    "rejects the invalid %s / %s type combination",
    (kind, subtype) => {
      const { card, project } = setup();
      card.kind = kind;
      card.subtype = subtype;
      card.effects[0].trigger = "activate";
      expect(
        errors(card, project).some((d) => d.message.includes("副类型")),
      ).toBe(true);
      expect(compileCard(card, project).lua).toBe("");
    },
  );
  it("separates blocking data problems from author review warnings", () => {
    const { card, project } = setup();
    card.reviewRequired = true;
    card.matchedText = "old text";
    card.text = "new text";
    expect(errors(card, project)).toEqual([]);
    expect(
      validateProject(project).filter((d) => d.severity === "warning"),
    ).toHaveLength(2);
    project.cards.push({ ...card, uid: "duplicate" });
    expect(
      validateProject(project).filter((d) => d.message.includes("重复")),
    ).toHaveLength(2);
    card.code = -1;
    expect(
      validateProject(project).some(
        (d) => d.severity === "error" && d.message.includes("卡号必须"),
      ),
    ).toBe(true);
  });
  it("requires real custom Lua with the current code and validates Lua syntax", () => {
    const { card, project } = setup();
    card.scriptMode = "custom";
    expect(
      errors(card, project).some((d) => d.message.includes("不能为空")),
    ).toBe(true);
    card.customLua = "function c100000002.initial_effect(c) end";
    expect(
      errors(card, project).some((d) => d.message.includes("不一致")),
    ).toBe(true);
    card.customLua = "local s,id=GetID()\nfunction s.initial_effect(c) if end";
    expect(
      errors(card, project).some((d) => d.message.includes("Lua 语法")),
    ).toBe(true);
    card.customLua = "local s,id=GetID()\nfunction s.initial_effect(c) end";
    expect(errors(card, project)).toEqual([]);
    card.customLua =
      "-- local s,id=GetID()\n-- function s.initial_effect(c) end";
    expect(errors(card, project).some((d) => d.message.includes("入口"))).toBe(
      true,
    );
  });
  it("does not allow unknown imported template values to execute code", () => {
    const { card, project, block } = setup();
    (block as { template: string }).template = "unknown";
    expect(
      errors(card, project).some((d) => d.message.includes("未知效果模板")),
    ).toBe(true);
    expect(compileCard(card, project).lua).toBe("");
  });
});
