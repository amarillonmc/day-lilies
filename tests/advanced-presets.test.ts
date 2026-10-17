import { describe, expect, it } from "vitest";
import { ADVANCED_EFFECT_PRESETS } from "../src/domain/advanced-presets";
import { compileCard, validateProject } from "../src/domain/compiler";
import { createCard, createEffect, createProject } from "../src/domain/model";
import { parseNativeProject } from "../src/io/project-schema";

describe("editable ongoing-effect presets", () => {
  it.each(ADVANCED_EFFECT_PRESETS)(
    "compiles and roundtrips $id without changing source text",
    (preset) => {
      const card = createCard(100032001);
      card.name = "Author's name";
      card.text = "Original text 原文";
      const block = createEffect("custom-effect", card);
      block.advanced = structuredClone(preset.config);
      card.effects = [block];
      const project = {
        ...createProject(),
        cards: [card],
        target: preset.requiredCore ?? ("ygopro" as const),
      };
      const output = compileCard(card, project);
      expect(
        output.diagnostics.filter((issue) => issue.severity === "error"),
      ).toEqual([]);
      expect(output.lua).toContain(preset.config.code);
      expect(
        parseNativeProject(JSON.parse(JSON.stringify(project))).cards[0],
      ).toEqual(card);
      expect(card.text).toBe("Original text 原文");
      if (preset.requiredCore === "koishipro") {
        const official = { ...project, target: "ygopro" as const };
        expect(compileCard(card, official).lua).toBe("");
        expect(
          validateProject(official).some(
            (issue) =>
              issue.severity === "error" && issue.message.includes("KoishiPRO"),
          ),
        ).toBe(true);
      }
    },
  );
});
