import { describe, expect, it } from "vitest";
import { createCard, createEffect, createOperation } from "../src/domain/model";
import { defaultSummoning } from "../src/domain/summon-procedures";
import {
  activateFromHand,
  C,
  core,
  coreAvailable,
  createCoreHarness,
} from "./helpers/core-harness";
const { SlientAdvancor, SelectCardAdvancor, SummonPlaceAdvancor } = core;

function fixture(kind: "fusion" | "ritual" = "fusion") {
  const magic = createCard(100052001),
    a = createCard(100052002),
    b = createCard(100052003),
    boss = createCard(100052004);
  magic.kind = "spell";
  a.kind = b.kind = "normal";
  boss.kind = kind;
  boss.level = 8;
  if (kind === "fusion")
    boss.procedure = {
      ...boss.procedure,
      mode: "fusion",
      materialCodes: [a.code, b.code],
    };
  else {
    a.level = 8;
    magic.subtype = "ritual";
    boss.hasEffect = false;
  }
  const summon = createOperation("summoning");
  summon.summoning = {
    ...defaultSummoning(kind),
    monsterFilter: { codes: [boss.code] },
    materialSource: "hand",
    ritualComparison: "equal",
  };
  magic.effects = [createEffect("sequence", magic)];
  magic.effects[0].operations = [summon];
  return { magic, a, b, boss, summon };
}

