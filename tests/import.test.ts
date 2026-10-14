import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCard, createEffect, createProject } from "../src/domain/model";
import { importCards, parseMseSet } from "../src/io/import";

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
const jsonFile = (data: unknown) =>
  new File([JSON.stringify(data)], "cards.json", { type: "application/json" });

describe("card imports", () => {
  it("imports YGO Carder compact fields and ignores inactive Pendulum / Link settings", async () => {
    const result = await importCards(
      jsonFile({
        ve: 2,
        na: "Millennium Test",
        fr: "effect",
        rg: "en",
        at: "FIRE",
        ta: ["Illusion", "Effect"],
        st: 6,
        atk: "2400",
        def: "0",
        ip: false,
        il: false,
        pe: "Unused saved text",
        lm: ["1", "3", "7", "9"],
        pw: "Illust. someone",
        as: "offline",
        ad: png,
        ef: "Draw 1 card.",
      }),
    );
    expect(result.cards[0]).toMatchObject({
      code: 0,
      name: "Millennium Test",
      kind: "effect",
      attribute: "fire",
      race: 0x2000000,
      level: 6,
      attack: 2400,
      defense: 0,
      art: png,
      pendulum: false,
      pendulumText: "",
      linkMarkers: [],
    });
  });

  it("maps the two distinct arrow formats to core bits", async () => {
    const carder = await importCards(
      jsonFile({
        na: "Link A",
        fr: "link",
        ta: ["Cyberse", "Link", "Effect"],
        il: true,
        lm: ["1", "4", "8"],
        ef: "",
        at: "DARK",
      }),
    );
    const koorio = await importCards(
      jsonFile({
        name: "Link B",
        cardType: "link",
        type: "monster",
        monsterType: "Cyberse/Link/Effect",
        arrowList: [1, 6, 7],
        attribute: "dark",
        description: "",
        password: "12345678",
      }),
    );
    expect(carder.cards[0].linkMarkers).toEqual([1, 8, 128]);
    expect(koorio.cards[0].linkMarkers).toEqual([128, 1, 8]);
    expect(koorio.cards[0].code).toBe(0);
  });

  it("distinguishes the Spellcaster monster race from Spell cards", async () => {
    const { cards } = await importCards(
      jsonFile({
        na: "Mage",
        fr: "effect",
        rg: "en",
        at: "DARK",
        ta: ["Spellcaster", "Effect"],
        st: 4,
        ef: "Draw 1 card.",
      }),
    );
    expect(cards[0]).toMatchObject({
      kind: "effect",
      race: 2,
      attribute: "dark",
    });
  });

  it("preserves non-effect extra deck type and unknown attack", async () => {
    const { cards } = await importCards(
      jsonFile({
        name: "Plain Fusion",
        type: "monster",
        cardType: "fusion",
        monsterType: "Warrior/Fusion",
        level: 6,
        atk: -1,
        def: 1800,
        description: '"A" + "B"',
        attribute: "earth",
      }),
    );
    expect(cards[0]).toMatchObject({
      kind: "fusion",
      hasEffect: false,
      attack: -2,
      procedure: { mode: "none" },
    });
  });

  it("reads MSE ZIP text, stars, tags, notes, arrows and embedded pictures", async () => {
    const set = `mse_version: 2.0.1\ngame: yugioh\nstylesheet: series10\ncard:\n\tname: "Scout"\n\tattribute: "light"\n\tlevel: "<sym-auto>*</sym-auto><sym-auto>*</sym-auto><sym-auto>*</sym-auto><sym-auto>*</sym-auto>"\n\ttype_1: "<word-list-monster>Psychic</word-list-monster>"\n\ttype_2: "<word-list-card>Effect</word-list-card>"\n\trule_text: "You can only use this effect of \\"<atom-cardname>Scout</atom-cardname>\\" once per turn."\n\tnotes:\n\t\t中文参考\n\t\t可能包含笔误\n\timage: local_image_file("image1")\n\tgamecode: "Illust. Author"\ncard:\n\tname: "Link Scout"\n\tattribute: "water"\n\ttype_1: "Dragon"\n\ttype_2: "Link"\n\ttype_3: "Effect"\n\tlinkl: "on"\n\tlinkd: "on"\n\trule_text: "2 monsters\\nDraw 1 card."\n`;
    const zip = new JSZip()
      .file("set", set)
      .file("image1", png.split(",")[1], { base64: true });
    const file = new File(
      [
        (await zip.generateAsync({
          type: "uint8array",
        })) as Uint8Array<ArrayBuffer>,
      ],
      "test.mse-set",
    );
    const result = await importCards(file);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toMatchObject({
      kind: "effect",
      race: 0x100000,
      level: 4,
      code: 0,
      notes: "中文参考\n可能包含笔误",
      art: png,
      text: 'You can only use this effect of "Scout" once per turn.',
    });
    expect(result.cards[1]).toMatchObject({
      kind: "link",
      level: 2,
      linkMarkers: [2, 8],
      text: "2 monsters\nDraw 1 card.",
    });
  });

  it("does not mistake nested styling keys for card values", () => {
    const parsed = parseMseSet(
      'game: yugioh\ncard:\n\tstyling_data:\n\t\tname: "wrong"\n\tname: "right"\n',
    );
    expect(parsed.cards[0].name).toBe("right");
  });

  it("restores the native project including authored blocks and identifiers", async () => {
    const project = createProject();
    const card = createCard(100000101);
    card.effects = [createEffect("draw", card)];
    project.cards = [card];
    const result = await importCards(jsonFile(project));
    expect(result.project).toEqual(project);
  });

  it("rejects malformed backup fields before they can reach the editor", async () => {
    const project = createProject();
    project.cards = [createCard()];
    await expect(
      importCards(jsonFile({ ...project, archetypes: null })),
    ).rejects.toThrow("数据格式");
    await expect(
      importCards(
        jsonFile({
          ...project,
          cards: [{ ...project.cards[0], effects: [{}] }],
        }),
      ),
    ).rejects.toThrow("数据格式");
    await expect(
      importCards(
        jsonFile({ ...project, cards: [{ ...project.cards[0], text: {} }] }),
      ),
    ).rejects.toThrow("数据格式");
  });

  it("never fetches external art during import", async () => {
    const result = await importCards(
      jsonFile({
        name: "Remote",
        cardType: "normal",
        type: "monster",
        monsterType: "Dragon",
        image: "https://example.com/private.png",
        description: "",
      }),
    );
    expect(result.cards[0].art).toBe("");
    expect(
      result.warnings.some((warning) => warning.includes("外部地址")),
    ).toBe(true);
  });
});

