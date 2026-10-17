import { z } from "zod";
import { createCard, createProject, type CardProject } from "../domain/model";

const number = z.number().finite();
const integer = number.int().min(-2147483648).max(4294967295);
const positive = integer.min(1);
const nonnegative = integer.min(0);
const sourceZone = z.enum([
  "deck",
  "hand",
  "grave",
  "field",
  "monster",
  "spelltrap",
  "banished",
  "hand-grave",
  "extra",
]);
const playerScope = z.enum(["self", "opponent", "both"]);
const action = z.enum([
  "search",
  "recover",
  "draw",
  "mill",
  "destroy",
  "bounce",
  "banish",
  "revive",
  "summon",
  "summoning",
  "boost",
  "damage",
  "heal",
  "mill-top",
  "to-deck",
  "send-grave",
  "discard-hand",
  "change-position",
  "control",
  "negate-activation",
  "negate-effect",
  "disable",
  "equip",
  "add-counter",
  "remove-counter",
  "attach-material",
  "detach-material",
  "set-spelltrap",
  "declare-race",
  "declare-attribute",
]);
const operationOptions = {
  value: integer.optional(),
  counterType: nonnegative.max(65535).optional(),
  position: z
    .enum(["faceup-attack", "faceup-defense", "facedown-defense"])
    .optional(),
  destination: z.enum(["shuffle", "top", "bottom"]).optional(),
  duration: z.enum(["turn", "permanent"]).optional(),
};
const attribute = z.enum([
  "dark",
  "light",
  "earth",
  "water",
  "fire",
  "wind",
  "divine",
]);
const filter = z.object({
  setcode: number.optional(),
  kind: z.enum(["any", "monster", "spell", "trap"]).optional(),
  race: number.optional(),
  attribute: attribute.optional(),
  maxLevel: number.optional(),
  minLevel: number.optional(),
  excludeSelfName: z.boolean().optional(),
  faceup: z.boolean().optional(),
  codes: z.array(positive).max(256).optional(),
  minAttack: integer.optional(),
  maxAttack: integer.optional(),
  minDefense: integer.optional(),
  maxDefense: integer.optional(),
  minRank: nonnegative.optional(),
  maxRank: nonnegative.optional(),
  minLink: nonnegative.optional(),
  maxLink: nonnegative.optional(),
  tuner: z.boolean().optional(),
  extraDeck: z.boolean().optional(),
  effect: z.boolean().optional(),
  expression: z.string().max(20000).optional(),
});
const summoning = z.object({
  kind: z.enum(["fusion", "ritual"]),
  monsterFilter: filter,
  materialFilter: filter,
  materialSource: z.enum(["hand-field", "field", "hand", "hand-field-grave"]),
  ritualLevel: z.enum(["original", "current", "fixed"]).optional(),
  ritualFixedLevel: positive.max(13).optional(),
  ritualComparison: z.enum(["equal", "at-least"]).optional(),
  ritualSummonFrom: z.enum(["hand", "hand-grave"]).optional(),
});
const operation = z.object({
  uid: z.string().min(1),
  action,
  amount: positive.max(100000),
  source: sourceZone,
  players: playerScope,
  filter,
  summoning: summoning.optional(),
  selection: z.enum([
    "target",
    "select",
    "all",
    "self",
    "previous",
    "target-group",
    "result",
  ]),
  targetName: z.string().max(80).optional(),
  targetOverlap: z.enum(["allow", "disallow"]).optional(),
  reference: z.string().min(1).optional(),
  next: z.enum(["always", "if-success", "if-failed"]),
  timing: z.enum(["separate", "together"]).optional(),
  optional: z.boolean(),
  attack: integer,
  defense: integer,
  ...operationOptions,
});
const luaBody = z.string().max(100000);
const advanced = z.object({
  type: z.string().max(2000),
  code: z.string().max(2000),
  category: z.string().max(2000).optional(),
  property: z.string().max(2000).optional(),
  value: z.string().max(20000).optional(),
  reset: z.string().max(2000).optional(),
  range: z.string().max(2000).optional(),
  targetRange: z.tuple([nonnegative, nonnegative]).optional(),
  requiredCore: z.enum(["ygopro", "koishipro"]).optional(),
  condition: luaBody.optional(),
  cost: luaBody.optional(),
  target: luaBody.optional(),
  operation: luaBody.optional(),
  valueFunction: luaBody.optional(),
  callbackArgs: z
    .object({
      condition: z.string().max(500).optional(),
      cost: z.string().max(500).optional(),
      target: z.string().max(500).optional(),
      operation: z.string().max(500).optional(),
      valueFunction: z.string().max(500).optional(),
    })
    .optional(),
});
const effect = z.object({
  uid: z.string().min(1),
  template: z.enum([
    "search",
    "recover",
    "draw",
    "mill",
    "destroy",
    "bounce",
    "banish",
    "revive",
    "summon",
    "self-summon",
    "boost",
    "damage",
    "heal",
    "mill-top",
    "to-deck",
    "send-grave",
    "discard-hand",
    "change-position",
    "control",
    "negate-activation",
    "negate-effect",
    "disable",
    "equip",
    "add-counter",
    "remove-counter",
    "attach-material",
    "detach-material",
    "set-spelltrap",
    "declare-race",
    "declare-attribute",
    "sequence",
    "summoning",
    "custom-effect",
  ]),
  trigger: z.enum([
    "activate",
    "ignition",
    "summon",
    "special-summon",
    "summon-or-special",
    "flip",
    "sent-to-grave",
    "quick",
    "chain",
    "destroyed",
    "banished",
    "to-hand",
    "to-deck",
    "battle-destroying",
    "battle-destroyed",
    "damage",
    "attack-announce",
    "standby",
    "end-phase",
    "any-summon",
    "any-special-summon",
  ]),
  description: z.string(),
  sourceText: z.string(),
  count: z.enum(["none", "soft", "name-use", "name-activate", "shared-use"]),
  countGroup: z.string().optional(),
  amount: number,
  source: sourceZone,
  players: playerScope,
  filter,
  cost: z.enum([
    "none",
    "discard",
    "send-hand",
    "banish-self",
    "send-self",
    "lp",
    "release-self",
    "release-monster",
    "banish-grave",
    "detach",
    "remove-counter",
  ]),
  costAmount: number,
  optional: z.boolean(),
  attack: number,
  defense: number,
  condition: z.enum(["none", "no-monsters", "opponent-only"]),
  scope: z.enum(["monster", "pendulum"]).optional(),
  range: z.enum(["field", "hand", "grave", "banished"]).optional(),
  ...operationOptions,
  operations: z.array(operation).max(16).optional(),
  advanced: advanced.optional(),
  tracking: z
    .array(
      z.object({
        uid: z.string().min(1),
        sourceStep: z.string().min(1),
        phase: z.enum(["standby", "end"]),
        schedule: z.enum(["this-turn", "next-turn", "next-matching"]),
        turnPlayer: z.enum(["either", "self", "opponent"]),
        action: z.enum([
          "bounce",
          "to-deck",
          "destroy",
          "banish",
          "send-grave",
          "return-temporary",
        ]),
        resolution: z.enum(["continuous", "trigger"]),
        validity: z.enum(["any", "all"]),
        resetOnMove: z.boolean(),
        destination: z.enum(["shuffle", "top", "bottom"]).optional(),
        position: z
          .enum([
            "original",
            "faceup-attack",
            "faceup-defense",
            "facedown-defense",
          ])
          .optional(),
      }),
    )
    .max(8)
    .optional(),
  summoning: summoning.optional(),
});
const procedure = z.object({
  mode: z.enum(["none", "synchro", "xyz", "link", "fusion"]),
  min: number,
  max: number,
  materialLevel: number,
  materialCodes: z.array(number),
  tunerCount: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  tunerFilter: filter.optional(),
  nonTunerFilter: filter.optional(),
  materialFilter: filter.optional(),
  xyzAlternative: z.object({ filter, description: positive }).optional(),
  fusionSlots: z
    .array(
      z.object({
        kind: z.enum(["code", "filter"]),
        code: positive.optional(),
        filter,
        min: positive.max(8),
        max: positive.max(8),
      }),
    )
    .max(8)
    .optional(),
  fusionSubstitute: z.boolean().optional(),
  contactFusion: z
    .object({
      materialSource: z.enum([
        "field",
        "hand-field",
        "field-grave",
        "hand-field-grave",
      ]),
      materialPlayers: playerScope,
      materialAction: z.enum(["to-deck", "banish", "send-grave", "release"]),
      faceup: z.boolean(),
      restriction: z.enum(["none", "contact-only", "contact-or-fusion"]),
    })
    .optional(),
});
const card = z.object({
  uid: z.string().min(1),
  code: number,
  name: z.string(),
  text: z.string(),
  notes: z.string(),
  language: z.enum(["sc", "tc", "en", "jp"]),
  kind: z.enum([
    "normal",
    "effect",
    "ritual",
    "fusion",
    "synchro",
    "xyz",
    "link",
    "spell",
    "trap",
    "token",
  ]),
  subtype: z.enum([
    "normal",
    "quick-play",
    "continuous",
    "equip",
    "field",
    "ritual",
    "counter",
  ]),
  attribute,
  race: number,
  level: number,
  attack: number,
  defense: number,
  tuner: z.boolean(),
  hasEffect: z.boolean().optional(),
  pendulum: z.boolean(),
  leftScale: number,
  rightScale: number,
  pendulumText: z.string(),
  linkMarkers: z.array(number),
  setcodes: z.array(number),
  alias: number,
  art: z.string(),
  artworkCredit: z.string(),
  effects: z.array(effect),
  procedure,
  scriptMode: z.enum(["blocks", "custom"]),
  customLua: z.string(),
  customStrings: z.array(z.string()),
  matchedText: z.string(),
  reviewRequired: z.boolean(),
});
export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  target: z.enum(["ygopro", "koishipro"]),
  nextCode: number,
  archetypes: z.array(z.object({ name: z.string(), code: number })),
  cards: z.array(card).max(2000),
  updatedAt: z.string(),
});
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Normalize missing optional fields, then reject wrong types before UI activation. */
export function parseNativeProject(value: unknown): CardProject {
  const source = record(value);
  if (source.schemaVersion !== 1 || !Array.isArray(source.cards))
    throw new Error("无法识别 Day Lilies 工程版本。");
  const merged = {
    ...createProject(),
    ...source,
    cards: source.cards.map((value) => {
      const input = record(value),
        base = createCard();
      if (typeof input.name !== "string" || typeof input.kind !== "string")
        throw new Error("工程中的卡片缺少卡名或卡种。");
      const procedureValue =
        input.procedure === undefined
          ? base.procedure
          : input.procedure &&
              typeof input.procedure === "object" &&
              !Array.isArray(input.procedure)
            ? { ...base.procedure, ...record(input.procedure) }
            : input.procedure;
      return { ...base, ...input, procedure: procedureValue };
    }),
  };
  const parsed = projectSchema.safeParse(merged);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .slice(0, 5)
      .map((issue) => issue.path.join("."))
      .join("、");
    throw new Error(`工程数据格式无效，请检查这些字段：${fields}`);
  }
  const ids = new Set<string>();
  for (const current of parsed.data.cards) {
    if (ids.has(current.uid)) throw new Error("工程含有重复的卡片内部 ID。");
    ids.add(current.uid);
    const effects = new Set<string>();
    for (const block of current.effects) {
      if (effects.has(block.uid))
        throw new Error(`${current.name} 含有重复的效果内部 ID。`);
      effects.add(block.uid);
      const operations = new Set<string>();
      for (const step of block.operations || []) {
        if (operations.has(step.uid))
          throw new Error(`${current.name} 含有重复的处理内部 ID。`);
        operations.add(step.uid);
      }
      const tracking = new Set<string>();
      for (const rule of block.tracking || []) {
        if (tracking.has(rule.uid))
          throw new Error(`${current.name} 含有重复的追踪内部 ID。`);
        tracking.add(rule.uid);
      }
    }
  }
  return parsed.data;
}
