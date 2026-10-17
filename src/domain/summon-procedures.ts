import type {
  Card,
  CardFilter,
  ContactFusionProcedure,
  EffectBlock,
  FusionMaterialSlot,
  SummoningEffect,
} from "./model";
import { ATTRIBUTES, RACES } from "./catalog";
import { extraFilterClauses, validateFilterExtra } from "./operations";

// All helpers used here are present in Fluorohydride/ygopro-scripts/procedure.lua
// as well as the pinned Smile-DK scripts. These are not KoishiPRO-only features.
const integer = (n: number, min: number, max: number) =>
  Number.isInteger(n) && n >= min && n <= max;
const validCode = (n: number) => integer(n, 128, 0x0fffffff);
const sources = {
  "hand-field": "LOCATION_HAND+LOCATION_MZONE",
  hand: "LOCATION_HAND",
  field: "LOCATION_MZONE",
  "hand-field-grave": "LOCATION_HAND+LOCATION_MZONE+LOCATION_GRAVE",
} as const;
const contactSources = {
  field: "LOCATION_MZONE",
  "hand-field": "LOCATION_HAND+LOCATION_MZONE",
  "field-grave": "LOCATION_MZONE+LOCATION_GRAVE",
  "hand-field-grave": "LOCATION_HAND+LOCATION_MZONE+LOCATION_GRAVE",
} as const;

export function defaultContactFusion(): ContactFusionProcedure {
  return {
    materialSource: "field",
    materialPlayers: "self",
    materialAction: "to-deck",
    faceup: true,
    restriction: "contact-or-fusion",
  };
}

function validateContactFusion(value: ContactFusionProcedure): string[] {
  const errors: string[] = [];
  if (
    !Object.hasOwn(contactSources, value.materialSource) ||
    !["self", "opponent", "both"].includes(value.materialPlayers) ||
    !["to-deck", "banish", "send-grave", "release"].includes(
      value.materialAction,
    ) ||
    !["none", "contact-only", "contact-or-fusion"].includes(
      value.restriction,
    ) ||
    typeof value.faceup !== "boolean"
  )
    errors.push("接触融合配置无效。");
  if (
    value.materialAction === "release" &&
    !["field", "hand-field"].includes(value.materialSource)
  )
    errors.push("接触融合的解放素材仅支持手牌和怪兽区域。");
  if (
    value.materialPlayers !== "self" &&
    (value.materialSource !== "field" || !value.faceup)
  )
    errors.push("使用对方素材的接触融合仅支持表侧怪兽区域。");
  return errors;
}

