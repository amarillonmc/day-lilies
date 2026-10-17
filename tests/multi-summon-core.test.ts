import { describe, expect, it } from "vitest";
import { createCard, createEffect, createOperation } from "../src/domain/model";
import {
  activateFromHand,
  C,
  core,
  coreAvailable,
  createCoreHarness,
} from "./helpers/core-harness";
const { SlientAdvancor, SelectCardAdvancor, SummonPlaceAdvancor } = core;
function fixture() {
  const magic = createCard(100053001),
    a = createCard(100053002),
    b = createCard(100053003),
    watcher = createCard(100053004);
  magic.kind = "spell";
  a.kind = b.kind = "normal";
  const summon = createOperation("revive");
  summon.amount = 2;
  magic.effects = [createEffect("sequence", magic)];
  magic.effects[0].operations = [summon];
  watcher.effects = [createEffect("custom-effect", watcher)];
  watcher.effects[0].advanced = {
    type: "EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS",
    code: "EVENT_SPSUMMON_SUCCESS",
    range: "LOCATION_MZONE",
    operation: "e:GetHandler():RegisterFlagEffect(id,0,0,1,eg:GetCount())",
  };
  return { magic, a, b, watcher, summon };
}
const field = (code: number) => ({
  code,
  location: C.LOCATION_MZONE,
  position: C.POS_FACEUP_ATTACK,
});
const grave = (code: number) => ({ code, location: C.LOCATION_GRAVE });
const restrict =
  "local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetCode(59822133) e:SetTargetRange(1,0) Duel.RegisterEffect(e,0)";

