import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, expect, it } from "vitest";
import luaparse from "luaparse";
import { ReferenceStore } from "../server/references";

// Optional integration evidence against managed data, never sibling repositories.
// A clean checkout without a synced cache skips this test; sync then rerun to verify it.
const directory = resolve(
  process.env.DAY_LILIES_REFERENCE_CACHE ?? ".data/references",
);
describe.skipIf(!existsSync(join(directory, "manifest.json")))(
  "managed OCG reference cache (read only)",
  () => {
    const references = new ReferenceStore(directory);
    it("loads multilingual text, numeric/name searches and matching Lua files", async () => {
      const manifest = await references.manifest();
      expect(manifest?.count).toBeGreaterThan(10000);
      expect(manifest?.languages).toEqual(
        expect.arrayContaining(["sc", "en", "jp"]),
      );
      for (const language of ["sc", "en", "jp"]) {
        const card = await references.get(32807846, language);
        expect(card?.name).toBeTruthy();
        expect(card?.text).toBeTruthy();
        expect(card?.script).toContain("Duel.SendtoHand");
        expect(() =>
          luaparse.parse(card!.script!, { luaVersion: "5.3" }),
        ).not.toThrow();
        expect((await references.search("32807846", language))[0]?.code).toBe(
          32807846,
        );
        expect((await references.search(card!.name, language))[0]?.code).toBe(
          32807846,
        );
      }
      expect(
        (await references.search("Reinforcement of the Army", "en"))[0]?.code,
      ).toBe(32807846);
    });

    it("supplies real core and helper names and default BYOK examples", async () => {
      const inventory = await references.apiSummary();
      expect(inventory).toContain("Duel.SelectMatchingCard");
      expect(inventory).toContain("Auxiliary.AddLinkProcedure");
      expect(inventory).toContain("EFFECT_CHANGE_LINK_MARKER_KOISHI");
      for (const code of [32807846, 83764718, 55144522]) {
        const card = await references.get(code, "en");
        expect(card?.script).toContain("initial_effect");
        expect(() =>
          luaparse.parse(card!.script!, { luaVersion: "5.3" }),
        ).not.toThrow();
      }
    });
  },
);
