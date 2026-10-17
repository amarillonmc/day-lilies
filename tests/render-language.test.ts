import { describe, expect, it } from "vitest";
import { createCard, createProject, type Language } from "../src/domain/model";
import { cardDescription, raceName } from "../src/io/card-data";
import { toRenderData } from "../src/io/render";
import { parseNativeProject } from "../src/io/project-schema";

describe("card rendering language", () => {
  it.each([
    ["sc", "龙族/融合/灵摆/调整/效果"],
    ["tc", "龍族/融合/靈擺/協調/效果"],
    ["en", "Dragon/Fusion/Pendulum/Tuner/Effect"],
    ["jp", "ドラゴン族/融合/ペンデュラム/チューナー/効果"],
  ] as const)(
    "uses %s card labels without changing author text",
    (language, monsterType) => {
      const card = {
        ...createCard(100030001),
        language,
        kind: "fusion" as const,
        pendulum: true,
        tuner: true,
        race: 0x2000,
        name: "混合 Card 名前",
        text: "Draw 1 card. 一枚引く。抽一张卡。",
        pendulumText: "Author's pendulum text",
        notes: "中文注释",
        leftScale: 1,
        rightScale: 8,
      };
      const original = structuredClone(card);
      const rendered = toRenderData(card);
      expect(rendered).toMatchObject({
        language,
        monsterType,
        name: card.name,
        description: card.text,
        pendulumDescription: card.pendulumText,
      });
      expect(card).toEqual(original);
      const project = { ...createProject(), cards: [card] };
      expect(
        parseNativeProject(JSON.parse(JSON.stringify(project))).cards[0],
      ).toEqual(original);
    },
  );

  it.each(["sc", "tc", "en", "jp"] as const)(
    "keeps %s spell/trap rendering and database content independent",
    (language) => {
      for (const kind of ["spell", "trap"] as const) {
        const card = {
          ...createCard(100030002),
          language,
          kind,
          name: "User card",
          text: "用户自定义内容",
          customStrings: ["用户提示"],
        };
        expect(toRenderData(card)).toMatchObject({
          language,
          type: kind,
          name: "User card",
          description: "用户自定义内容",
        });
        expect(cardDescription(card)).toBe(card.text);
      }
    },
  );

  it("localizes only generated Pendulum section labels and invalid-type fallback", () => {
    const headings: Record<Language, string> = {
      en: "[Pendulum Effect]",
      jp: "【ペンデュラム効果】",
      sc: "【灵摆效果】",
      tc: "【靈擺效果】",
    };
    for (const language of Object.keys(headings) as Language[]) {
      const card = {
        ...createCard(),
        pendulum: true,
        language,
        pendulumText: "Original pendulum",
        text: "Original monster",
      };
      expect(cardDescription(card)).toContain(headings[language]);
      expect(cardDescription(card)).toContain("Original pendulum");
      expect(cardDescription(card)).toContain("Original monster");
    }
    expect(raceName(0, "jp")).toBe("不明な種族");
    expect(raceName(0, "en")).toBe("Unknown Type");
  });
});
