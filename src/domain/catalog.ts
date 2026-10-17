import type { Attribute, TemplateId, Trigger } from "./model";

const source = (code: number) =>
  `https://github.com/Smile-DK/ygopro-scripts/blob/master/c${code}.lua`;
export const TEMPLATES: {
  id: TemplateId;
  label: string;
  summary: string;
  source: string;
}[] = [
  {
    id: "search",
    label: "卡组检索",
    summary: "处理时从自己的卡组选出固定数量的卡，加入手牌并公开。",
    source: source(32807846),
  },
  {
    id: "recover",
    label: "墓地回收",
    summary: "发动时选择墓地的 1 张卡为对象，回到持有者手牌。",
    source: source(95281259),
  },
  {
    id: "draw",
    label: "抽卡",
    summary: "指定玩家抽固定数量的卡。",
    source: source(55144522),
  },
  {
    id: "mill",
    label: "卡组选送墓地",
    summary: "处理时从自己的卡组选出固定数量的卡送墓；不是卡组顶送墓。",
    source: source(81439173),
  },
  {
    id: "destroy",
    label: "对象破坏",
    summary: "以场上的 1 张卡为对象并破坏。",
    source: source(5318639),
  },
  {
    id: "bounce",
    label: "对象回手",
    summary: "以场上的 1 张卡为对象，回到持有者手牌。",
    source: source(94192409),
  },
  {
    id: "banish",
    label: "对象除外",
    summary: "以场上或墓地的 1 张卡为对象，表侧除外。",
    source: source(24508238),
  },
  {
    id: "revive",
    label: "墓地对象苏生",
    summary: "以墓地 1 只怪兽为对象，特殊召唤到自己场上。",
    source: source(83764718),
  },
  {
    id: "summon",
    label: "选择特殊召唤",
    summary: "处理时从自己的手牌或墓地选 1 只怪兽，特殊召唤。",
    source: source(88264978),
  },
  {
    id: "self-summon",
    label: "手牌特召手续",
    summary: "自己无怪兽等预设条件下，从手牌特殊召唤自身，不发动连锁。",
    source: source(70095154),
  },
  {
    id: "boost",
    label: "临时攻守变化",
    summary: "以场上 1 只表侧怪兽为对象，攻守增减至回合结束。",
    source: source(86120751),
  },
  ...(
    [
      ["damage", "效果伤害", "对指定玩家造成固定数值的效果伤害。"],
      ["heal", "回复基本分", "为指定玩家回复固定数值的基本分。"],
      ["mill-top", "卡组顶送墓", "将指定玩家卡组最上方的固定数量卡送去墓地。"],
      ["to-deck", "返回卡组", "将对象返回卡组并洗切，或放到卡组顶／底。"],
      ["send-grave", "送去墓地", "选择对象送去墓地，不作为破坏。"],
      [
        "discard-hand",
        "丢弃手牌",
        "处理时由效果控制者选择指定玩家的手牌丢弃。",
      ],
      ["change-position", "改变表示形式", "改变对象怪兽的战斗表示形式。"],
      ["control", "获得控制权", "获得对象怪兽控制权，可设回合结束或永久。"],
      [
        "negate-activation",
        "无效连锁发动",
        "连锁发动时无效该连锁的发动；可在复合处理中接破坏。",
      ],
      ["negate-effect", "无效连锁效果", "连锁发动时无效该连锁的效果。"],
      ["disable", "无效卡片效果", "无效对象表侧卡片的效果，可设持续时间。"],
      ["equip", "将自身装备", "将此卡装备给对象表侧怪兽，并设置装备限制。"],
      [
        "add-counter",
        "放置指示物",
        "在自身放置指定类型的指示物；其他卡须已有对应许可。",
      ],
      ["remove-counter", "取除指示物", "从自身取除指定类型的指示物。"],
      [
        "attach-material",
        "叠放超量素材",
        "将选择的卡叠放到此卡之下作为超量素材。",
      ],
      [
        "detach-material",
        "取除超量素材",
        "从此卡取除固定数量超量素材作为效果处理。",
      ],
      ["set-spelltrap", "盖放魔法陷阱", "选择魔法陷阱盖放到自己场上。"],
      [
        "declare-race",
        "宣言并改变种族",
        "宣言一种种族，将对象怪兽变为该种族。",
      ],
      [
        "declare-attribute",
        "宣言并改变属性",
        "宣言一种属性，将对象怪兽变为该属性。",
      ],
      [
        "sequence",
        "复合效果",
        "依次组合处理，支持成功／失败分支、任意处理和沿用上一组卡。",
      ],
      [
        "custom-effect",
        "高级效果配置",
        "直接配置 Effect 参数和 Lua 回调，可与其他拼图共存。",
      ],
    ] as const
  ).map(([id, label, summary]) => ({
    id,
    label,
    summary,
    source: "https://github.com/Fluorohydride/ygopro-core",
  })),
];
export const TRIGGERS: { value: Trigger; label: string }[] = [
  { value: "activate", label: "魔法／陷阱卡的发动" },
  { value: "ignition", label: "起动效果（自己主要阶段）" },
  { value: "summon", label: "召唤成功的场合" },
  { value: "special-summon", label: "特殊召唤成功的场合" },
  { value: "summon-or-special", label: "召唤或特殊召唤成功的场合" },
  { value: "flip", label: "反转的场合" },
  { value: "sent-to-grave", label: "送去墓地的场合" },
  { value: "quick", label: "场上快速效果（自由连锁）" },
  { value: "chain", label: "其他效果发动时（连锁响应）" },
  { value: "destroyed", label: "此卡被破坏时" },
  { value: "banished", label: "此卡被除外时" },
  { value: "to-hand", label: "此卡加入手牌时" },
  { value: "to-deck", label: "此卡回到卡组时" },
  { value: "battle-destroying", label: "此卡战斗破坏怪兽时" },
  { value: "battle-destroyed", label: "此卡被战斗破坏时" },
  { value: "damage", label: "玩家受到伤害时" },
  { value: "attack-announce", label: "攻击宣言时" },
  { value: "standby", label: "准备阶段" },
  { value: "end-phase", label: "结束阶段" },
  { value: "any-summon", label: "任意怪兽召唤成功时" },
  { value: "any-special-summon", label: "任意怪兽特殊召唤成功时" },
];
export const RACES: { value: number; label: string; english: string }[] = [
  ["战士", "Warrior"],
  ["魔法师", "Spellcaster"],
  ["天使", "Fairy"],
  ["恶魔", "Fiend"],
  ["不死", "Zombie"],
  ["机械", "Machine"],
  ["水", "Aqua"],
  ["炎", "Pyro"],
  ["岩石", "Rock"],
  ["鸟兽", "Winged Beast"],
  ["植物", "Plant"],
  ["昆虫", "Insect"],
  ["雷", "Thunder"],
  ["龙", "Dragon"],
  ["兽", "Beast"],
  ["兽战士", "Beast-Warrior"],
  ["恐龙", "Dinosaur"],
  ["鱼", "Fish"],
  ["海龙", "Sea Serpent"],
  ["爬虫类", "Reptile"],
  ["念动力", "Psychic"],
  ["幻神兽", "Divine-Beast"],
  ["创造神", "Creator God"],
  ["幻龙", "Wyrm"],
  ["电子界", "Cyberse"],
  ["幻想魔", "Illusion"],
].map(([label, english], i) => ({
  value: 2 ** i,
  label: `${label}族`,
  english,
}));
export const ATTRIBUTES: { value: Attribute; label: string }[] = [
  { value: "dark", label: "暗" },
  { value: "light", label: "光" },
  { value: "earth", label: "地" },
  { value: "water", label: "水" },
  { value: "fire", label: "炎" },
  { value: "wind", label: "风" },
  { value: "divine", label: "神" },
];
