import { z } from "zod";
import { createCard, createProject, type CardProject } from "../domain/model";

const number = z.number().finite();
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
  ]),
  description: z.string(),
  sourceText: z.string(),
  count: z.enum(["none", "soft", "name-use", "name-activate", "shared-use"]),
  countGroup: z.string().optional(),
  amount: number,
  source: z.enum([
    "deck",
    "hand",
    "grave",
    "field",
    "monster",
    "spelltrap",
    "banished",
    "hand-grave",
  ]),
  players: z.enum(["self", "opponent", "both"]),
  filter,
  cost: z.enum([
    "none",
    "discard",
    "send-hand",
    "banish-self",
    "send-self",
    "lp",
  ]),
  costAmount: number,
  optional: z.boolean(),
  attack: number,
  defense: number,
  condition: z.enum(["none", "no-monsters", "opponent-only"]),
  scope: z.enum(["monster", "pendulum"]).optional(),
  range: z.enum(["field", "hand", "grave", "banished"]).optional(),
});
const procedure = z.object({
  mode: z.enum(["none", "synchro", "xyz", "link", "fusion"]),
  min: number,
  max: number,
  materialLevel: number,
  materialCodes: z.array(number),
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
    }
  }
  return parsed.data;
}
