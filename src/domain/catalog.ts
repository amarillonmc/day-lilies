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
