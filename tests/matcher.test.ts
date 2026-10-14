import { describe, expect, it } from "vitest";
import { matchEffects } from "../src/domain/matcher";
import { compileCard } from "../src/domain/compiler";
import { createCard, createProject } from "../src/domain/model";
import { demoProject } from "../src/domain/demo";

function match(text: string, kind: "spell" | "effect" = "spell") {
  const card = createCard(100000001),
    project = createProject();
  card.kind = kind;
  card.name = "Starcourt Muster";
  card.text = text;
  project.cards = [card];
  project.archetypes = [
    { name: "Starcourt", code: 0x123 },
    { name: "星庭", code: 0x123 },
  ];
  const result = matchEffects(card, project);
  return { ...result, card, project };
}
describe("conservative text matching", () => {
  it("matches archetype search and card activation count into the shared block model", () => {
    const result = match(
      "Add 1 “Starcourt” monster from your Deck to your hand. You can only activate 1 “Starcourt Muster” per turn.",
    );
    expect(result.unmatched).toEqual([]);
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]).toMatchObject({
      template: "search",
      amount: 1,
      count: "name-activate",
      filter: { kind: "monster", setcode: 0x123 },
    });
    result.card.effects = result.effects;
    expect(compileCard(result.card, result.project).lua).toContain(
      "EFFECT_COUNT_CODE_OATH",
    );
  });
  it("extracts a summon trigger, discard cost and name-use count", () => {
    const result = match(
      "If this card is Normal or Special Summoned: You can discard 1 card; add 1 “Starcourt” monster from your Deck to your hand. You can only use this effect of “Starcourt Muster” once per turn.",
      "effect",
    );
    expect(result.unmatched).toEqual([]);
    expect(result.effects[0]).toMatchObject({
      trigger: "summon-or-special",
      optional: true,
      cost: "discard",
      count: "name-use",
    });
  });
  it("does not treat a card name as an archetype or invent its setcode", () => {
    const result = match(
      "Add 1 “Unknown Scout” monster from your Deck to your hand.",
    );
    expect(result.effects).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("尚未关联系列代码"))).toBe(
      true,
    );
  });
  it("leaves unsupported restrictions visible even when the main action matches", () => {
    const result = match(
      "Add 1 “Starcourt” monster from your Deck to your hand. You cannot Special Summon monsters the turn you activate this card, except Dragon monsters.",
    );
    expect(result.effects).toHaveLength(1);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0]).toContain("cannot Special Summon");
    expect(
      match(
        "Add 1 “Starcourt” monster from your Deck to your hand, then discard 1 card.",
      ).effects,
    ).toHaveLength(0);
  });
  it("matches standard Chinese search and separate targeting operation sentences", () => {
    const search = match("从卡组把1只「星庭」怪兽加入手牌。");
    expect(search.unmatched).toEqual([]);
    expect(search.effects[0].filter.setcode).toBe(0x123);
    const removal = match("以对方场上的1张卡为对象才能发动。那张卡破坏。");
    expect(removal.unmatched).toEqual([]);
    expect(removal.effects[0]).toMatchObject({
      template: "destroy",
      source: "field",
      players: "opponent",
    });
  });
  it("distinguishes target Special Summon and selecting at resolution", () => {
    const target = match("Target 1 monster in your GY; Special Summon it.");
    const select = match(
      "Special Summon 1 Dragon monster from your hand or GY.",
    );
    expect(target.effects[0]).toMatchObject({
      template: "revive",
      source: "grave",
    });
    expect(select.effects[0]).toMatchObject({
      template: "summon",
      source: "hand-grave",
      filter: { race: 8192 },
    });
  });
  it("supports level filters, main phase soft count, and common fixed Japanese text", () => {
    expect(
      match(
        "Once per turn: You can add 1 Level 4 or lower Warrior monster from your Deck to your hand.",
        "effect",
      ).effects[0],
    ).toMatchObject({ count: "soft", filter: { maxLevel: 4, race: 1 } });
    expect(match("自分はデッキから2枚ドローする。").effects[0]).toMatchObject({
      template: "draw",
      amount: 2,
    });
    expect(
      match("デッキから「星庭」モンスター1枚を手札に加える。").effects[0],
    ).toMatchObject({ template: "search", filter: { setcode: 0x123 } });
  });
  it("keeps missed-timing and unsupported chain effects unmatched", () => {
    expect(
      match("When this card is Normal Summoned: You can draw 1 card.", "effect")
        .unmatched,
    ).toHaveLength(1);
    expect(
      match(
        "When your opponent activates a monster effect (Quick Effect): You can negate the activation.",
        "effect",
      ).unmatched,
    ).toHaveLength(1);
    expect(
      match("If this card is Flip Summoned: You can draw 1 card.", "effect")
        .unmatched,
    ).toHaveLength(1);
  });
  it("retains two separate effects and applies each-effect count", () => {
    const result = match(
      "① If this card is Normal Summoned: You can draw 1 card.\n② Once per turn: You can target 1 monster in your GY; add it to your hand.\nYou can only use each effect of “Starcourt Muster” once per turn.",
      "effect",
    );
    expect(result.unmatched).toEqual([]);
    expect(result.effects.map((e) => e.template)).toEqual(["draw", "recover"]);
    expect(result.effects.every((e) => e.count === "name-use")).toBe(true);
  });
  it("matches the non-chain hand summon procedure and a face-up temporary boost", () => {
    const procedure = match(
      "If only your opponent controls a monster, you can Special Summon this card (from your hand).",
      "effect",
    );
    expect(procedure.effects[0]).toMatchObject({
      template: "self-summon",
      condition: "opponent-only",
    });
    const boost = match(
      "Target 1 face-up monster you control; it gains 500 ATK/DEF until the end of this turn.",
    );
    expect(boost.effects[0]).toMatchObject({
      template: "boost",
      attack: 500,
      defense: 500,
    });
  });
  it("does not accidentally consume a different card name count statement", () => {
    const result = match(
      "Draw 2 cards. You can only activate 1 “Different Card” per turn.",
    );
    expect(result.effects[0].count).toBe("none");
    expect(result.unmatched).toHaveLength(1);
  });
  it("matches the Chinese starter cards without dropping their counts or summon conditions", () => {
    const project = demoProject();
    for (const card of project.cards) {
      const result = matchEffects(card, project);
      expect(result.unmatched).toEqual([]);
      expect(result.effects[0].template).toBe(card.effects[0].template);
      expect(result.effects[0].count).toBe(card.effects[0].count);
      expect(result.effects[0].optional).toBe(card.effects[0].optional);
    }
  });
  it("distinguishes a graveyard self-banish cost from the action source", () => {
    for (const text of [
      "You can banish this card from your GY; draw 1 card.",
      "把墓地的这张卡除外才能发动。自己抽1张卡。",
    ]) {
      const result = match(text, "effect");
      expect(result.unmatched).toEqual([]);
      expect(result.effects[0]).toMatchObject({
        template: "draw",
        trigger: "ignition",
        cost: "banish-self",
        range: "grave",
        source: "deck",
      });
    }
  });
});
