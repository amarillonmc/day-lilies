import { describe, expect, it } from "vitest";
import type { YGOProTest } from "ygopro-jstest";
import {
  createCard,
  createEffect,
  createOperation,
  type Card,
} from "../src/domain/model";
import {
  defaultContactFusion,
  defaultSummoning,
} from "../src/domain/summon-procedures";
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
function material(code: number) {
  const card = createCard(code);
  card.kind = "normal";
  card.name = `Contact material ${code}`;
  return card;
}
function fixture() {
  const a = material(100045002),
    b = material(100045003),
    fusion = material(100045001);
  fusion.kind = "fusion";
  fusion.procedure.mode = "fusion";
  fusion.procedure.materialCodes = [a.code, b.code];
  fusion.procedure.contactFusion = defaultContactFusion();
  return { fusion, a, b };
}
function field(
  card: Card,
  controller = 0,
  position: number = C.POS_FACEUP_ATTACK,
) {
  return { code: card.code, location: C.LOCATION_MZONE, controller, position };
}
function summon(ygo: YGOProTest, fusion: Card, ...materials: Card[]) {
  ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
    const c = ygo
      .getFieldCard(0, C.LOCATION_EXTRA)
      .find((c) => c.code === fusion.code)!;
    expect(c.canSpecialSummon()).toBe(true);
    return c.specialSummon();
  });
  ygo.advance(
    SummonPlaceAdvancor(),
    SelectCardAdvancor(...materials.map((c) => ({ code: c.code }))),
    SlientAdvancor(),
  );
  expect(
    ygo.getFieldCard(0, C.LOCATION_MZONE).some((c) => c.code === fusion.code),
  ).toBe(true);
}
function denyPayment(card: Card, code: string) {
  card.kind = "effect";
  card.scriptMode = "custom";
  card.customLua = `local s,id=GetID()
function s.initial_effect(c)
 local e=Effect.CreateEffect(c)
 e:SetType(EFFECT_TYPE_SINGLE)
 e:SetCode(${code})
 e:SetValue(1)
 c:RegisterEffect(e)
end`;
}

