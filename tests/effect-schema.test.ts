import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../src/domain/catalog";
import {
  createCard,
  createEffect,
  createOperation,
  createProject,
} from "../src/domain/model";
import { parseNativeProject } from "../src/io/project-schema";

const projectWith = (
  template: Parameters<typeof createEffect>[0] = "sequence",
) => {
  const project = createProject();
  const card = createCard(100000101);
  card.effects = [createEffect(template, card)];
  project.cards = [card];
  return project;
};
const jsonRoundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("expanded effect project persistence", () => {
  it("retains every toolbox template without changing older block defaults", () => {
    const project = createProject();
    const card = createCard(100000102);
    card.effects = TEMPLATES.map((template) => createEffect(template.id, card));
    project.cards = [card];
    const restored = parseNativeProject(jsonRoundTrip(project));
    expect(restored).toEqual(jsonRoundTrip(project));
    expect(
      restored.cards[0].effects.find((effect) => effect.template === "search"),
    ).not.toHaveProperty("operations");
    expect(
      restored.cards[0].effects.find((effect) => effect.template === "draw"),
    ).not.toHaveProperty("advanced");
  });

  it("round-trips ordered operations, condition branches, timing and complete card filters", () => {
    const project = projectWith();
    const destroy = createOperation("destroy");
    destroy.amount = 3;
    destroy.players = "opponent";
    destroy.filter = {
      kind: "monster",
      codes: [100000103, 100000104],
      setcode: 0x123,
      attribute: "dark",
      race: 1,
      minLevel: 2,
      maxLevel: 8,
      minAttack: 0,
      maxAttack: 3000,
      minDefense: 100,
      maxDefense: 2000,
      minRank: 1,
      maxRank: 8,
      minLink: 1,
      maxLink: 4,
      tuner: false,
      extraDeck: true,
      faceup: true,
      excludeSelfName: true,
      expression: "c:IsAbleToGrave() and c:IsControler(1-tp)",
    };
    const draw = createOperation("draw");
    draw.next = "if-success";
    draw.timing = "together";
    draw.optional = true;
    const counters = createOperation("add-counter");
    counters.next = "if-failed";
    counters.value = 3;
    counters.counterType = 0x1001;
    const position = createOperation("change-position");
    position.selection = "previous";
    position.position = "facedown-defense";
    position.duration = "permanent";
    position.destination = "bottom";
    project.cards[0].effects[0].operations = [
      destroy,
      draw,
      counters,
      position,
    ];
    expect(parseNativeProject(jsonRoundTrip(project))).toEqual(
      jsonRoundTrip(project),
    );
  });

  it("preserves explicit core requirements, expressions and custom callback signatures", () => {
    const project = projectWith("custom-effect");
    project.target = "koishipro";
    project.cards[0].effects[0].advanced = {
      type: "EFFECT_TYPE_FIELD",
      code: "EFFECT_CHANGE_LINK_MARKER_KOISHI",
      range: "LOCATION_MZONE+LOCATION_SZONE",
      property: "EFFECT_FLAG_PLAYER_TARGET",
      category: "CATEGORY_ATKCHANGE",
      value: "LINK_MARKER_LEFT",
      reset: "RESET_EVENT+RESETS_STANDARD",
      targetRange: [1, 0],
      requiredCore: "koishipro",
      condition: "return Duel.GetTurnPlayer()==tp",
      cost: "if chk==0 then return true end",
      target: "return c:IsFaceup()",
      operation: "Duel.Draw(tp,1,REASON_EFFECT)",
      valueFunction: "return c:IsType(TYPE_LINK)",
      callbackArgs: {
        condition: "e,tp",
        cost: "e,tp,eg,ep,ev,re,r,rp,chk",
        target: "e,c",
        operation: "e,tp",
        valueFunction: "e,c",
      },
    };
    expect(parseNativeProject(jsonRoundTrip(project))).toEqual(
      jsonRoundTrip(project),
    );
  });

  it("rejects malformed nested data before it reaches the editor", () => {
    const project = projectWith();
    const variants = [
      { action: "custom-effect" },
      { action: "unknown" },
      { selection: "random" },
      { next: "some" },
      { timing: "never" },
      { amount: 1.5 },
      { amount: Infinity },
      { filter: { codes: ["100000101"] } },
      { filter: { expression: {} } },
      { value: "800" },
      { position: "attack" },
      { counterType: -1 },
    ];
    for (const patch of variants) {
      const copy = structuredClone(project);
      Object.assign(copy.cards[0].effects[0].operations![0], patch);
      expect(() => parseNativeProject(copy)).toThrow("数据格式");
    }
  });

  it("rejects invalid callbacks, core labels and target ranges", () => {
    for (const patch of [
      { requiredCore: "unsupported" },
      { targetRange: [1] },
      { targetRange: [1, "0"] },
      { operation: { code: "Duel.Draw(tp,1,REASON_EFFECT)" } },
      { callbackArgs: { target: ["e", "c"] } },
    ]) {
      const project = projectWith("custom-effect");
      Object.assign(project.cards[0].effects[0].advanced!, patch);
      expect(() => parseNativeProject(project)).toThrow("数据格式");
    }
  });

  it("bounds operation count and rejects duplicate operation identities", () => {
    const project = projectWith();
    project.cards[0].effects[0].operations = Array.from({ length: 17 }, () =>
      createOperation(),
    );
    expect(() => parseNativeProject(project)).toThrow("数据格式");
    const repeated = createOperation();
    project.cards[0].effects[0].operations = [
      repeated,
      structuredClone(repeated),
    ];
    expect(() => parseNativeProject(project)).toThrow("重复的处理内部 ID");
  });
});
