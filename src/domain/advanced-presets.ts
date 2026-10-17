import type { AdvancedEffect, TargetCore } from "./model";

export interface AdvancedEffectPreset {
  id: string;
  label: string;
  summary: string;
  requiredCore?: TargetCore;
  config: AdvancedEffect;
}
const single = (code: string, value = "1"): AdvancedEffect => ({
  type: "EFFECT_TYPE_SINGLE",
  code,
  property: "EFFECT_FLAG_SINGLE_RANGE",
  range: "LOCATION_MZONE",
  value,
});
const playerRule = (
  code: string,
  value: string,
  targetRange: [number, number],
): AdvancedEffect => ({
  type: "EFFECT_TYPE_FIELD",
  code,
  range: "LOCATION_MZONE",
  property: "EFFECT_FLAG_PLAYER_TARGET",
  targetRange,
  value,
});

/** Editable starting points. Values/ranges/callbacks remain visible and author-owned. */
export const ADVANCED_EFFECT_PRESETS: AdvancedEffectPreset[] = [
  {
    id: "battle-protection",
    label: "不会被战斗破坏",
    summary: "此怪兽在怪兽区不会被战斗破坏。",
    config: single("EFFECT_INDESTRUCTABLE_BATTLE"),
  },
  {
    id: "effect-protection",
    label: "不会被效果破坏",
    summary: "此怪兽在怪兽区不会被任何效果破坏。",
    config: single("EFFECT_INDESTRUCTABLE_EFFECT"),
  },
  {
    id: "opponent-target-protection",
    label: "不会成为对方效果对象",
    summary: "此怪兽不成为对方效果的对象；仍可能受到不取对象的效果影响。",
    config: single("EFFECT_CANNOT_BE_EFFECT_TARGET", "aux.tgoval"),
  },
  {
    id: "battle-target-protection",
    label: "不会成为攻击对象",
    summary: "此怪兽在怪兽区不能被选为攻击对象。",
    config: single("EFFECT_CANNOT_BE_BATTLE_TARGET"),
  },
  {
    id: "opponent-immunity",
    label: "不受对方效果影响",
    summary: "通过效果持有者判断，不受对方效果影响。",
    config: {
      ...single("EFFECT_IMMUNE_EFFECT"),
      value: undefined,
      valueFunction: "return e:GetOwnerPlayer()~=te:GetOwnerPlayer()",
      callbackArgs: { valueFunction: "e,te" },
    },
  },
  {
    id: "direct-attack",
    label: "可以直接攻击",
    summary: "此怪兽可以直接攻击对方玩家。",
    config: single("EFFECT_DIRECT_ATTACK"),
  },
  {
    id: "piercing",
    label: "贯穿战斗伤害",
    summary: "攻击守备表示怪兽时给予贯穿战斗伤害。",
    config: single("EFFECT_PIERCE"),
  },
  {
    id: "extra-attack",
    label: "增加攻击次数",
    summary: "默认额外攻击 1 次；固定数值可修改。",
    config: single("EFFECT_EXTRA_ATTACK"),
  },
  {
    id: "cannot-attack",
    label: "自身不能攻击",
    summary: "此怪兽在怪兽区不能攻击。",
    config: single("EFFECT_CANNOT_ATTACK"),
  },
  {
    id: "attack-aura",
    label: "自己怪兽攻击力光环",
    summary: "自己场上所有表侧怪兽攻击力上升 500；可编辑数值及筛选回调。",
    config: {
      type: "EFFECT_TYPE_FIELD",
      code: "EFFECT_UPDATE_ATTACK",
      range: "LOCATION_MZONE",
      targetRange: [4, 0],
      value: "500",
      target: "return c:IsFaceup()",
      callbackArgs: { target: "e,c" },
    },
  },
  {
    id: "defense-aura",
    label: "自己怪兽守备力光环",
    summary: "自己场上有守备力的表侧怪兽守备力上升 500。",
    config: {
      type: "EFFECT_TYPE_FIELD",
      code: "EFFECT_UPDATE_DEFENSE",
      range: "LOCATION_MZONE",
      targetRange: [4, 0],
      value: "500",
      target: "return c:IsFaceup() and c:IsHasDefense()",
      callbackArgs: { target: "e,c" },
    },
  },
  {
    id: "level",
    label: "持续改变等级",
    summary: "此怪兽在怪兽区的等级变成 4；不适用于阶级或连接值。",
    config: single("EFFECT_CHANGE_LEVEL", "4"),
  },
  {
    id: "attribute",
    label: "持续改变属性",
    summary: "此怪兽在怪兽区的属性变成暗属性。",
    config: single("EFFECT_CHANGE_ATTRIBUTE", "ATTRIBUTE_DARK"),
  },
  {
    id: "race",
    label: "持续改变种族",
    summary: "此怪兽在怪兽区的种族变成龙族。",
    config: single("EFFECT_CHANGE_RACE", "RACE_DRAGON"),
  },
  {
    id: "tuner",
    label: "视为调整",
    summary: "此怪兽在怪兽区同时视为调整怪兽。",
    config: single("EFFECT_ADD_TYPE", "TYPE_TUNER"),
  },
  {
    id: "special-summon-lock",
    label: "自己不能特殊召唤",
    summary: "此卡在怪兽区存在期间，自己不能特殊召唤；不是整回合誓约。",
    config: playerRule("EFFECT_CANNOT_SPECIAL_SUMMON", "1", [1, 0]),
  },
  {
    id: "opponent-spell-lock",
    label: "对方不能发动魔法",
    summary: "此卡在怪兽区存在期间，对方不能发动魔法卡或魔法效果。",
    config: {
      ...playerRule("EFFECT_CANNOT_ACTIVATE", "1", [0, 1]),
      value: undefined,
      valueFunction: "return re:IsActiveType(TYPE_SPELL)",
      callbackArgs: { valueFunction: "e,re,tp" },
    },
  },
  {
    id: "hand-limit",
    label: "改变自己手牌上限",
    summary: "此卡在怪兽区存在期间，自己的手牌上限为 7。",
    config: playerRule("EFFECT_HAND_LIMIT", "7", [1, 0]),
  },
  {
    id: "koishi-add-arrow",
    label: "增加连接箭头",
    summary: "KoishiPRO：在怪兽区增加向上的连接箭头；数值为连接标记位。",
    requiredCore: "koishipro",
    config: {
      ...single("EFFECT_ADD_LINK_MARKER_KOISHI", "128"),
      requiredCore: "koishipro",
    },
  },
  {
    id: "koishi-remove-arrow",
    label: "移除连接箭头",
    summary: "KoishiPRO：在怪兽区移除向上的连接箭头。",
    requiredCore: "koishipro",
    config: {
      ...single("EFFECT_REMOVE_LINK_MARKER_KOISHI", "128"),
      requiredCore: "koishipro",
    },
  },
  {
    id: "koishi-change-arrows",
    label: "变更连接箭头",
    summary: "KoishiPRO：在怪兽区将连接箭头替换为向上。",
    requiredCore: "koishipro",
    config: {
      ...single("EFFECT_CHANGE_LINK_MARKER_KOISHI", "128"),
      requiredCore: "koishipro",
    },
  },
];