describe.skipIf(!coreAvailable)("Contact Fusion in the real core", () => {
  const run = createCoreHarness("contact-fusion");
  it.each([
    ["to-deck", C.LOCATION_DECK],
    ["banish", C.LOCATION_REMOVED],
    ["send-grave", C.LOCATION_GRAVE],
    ["release", C.LOCATION_GRAVE],
  ] as const)(
    "pays %s materials and records a non-Fusion Special Summon",
    async (materialAction, destination) => {
      const { fusion, a, b } = fixture();
      fusion.procedure.contactFusion!.materialAction = materialAction;
      await run([fusion, a, b], (ygo) => {
        ygo.addCard([
          field(a),
          field(b),
          { code: fusion.code, location: C.LOCATION_EXTRA },
        ]);
        summon(ygo, fusion, a, b);
        expect(
          ygo
            .getFieldCard(0, destination)
            .map((c) => c.code)
            .sort(),
        ).toEqual([a.code, b.code]);
        expect(
          ygo.evaluate(
            `local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${fusion.code}):GetFirst() return c:GetSummonType()&SUMMON_TYPE_FUSION==SUMMON_TYPE_FUSION`,
          ),
        ).toBe(false);
        expect(
          ygo.evaluate(
            `local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${fusion.code}):GetFirst() return c:GetMaterialCount()`,
          ),
        ).toBe(2);
      });
    },
  );
  it("uses mixed hand, field and grave locations with banish payment", async () => {
    const { fusion, a, b } = fixture();
    Object.assign(fusion.procedure.contactFusion!, {
      materialAction: "banish",
      materialSource: "hand-field-grave",
    });
    await run([fusion, a, b], (ygo) => {
      ygo.addCard([
        { code: a.code, location: C.LOCATION_HAND },
        { code: b.code, location: C.LOCATION_GRAVE },
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      summon(ygo, fusion, a, b);
      expect(ygo.getFieldCard(0, C.LOCATION_REMOVED)).toHaveLength(2);
    });
  });
  it("uses an opponent's face-up material while retaining both controllers' destinations", async () => {
    const { fusion, a, b } = fixture();
    Object.assign(fusion.procedure.contactFusion!, {
      materialAction: "send-grave",
      materialPlayers: "both",
    });
    await run([fusion, a, b], (ygo) => {
      ygo.addCard([
        field(a),
        field(b, 1),
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      summon(ygo, fusion, a, b);
      expect(ygo.getFieldCard(0, C.LOCATION_GRAVE).map((c) => c.code)).toEqual([
        a.code,
      ]);
      expect(ygo.getFieldCard(1, C.LOCATION_GRAVE).map((c) => c.code)).toEqual([
        b.code,
      ]);
    });
  });
  it("can free a Monster Zone by paying materials when the main zones and Extra Monster Zone are occupied", async () => {
    const { fusion, a, b } = fixture();
    fusion.procedure.contactFusion!.materialAction = "send-grave";
    const filler = [
      material(100045004),
      material(100045005),
      material(100045006),
      material(100045007),
    ];
    filler[3].kind = "xyz";
    filler[3].procedure.mode = "xyz";
    await run([fusion, a, b, ...filler], (ygo) => {
      ygo.addCard([
        ...[a, b, ...filler].map((c, sequence) => ({ ...field(c), sequence })),
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      summon(ygo, fusion, a, b);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(5);
    });
  });
  it("rejects opponent-only materials when they cannot free a usable zone", async () => {
    const { fusion, a, b } = fixture();
    Object.assign(fusion.procedure.contactFusion!, {
      materialAction: "send-grave",
      materialPlayers: "opponent",
    });
    const filler = Array.from({ length: 6 }, (_, i) => material(100045010 + i));
    filler[5].kind = "xyz";
    filler[5].procedure.mode = "xyz";
    await run([fusion, a, b, ...filler], (ygo) => {
      ygo.addCard([
        ...filler.map((c, sequence) => ({ ...field(c), sequence })),
        field(a, 1),
        field(b, 1),
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
        expect(
          ygo.getFieldCard(0, C.LOCATION_EXTRA)[0].canSpecialSummon(),
        ).toBe(false);
      });
    });
  });
  it.each([
    ["to-deck", "EFFECT_CANNOT_TO_DECK"],
    ["banish", "EFFECT_CANNOT_REMOVE"],
    ["send-grave", "EFFECT_CANNOT_TO_GRAVE"],
    ["release", "EFFECT_UNRELEASABLE_NONSUM"],
  ] as const)(
    "rejects an unavailable %s payment",
    async (materialAction, denial) => {
      const { fusion, a, b } = fixture();
      fusion.procedure.contactFusion!.materialAction = materialAction;
      denyPayment(a, denial);
      await run([fusion, a, b], (ygo) => {
        ygo.addCard([
          field(a),
          field(b),
          { code: fusion.code, location: C.LOCATION_EXTRA },
        ]);
        ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
          expect(
            ygo.getFieldCard(0, C.LOCATION_EXTRA)[0].canSpecialSummon(),
          ).toBe(false);
        });
      });
    },
  );
  it.each([true, false])(
    "honors the face-up material requirement (%s)",
    async (faceup) => {
      const { fusion, a, b } = fixture();
      fusion.procedure.contactFusion!.faceup = faceup;
      await run([fusion, a, b], (ygo) => {
        ygo.addCard([
          field(a, 0, C.POS_FACEDOWN_DEFENSE),
          field(b),
          { code: fusion.code, location: C.LOCATION_EXTRA },
        ]);
        ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
          expect(
            ygo.getFieldCard(0, C.LOCATION_EXTRA)[0].canSpecialSummon(),
          ).toBe(!faceup);
        });
      });
    },
  );
  it("does not allow Fusion substitutes for the contact procedure", async () => {
    const { fusion, a, b } = fixture();
    const substitute = material(100045004);
    denyPayment(substitute, "EFFECT_FUSION_SUBSTITUTE");
    fusion.procedure.fusionSubstitute = true;
    await run([fusion, a, b, substitute], (ygo) => {
      ygo.addCard([
        field(substitute),
        field(b),
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
        expect(
          ygo.getFieldCard(0, C.LOCATION_EXTRA)[0].canSpecialSummon(),
        ).toBe(false);
      });
    });
  });
  it("still allows the configured Fusion substitute when using a normal Fusion effect", async () => {
    const { fusion, a, b } = fixture();
    const substitute = material(100045004),
      spell = createCard(100045005);
    denyPayment(substitute, "EFFECT_FUSION_SUBSTITUTE");
    fusion.procedure.fusionSubstitute = true;
    spell.kind = "spell";
    spell.effects = [createEffect("summoning", spell)];
    spell.effects[0].summoning = defaultSummoning("fusion");
    await run([fusion, a, b, substitute, spell], (ygo) => {
      ygo.addCard([
        field(substitute),
        field(b),
        { code: spell.code, location: C.LOCATION_HAND },
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      activateFromHand(ygo, spell.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor(
          { code: fusion.code },
          { code: substitute.code },
          { code: b.code },
        ),
        SlientAdvancor(),
      );
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE).map((c) => c.code)).toEqual([
        fusion.code,
      ]);
      expect(
        ygo.evaluate(
          `local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${fusion.code}):GetFirst() return c:GetSummonType()&SUMMON_TYPE_FUSION==SUMMON_TYPE_FUSION`,
        ),
      ).toBe(true);
    });
  });
  it("permits revival after the contact-only procedure has been completed", async () => {
    const { fusion, a, b } = fixture();
    fusion.procedure.contactFusion!.restriction = "contact-only";
    const spell = createCard(100045005);
    spell.kind = "spell";
    spell.effects = [createEffect("sequence", spell)];
    const destroy = createOperation("destroy"),
      revive = createOperation("revive");
    Object.assign(destroy, {
      players: "self",
      source: "monster",
      filter: { codes: [fusion.code] },
    });
    Object.assign(revive, {
      selection: "previous",
      source: "grave",
      next: "if-success",
    });
    spell.effects[0].operations = [destroy, revive];
    await run([fusion, a, b, spell], (ygo) => {
      ygo.addCard([
        field(a),
        field(b),
        { code: spell.code, location: C.LOCATION_HAND },
        { code: fusion.code, location: C.LOCATION_EXTRA },
      ]);
      summon(ygo, fusion, a, b);
      activateFromHand(ygo, spell.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor({ code: fusion.code }),
        SlientAdvancor(),
      );
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE).map((c) => c.code)).toEqual([
        fusion.code,
      ]);
      expect(
        ygo.evaluate(
          `local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${fusion.code}):GetFirst() return c:GetPreviousLocation()==LOCATION_GRAVE`,
        ),
      ).toBe(true);
    });
  });
  it.each(["contact-only", "contact-or-fusion"] as const)(
    "respects the %s restriction for ordinary Fusion effects",
    async (restriction) => {
      const { fusion, a, b } = fixture();
      fusion.procedure.contactFusion!.restriction = restriction;
      const spell = createCard(100045004);
      spell.kind = "spell";
      spell.effects = [createEffect("summoning", spell)];
      spell.effects[0].summoning = defaultSummoning("fusion");
      await run([fusion, a, b, spell], (ygo) => {
        ygo.addCard([
          field(a),
          field(b),
          { code: spell.code, location: C.LOCATION_HAND },
          { code: fusion.code, location: C.LOCATION_EXTRA },
        ]);
        ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
          expect(ygo.getFieldCard(0, C.LOCATION_HAND)[0].canActivate()).toBe(
            restriction === "contact-or-fusion",
          );
        });
      });
    },
  );
});