export function summonFilterExpression(filter: CardFilter): string {
  const clauses = extraFilterClauses(filter);
  if (filter.kind && filter.kind !== "any")
    clauses.push(`c:IsType(TYPE_${filter.kind.toUpperCase()})`);
  if (filter.setcode)
    clauses.push(`c:IsSetCard(0x${filter.setcode.toString(16)})`);
  if (filter.race) clauses.push(`c:IsRace(${filter.race})`);
  if (filter.attribute)
    clauses.push(`c:IsAttribute(ATTRIBUTE_${filter.attribute.toUpperCase()})`);
  if (filter.minLevel != null)
    clauses.push(`c:IsLevelAbove(${filter.minLevel})`);
  if (filter.maxLevel != null)
    clauses.push(`c:IsLevelBelow(${filter.maxLevel})`);
  if (filter.excludeSelfName) clauses.push("not c:IsCode(id)");
  if (filter.faceup) clauses.push("c:IsFaceup()");
  return clauses.length ? clauses.join(" and ") : "true";
}
function validateMaterialFilter(filter: CardFilter): string[] {
  const errors = validateFilterExtra(filter);
  if (filter.kind && !["any", "monster"].includes(filter.kind))
    errors.push("召唤筛选只支持怪兽。");
  if (
    (filter.setcode != null && !integer(filter.setcode, 1, 65535)) ||
    (filter.race != null &&
      !RACES.some(({ value }) => value === filter.race)) ||
    (filter.attribute != null &&
      !ATTRIBUTES.some(({ value }) => value === filter.attribute))
  )
    errors.push("召唤素材的系列、种族或属性筛选无效。");
  if (
    [filter.minLevel, filter.maxLevel].some(
      (n) => n != null && !integer(n, 0, 13),
    ) ||
    (filter.minLevel != null &&
      filter.maxLevel != null &&
      filter.minLevel > filter.maxLevel)
  )
    errors.push("召唤素材的等级筛选范围无效。");
  // Material callbacks have several incompatible signatures across procedures;
  // only the candidate card is a shared, reliable Lua escape-hatch variable.
  if (filter.expression && /\b(?:e|tp)\b/.test(filter.expression))
    errors.push("召唤筛选表达式仅提供 c；不能使用 e 或 tp。");
  return errors;
}
export function fusionMaterialSlots(card: Card): FusionMaterialSlot[] {
  return (
    card.procedure.fusionSlots ??
    card.procedure.materialCodes.map((code) => ({
      kind: "code",
      code,
      filter: {},
      min: 1,
      max: 1,
    }))
  );
}
export function validateSummonProcedure(card: Card): string[] {
  const p = card.procedure;
  const errors: string[] = [];
  if (p.contactFusion && (p.mode !== "fusion" || card.kind !== "fusion"))
    errors.push("接触融合需要启用融合怪兽的融合素材槽。");
  if (p.mode === "none") return errors;
  if (
    p.mode !== "fusion" &&
    (!integer(p.min, 1, 8) || !integer(p.max, p.min, 8))
  )
    errors.push("素材数范围须为 1–8，最大数不能小于最小数。");
  if (p.mode === "synchro") {
    const tuners = p.tunerCount ?? 1;
    if (!integer(tuners, 1, 3) || p.min <= tuners)
      errors.push("同调手续需要 1–3 只调整及至少 1 只非调整。");
    errors.push(
      ...validateMaterialFilter(p.tunerFilter || {}),
      ...validateMaterialFilter(p.nonTunerFilter || {}),
    );
  }
  if (p.mode === "xyz") {
    if (!integer(p.materialLevel, 1, 13))
      errors.push("超量素材等级须为 1–13。");
    if (p.xyzAlternative) {
      errors.push(...validateMaterialFilter(p.xyzAlternative.filter));
      if (!integer(p.xyzAlternative.description, 1, 0x7fffffff))
        errors.push("叠放路线的系统提示编号无效。");
    }
  }
  if (["link", "xyz"].includes(p.mode))
    errors.push(...validateMaterialFilter(p.materialFilter || {}));
  if (p.mode === "link" && (p.min > card.level || p.max > card.level))
    errors.push("连接素材数量不能超过 LINK 值。");
  if (p.mode === "fusion") {
    if (p.contactFusion) errors.push(...validateContactFusion(p.contactFusion));
    const slots = fusionMaterialSlots(card);
    if (
      !slots.length ||
      slots.length > 8 ||
      slots.reduce((sum, slot) => sum + slot.min, 0) < 2 ||
      slots.reduce((sum, slot) => sum + slot.max, 0) > 8
    )
      errors.push("融合素材合计须为 2–8 张。");
    if (slots.filter((slot) => slot.min !== slot.max).length > 1)
      errors.push("融合手续最多允许一个数量可变的素材槽。");
    for (const slot of slots) {
      if (!integer(slot.min, 1, 8) || !integer(slot.max, slot.min, 8))
        errors.push("融合素材槽数量须为 1–8，最大数不能小于最小数。");
      if (slot.kind === "code" && !validCode(slot.code ?? 0))
        errors.push("融合素材槽需要有效卡号。");
      if (slot.kind === "filter")
        errors.push(...validateMaterialFilter(slot.filter));
    }
  }
  return [...new Set(errors)];
}
export function emitSummonProcedure(card: Card): {
  init: string[];
  funcs: string[];
} {
  const p = card.procedure;
  const init: string[] = [],
    funcs: string[] = [];
  if (p.mode !== "none" || card.kind === "ritual")
    init.push("c:EnableReviveLimit()");
  const filter = (name: string, value?: CardFilter, prefix?: string) => {
    if (!value || !Object.keys(value).length)
      return prefix ? `function(c) return ${prefix} end` : "nil";
    funcs.push(
      `function s.${name}(c)\n\treturn ${prefix ? prefix + " and " : ""}${summonFilterExpression(value)}\nend`,
    );
    return `s.${name}`;
  };
  if (p.mode === "synchro") {
    const tuners = p.tunerCount ?? 1;
    const tuner = filter("summonTuner", p.tunerFilter);
    const other = filter("summonNonTuner", p.nonTunerFilter);
    if (tuners === 1)
      init.push(
        `aux.AddSynchroProcedure(c,${tuner},aux.NonTuner(${other}),${p.min - 1},${p.max - 1})`,
      );
    else
      init.push(
        `aux.AddSynchroMixProcedure(c,aux.Tuner(${tuner}),aux.Tuner(${tuner}),${tuners === 3 ? `aux.Tuner(${tuner})` : "nil"},aux.NonTuner(${other}),${p.min - tuners},${p.max - tuners})`,
      );
  }
  if (p.mode === "xyz") {
    const mat = filter("summonMaterial", p.materialFilter);
    if (p.xyzAlternative)
      init.push(
        `aux.AddXyzProcedure(c,${mat},${p.materialLevel},${p.min},${filter("summonAlternative", p.xyzAlternative.filter, "c:IsFaceup() and c:IsType(TYPE_XYZ)")},${p.xyzAlternative.description},${p.max})`,
      );
    else if (p.min === p.max)
      init.push(`aux.AddXyzProcedure(c,${mat},${p.materialLevel},${p.min})`);
    else
      init.push(
        `aux.AddXyzProcedure(c,${mat},${p.materialLevel},${p.min},nil,nil,${p.max})`,
      );
  }
  if (p.mode === "link")
    init.push(
      `aux.AddLinkProcedure(c,${filter("summonMaterial", p.materialFilter)},${p.min},${p.max})`,
    );
  if (p.mode === "fusion") {
    const slots = fusionMaterialSlots(card);
    const material = (slot: FusionMaterialSlot, index: number) =>
      slot.kind === "code"
        ? String(slot.code)
        : filter(
            `fusionMaterial${index + 1}`,
            slot.filter,
            "c:IsType(TYPE_MONSTER)",
          );
    const variable = slots.findIndex((slot) => slot.min !== slot.max);
    const fixed = slots.flatMap((slot, index) =>
      index === variable
        ? []
        : Array.from({ length: slot.min }, () => material(slot, index)),
    );
    // A filter used repeatedly in a fixed-count slot must be emitted only once.
    const unique = [...new Set(funcs)];
    funcs.splice(0, funcs.length, ...unique);
    const substitute = p.fusionSubstitute !== false;
    if (variable < 0)
      init.push(
        `aux.AddFusionProcMix(c,${substitute},true,${fixed.join(",")})`,
      );
    else {
      const slot = slots[variable];
      const repeated = material(slot, variable);
      init.push(
        `aux.AddFusionProcMixRep(c,${substitute},true,${repeated},${slot.min},${slot.max}${fixed.length ? "," + fixed.join(",") : ""})`,
      );
    }
    if (p.contactFusion) {
      const contact = p.contactFusion;
      const location = contactSources[contact.materialSource];
      const legalPayment = {
        "to-deck": "c:IsAbleToDeckOrExtraAsCost()",
        banish: "c:IsAbleToRemoveAsCost()",
        "send-grave": "c:IsAbleToGraveAsCost()",
        release: "c:IsReleasable(REASON_SPSUMMON)",
      }[contact.materialAction];
      const payment = {
        "to-deck": "aux.ContactFusionSendToDeck(c)",
        banish: "Duel.Remove,POS_FACEUP,REASON_COST",
        "send-grave": "Duel.SendtoGrave,REASON_COST",
        release: "Duel.Release,REASON_SPSUMMON+REASON_MATERIAL",
      }[contact.materialAction];
      funcs.push(
        `function s.contactMaterial(c,fc)\n\treturn c:IsType(TYPE_MONSTER) and ${legalPayment}${contact.faceup ? " and (not c:IsLocation(LOCATION_ONFIELD) or c:IsFaceup())" : ""}\nend`,
      );
      // This official helper passes tp|0x200 to the same material slots, so
      // contact summoning never uses named-material Fusion substitutes.
      init.push(
        `aux.AddContactFusionProcedure(c,s.contactMaterial,${contact.materialPlayers === "opponent" ? "0" : location},${contact.materialPlayers === "self" ? "0" : location},${payment})`,
      );
      if (contact.restriction !== "none") {
        init.push(
          "local contactLimit=Effect.CreateEffect(c)",
          "contactLimit:SetType(EFFECT_TYPE_SINGLE)",
          "contactLimit:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)",
          "contactLimit:SetCode(EFFECT_SPSUMMON_CONDITION)",
          "contactLimit:SetValue(s.contactSummonLimit)",
          "c:RegisterEffect(contactLimit)",
        );
        funcs.push(
          `function s.contactSummonLimit(e,se,sp,st)\n\treturn not e:GetHandler():IsLocation(LOCATION_EXTRA)${contact.restriction === "contact-or-fusion" ? " or (st&SUMMON_TYPE_FUSION)==SUMMON_TYPE_FUSION" : ""}\nend`,
        );
      }
    }
  }
  return { init, funcs };
}

export function validateSummoning(block: EffectBlock): string[] {
  if (block.template !== "summoning") return [];
  const s = block.summoning;
  if (!s) return ["请配置融合或仪式召唤处理。"];
  const errors = [
    ...validateMaterialFilter(s.monsterFilter),
    ...validateMaterialFilter(s.materialFilter),
  ];
  if (!["fusion", "ritual"].includes(s.kind) || !(s.materialSource in sources))
    errors.push("召唤处理的种类或素材来源无效。");
  if (
    s.kind === "ritual" &&
    s.ritualLevel === "fixed" &&
    !integer(s.ritualFixedLevel ?? 0, 1, 13)
  )
    errors.push("仪式固定等级须为 1–13。");
  return errors;
}
export function defaultSummoning(
  kind: SummoningEffect["kind"] = "fusion",
): SummoningEffect {
  return {
    kind,
    monsterFilter: { kind: "monster" },
    materialFilter: { kind: "monster" },
    materialSource: "hand-field",
    ritualLevel: "original",
    ritualComparison: "at-least",
    ritualSummonFrom: "hand",
  };
}
