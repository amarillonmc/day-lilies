import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { createCard, createEffect, createProject } from "../src/domain/model";
import { compileCard } from "../src/domain/compiler";
import { cardTypeBits, packedSetcode } from "../src/io/card-data";
import { createCdb, exportProject, getSql } from "../src/io/export";

vi.mock("../src/io/render", () => ({
  renderCard: vi.fn(
    async () =>
      new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
  ),
}));

function projectFixture() {
  const project = createProject();
  project.name = "测试卡包";
  const card = createCard(100000101);
  Object.assign(card, {
    kind: "normal",
    hasEffect: false,
    name: "Test Knight",
    art: "data:image/png;base64,AA==",
    text: "A knight.",
    race: 1,
  });
  project.cards = [card];
  return project;
}

describe("YGOPRO package export", () => {
  it("writes and reads 64-bit setcode, independent scales, Link markers and text strings", async () => {
    const project = projectFixture();
    const pendulum = project.cards[0];
    Object.assign(pendulum, {
      pendulum: true,
      leftScale: 2,
      rightScale: 8,
      pendulumText: "Pendulum text",
      setcodes: [0x1234, 0xabcd, 0x4321, 0xffff],
    });
    const link = {
      ...createCard(100000102),
      kind: "link" as const,
      level: 3,
      linkMarkers: [1, 128, 256],
      art: pendulum.art,
      procedure: {
        mode: "link" as const,
        min: 2,
        max: 3,
        materialLevel: 4,
        materialCodes: [],
      },
    };
    project.cards.push(link);
    const compiled = project.cards.map((card) => compileCard(card, project));
    compiled[0].strings = ["提示一", "提示二"];
    const SQL = await getSql();
    const db = new SQL.Database(await createCdb(project, compiled, SQL));
    try {
      const rows = db.exec(
        "SELECT id,CAST(setcode AS TEXT),type,level,def FROM datas ORDER BY id",
      )[0].values;
      expect(rows[0]).toEqual([
        100000101,
        BigInt.asIntN(64, 0xffff4321abcd1234n).toString(),
        0x1000011,
        0x02080004,
        1000,
      ]);
      expect(rows[1][4]).toBe(385);
      expect(rows[1][2]).toBe(0x4000021);
      const text = db.exec(
        "SELECT name,desc,str1,str2 FROM texts WHERE id=100000101",
      )[0].values[0];
      expect(text[1]).toContain("Pendulum text");
      expect(text.slice(2)).toEqual(["提示一", "提示二"]);
    } finally {
      db.close();
    }
  });

  it("generates the complete expansions layout with matching card numbers", async () => {
    const project = projectFixture();
    project.archetypes = [{ name: "Example", code: 0x1234 }];
    const onProgress = vi.fn();
    const zip = await JSZip.loadAsync(
      await (await exportProject(project, { onProgress })).arrayBuffer(),
    );
    expect(zip.file("expansions/测试卡包.cdb")).not.toBeNull();
    expect(zip.file("expansions/pics/100000101.png")).not.toBeNull();
    expect(
      await zip.file("expansions/script/c100000101.lua")!.async("string"),
    ).toContain("function s.initial_effect(c)");
    expect(await zip.file("expansions/strings.conf")!.async("string")).toBe(
      "!setname 0x1234 Example\n",
    );
    expect(zip.file("README.txt")).not.toBeNull();
    expect(zip.file("export-report.json")).not.toBeNull();
    expect(onProgress).toHaveBeenLastCalledWith(1, 1);
  });

  it("never bypasses missing or duplicate IDs or invalid Lua in draft mode", async () => {
    const missing = projectFixture();
    missing.cards[0].code = 0;
    await expect(exportProject(missing, { allowDraft: true })).rejects.toThrow(
      "卡号",
    );
    const duplicate = projectFixture();
    duplicate.cards.push({ ...duplicate.cards[0], uid: "other" });
    await expect(
      exportProject(duplicate, { allowDraft: true }),
    ).rejects.toThrow("重复");
    const invalid = projectFixture();
    Object.assign(invalid.cards[0], {
      scriptMode: "custom",
      customLua: "this is not lua",
    });
    await expect(
      exportProject(invalid, { allowDraft: true }),
    ).rejects.toThrow();
  });

  it("blocks Koishi-only effect blocks and custom SetCode numbers even in draft exports", async () => {
    const project = projectFixture();
    const card = project.cards[0];
    card.kind = "effect";
    card.hasEffect = true;
    const block = createEffect("custom-effect", card);
    block.advanced = {
      type: "EFFECT_TYPE_SINGLE",
      code: "EFFECT_MAP_OF_HEAVEN",
      value: "1",
    };
    card.effects = [block];
    await expect(exportProject(project, { allowDraft: true })).rejects.toThrow(
      "KoishiPRO",
    );
    card.scriptMode = "custom";
    card.customLua =
      "local s,id=GetID()\nfunction s.initial_effect(c)\nlocal e=Effect.CreateEffect(c)\ne:SetType(EFFECT_TYPE_SINGLE)\ne:SetCode(37564151)\ne:SetValue(128)\nc:RegisterEffect(e)\nend";
    await expect(exportProject(project, { allowDraft: true })).rejects.toThrow(
      "KoishiPRO",
    );
    project.target = "koishipro";
    const zip = await JSZip.loadAsync(
      await (await exportProject(project)).arrayBuffer(),
    );
    expect(
      JSON.parse(await zip.file("export-report.json")!.async("string")).target,
    ).toBe("koishipro");
    expect(
      await zip.file(`expansions/script/c${card.code}.lua`)!.async("string"),
    ).toContain("SetCode(37564151)");
  });

  it("requires explicit draft choice for incomplete review but preserves the report", async () => {
    const project = projectFixture();
    project.cards[0].reviewRequired = true;
    await expect(exportProject(project)).rejects.toThrow("草稿");
    const zip = await JSZip.loadAsync(
      await (await exportProject(project, { allowDraft: true })).arrayBuffer(),
    );
    const report = JSON.parse(
      await zip.file("export-report.json")!.async("string"),
    );
    expect(report.draft).toBe(true);
    expect(report.diagnostics.length).toBeGreaterThan(0);
  });

  it("preserves non-effect extra deck flags and all four packed setcodes", () => {
    const card = createCard();
    card.kind = "fusion";
    card.hasEffect = false;
    expect(cardTypeBits(card)).toBe(0x41);
    expect(packedSetcode([0x1, 0x2, 0x3, 0x4])).toBe("1125912791875585");
  });
});
