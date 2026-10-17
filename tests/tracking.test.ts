import { describe, expect, it } from "vitest";
import luaparse from "luaparse";
import {
  createCard,
  createEffect,
  createOperation,
  createProject,
} from "../src/domain/model";
import {
  createTracking,
  emitTrackingFunctions,
  emitTrackingRegistration,
  isTemporaryBanish,
  validateTracking,
} from "../src/domain/tracking";
import { compileCard } from "../src/domain/compiler";
import { trackingTranslations } from "../src/trackingTranslations";
import { translate } from "../src/i18n";

describe("delayed card tracking", () => {
  it("binds explicit source IDs and the final configured step independently of reorder", () => {
    const block = createEffect("sequence");
    const first = createOperation("revive"),
      last = createOperation("banish");
    block.operations = [first, last];
    block.tracking = [createTracking(first.uid), createTracking("last")];
    expect(emitTrackingRegistration(block, 2, first.uid, "actual")).toEqual([
      "s.track3_1(e,tp,actual)",
    ]);
    expect(emitTrackingRegistration(block, 2, last.uid, "actual")).toEqual([
      "s.track3_2(e,tp,actual)",
    ]);
    block.operations.reverse();
    expect(emitTrackingRegistration(block, 2, first.uid, "actual")).toEqual([
      "s.track3_1(e,tp,actual)",
      "s.track3_2(e,tp,actual)",
    ]);
  });
  it("rejects dangling sources, scalar effects and duplicate temporary returns", () => {
    const block = createEffect("damage");
    block.tracking = [createTracking()];
    expect(validateTracking(block)).toContain(
      "延迟追踪只能引用会产生实际处理卡组的步骤。",
    );
    block.tracking[0].sourceStep = "deleted";
    expect(validateTracking(block)).toContain(
      "延迟追踪的来源步骤已不存在，请重新选择。",
    );
    const banish = createEffect("banish");
    banish.source = "field";
    banish.tracking = [
      { ...createTracking(), action: "return-temporary" },
      { ...createTracking(banish.uid), action: "return-temporary" },
    ];
    expect(validateTracking(banish)).toContain(
      "同一除外步骤只能配置一项暂时除外返回。",
    );
    expect(isTemporaryBanish(banish, banish.uid)).toBe(true);
    banish.source = "grave";
    expect(validateTracking(banish)).toContain(
      "暂时除外返回必须引用从场上除外的步骤。",
    );
  });
  it("accepts actual drawn cards and emits bounded cleanup without persistent groups", () => {
    const block = createEffect("draw");
    block.tracking = [createTracking()];
    expect(validateTracking(block)).toEqual([]);
    const lua = emitTrackingFunctions(block, 0).join("\n");
    expect(lua).toContain("if not operated or #operated==0 then return end");
    expect(lua).toContain("SetReset(RESET_PHASE+PHASE_END,lifetime)");
    expect(lua).toContain("e:Reset()");
    expect(lua).not.toContain("KeepAlive");
    expect(lua).not.toContain("EFFECT_FLAG_IGNORE_IMMUNE");
  });
  it("compiles every timing, action and chain mode to valid Lua", () => {
    const card = createCard(100030001);
    card.kind = "spell";
    const block = createEffect("banish", card);
    block.source = "monster";
    card.effects = [block];
    for (const phase of ["standby", "end"] as const) {
      for (const schedule of [
        "this-turn",
        "next-turn",
        "next-matching",
      ] as const) {
        for (const action of [
          "bounce",
          "to-deck",
          "destroy",
          "banish",
          "send-grave",
          "return-temporary",
        ] as const) {
          for (const resolution of ["continuous", "trigger"] as const) {
            block.tracking = [
              {
                ...createTracking(),
                phase,
                schedule,
                action,
                resolution,
                turnPlayer: "opponent",
              },
            ];
            const result = compileCard(card, {
              ...createProject(),
              cards: [card],
            });
            expect(
              result.diagnostics.filter((d) => d.severity === "error"),
            ).toEqual([]);
            expect(() =>
              luaparse.parse(result.lua, { luaVersion: "5.3" }),
            ).not.toThrow();
            expect(result.lua).toContain("s.track1_1(e,tp,previous)");
            expect(result.lua).toContain(
              resolution === "trigger"
                ? "EFFECT_TYPE_TRIGGER_F"
                : "EFFECT_TYPE_CONTINUOUS",
            );
            if (action === "return-temporary")
              expect(result.lua).toContain("REASON_EFFECT+REASON_TEMPORARY");
          }
        }
      }
    }
  });
  it("translates every tracking message into English and Japanese", () => {
    for (const [source, translations] of Object.entries(trackingTranslations)) {
      expect(translate(source, "en")).toBe(translations[0]);
      expect(translate(source, "ja")).toBe(translations[1]);
    }
  });
});