// Optional local evidence check; no uploaded user artwork is committed as a fixture.
const fixtureDirectory = process.env.DAY_LILIES_IMPORT_FIXTURES;
it.skipIf(!fixtureDirectory)(
  "imports the three original user examples",
  async () => {
    for (const [filename, count] of [
      ["Millennium Princesses-on-Trial.json", 1],
      ["Telespace XBlader - Geoff.json", 1],
      ["ANSD.mse-set", 22],
    ] as const) {
      const bytes = await readFile(path.join(fixtureDirectory!, filename));
      const result = await importCards(
        new File([new Uint8Array(bytes)], filename),
      );
      expect(result.cards).toHaveLength(count);
      expect(
        result.cards.every(
          (card) =>
            card.art.startsWith("data:image/png;base64,") && card.code === 0,
        ),
      ).toBe(true);
      expect(
        result.cards.every(
          (card) => ["spell", "trap"].includes(card.kind) || card.race > 0,
        ),
      ).toBe(true);
      if (filename === "ANSD.mse-set") {
        expect(
          result.cards.find((card) => card.name === "H-Anifriends Seiryu"),
        ).toMatchObject({ kind: "link", level: 2, linkMarkers: [2, 8] });
        expect(
          result.cards.find((card) => card.name === "H-Anifriends Oinari-Sama"),
        ).toMatchObject({ kind: "synchro", level: 11 });
        expect(result.cards[0].text).toContain("You can only activate");
        expect(result.cards[0].notes).toContain("通常魔法");
      }
    }
  },
);