describe.skipIf(!coreAvailable)(
  "simultaneous Special Summons in the real core",
  () => {
    const run = createCoreHarness("multi-summon");
    it("summons both targets in one success event and returns both for a later step", async () => {
      const { magic, a, b, watcher, summon } = fixture();
      const boost = createOperation("boost");
      boost.selection = "result";
      boost.reference = summon.uid;
      boost.source = "monster";
      boost.players = "self";
      boost.attack = 300;
      boost.defense = 0;
      magic.effects[0].operations!.push(boost);
      await run([magic, a, b, watcher], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
          field(watcher.code),
        ]);
        activateFromHand(ygo, magic.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: a.code }, { code: b.code }),
          SlientAdvancor(),
        );
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_MZONE)
            .filter((c) => c.code !== watcher.code)
            .map((c) => c.attack),
        ).toEqual([a.attack + 300, b.attack + 300]);
        expect(
          ygo.evaluate(
            `return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${watcher.code}):GetFirst():GetFlagEffectLabel(${watcher.code})`,
          ),
        ).toBe(2);
        expect(
          ygo.evaluate(
            `return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${watcher.code}):GetFirst():GetFlagEffect(${watcher.code})`,
          ),
        ).toBe(1);
      });
    });
    it("does not activate a mandatory two-monster summon with only one free zone", async () => {
      const { magic, a, b } = fixture();
      await run([magic, a, b], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
          ...Array.from({ length: 4 }, () => field(a.code)),
        ]);
        ygo.advance(SlientAdvancor()).state(core.YGOProMsgSelectIdleCmd, () => {
          expect(ygo.getFieldCard(0, C.LOCATION_HAND)[0].canActivate()).toBe(
            false,
          );
        });
      });
    });
    it("does not activate a mandatory two-monster summon under the one-at-a-time restriction", async () => {
      const { magic, a, b, watcher } = fixture();
      watcher.effects[0].advanced = {
        type: "EFFECT_TYPE_FIELD",
        code: "59822133",
        range: "LOCATION_MZONE",
        property: "EFFECT_FLAG_PLAYER_TARGET",
        targetRange: [1, 0],
      };
      await run([magic, a, b, watcher], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
          field(watcher.code),
        ]);
        ygo.advance(SlientAdvancor()).state(core.YGOProMsgSelectIdleCmd, () => {
          expect(ygo.getFieldCard(0, C.LOCATION_HAND)[0].canActivate()).toBe(
            false,
          );
        });
      });
    });
    it("does not reduce a multi-target summon to one if the one-at-a-time restriction starts on the chain", async () => {
      const { magic, a, b } = fixture();
      await run([magic, a, b], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
        ]);
        activateFromHand(ygo, magic.code);
        ygo
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: a.code }, { code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, () => {
            ygo.evaluate(restrict);
          })
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: b.code }),
            SlientAdvancor(),
          );
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
        expect(
          ygo.getFieldCard(0, C.LOCATION_GRAVE).some((c) => c.code === a.code),
        ).toBe(true);
        expect(
          ygo.getFieldCard(0, C.LOCATION_GRAVE).some((c) => c.code === b.code),
        ).toBe(true);
      });
    });
    it("rechecks each target's summoning legality and only returns successful cards", async () => {
      const { magic, a, b } = fixture();
      const boost = createOperation("boost");
      boost.selection = "previous";
      boost.source = "monster";
      boost.players = "self";
      boost.attack = 300;
      boost.defense = 0;
      magic.effects[0].operations!.push(boost);
      await run([magic, a, b], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
        ]);
        activateFromHand(ygo, magic.code);
        ygo
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: a.code }, { code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, () => {
            ygo.evaluate(
              `local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${a.code}):GetFirst() local e=Effect.CreateEffect(c) e:SetType(EFFECT_TYPE_SINGLE) e:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON) c:RegisterEffect(e)`,
            );
          })
          .advance(SummonPlaceAdvancor(), SlientAdvancor());
        expect(
          ygo.getFieldCard(0, C.LOCATION_MZONE).map((c) => c.code),
        ).toEqual([b.code]);
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)[0].attack).toBe(
          b.attack + 300,
        );
      });
    });
    it("offers a surviving target subset when the chain consumes one of the free zones", async () => {
      const { magic, a, b } = fixture();
      await run([magic, a, b], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
          ...Array.from({ length: 3 }, () => field(a.code)),
        ]);
        activateFromHand(ygo, magic.code);
        ygo
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: a.code }, { code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, () => {
            ygo.addCard(field(a.code));
          })
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: b.code }),
            SlientAdvancor(),
          );
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(5);
        expect(
          ygo.getFieldCard(0, C.LOCATION_MZONE).some((c) => c.code === b.code),
        ).toBe(true);
        expect(
          ygo.getFieldCard(0, C.LOCATION_GRAVE).some((c) => c.code === a.code),
        ).toBe(true);
      });
    });
    it("uses the configured cap when summoning a previous result group", async () => {
      const { magic, a, b, summon } = fixture();
      const mill = createOperation("mill");
      mill.amount = 2;
      mill.filter.codes = [a.code, b.code];
      summon.selection = "result";
      summon.reference = mill.uid;
      summon.amount = 1;
      magic.effects[0].operations = [mill, summon];
      await run([magic, a, b], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          { code: a.code, location: C.LOCATION_DECK },
          { code: b.code, location: C.LOCATION_DECK },
        ]);
        activateFromHand(ygo, magic.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor(
            { code: a.code },
            { code: b.code },
            { code: a.code },
          ),
          SlientAdvancor(),
        );
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)[0].code).toBe(a.code);
      });
    });
    it("keeps all-group summoning atomic if a chain introduces a one-at-a-time restriction", async () => {
      const { magic, a, b, summon } = fixture();
      summon.selection = "all";
      await run([magic, a, b], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
        ]);
        activateFromHand(ygo, magic.code);
        ygo
          .advance(SummonPlaceAdvancor())
          .state(core.YGOProMsgSelectChain, () => {
            ygo.evaluate(restrict);
          })
          .advance(SummonPlaceAdvancor(), SlientAdvancor());
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_GRAVE)
            .filter((c) => c.code !== magic.code),
        ).toHaveLength(2);
      });
    });
    it("supports face-down Defense Position for a simultaneous group", async () => {
      const { magic, a, b, summon } = fixture();
      summon.selection = "select";
      summon.position = "facedown-defense";
      await run([magic, a, b], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          grave(a.code),
          grave(b.code),
        ]);
        activateFromHand(ygo, magic.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: a.code }, { code: b.code }),
          SlientAdvancor(),
        );
        expect(
          ygo.getFieldCard(0, C.LOCATION_MZONE).map((c) => c.position),
        ).toEqual([C.POS_FACEDOWN_DEFENSE, C.POS_FACEDOWN_DEFENSE]);
      });
    });
  },
);
