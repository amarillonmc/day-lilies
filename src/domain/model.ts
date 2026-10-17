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
  | "boost"
  | "damage"
  | "heal"
  | "mill-top"
  | "to-deck"
  | "send-grave"
  | "discard-hand"
  | "change-position"
  | "control"
  | "negate-activation"
  | "negate-effect"
  | "disable"
  | "equip"
  | "add-counter"
  | "remove-counter"
  | "attach-material"
  | "detach-material"
  | "set-spelltrap"
  | "declare-race"
  | "declare-attribute"
  | "sequence"
  | "summoning"
  | "custom-effect";
export type Trigger =
  | "activate"
  | "ignition"
  | "summon"
  | "special-summon"
  | "summon-or-special"
  | "flip"
  | "sent-to-grave"
  | "quick"
  | "chain"
  | "destroyed"
  | "banished"
  | "to-hand"
  | "to-deck"
  | "battle-destroying"
  | "battle-destroyed"
  | "damage"
  | "attack-announce"
  | "standby"
  | "end-phase"
  | "any-summon"
  | "any-special-summon";
export type Zone =
  | "deck"
  | "hand"
  | "grave"
  | "field"
  | "monster"
  | "spelltrap"
  | "banished"
  | "hand-grave"
  | "extra";
export type PlayerScope = "self" | "opponent" | "both";
export type CountMode =
  "none" | "soft" | "name-use" | "name-activate" | "shared-use";
export type CostKind =
  | "none"
  | "discard"
  | "send-hand"
  | "banish-self"
  | "send-self"
  | "lp"
  | "release-self"
  | "release-monster"
  | "banish-grave"
  | "detach"
  | "remove-counter";
export interface CardFilter {
  setcode?: number;
  kind?: "any" | "monster" | "spell" | "trap";
  race?: number;
  attribute?: Attribute;
  maxLevel?: number;
  minLevel?: number;
  excludeSelfName?: boolean;
  faceup?: boolean;
  codes?: number[];
  minAttack?: number;
  maxAttack?: number;
  minDefense?: number;
  maxDefense?: number;
  minRank?: number;
  maxRank?: number;
  minLink?: number;
  maxLink?: number;
  tuner?: boolean;
  extraDeck?: boolean;
  /** Restrict to effect / non-effect monsters, including Extra Deck monsters. */
  effect?: boolean;
  /** Additional predicate body expression; variables c,e,tp are available. */
  expression?: string;
}
export type OperationAction = Exclude<
  TemplateId,
  "self-summon" | "sequence" | "custom-effect" | "summoning"
>;
export type OperationSelection =
  "target" | "select" | "all" | "self" | "previous" | "target-group" | "result";
export type OperationPosition =
  "faceup-attack" | "faceup-defense" | "facedown-defense";
