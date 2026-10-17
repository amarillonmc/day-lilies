import { describe, expect, it } from "vitest";
import {
  createCard,
  createEffect,
  createOperation,
  createProject,
  type DelayedTracking,
} from "../src/domain/model";
import { cloneEffect } from "../src/domain/effect-editing";
import { parseNativeProject } from "../src/io/project-schema";
import { compileCard } from "../src/domain/compiler";

function fixture() {
  const card = createCard(100090001);
  card.kind = "spell";
  const effect = createEffect("sequence", card);
  const a = createOperation("banish");
  a.targetName = "设置 / カード A";
  a.targetOverlap = "disallow";
  a.source = "monster";
  const b = createOperation("destroy");
  b.targetName = "Group B";
  b.targetOverlap = "allow";
  b.players = "opponent";
  const c = createOperation("bounce");
  c.selection = "result";
  c.reference = a.uid;
  c.source = "banished";
  const d = createOperation("boost");
  d.selection = "target-group";
  d.reference = b.uid;
  effect.operations = [a, b, c, d];
  const tracking: DelayedTracking = {
    uid: "tracking-a",
    sourceStep: a.uid,
    phase: "end",
    schedule: "next-matching",
    turnPlayer: "opponent",
    action: "return-temporary",
    resolution: "continuous",
    validity: "any",
    resetOnMove: true,
    position: "original",
  };
  effect.tracking = [tracking];
  card.effects = [effect];
  return { ...createProject(), cards: [card] };
}

describe("visual composition persistence and copying", () => {
  it("round-trips independent targets, prior results and delayed rules without translating user labels", () => {
    const project = fixture();
    expect(parseNativeProject(JSON.parse(JSON.stringify(project)))).toEqual(
      project,
    );
  });

  it("copies an entire reference graph into an independent effect", () => {
    const original = fixture().cards[0].effects[0];
    const copy = cloneEffect(original);
    expect(copy.uid).not.toBe(original.uid);
    const steps = copy.operations!;
    expect(steps[2].reference).toBe(steps[0].uid);
    expect(steps[3].reference).toBe(steps[1].uid);
    expect(copy.tracking![0].sourceStep).toBe(steps[0].uid);
    expect(copy.tracking![0].uid).not.toBe(original.tracking![0].uid);
    expect(steps[0].targetName).toBe(original.operations![0].targetName);
    expect(
      new Set([...original.operations!, ...steps].map((s) => s.uid)).size,
    ).toBe(8);
    steps[0].filter.race = 2;
    expect(original.operations![0].filter.race).toBeUndefined();
  });

  it("keeps final-result tracking and remaps implicit single-step references when copying", () => {
    const single = createEffect("banish");
    single.tracking = fixture().cards[0].effects[0].tracking!.map((rule) => ({
      ...rule,
      sourceStep: single.uid,
    }));
    expect(cloneEffect(single).tracking![0].sourceStep).not.toBe(single.uid);
    single.tracking![0].sourceStep = "last";
    expect(cloneEffect(single).tracking![0].sourceStep).toBe("last");
  });

  it("round-trips filtered material slots, alternative Xyz routes and ritual configuration", () => {
    const project = fixture();
    const card = project.cards[0];
    card.procedure = {
      mode: "fusion",
      min: 2,
      max: 4,
      materialLevel: 4,
      materialCodes: [],
      tunerCount: 2,
      tunerFilter: { race: 1 },
      nonTunerFilter: { attribute: "dark" },
      materialFilter: { minLevel: 4 },
      xyzAlternative: { filter: { minRank: 3, maxRank: 3 }, description: 1165 },
      fusionSlots: [
        { kind: "code", code: 100090002, filter: {}, min: 1, max: 1 },
        { kind: "filter", filter: { setcode: 0x123 }, min: 1, max: 3 },
      ],
      fusionSubstitute: false,
    };
    const spell = createEffect("summoning", card);
    spell.summoning = {
      kind: "ritual",
      monsterFilter: { codes: [100090003] },
      materialFilter: { race: 1 },
      materialSource: "hand-field-grave",
      ritualLevel: "fixed",
      ritualFixedLevel: 8,
      ritualComparison: "equal",
      ritualSummonFrom: "hand-grave",
    };
    card.effects.push(spell);
    expect(parseNativeProject(JSON.parse(JSON.stringify(project)))).toEqual(
      project,
    );
  });

  it("rejects malformed nested rules and duplicate tracking identities on import", () => {
    for (const patch of [
      { phase: "battle" },
      { schedule: "never" },
      { sourceStep: 5 },
      { action: "arbitrary-lua" },
      { resetOnMove: "yes" },
    ]) {
      const project = fixture();
      Object.assign(project.cards[0].effects[0].tracking![0], patch);
      expect(() => parseNativeProject(project)).toThrow("数据格式");
    }
    const project = fixture();
    const tracking = project.cards[0].effects[0].tracking!;
    tracking.push(structuredClone(tracking[0]));
    expect(() => parseNativeProject(project)).toThrow("重复的追踪内部 ID");
  });

  it("checks Koishi dependencies embedded in the new summoning filters", () => {
    const card = createCard(100090005);
    card.kind = "spell";
    const effect = createEffect("summoning", card);
    effect.summoning!.monsterFilter.expression =
      "c:IsHasEffect(EFFECT_CANNOT_LOSE_KOISHI)";
    card.effects = [effect];
    const project = { ...createProject(), cards: [card] };
    const result = compileCard(card, project);
    expect(
      result.diagnostics.some(
        (d) => d.severity === "error" && d.message.includes("KoishiPRO"),
      ),
    ).toBe(true);
    project.target = "koishipro";
    const compatible = compileCard(card, project);
    expect(
      compatible.diagnostics.filter((d) => d.severity === "error"),
    ).toEqual([]);
    expect(compatible.lua).toContain("local EFFECT_CANNOT_LOSE_KOISHI=");
  });
});
