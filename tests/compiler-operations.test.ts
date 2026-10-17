import { describe, expect, it } from "vitest";
import { compileCard, validateProject } from "../src/domain/compiler";
import {
  createCard,
  createEffect,
  createOperation,
  createProject,
  type OperationAction,
} from "../src/domain/model";

function sequence(...actions: OperationAction[]) {
  const card = createCard(100000001);
  card.kind = "spell";
  const block = createEffect("sequence", card);
  block.operations = actions.map(createOperation);
  card.effects = [block];
  const project = { ...createProject(), cards: [card] };
  return { card, block, project, ops: block.operations };
}
describe("composable effect operations", () => {
  it("distinguishes timing from dependency and keeps all steps in one activation", () => {
    const { card, block, project, ops } = sequence("destroy", "draw");
    ops[1].next = "if-success";
    ops[1].timing = "together";
    let result = compileCard(card, project);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(result.lua.match(/SetType\(EFFECT_TYPE_ACTIVATE\)/g)).toHaveLength(
      1,
    );
    expect(result.lua).toContain("if success and true then");
    expect(result.lua).not.toContain("Duel.BreakEffect()");
    ops[1].timing = "separate";
    result = compileCard(card, project);
    expect(result.lua).toContain("Duel.BreakEffect()");
    expect(result.strings).toHaveLength(1);
    expect(block.template).toBe("sequence");
  });
  it("accepts independent target groups but rejects unsupported simultaneous summons", () => {
    const { card, project, ops } = sequence("destroy", "banish");
    expect(
      compileCard(card, project).diagnostics.filter(
        (d) => d.severity === "error",
      ),
    ).toEqual([]);
    ops[1].selection = "previous";
    expect(
      compileCard(card, project).diagnostics.filter(
        (d) => d.severity === "error",
      ),
    ).toEqual([]);
    ops[1].action = "summon";
    ops[1].amount = 2;
    expect(compileCard(card, project).lua).toBe("");
  });
  it("rejects invalid Lua callbacks and validates resource amounts", () => {
    const { card, project, ops } = sequence("add-counter");
    ops[0].value = -1;
    expect(
      compileCard(card, project).diagnostics.some((d) =>
        d.message.includes("指示物数量"),
      ),
    ).toBe(true);
    card.effects = [createEffect("custom-effect", card)];
    card.effects[0].advanced!.operation = "if then broken end";
    expect(
      compileCard(card, project).diagnostics.some((d) =>
        d.message.includes("回调 Lua"),
      ),
    ).toBe(true);
  });
  it("carries callback signatures, ranges and resets into advanced effects", () => {
    const { card, project } = sequence("draw");
    card.effects = [createEffect("custom-effect", card)];
    card.effects[0].advanced = {
      type: "EFFECT_TYPE_FIELD",
      code: "EFFECT_UPDATE_ATTACK",
      range: "LOCATION_GRAVE",
      targetRange: [4, 0],
      target: "return c:IsRace(RACE_DRAGON)",
      callbackArgs: { target: "e,c" },
      value: "500",
      reset: "RESET_PHASE+PHASE_END",
    };
    const result = compileCard(card, project);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(result.lua).toContain("function s.e1target(e,c)");
    expect(result.lua).toContain("SetRange(LOCATION_GRAVE)");
    expect(result.lua).toContain("SetTargetRange(4,0)");
  });
  it("blocks Koishi-only symbols, numeric codes and explicit declarations on upstream exports", () => {
    const { card, project } = sequence("draw");
    card.effects = [createEffect("custom-effect", card)];
    const advanced = card.effects[0].advanced!;
    advanced.code = "EFFECT_ADD_LINK_MARKER_KOISHI";
    expect(compileCard(card, project).lua).toBe("");
    expect(
      validateProject(project).some((d) => d.message.includes("KoishiPRO")),
    ).toBe(true);
    advanced.code = "37564151";
    expect(compileCard(card, project).lua).toBe("");
    advanced.code = "EFFECT_UPDATE_ATTACK";
    advanced.requiredCore = "koishipro";
    expect(compileCard(card, project).lua).toBe("");
    project.target = "koishipro";
    advanced.code = "EFFECT_ADD_LINK_MARKER_KOISHI";
    expect(compileCard(card, project).lua).toContain(
      "local EFFECT_ADD_LINK_MARKER_KOISHI=37564151",
    );
  });
  it("also checks custom scripts instead of trusting the selected core label", () => {
    const { card, project } = sequence("draw");
    card.scriptMode = "custom";
    card.customLua =
      "local s,id=GetID()\nfunction s.initial_effect(c) local e=Effect.CreateEffect(c) e:SetCode(37564151) c:RegisterEffect(e) end";
    expect(compileCard(card, project).lua).toBe("");
    expect(
      validateProject(project).some(
        (d) => d.severity === "error" && d.message.includes("KoishiPRO"),
      ),
    ).toBe(true);
  });
  it("guards phase triggers against repeated activation in the same phase", () => {
    const { card, project, block } = sequence("draw");
    card.kind = "effect";
    block.trigger = "standby";
    expect(compileCard(card, project).lua).toContain("SetCountLimit(1)");
  });
});
