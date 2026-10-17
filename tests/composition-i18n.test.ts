import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, translate } from "../src/i18n";
import {
  createCard,
  createEffect,
  createOperation,
  createProject,
} from "../src/domain/model";
import { createTracking } from "../src/domain/tracking";
import { SummonProcedureEditor } from "../src/ui/SummonProcedureEditor";
import EffectEditor from "../src/ui/EffectEditor";
import { summonTranslations } from "../src/summonTranslations";
import { trackingTranslations } from "../src/trackingTranslations";
import { targetTranslations } from "../src/targetTranslations";
import { workflowTranslations } from "../src/workflowTranslations";

afterEach(() => vi.unstubAllGlobals());
describe("localized visual composition", () => {
  it("provides English and Japanese for new configuration and diagnostics", () => {
    for (const [source, pair] of Object.entries({
      ...summonTranslations,
      ...trackingTranslations,
      ...targetTranslations,
      ...workflowTranslations,
    })) {
      expect(pair, source).toHaveLength(2);
      expect(pair[0], source).not.toMatch(/[\u4e00-\u9fff]/);
      expect(translate(source, "en"), source).not.toBe(source);
      expect(translate(source, "ja"), source).toBeTruthy();
    }
  });
  it.each(["en", "ja"] as const)(
    "renders %s controls and preserves user target-group names",
    (language) => {
      vi.stubGlobal("localStorage", { getItem: () => language });
      const card = createCard(100090010);
      const first = createOperation("banish");
      first.targetName = "设置  日文\nA";
      const second = createOperation("bounce");
      second.selection = "target-group";
      second.reference = first.uid;
      const effect = createEffect("sequence");
      const ritual = createOperation("summoning");
      ritual.summoning!.kind = "ritual";
      effect.operations = [first, second, ritual];
      effect.tracking = [
        { ...createTracking(first.uid), action: "return-temporary" },
      ];
      card.effects = [effect, createEffect("summoning")];
      const project = { ...createProject(), cards: [card] };
      const before = structuredClone(project);
      const html = renderToStaticMarkup(
        createElement(I18nProvider, {
          children: createElement(EffectEditor, {
            card,
            project,
            onChange: vi.fn(),
          }),
        }),
      );
      expect(html).toContain(translate("跨时点追踪", language));
      expect(html).toContain(translate("融合／仪式召唤", language));
      expect(html).toContain(translate("仪式怪兽来源", language));
      expect(html).toContain(
        `<option value="hand" selected="">${translate("手牌", language)}</option>`,
      );
      expect(html).toContain(
        `<option value="hand-grave">${translate("手牌与墓地", language)}</option>`,
      );
      expect(html).not.toContain(">手牌</option>");
      expect(html).not.toContain(">手牌与墓地</option>");
      expect(html).toContain('value="设置  日文\nA"');
      expect(html).toContain("1. 设置  日文\nA</option>");
      expect(project).toEqual(before);
    },
  );
  it.each(["en", "ja"] as const)(
    "renders %s fusion material slots",
    (language) => {
      vi.stubGlobal("localStorage", { getItem: () => language });
      const card = createCard(100090011);
      card.kind = "fusion";
      card.procedure = {
        ...card.procedure,
        mode: "fusion",
        fusionSlots: [
          { kind: "filter", filter: { effect: true }, min: 2, max: 3 },
        ],
      };
      const project = { ...createProject(), cards: [card] };
      const html = renderToStaticMarkup(
        createElement(I18nProvider, {
          children: createElement(SummonProcedureEditor, {
            card,
            project,
            onChange: vi.fn(),
          }),
        }),
      );
      expect(html).toContain(translate("可视化召唤手续", language));
      expect(html).toContain(translate("添加素材槽", language));
      expect(html).toContain(translate("怪兽效果类型", language));
    },
  );
});
