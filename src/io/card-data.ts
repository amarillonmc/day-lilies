import type { Attribute, Card, CardKind, Language } from "../domain/model";

/** Values are OCGCORE constants, not display indexes. */
export const ATTRIBUTES: Record<Attribute, number> = {
  earth: 1,
  water: 2,
  fire: 4,
  wind: 8,
  light: 16,
  dark: 32,
  divine: 64,
};
export const RACES = [
  ["Warrior", "战士", "戰士", "戦士"],
  ["Spellcaster", "魔法师", "魔法使", "魔法使い"],
  ["Fairy", "天使", "天使", "天使"],
  ["Fiend", "恶魔", "惡魔", "悪魔"],
  ["Zombie", "不死", "不死", "アンデット"],
  ["Machine", "机械", "機械", "機械"],
  ["Aqua", "水", "水", "水"],
  ["Pyro", "炎", "炎", "炎"],
  ["Rock", "岩石", "岩石", "岩石"],
  ["Winged Beast", "鸟兽", "鳥獸", "鳥獣"],
  ["Plant", "植物", "植物", "植物"],
  ["Insect", "昆虫", "昆蟲", "昆虫"],
  ["Thunder", "雷", "雷", "雷"],
  ["Dragon", "龙", "龍", "ドラゴン"],
  ["Beast", "兽", "獸", "獣"],
  ["Beast-Warrior", "兽战士", "獸戰士", "獣戦士"],
  ["Dinosaur", "恐龙", "恐龍", "恐竜"],
  ["Fish", "鱼", "魚", "魚"],
  ["Sea Serpent", "海龙", "海龍", "海竜"],
  ["Reptile", "爬虫类", "爬蟲類", "爬虫類"],
  ["Psychic", "念动力", "念動力", "サイキック"],
  ["Divine-Beast", "幻神兽", "幻神獸", "幻神獣"],
  ["Creator God", "创造神", "創造神", "創造神"],
  ["Wyrm", "幻龙", "幻龍", "幻竜"],
  ["Cyberse", "电子界", "電子界", "サイバース"],
  ["Illusion", "幻想魔", "幻想魔", "幻想魔"],
] as const;
export const LINK_MARKERS = [1, 2, 4, 8, 32, 64, 128, 256];
export const RENDER_LINK_MARKERS = [128, 256, 32, 4, 2, 1, 8, 64];
export const CARDER_LINK_MARKERS: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 4,
  "4": 8,
  "6": 32,
  "7": 64,
  "8": 128,
  "9": 256,
};

export function raceFromText(text: string): number {
  const first = text
    .replace(/[\[\]【】]/g, "")
    .split(/[\/／]/)[0]
    .trim()
    .replace(/族$/, "")
    .toLowerCase();
  const index = RACES.findIndex((names) =>
    names.some((name) => name.toLowerCase() === first),
  );
  return index < 0 ? 0 : 2 ** index;
}
export function raceName(race: number, language: Language): string {
  const index = Math.log2(race);
  const names = RACES[index];
  const lang = { en: 0, sc: 1, tc: 2, jp: 3 }[language];
  return names
    ? names[lang] + (language === "en" ? "" : "族")
    : { en: "Unknown Type", sc: "未知种族", tc: "未知種族", jp: "不明な種族" }[
        language
      ];
}
export function cardTypeBits(card: Card): number {
  if (card.kind === "spell" || card.kind === "trap") {
    return (
      (card.kind === "spell" ? 2 : 4) |
      {
        normal: 0,
        "quick-play": 0x10000,
        continuous: 0x20000,
        equip: 0x40000,
        field: 0x80000,
        ritual: 0x80,
        counter: 0x100000,
      }[card.subtype]
    );
  }
  const kinds: Record<CardKind, number> = {
    normal: 0x10,
    effect: 0x20,
    ritual: 0x80,
    fusion: 0x40,
    synchro: 0x2000,
    xyz: 0x800000,
    link: 0x4000000,
    token: 0x4000 | 0x10,
    spell: 0,
    trap: 0,
  };
  const effect =
    card.kind !== "normal" && card.kind !== "token" && card.hasEffect !== false
      ? 0x20
      : 0;
  return (
    1 |
    kinds[card.kind] |
    effect |
    (card.tuner ? 0x1000 : 0) |
    (card.pendulum ? 0x1000000 : 0)
  );
}
export function cardDescription(card: Card): string {
  if (!card.pendulum) return card.text;
  const labels =
    card.language === "en"
      ? ["[Pendulum Effect]", "[Monster Effect]"]
      : card.language === "jp"
        ? ["【ペンデュラム効果】", "【モンスター効果】"]
        : card.language === "tc"
          ? ["【靈擺效果】", "【怪獸效果】"]
          : ["【灵摆效果】", "【怪兽效果】"];
  return `${labels[0]}\n${card.pendulumText}\n----------------------------------------\n${labels[1]}\n${card.text}`;
}
export function packedSetcode(codes: number[]): string {
  let value = 0n;
  codes.slice(0, 4).forEach((code, i) => {
    value |= BigInt(code & 0xffff) << BigInt(i * 16);
  });
  return BigInt.asIntN(64, value).toString();
}
