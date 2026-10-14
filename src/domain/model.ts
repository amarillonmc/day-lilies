export type Language = "sc" | "tc" | "en" | "jp";
export type TargetCore = "ygopro" | "koishipro";
export type CardKind =
  | "normal"
  | "effect"
  | "ritual"
  | "fusion"
  | "synchro"
  | "xyz"
  | "link"
  | "spell"
  | "trap"
  | "token";
export type SpellTrapKind =
  | "normal"
  | "quick-play"
  | "continuous"
  | "equip"
  | "field"
  | "ritual"
  | "counter";
export type Attribute =
  "dark" | "light" | "earth" | "water" | "fire" | "wind" | "divine";
export type TemplateId =
  | "search"
  | "recover"
  | "draw"
  | "mill"
  | "destroy"
  | "bounce"
  | "banish"
  | "revive"
  | "summon"
  | "self-summon"
  | "boost";
export type Trigger =
  | "activate"
  | "ignition"
  | "summon"
  | "special-summon"
  | "summon-or-special"
  | "flip"
  | "sent-to-grave"
  | "quick";
export type Zone =
  | "deck"
  | "hand"
  | "grave"
  | "field"
  | "monster"
  | "spelltrap"
  | "banished"
  | "hand-grave";
export type PlayerScope = "self" | "opponent" | "both";
export type CountMode =
  "none" | "soft" | "name-use" | "name-activate" | "shared-use";
export type CostKind =
  "none" | "discard" | "send-hand" | "banish-self" | "send-self" | "lp";
export interface CardFilter {
  setcode?: number;
  kind?: "any" | "monster" | "spell" | "trap";
  race?: number;
  attribute?: Attribute;
  maxLevel?: number;
  minLevel?: number;
  excludeSelfName?: boolean;
  faceup?: boolean;
}
export interface EffectBlock {
  uid: string;
  template: TemplateId;
  trigger: Trigger;
  description: string;
  sourceText: string;
  count: CountMode;
  countGroup?: string;
  amount: number;
  source: Zone;
  players: PlayerScope;
  filter: CardFilter;
  cost: CostKind;
  costAmount: number;
  optional: boolean;
  attack: number;
  defense: number;
  condition: "none" | "no-monsters" | "opponent-only";
  scope?: "monster" | "pendulum";
  range?: "field" | "hand" | "grave" | "banished";
}
export interface SummonProcedure {
  mode: "none" | "synchro" | "xyz" | "link" | "fusion";
  min: number;
  max: number;
  materialLevel: number;
  materialCodes: number[];
}
export interface Card {
  uid: string;
  code: number;
  name: string;
  text: string;
  notes: string;
  language: Language;
  kind: CardKind;
  hasEffect?: boolean;
  subtype: SpellTrapKind;
  attribute: Attribute;
  race: number;
  level: number;
  attack: number;
  defense: number;
  tuner: boolean;
  pendulum: boolean;
  leftScale: number;
  rightScale: number;
  pendulumText: string;
  linkMarkers: number[];
  setcodes: number[];
  alias: number;
  art: string;
  artworkCredit: string;
  effects: EffectBlock[];
  procedure: SummonProcedure;
  scriptMode: "blocks" | "custom";
  customLua: string;
  customStrings: string[];
  matchedText: string;
  reviewRequired: boolean;
}
export interface Archetype {
  name: string;
  code: number;
}
export interface CardProject {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  target: TargetCore;
  nextCode: number;
  archetypes: Archetype[];
  cards: Card[];
  updatedAt: string;
}
export interface Diagnostic {
  severity: "error" | "warning";
  message: string;
  cardUid?: string;
  effectUid?: string;
}
export interface CompileResult {
  lua: string;
  strings: string[];
  diagnostics: Diagnostic[];
}
export interface MatchResult {
  effects: EffectBlock[];
  unmatched: string[];
  warnings: string[];
}
export interface ImportResult {
  cards: Card[];
  warnings: string[];
  project?: CardProject;
}
export interface ReferenceCard {
  code: number;
  name: string;
  text: string;
  type?: number;
  script?: string;
  language?: string;
}
export interface ByokSettings {
  endpoint: string;
  model: string;
  apiKey: string;
}
export const uid = () => globalThis.crypto.randomUUID();

export function createCard(code = 0): Card {
  return {
    uid: uid(),
    code,
    name: "新的卡片",
    text: "",
    notes: "",
    language: "sc",
    kind: "effect",
    subtype: "normal",
    attribute: "light",
    race: 1,
    level: 4,
    attack: 1800,
    defense: 1000,
    tuner: false,
    pendulum: false,
    leftScale: 0,
    rightScale: 0,
    pendulumText: "",
    linkMarkers: [],
    setcodes: [],
    alias: 0,
    art: "",
    artworkCredit: "",
    effects: [],
    procedure: {
      mode: "none",
      min: 2,
      max: 2,
      materialLevel: 4,
      materialCodes: [],
    },
    scriptMode: "blocks",
    customLua: "",
    customStrings: [],
    matchedText: "",
    reviewRequired: false,
  };
}
export function createProject(): CardProject {
  return {
    schemaVersion: 1,
    id: uid(),
    name: "未命名卡包",
    description: "",
    target: "ygopro",
    nextCode: 100000001,
    archetypes: [],
    cards: [],
    updatedAt: new Date().toISOString(),
  };
}
export function createEffect(
  template: TemplateId = "search",
  card?: Card,
): EffectBlock {
  const source: Zone = ["search", "mill", "draw"].includes(template)
    ? "deck"
    : ["recover", "revive", "banish"].includes(template)
      ? "grave"
      : template === "summon"
        ? "hand-grave"
        : "field";
  return {
    uid: uid(),
    template,
    trigger:
      card && ["spell", "trap"].includes(card.kind) ? "activate" : "ignition",
    description: "",
    sourceText: "",
    count: "none",
    amount: 1,
    source,
    players: "self",
    filter: { kind: "monster" },
    cost: "none",
    costAmount: 1,
    optional: true,
    attack: 500,
    defense: 0,
    condition: template === "self-summon" ? "opponent-only" : "none",
    scope: "monster",
  };
}
