import { describe, expect, it } from "vitest";
import {
  ENGINE_CAPABILITIES,
  ENGINE_EFFECT_CODES,
  ENGINE_EVENTS,
  ENGINE_PROPERTIES,
  KOISHI_CAPABILITIES,
  findUnsupportedCoreSymbols,
} from "../src/domain/engine-capabilities";

describe("engine capability catalog and target diagnostics", () => {
  it("includes searchable effect/event/property families with traceable sources", () => {
    expect(
      ENGINE_EFFECT_CODES.some((c) => c.id === "EFFECT_CANNOT_SPECIAL_SUMMON"),
    ).toBe(true);
    expect(ENGINE_EVENTS.some((c) => c.id === "EVENT_CHAINING")).toBe(true);
    expect(
      ENGINE_PROPERTIES.some((c) => c.id === "EFFECT_FLAG_PLAYER_TARGET"),
    ).toBe(true);
    expect(new Set(ENGINE_CAPABILITIES.map((c) => c.id)).size).toBe(
      ENGINE_CAPABILITIES.length,
    );
    expect(
      ENGINE_CAPABILITIES.every((c) =>
        c.source.startsWith("https://github.com/"),
      ),
    ).toBe(true);
  });
  it.each(KOISHI_CAPABILITIES)(
    "rejects named and literal $id effects only on official target",
    ({ id, code }) => {
      expect(findUnsupportedCoreSymbols(`e:SetCode(${id})`, "ygopro")).toEqual([
        id,
      ]);
      expect(
        findUnsupportedCoreSymbols(`e:SetCode(${code})`, "ygopro"),
      ).toEqual([id]);
      expect(
        findUnsupportedCoreSymbols(
          `e.SetCode(e,0x${code.toString(16)})`,
          "ygopro",
        ),
      ).toEqual([id]);
      expect(
        findUnsupportedCoreSymbols(`e:SetCode(${id})`, "koishipro"),
      ).toEqual([]);
    },
  );
  it("does not confuse user prose, comments or card IDs with engine effects", () => {
    expect(
      findUnsupportedCoreSymbols(
        `-- EFFECT_ADD_LINK_MARKER_KOISHI\nlocal text="EFFECT_MAP_OF_HEAVEN"\nlocal card=710253\nc:IsCode(37564151)\ne:SetDescription(77702007)`,
        "ygopro",
      ),
    ).toEqual([]);
    expect(
      findUnsupportedCoreSymbols(
        "--[[ EFFECT_CANNOT_LOSE_KOISHI ]]\nlocal text=[=[e:SetCode(710253)]=]",
        "ygopro",
      ),
    ).toEqual([]);
  });
  it("finds suffix-less Koishi constants and deduplicates repeated usage", () => {
    expect(
      findUnsupportedCoreSymbols(
        "e:SetCode(EFFECT_MAP_OF_HEAVEN)\nf:SetCode(77702007)",
        "ygopro",
      ),
    ).toEqual(["EFFECT_MAP_OF_HEAVEN"]);
  });
});