describe.skipIf(!coreAvailable)("summoning steps in the real core", () => {
  const run = createCoreHarness("sequence-summoning");
  it.each(["fusion", "ritual"] as const)(
    "reuses the actual %s summoned monster after an intervening step",
    async (kind) => {
      const { magic, a, b, boss, summon } = fixture(kind);
      const damage = createOperation("damage"),
        boost = createOperation("boost");
      boost.selection = "result";
      boost.reference = summon.uid;
      boost.source = "monster";
      boost.players = "self";
      boost.attack = 500;
      boost.defense = 0;
      magic.effects[0].operations!.push(damage, boost);
      await run([magic, a, b, boss], (ygo) => {
        ygo.addCard([
          { code: magic.code, location: C.LOCATION_HAND },
          { code: a.code, location: C.LOCATION_HAND },
          ...(kind === "fusion"
            ? [{ code: b.code, location: C.LOCATION_HAND }]
            : []),
          {
            code: boss.code,
            location: kind === "fusion" ? C.LOCATION_EXTRA : C.LOCATION_HAND,
          },
        ]);
        activateFromHand(ygo, magic.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor(
            { code: boss.code },
            { code: a.code },
            { code: b.code },
          ),
          SlientAdvancor(),
        );
        const summoned = ygo
          .getFieldCard(0, C.LOCATION_MZONE)
          .find((c) => c.code === boss.code);
        expect(summoned?.attack).toBe(boss.attack + 500);
        expect(
          ygo.getFieldCard(0, C.LOCATION_GRAVE).some((c) => c.code === a.code),
        ).toBe(true);
        expect(
          ygo.evaluate(
            `return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${boss.code}):GetFirst():IsSummonType(SUMMON_TYPE_${kind.toUpperCase()})`,
          ),
        ).toBe(true);
      });
    },
  );
  it("allows a preceding search to provide Fusion material at resolution", async () => {
    const { magic, a, b, boss, summon } = fixture();
    const search = createOperation("search");
    search.filter.codes = [a.code];
    summon.next = "if-success";
    magic.effects[0].operations = [search, summon];
    await run([magic, a, b, boss], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_DECK },
        { code: b.code, location: C.LOCATION_HAND },
        { code: boss.code, location: C.LOCATION_EXTRA },
      ]);
      activateFromHand(ygo, magic.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor(
          { code: a.code },
          { code: boss.code },
          { code: a.code },
          { code: b.code },
        ),
        SlientAdvancor(),
      );
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE).map((c) => c.code)).toEqual([
        boss.code,
      ]);
    });
  });
  it("does not reuse stale material results when Fusion becomes impossible", async () => {
    const { magic, a, b, boss, summon } = fixture();
    const send = createOperation("send-grave"),
      fallback = createOperation("damage");
    send.selection = "select";
    send.source = "hand";
    send.players = "self";
    send.filter.codes = [a.code];
    summon.next = "if-success";
    fallback.next = "if-failed";
    magic.effects[0].operations = [send, summon, fallback];
    await run([magic, a, b, boss], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_HAND },
        { code: b.code, location: C.LOCATION_HAND },
        { code: boss.code, location: C.LOCATION_EXTRA },
      ]);
      activateFromHand(ygo, magic.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor({ code: a.code }),
        SlientAdvancor(),
      );
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
      expect(ygo.getFieldCard(0, C.LOCATION_EXTRA).map((c) => c.code)).toEqual([
        boss.code,
      ]);
      expect(ygo.evaluate("return Duel.GetLP(1)")).toBe(7200);
    });
  });
  it("rejects activation of a mandatory Fusion step without legal materials", async () => {
    const { magic, a, b, boss } = fixture();
    await run([magic, a, b, boss], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_HAND },
        { code: boss.code, location: C.LOCATION_EXTRA },
      ]);
      ygo.advance(SlientAdvancor()).state(core.YGOProMsgSelectIdleCmd, () => {
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_HAND)
            .find((c) => c.code === magic.code)!
            .canActivate(),
        ).toBe(false);
      });
    });
  });
  it("preserves aggregated metadata for Fusion and a later normal Special Summon", async () => {
    const { magic, a, b, boss, summon } = fixture();
    const revive = createOperation("revive");
    revive.selection = "result";
    revive.reference = summon.uid;
    magic.effects[0].operations!.push(revive);
    await run([magic, a, b, boss], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_HAND },
        { code: b.code, location: C.LOCATION_HAND },
        { code: boss.code, location: C.LOCATION_EXTRA },
      ]);
      activateFromHand(ygo, magic.code);
      ygo
        .advance(SummonPlaceAdvancor())
        .state(core.YGOProMsgSelectChain, () => {
          expect(
            ygo.evaluate(
              "local ok,g,n,p,loc=Duel.GetOperationInfo(1,CATEGORY_SPECIAL_SUMMON) return ok and not g and n==0 and loc==(LOCATION_EXTRA|LOCATION_GRAVE)",
            ),
          ).toBe(true);
          expect(
            ygo.evaluate(
              "local ok,g,n,p,loc=Duel.GetOperationInfo(1,CATEGORY_FUSION_SUMMON) return ok and n==1 and loc==LOCATION_EXTRA",
            ),
          ).toBe(true);
        })
        .advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor(
            { code: boss.code },
            { code: a.code },
            { code: b.code },
          ),
          SlientAdvancor(),
        );
    });
  });
  it("captures a Fusion Summon performed through Chain Material", async () => {
    const { magic, a, b, boss, summon } = fixture();
    const chain = createCard(100052005);
    chain.effects = [createEffect("custom-effect", chain)];
    chain.effects[0].advanced = {
      type: "EFFECT_TYPE_FIELD",
      code: "EFFECT_CHAIN_MATERIAL",
      property: "EFFECT_FLAG_PLAYER_TARGET",
      range: "LOCATION_MZONE",
      targetRange: [1, 0],
      value: "aux.TRUE",
      target:
        "return Duel.GetMatchingGroup(Card.IsType,tp,LOCATION_DECK,0,nil,TYPE_MONSTER)",
      operation:
        "tc:SetMaterial(mat) Duel.Remove(mat,POS_FACEUP,REASON_EFFECT+REASON_MATERIAL+REASON_FUSION) Duel.BreakEffect() Duel.SpecialSummon(tc,SUMMON_TYPE_FUSION,tp,tp,false,false,POS_FACEUP)",
      callbackArgs: { target: "e,te,tp", operation: "e,te,tp,tc,mat" },
    };
    const boost = createOperation("boost");
    boost.selection = "result";
    boost.reference = summon.uid;
    boost.source = "monster";
    boost.attack = 500;
    boost.defense = 0;
    magic.effects[0].operations!.push(boost);
    await run([magic, a, b, boss, chain], (ygo) => {
      ygo.addCard([
        { code: magic.code, location: C.LOCATION_HAND },
        { code: a.code, location: C.LOCATION_DECK },
        { code: b.code, location: C.LOCATION_DECK },
        { code: boss.code, location: C.LOCATION_EXTRA },
        {
          code: chain.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        },
      ]);
      activateFromHand(ygo, magic.code);
      ygo.advance(
        SummonPlaceAdvancor(),
        SelectCardAdvancor(
          { code: boss.code },
          { code: a.code },
          { code: b.code },
        ),
        SlientAdvancor(),
      );
      expect(
        ygo.getFieldCard(0, C.LOCATION_MZONE).find((c) => c.code === boss.code)
          ?.attack,
      ).toBe(boss.attack + 500);
      expect(ygo.getFieldCard(0, C.LOCATION_REMOVED)).toHaveLength(2);
    });
  });
});
