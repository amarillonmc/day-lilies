import { describe, expect, it } from "vitest";
import {
  createCard,
  createEffect,
  createOperation,
  createProject,
} from "../src/domain/model";
import { compileCard } from "../src/domain/compiler";
import { cloneEffect } from "../src/domain/effect-editing";
import { defaultSummoning } from "../src/domain/summon-procedures";
import { createTracking, validateTracking } from "../src/domain/tracking";
import { parseNativeProject } from "../src/io/project-schema";

function composition() {
  const card = createCard(100095001);
  card.kind = "spell";
  const block = createEffect("sequence", card);
  const ritual = createOperation("summoning");
  ritual.summoning = {
    ...defaultSummoning("ritual"),
    monsterFilter: { codes: [100095003] },
    materialFilter: { race: 1 },
    materialSource: "hand-field-grave",
    ritualLevel: "fixed",
    ritualFixedLevel: 8,
    ritualComparison: "equal",
    ritualSummonFrom: "hand-grave",
  };
  ritual.targetName = "仪式结果 / Ritual result / 儀式の結果";
  const boost = createOperation("boost");
  boost.selection = "result";
  boost.reference = ritual.uid;
  boost.next = "if-success";
  const revive = createOperation("revive");
  revive.amount = 2;
  revive.selection = "select";
  revive.next = "if-success";
  block.operations = [ritual, boost, revive];
  block.tracking = [createTracking(ritual.uid), createTracking(revive.uid)];
  card.effects = [block];
  const fusion = createCard(100095002);
  fusion.kind = "fusion";
  fusion.procedure = {
    ...fusion.procedure,
    mode: "fusion",
    fusionSlots: [
      { kind: "filter", filter: { kind: "monster", race: 1 }, min: 2, max: 2 },
    ],
    contactFusion: {
      materialSource: "hand-field-grave",
      materialPlayers: "self",
      materialAction: "banish",
      faceup: true,
      restriction: "contact-or-fusion",
    },
  };
  return { ...createProject(), cards: [card, fusion] };
}

describe("summoning composition regression", () => {
  it("persists nested ritual, simultaneous summons and contact configuration together", () => {
    const project = composition();
    expect(parseNativeProject(JSON.parse(JSON.stringify(project)))).toEqual(
      project,
    );
  });

  it("copies nested summon filters and keeps result/tracking references inside the copy", () => {
    const original = composition().cards[0].effects[0];
    const copy = cloneEffect(original);
    const [summon, boost, revive] = copy.operations!;
    expect(boost.reference).toBe(summon.uid);
    expect(copy.tracking![0].sourceStep).toBe(summon.uid);
    expect(copy.tracking![1].sourceStep).toBe(revive.uid);
    expect(summon.uid).not.toBe(original.operations![0].uid);
    expect(summon.targetName).toBe(original.operations![0].targetName);
    summon.summoning!.monsterFilter.codes!.push(100095004);
    summon.summoning!.materialFilter.race = 2;
    expect(original.operations![0].summoning!.monsterFilter.codes).toEqual([
      100095003,
    ]);
    expect(original.operations![0].summoning!.materialFilter.race).toBe(1);
  });

  it("rejects malformed nested summon and contact options on import", () => {
    for (const patch of [
      { kind: "contact" },
      { materialSource: "opponent-deck" },
      { ritualLevel: "unknown" },
      { ritualFixedLevel: 0 },
      { materialFilter: { effect: "yes" } },
    ]) {
      const project = composition();
      Object.assign(
        project.cards[0].effects[0].operations![0].summoning!,
        patch,
      );
      expect(() => parseNativeProject(project)).toThrow("数据格式");
    }
    for (const patch of [
      { materialSource: "deck" },
      { materialPlayers: "anyone" },
      { materialAction: "destroy" },
      { restriction: "revive-unconditionally" },
      { faceup: "true" },
    ]) {
      const project = composition();
      Object.assign(project.cards[1].procedure.contactFusion!, patch);
      expect(() => parseNativeProject(project)).toThrow("数据格式");
    }
  });

  it("retains phase tracking for both embedded summon kinds and top-level summon blocks", () => {
    for (const kind of ["fusion", "ritual"] as const) {
      const project = composition();
      const card = project.cards[0];
      card.effects[0].operations![0].summoning = defaultSummoning(kind);
      expect(validateTracking(card.effects[0])).toEqual([]);
      expect(
        compileCard(card, project).diagnostics.filter(
          (d) => d.severity === "error",
        ),
      ).toEqual([]);
      const single = createEffect("summoning", card);
      single.summoning = defaultSummoning(kind);
      single.tracking = [createTracking(single.uid)];
      card.effects = [single];
      expect(validateTracking(single)).toEqual([]);
      const copied = cloneEffect(single);
      expect(copied.tracking![0].sourceStep).toBe(copied.uid);
      expect(
        compileCard(card, project).diagnostics.filter(
          (d) => d.severity === "error",
        ),
      ).toEqual([]);
    }
  });

  it("detects Koishi-only symbols in nested monster and material filters", () => {
    for (const kind of ["fusion", "ritual"] as const) {
      for (const field of ["monsterFilter", "materialFilter"] as const) {
        const project = composition();
        const card = project.cards[0];
        const step = card.effects[0].operations![0];
        step.summoning = defaultSummoning(kind);
        step.summoning[field].expression =
          "c:IsHasEffect(EFFECT_CANNOT_LOSE_KOISHI)";
        const upstream = compileCard(card, project);
        expect(
          upstream.diagnostics.some(
            (d) => d.severity === "error" && d.message.includes("KoishiPRO"),
          ),
        ).toBe(true);
        project.target = "koishipro";
        const koishi = compileCard(card, project);
        expect(
          koishi.diagnostics.filter((d) => d.severity === "error"),
        ).toEqual([]);
        expect(koishi.lua).toContain("local EFFECT_CANNOT_LOSE_KOISHI=");
      }
    }
  });

  it("keeps material-filter compatibility checks active when contact fusion is enabled", () => {
    const project = composition();
    const card = project.cards[1];
    card.procedure.fusionSlots![0].filter.expression =
      "c:IsHasEffect(EFFECT_CANNOT_LOSE_KOISHI)";
    expect(
      compileCard(card, project).diagnostics.some(
        (d) => d.severity === "error" && d.message.includes("KoishiPRO"),
      ),
    ).toBe(true);
    project.target = "koishipro";
    const result = compileCard(card, project);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(result.lua).toContain("aux.AddContactFusionProcedure");
  });
});
