import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  I18nProvider,
  readUiLanguage,
  translate,
  UI_LANGUAGE_KEY,
} from "../src/i18n";
import { createCard, createProject } from "../src/domain/model";
import CardEditor from "../src/ui/CardEditor";
import { Select } from "../src/ui/Fields";
import {
  ATTRIBUTES,
  COSTS,
  COUNTS,
  KINDS,
  RACES,
  SUBTYPES,
  TRIGGERS,
  ZONES,
} from "../src/ui/options";
import { uiTranslations } from "../src/uiTranslations";
import { ADVANCED_EFFECT_PRESETS } from "../src/domain/advanced-presets";
import { validateOperations } from "../src/domain/operations";
import { createEffect } from "../src/domain/model";
import { TRIGGERS as EFFECT_TRIGGERS } from "../src/domain/catalog";

afterEach(() => vi.unstubAllGlobals());

describe("interface language", () => {
  it("loads only supported saved languages and tolerates unavailable storage", () => {
    for (const value of ["zh-CN", "en", "ja"] as const) {
      const getItem = vi.fn(() => value);
      expect(readUiLanguage({ getItem })).toBe(value);
      expect(getItem).toHaveBeenCalledWith(UI_LANGUAGE_KEY);
    }
    expect(readUiLanguage({ getItem: () => "jp" })).toBe("zh-CN");
    expect(readUiLanguage({ getItem: () => null })).toBe("zh-CN");
    expect(
      readUiLanguage({
        getItem: () => {
          throw new Error("disabled");
        },
      }),
    ).toBe("zh-CN");
  });

  it("translates UI messages while preserving dynamic values exactly", () => {
    const name = "设置  空格\n日本語 {count}";
    expect(translate("删除「{0}」？", "en", { 0: name })).toBe(
      `Delete “${name}”?`,
    );
    expect(translate(`删除「${name}」？`, "ja")).toBe(
      `「${name}」を削除しますか？`,
    );
    expect(translate("正在生成卡图 2 / 5…", "en")).toBe(
      "Rendering card images 2 / 5…",
    );
    expect(translate("请先加入卡片。\n保存失败", "en")).toBe(
      "Add a card first.\nSave failed",
    );
    expect(translate("Unrecognized application message", "ja")).toBe(
      "Unrecognized application message",
    );
  });

  it("translates nested operation diagnostics without translating embedded user names", () => {
    const block = createEffect("sequence");
    block.operations![0].amount = -1;
    const messages = validateOperations(block);
    expect(messages).toContain("处理 1：数量须为 1–40。");
    expect(messages.map((message) => translate(message, "en"))).toContain(
      "Step 1: The amount must be from 1 to 40.",
    );
    expect(
      translate("处理 {0}：{1}", "ja", { 0: 2, 1: "选择方式无效。" }),
    ).toBe("処理 2：選択方法が無効です。");
    const name = "设置  保持空格\n日本語";
    expect(
      translate(`处理 3：系列「${name}」对应多个代码，无法可靠匹配。`, "en"),
    ).toBe(
      `Step 3: Archetype “${name}” has multiple codes and cannot be matched reliably.`,
    );
    const unknown = "Author message: 自定义内容";
    expect(translate(`处理 4：${unknown}`, "en")).toBe(`Step 4: ${unknown}`);
  });

  it("provides localized labels and explanations for every advanced effect preset", () => {
    for (const preset of ADVANCED_EFFECT_PRESETS) {
      for (const copy of [preset.label, preset.summary]) {
        expect(translate(copy, "en"), preset.id).not.toMatch(/[\u4e00-\u9fff]/);
        expect(translate(copy, "ja"), preset.id).not.toBe(copy);
      }
    }
    expect(
      translate(
        "EFFECT_ADD_LINK_MARKER_KOISHI 是 KoishiPRO 专有能力，上游 YGOPRO 目标不支持。",
        "en",
      ),
    ).toBe(
      "EFFECT_ADD_LINK_MARKER_KOISHI is exclusive to KoishiPRO and is unsupported by the upstream YGOPRO target.",
    );
  });

  it("has English and Japanese copy for every built-in card option", () => {
    for (const [, label] of [
      ...ATTRIBUTES,
      ...COSTS,
      ...COUNTS,
      ...KINDS,
      ...RACES,
      ...SUBTYPES,
      ...TRIGGERS,
      ...ZONES,
    ]) {
      expect(uiTranslations[label], label).toHaveLength(2);
      expect(translate(label, "en"), label).not.toMatch(/[\u4e00-\u9fff]/);
      expect(translate(label, "ja"), label).toBeTruthy();
    }
    // Water and Fire attributes are distinct from Aqua and Pyro monster types.
    expect(
      translate(ATTRIBUTES.find(([value]) => value === "water")![1], "en"),
    ).toBe("WATER");
    expect(translate(RACES.find(([value]) => value === 64)![1], "en")).toBe(
      "Aqua",
    );
    expect(translate(RACES.find(([value]) => value === 128)![1], "en")).toBe(
      "Pyro",
    );
  });

  it("labels delayed event triggers as If while retaining chain-response When timing", () => {
    const delayed = new Set([
      "summon",
      "special-summon",
      "summon-or-special",
      "flip",
      "sent-to-grave",
    ]);
    for (const { value, label } of EFFECT_TRIGGERS) {
      if (delayed.has(value)) expect(translate(label, "en")).toMatch(/^If /);
      if (value === "chain") expect(translate(label, "en")).toMatch(/^When /);
    }
    for (const [value, label] of TRIGGERS) {
      if (delayed.has(value)) expect(translate(label, "en")).toMatch(/^If /);
    }
  });

  it.each(["en", "ja"] as const)(
    "renders %s interface without altering card language or user content",
    (language) => {
      vi.stubGlobal("localStorage", { getItem: () => language });
      const card = {
        ...createCard(100000001),
        language: "jp" as const,
        name: "卡片名称",
        text: "设置\nユーザーの本文 / user text",
        notes: "效果积木",
        customLua: "-- 未翻译\nlocal s,id=GetID()",
      };
      const project = createProject();
      project.cards = [card];
      project.archetypes = [{ name: "设置", code: 0x7d01 }];
      const before = JSON.stringify(project);
      const onChange = vi.fn();
      const html = renderToStaticMarkup(
        createElement(I18nProvider, {
          children: createElement(CardEditor, {
            card,
            project,
            onChange,
            onError: vi.fn(),
          }),
        }),
      );
      expect(html).toContain(
        language === "en" ? "Card rendering language" : "カードの描画言語",
      );
      expect(html).toContain('value="jp" selected=""');
      expect(html).toContain('value="卡片名称"');
      expect(html).toContain("设置\nユーザーの本文 / user text");
      expect(html).toContain(">设置</button>");
      expect(JSON.stringify(project)).toBe(before);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("keeps user-provided select labels unchanged when translation is disabled", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const html = renderToStaticMarkup(
      createElement(I18nProvider, {
        children: createElement(Select, {
          value: "user",
          options: [["user", "设置"]],
          translateOptions: false,
          onChange: () => {},
        }),
      }),
    );
    expect(html).toContain(">设置</option>");
    expect(html).not.toContain("Settings");
  });
});