export interface OperationOptions {
  value?: number;
  counterType?: number;
  position?: OperationPosition;
  destination?: "shuffle" | "top" | "bottom";
  duration?: "turn" | "permanent";
}
export interface EffectOperation extends OperationOptions {
  uid: string;
  action: OperationAction;
  amount: number;
  source: Zone;
  players: PlayerScope;
  filter: CardFilter;
  selection: OperationSelection;
  /** Display name for an independently selected activation target group. */
  targetName?: string;
  /** Sharing a card requires both target groups to allow overlap. */
  targetOverlap?: "allow" | "disallow";
  /** Stable operation uid: a target group or an earlier operation's actual result. */
  reference?: string;
  /** Each step depends on the immediately preceding step's actual result. */
  next: "always" | "if-success" | "if-failed";
  timing?: "separate" | "together";
  optional: boolean;
  attack: number;
  defense: number;
}
export interface AdvancedEffect {
  type: string;
  code: string;
  category?: string;
  property?: string;
  value?: string;
  reset?: string;
  range?: string;
  targetRange?: [number, number];
  requiredCore?: TargetCore;
  /** Lua function bodies, with the engine's ordinary callback arguments. */
  condition?: string;
  cost?: string;
  target?: string;
  operation?: string;
  /** Function body used instead of a constant SetValue when present. */
  valueFunction?: string;
  callbackArgs?: Partial<
    Record<
      "condition" | "cost" | "target" | "operation" | "valueFunction",
      string
    >
  >;
}
/** A one-shot phase action using a completed operation's actual result cards. */
export interface DelayedTracking {
  uid: string;
  /** An operation UID, or "last" for the final configured operation. */
  sourceStep: string;
  phase: "standby" | "end";
  schedule: "this-turn" | "next-turn" | "next-matching";
  turnPlayer: "either" | "self" | "opponent";
  action:
    | "bounce"
    | "to-deck"
    | "destroy"
    | "banish"
    | "send-grave"
    | "return-temporary";
  /** Phase handling without a chain, or a mandatory phase trigger. */
  resolution: "continuous" | "trigger";
  validity: "any" | "all";
  /** Invalidate the tracked instance when it moves or is turned face-down. */
  resetOnMove: boolean;
  destination?: "shuffle" | "top" | "bottom";
  position?:
    "original" | "faceup-attack" | "faceup-defense" | "facedown-defense";
}
export interface EffectBlock extends OperationOptions {
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
  operations?: EffectOperation[];
  advanced?: AdvancedEffect;
  summoning?: SummoningEffect;
  tracking?: DelayedTracking[];
}
export interface SummonProcedure {
  mode: "none" | "synchro" | "xyz" | "link" | "fusion";
  min: number;
  max: number;
  materialLevel: number;
  materialCodes: number[];
  tunerCount?: 1 | 2 | 3;
  tunerFilter?: CardFilter;
  nonTunerFilter?: CardFilter;
  materialFilter?: CardFilter;
  xyzAlternative?: { filter: CardFilter; description: number };
  fusionSlots?: FusionMaterialSlot[];
  fusionSubstitute?: boolean;
}
export interface FusionMaterialSlot {
  kind: "code" | "filter";
  code?: number;
  filter: CardFilter;
  min: number;
  max: number;
}
export interface SummoningEffect {
  kind: "fusion" | "ritual";
  monsterFilter: CardFilter;
  materialFilter: CardFilter;
  materialSource: "hand-field" | "field" | "hand" | "hand-field-grave";
  ritualLevel?: "original" | "current" | "fixed";
  ritualFixedLevel?: number;
  ritualComparison?: "equal" | "at-least";
  ritualSummonFrom?: "hand" | "hand-grave";
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
  const source: Zone = ["search", "mill", "draw", "mill-top"].includes(template)
    ? "deck"
    : ["recover", "revive", "banish"].includes(template)
      ? "grave"
      : template === "discard-hand"
        ? "hand"
        : template === "set-spelltrap"
          ? "hand"
          : template === "summon"
            ? "hand-grave"
            : "field";
  return {
    uid: uid(),
    template,
    trigger: ["negate-activation", "negate-effect"].includes(template)
      ? "chain"
      : card && ["spell", "trap"].includes(card.kind)
        ? "activate"
        : "ignition",
    description: "",
    sourceText: "",
    count: "none",
    amount: 1,
    source,
    players: [
      "damage",
      "control",
      "negate-activation",
      "negate-effect",
    ].includes(template)
      ? "opponent"
      : "self",
    filter: {
      kind: ["add-counter", "remove-counter"].includes(template)
        ? "any"
        : template === "set-spelltrap"
          ? "spell"
          : "monster",
    },
    cost: "none",
    costAmount: 1,
    optional: true,
    attack: 500,
    defense: 0,
    condition: template === "self-summon" ? "opponent-only" : "none",
    scope: "monster",
    ...(["damage", "heal"].includes(template) ? { value: 800 } : {}),
    ...(["add-counter", "remove-counter"].includes(template)
      ? { counterType: 0x1001, value: 1 }
      : {}),
    ...(template === "sequence"
      ? { operations: [createOperation("draw")] }
      : {}),
    ...(template === "summoning"
      ? {
          summoning: {
            kind: "fusion" as const,
            monsterFilter: { kind: "monster" as const },
            materialFilter: { kind: "monster" as const },
            materialSource: "hand-field" as const,
          },
        }
      : {}),
    ...(template === "custom-effect"
      ? {
          advanced: {
            type: "EFFECT_TYPE_SINGLE",
            code: "EFFECT_UPDATE_ATTACK",
            property: "EFFECT_FLAG_SINGLE_RANGE",
            value: "500",
          },
        }
      : {}),
  };
}

export function createOperation(
  action: OperationAction = "draw",
): EffectOperation {
  const block = createEffect(action);
  return {
    uid: uid(),
    action,
    amount: block.amount,
    source: block.source,
    players: block.players,
    filter: block.filter,
    selection: [
      "recover",
      "destroy",
      "bounce",
      "banish",
      "revive",
      "boost",
      "to-deck",
      "send-grave",
      "control",
      "disable",
      "change-position",
      "equip",
      "declare-race",
      "declare-attribute",
    ].includes(action)
      ? "target"
      : ["add-counter", "remove-counter", "detach-material"].includes(action)
        ? "self"
        : "select",
    next: "always",
    optional: false,
    attack: block.attack,
    defense: block.defense,
    value: block.value,
    counterType: block.counterType,
  };
}
