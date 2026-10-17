import { describe, expect, it } from "vitest";
import type { YGOProTest } from "ygopro-jstest";
import { createCard, createEffect } from "../src/domain/model";
import { defaultSummoning } from "../src/domain/summon-procedures";
import {
  activateFromHand,
  C,
  core,
  coreAvailable,
  createCoreHarness,
} from "./helpers/core-harness";
const {
  SlientAdvancor,
  SelectCardAdvancor,
  SummonPlaceAdvancor,
  YGOProMsgSelectIdleCmd,
} = core;
function monster(code: number, level = 4) {
  const c = createCard(code);
  c.kind = "normal";
  c.level = level;
  c.name = `Summon material ${code}`;
  return c;
}
function spell(kind: "fusion" | "ritual", code: number) {
  const c = createCard(code);
  c.kind = "spell";
  c.name = `Summon spell ${code}`;
  if (kind === "ritual") c.subtype = "ritual";
  const b = createEffect("summoning", c);
  b.summoning = defaultSummoning(kind);
  c.effects = [b];
  return c;
}
function onField(
  ygo: YGOProTest,
  code: number,
  location: number = C.LOCATION_MZONE,
) {
  return ygo.getFieldCard(0, location).some((c) => c.code === code);
}

describe.skipIf(!coreAvailable)("visual summoning in the real core", () => {
  const run = createCoreHarness("summon");
  it("performs a Fusion Summon using a named hand material and a filtered grave material", async () => {
    const magic = spell("fusion", 100042001),
      a = monster(100042002),
      b = monster(100042003),
      fusion = monster(100042004, 8);
    b.attribute = "dark";
    fusion.kind = "fusion";
    fusion.procedure = {
      ...fusion.procedure,
      mode: "fusion",
      fusionSlots: [
        { kind: "code", code: a.code, filter: {}, min: 1, max: 1 },
        { kind: "filter", filter: { attribute: "dark" }, min: 1, max: 2 },
      ],
    };
    magic.effects[0].summoning!.materialSource = "hand-field-grave";
    await run([magic, a, b, fusion], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_HAND },
        { code: b.code, location: C.LOCATION_GRAVE },
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      activateFromHand(ygo, magic.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor(
          { code: fusion.code },
          { code: a.code },
          { code: b.code },
        ),
        SlientAdvancor(),
      );
      expect(onField(ygo, fusion.code)).toBe(true);
      expect(onField(ygo, a.code, C.LOCATION_GRAVE)).toBe(true);
      expect(onField(ygo, b.code, C.LOCATION_REMOVED)).toBe(true);
    });
  });
  it("performs an exact-level Ritual Summon with a filtered hand material", async () => {
    const magic = spell("ritual", 100042011),
      a = monster(100042012, 8),
      ritual = monster(100042013, 8);
    ritual.kind = "ritual";
    ritual.hasEffect = false;
    Object.assign(magic.effects[0].summoning!, {
      ritualComparison: "equal",
      materialSource: "hand",
      monsterFilter: { codes: [ritual.code] },
      materialFilter: { codes: [a.code] },
    });
    await run([magic, a, ritual], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_HAND },
        { code: ritual.code, location: C.LOCATION_HAND },
      ]);
      activateFromHand(ygo, magic.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor({ code: ritual.code }, { code: a.code }),
        SlientAdvancor(),
      );
      expect(onField(ygo, ritual.code)).toBe(true);
      expect(onField(ygo, a.code, C.LOCATION_GRAVE)).toBe(true);
    });
  });
  it("performs a two-Tuner Synchro procedure with separate material filters", async () => {
    const a = monster(100042021, 2),
      b = monster(100042022, 2),
      other = monster(100042023, 4),
      synchro = monster(100042024, 8);
    a.tuner = true;
    b.tuner = true;
    a.setcodes = [0x123];
    b.setcodes = [0x123];
    other.attribute = "dark";
    synchro.kind = "synchro";
    synchro.procedure = {
      ...synchro.procedure,
      mode: "synchro",
      min: 3,
      max: 3,
      tunerCount: 2,
      tunerFilter: { setcode: 0x123 },
      nonTunerFilter: { attribute: "dark" },
    };
    await run([a, b, other, synchro], (ygo) => {
      ygo.addCard([
        ...[a, b, other].map((c) => ({
          code: c.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        })),
        {
          code: synchro.code,
          location: C.LOCATION_EXTRA,
          position: C.POS_FACEDOWN_DEFENSE,
        },
      ]);
      ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
        const c = ygo.getFieldCard(0, C.LOCATION_EXTRA)[0];
        expect(c.canSpecialSummon()).toBe(true);
        return c.specialSummon();
      });
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor(
          { code: a.code },
          { code: b.code },
          { code: other.code },
        ),
        SlientAdvancor(),
      );
      expect(onField(ygo, synchro.code)).toBe(true);
      expect(ygo.getFieldCard(0, C.LOCATION_GRAVE)).toHaveLength(3);
    });
  });
  it("allows an alternative Xyz Summon on an eligible face-up Xyz Monster", async () => {
    const base = monster(100042031, 3),
      rankup = monster(100042032, 5);
    base.kind = "xyz";
    base.procedure = { ...base.procedure, mode: "xyz", materialLevel: 3 };
    rankup.kind = "xyz";
    rankup.procedure = {
      ...rankup.procedure,
      mode: "xyz",
      materialLevel: 5,
      xyzAlternative: { filter: { codes: [base.code] }, description: 1165 },
    };
    await run([base, rankup], (ygo) => {
      ygo.addCard([
        {
          code: base.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        },
        { code: rankup.code, location: C.LOCATION_EXTRA },
      ]);
      ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
        const c = ygo.getFieldCard(0, C.LOCATION_EXTRA)[0];
        expect(c.canSpecialSummon()).toBe(true);
        return c.specialSummon();
      });
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor({ code: base.code }),
        SlientAdvancor(),
      );
      expect(onField(ygo, rankup.code)).toBe(true);
      expect(onField(ygo, base.code)).toBe(false);
    });
  });
  it("rejects an exact-level Ritual Summon when only excessive materials are available", async () => {
    const magic = spell("ritual", 100042041),
      a = monster(100042042, 9),
      ritual = monster(100042043, 8);
    ritual.kind = "ritual";
    ritual.hasEffect = false;
    Object.assign(magic.effects[0].summoning!, {
      ritualComparison: "equal",
      materialSource: "hand",
      monsterFilter: { codes: [ritual.code] },
    });
    await run([magic, a, ritual], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_HAND },
        { code: ritual.code, location: C.LOCATION_HAND },
      ]);
      ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_HAND)
            .find((c) => c.code === magic.code)!
            .canActivate(),
        ).toBe(false);
      });
    });
  });
  it("banishes an explicitly enabled graveyard Ritual material", async () => {
    const magic = spell("ritual", 100042051),
      material = monster(100042052, 8),
      ritual = monster(100042053, 8);
    ritual.kind = "ritual";
    ritual.hasEffect = false;
    Object.assign(magic.effects[0].summoning!, {
      materialSource: "hand-field-grave",
      materialFilter: { codes: [material.code] },
    });
    await run([magic, material, ritual], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: material.code, location: C.LOCATION_GRAVE },
        { code: ritual.code, location: C.LOCATION_HAND },
      ]);
      activateFromHand(ygo, magic.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor({ code: ritual.code }, { code: material.code }),
        SlientAdvancor(),
      );
      expect(onField(ygo, ritual.code)).toBe(true);
      expect(onField(ygo, material.code, C.LOCATION_REMOVED)).toBe(true);
    });
  });
  it("rejects a Link Summon when one material fails its attribute filter", async () => {
    const a = monster(100042061),
      b = monster(100042062),
      link = monster(100042063, 2);
    a.attribute = "dark";
    b.attribute = "light";
    link.kind = "link";
    link.linkMarkers = [1, 4];
    link.procedure = {
      ...link.procedure,
      mode: "link",
      materialFilter: { attribute: "dark" },
    };
    await run([a, b, link], (ygo) => {
      ygo.addCard([
        {
          code: a.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        },
        {
          code: b.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        },
        { code: link.code, location: C.LOCATION_EXTRA },
      ]);
      ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
        expect(
          ygo.getFieldCard(0, C.LOCATION_EXTRA)[0].canSpecialSummon(),
        ).toBe(false);
      });
    });
  });
  it("rejects an alternative Xyz route when the material is not an Xyz Monster", async () => {
    const material = monster(100042071, 3),
      xyz = monster(100042072, 5);
    xyz.kind = "xyz";
    xyz.procedure = {
      ...xyz.procedure,
      mode: "xyz",
      materialLevel: 5,
      xyzAlternative: { filter: { codes: [material.code] }, description: 1165 },
    };
    await run([material, xyz], (ygo) => {
      ygo.addCard([
        {
          code: material.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        },
        { code: xyz.code, location: C.LOCATION_EXTRA },
      ]);
      ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
        expect(
          ygo.getFieldCard(0, C.LOCATION_EXTRA)[0].canSpecialSummon(),
        ).toBe(false);
      });
    });
  });
});
