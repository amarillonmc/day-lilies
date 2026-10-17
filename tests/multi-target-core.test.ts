import { describe, expect, it } from "vitest";
import {
  createCard,
  createEffect,
  createOperation,
  type Card,
} from "../src/domain/model";
import {
  core,
  C,
  coreAvailable,
  createCoreHarness,
  activateFromHand,
} from "./helpers/core-harness";
const { SlientAdvancor, SummonPlaceAdvancor, SelectCardAdvancor } = core;

function fixture() {
  const card = createCard(100040001);
  card.kind = "spell";
  card.effects = [createEffect("sequence", card)];
  const a = createCard(100040002),
    b = createCard(100040003);
  a.kind = b.kind = "normal";
  return { card, a, b };
}
const field = (card: Card, controller = 1) => ({
  code: card.code,
  controller,
  location: C.LOCATION_MZONE,
  position: C.POS_FACEUP_ATTACK,
});

describe.skipIf(!coreAvailable)(
  "multi-target allocation in the real core",
  () => {
    const run = createCoreHarness("multi-targets");

    it("reports all same-category target groups to chained response observers", async () => {
      const { card, a, b } = fixture();
      const first = createOperation("destroy"),
        second = createOperation("destroy");
      first.players = second.players = "opponent";
      first.source = second.source = "monster";
      card.effects[0].operations = [first, second];
      await run([card, a, b], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a),
          field(b),
        ]);
        activateFromHand(ygo, card.code);
        ygo
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: a.code }),
            SelectCardAdvancor({ code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, () => {
            expect(
              ygo.evaluate(
                `local ok,g,count=Duel.GetOperationInfo(1,CATEGORY_DESTROY) return ok and count==2 and g and #g==2 and g:IsExists(Card.IsCode,1,nil,${a.code}) and g:IsExists(Card.IsCode,1,nil,${b.code})`,
              ),
            ).toBe(true);
          })
          .advance(SlientAdvancor());
      });
    });

    it("combines operation-info players and locations without dropping either target group", async () => {
      const { card, a, b } = fixture();
      const first = createOperation("banish"),
        second = createOperation("banish");
      first.players = "self";
      first.source = "grave";
      second.players = "opponent";
      second.source = "monster";
      card.effects[0].operations = [first, second];
      await run([card, a, b], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          { code: a.code, location: C.LOCATION_GRAVE },
          field(b),
        ]);
        activateFromHand(ygo, card.code);
        ygo
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: a.code }),
            SelectCardAdvancor({ code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, () => {
            expect(
              ygo.evaluate(
                "local ok,g,count,p,loc=Duel.GetOperationInfo(1,CATEGORY_REMOVE) return ok and g and #g==2 and count==2 and p==PLAYER_ALL and loc==(LOCATION_GRAVE|LOCATION_MZONE)",
              ),
            ).toBe(true);
          })
          .advance(SlientAdvancor());
      });
    });

    it("does not claim a partial target set is complete when later cards are chosen at resolution", async () => {
      const { card, a, b } = fixture();
      const first = createOperation("destroy"),
        second = createOperation("destroy");
      first.players = second.players = "opponent";
      first.source = second.source = "monster";
      second.selection = "select";
      card.effects[0].operations = [first, second];
      await run([card, a, b], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a),
          field(b),
        ]);
        activateFromHand(ygo, card.code);
        ygo
          .advance(SummonPlaceAdvancor(), SelectCardAdvancor({ code: a.code }))
          .state(core.YGOProMsgSelectChain, () => {
            expect(
              ygo.evaluate(
                "local ok,g,count,p,loc=Duel.GetOperationInfo(1,CATEGORY_DESTROY) return ok and g==nil and count==0 and p==1 and loc==LOCATION_MZONE",
              ),
            ).toBe(true);
          })
          .advance(SelectCardAdvancor({ code: b.code }), SlientAdvancor());
      });
    });

    it("sums repeated scalar operation-info amounts for the same player", async () => {
      const { card } = fixture();
      const first = createOperation("damage"),
        second = createOperation("damage");
      first.value = 500;
      second.value = 800;
      card.effects[0].operations = [first, second];
      await run([card], (ygo) => {
        ygo.addCard({ code: card.code, location: C.LOCATION_HAND });
        activateFromHand(ygo, card.code);
        ygo
          .advance(SummonPlaceAdvancor())
          .state(core.YGOProMsgSelectChain, () => {
            expect(
              ygo.evaluate(
                "local ok,g,count,p,amount=Duel.GetOperationInfo(1,CATEGORY_DAMAGE) return ok and p==1 and amount==1300",
              ),
            ).toBe(true);
          })
          .advance(SlientAdvancor());
        expect(ygo.getLP(1)).toBe(6700);
      });
    });

    it("routes two independently chosen groups to their own operations", async () => {
      const { card, a, b } = fixture();
      const destroy = createOperation("destroy"),
        bounce = createOperation("bounce");
      destroy.source = bounce.source = "monster";
      destroy.players = bounce.players = "opponent";
      card.effects[0].operations = [destroy, bounce];
      await run([card, a, b], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a),
          field(b),
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: a.code }),
          SelectCardAdvancor({ code: b.code }),
          SlientAdvancor(),
        );
        expect(
          ygo.getFieldCard(1, C.LOCATION_GRAVE).map((c) => c.code),
        ).toEqual([a.code]);
        expect(ygo.getFieldCard(1, C.LOCATION_HAND).map((c) => c.code)).toEqual(
          [b.code],
        );
        expect(ygo.evaluate(`return next(c${card.code}.e1contexts)==nil`)).toBe(
          true,
        );
      });
    });
    it("rejects activation when independently valid groups cannot be assigned jointly", async () => {
      const { card, a } = fixture();
      const destroy = createOperation("destroy"),
        banish = createOperation("banish");
      destroy.players = banish.players = "opponent";
      destroy.source = banish.source = "monster";
      card.effects[0].operations = [destroy, banish];
      await run([card, a], (ygo) => {
        ygo.addCard([{ code: card.code, location: C.LOCATION_HAND }, field(a)]);
        ygo.advance(SlientAdvancor());
        expect(ygo.getFieldCard(0, C.LOCATION_HAND)[0].canActivate()).toBe(
          false,
        );
      });
    });
    it("does not offer an early choice that would make a later narrow group impossible", async () => {
      const { card, a, b } = fixture();
      const destroy = createOperation("destroy"),
        bounce = createOperation("bounce");
      destroy.players = bounce.players = "opponent";
      destroy.source = bounce.source = "monster";
      bounce.filter.codes = [a.code];
      card.effects[0].operations = [destroy, bounce];
      await run([card, a, b], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a),
          field(b),
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: b.code }),
          SelectCardAdvancor({ code: a.code }),
          SlientAdvancor(),
        );
        expect(
          ygo.getFieldCard(1, C.LOCATION_GRAVE).map((c) => c.code),
        ).toEqual([b.code]);
        expect(ygo.getFieldCard(1, C.LOCATION_HAND).map((c) => c.code)).toEqual(
          [a.code],
        );
      });
    });
    it("allows a shared target only when both groups opt in", async () => {
      const { card, a } = fixture();
      const first = createOperation("boost"),
        second = createOperation("boost");
      first.players = second.players = "self";
      first.source = second.source = "monster";
      first.targetOverlap = second.targetOverlap = "allow";
      first.attack = 300;
      second.attack = 700;
      card.effects[0].operations = [first, second];
      await run([card, a], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a, 0),
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: a.code }),
          SelectCardAdvancor({ code: a.code }),
          SlientAdvancor(),
        );
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)[0].attack).toBe(
          a.attack + 1000,
        );
      });
    });
    it("reuses a nonadjacent actual result after an intervening scalar operation", async () => {
      const { card, a } = fixture();
      const send = createOperation("send-grave"),
        damage = createOperation("damage"),
        recover = createOperation("recover");
      send.source = "monster";
      recover.selection = "result";
      recover.reference = send.uid;
      recover.players = "self";
      card.effects[0].operations = [send, damage, recover];
      await run([card, a], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a, 0),
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: a.code }),
          SlientAdvancor(),
        );
        expect(ygo.getFieldCard(0, C.LOCATION_HAND).map((c) => c.code)).toEqual(
          [a.code],
        );
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
      });
    });
    it("keeps two activations of the same Effect in one chain separate", async () => {
      const { card, a, b } = fixture();
      const c = createCard(100040004),
        d = createCard(100040005);
      c.kind = d.kind = "normal";
      card.kind = "effect";
      const block = card.effects[0];
      block.trigger = "quick";
      block.count = "none";
      const destroy = createOperation("destroy"),
        bounce = createOperation("bounce");
      destroy.players = bounce.players = "opponent";
      destroy.source = bounce.source = "monster";
      block.operations = [destroy, bounce];
      await run([card, a, b, c, d], (ygo) => {
        ygo.addCard([field(card, 0), field(a), field(b), field(c), field(d)]);
        ygo
          .advance(SlientAdvancor())
          .state(core.YGOProMsgSelectIdleCmd, () =>
            ygo.getFieldCard(0, C.LOCATION_MZONE)[0].activate(),
          );
        ygo
          .advance(
            SelectCardAdvancor({ code: a.code }),
            SelectCardAdvancor({ code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, (msg) => msg.prepareResponse(null))
          .state(core.YGOProMsgSelectChain, () =>
            ygo.getFieldCard(0, C.LOCATION_MZONE)[0].activate(),
          );
        ygo.advance(
          SelectCardAdvancor({ code: c.code }),
          SelectCardAdvancor({ code: d.code }),
          SlientAdvancor(),
        );
        expect(
          ygo
            .getFieldCard(1, C.LOCATION_GRAVE)
            .map((value) => value.code)
            .sort(),
        ).toEqual([a.code, c.code]);
        expect(
          ygo
            .getFieldCard(1, C.LOCATION_HAND)
            .map((value) => value.code)
            .sort(),
        ).toEqual([b.code, d.code]);
        expect(ygo.evaluate(`return next(c${card.code}.e1contexts)==nil`)).toBe(
          true,
        );
      });
    });
    it("cleans preserved groups when activation is negated", async () => {
      const { card, a, b } = fixture();
      const negate = createCard(100040004);
      negate.effects = [createEffect("negate-activation", negate)];
      const destroy = createOperation("destroy"),
        bounce = createOperation("bounce");
      destroy.players = bounce.players = "opponent";
      destroy.source = bounce.source = "monster";
      card.effects[0].operations = [destroy, bounce];
      await run([card, a, b, negate], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a),
          field(b),
          field(negate),
        ]);
        activateFromHand(ygo, card.code);
        ygo
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: a.code }),
            SelectCardAdvancor({ code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, () =>
            ygo
              .getFieldCard(1, C.LOCATION_MZONE)
              .find((c) => c.code === negate.code)!
              .activate(),
          )
          .advance(SlientAdvancor());
        expect(ygo.getFieldCard(1, C.LOCATION_MZONE)).toHaveLength(3);
        expect(ygo.evaluate(`return next(c${card.code}.e1contexts)==nil`)).toBe(
          true,
        );
      });
    });
    it("retains standard ChangeTargetCard behavior for a single target group", async () => {
      const { card, a, b } = fixture();
      const redirect = createCard(100040004);
      redirect.scriptMode = "custom";
      redirect.customLua = `local s,id=GetID()
function s.initial_effect(c)
 local e=Effect.CreateEffect(c)
 e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_QUICK_O)
 e:SetCode(EVENT_CHAINING) e:SetRange(LOCATION_MZONE)
 e:SetCondition(function(e,tp,eg,ep,ev,re) return re:GetHandler():IsCode(${card.code}) end)
 e:SetOperation(function(e,tp,eg,ep,ev)
  local g=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_MZONE,0,nil,${b.code})
  Duel.ChangeTargetCard(ev,g)
 end)
 c:RegisterEffect(e)
end`;
      const destroy = createOperation("destroy");
      destroy.players = "opponent";
      destroy.source = "monster";
      card.effects[0].operations = [destroy];
      await run([card, a, b, redirect], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a),
          field(b),
          field(redirect),
        ]);
        activateFromHand(ygo, card.code);
        ygo
          .advance(SummonPlaceAdvancor(), SelectCardAdvancor({ code: a.code }))
          .state(core.YGOProMsgSelectChain, () =>
            ygo
              .getFieldCard(1, C.LOCATION_MZONE)
              .find((c) => c.code === redirect.code)!
              .activate(),
          )
          .advance(SlientAdvancor());
        expect(
          ygo.getFieldCard(1, C.LOCATION_GRAVE).map((c) => c.code),
        ).toEqual([b.code]);
        expect(
          ygo.getFieldCard(1, C.LOCATION_MZONE).map((c) => c.code),
        ).toContain(a.code);
      });
    });
    it("does not guess group membership after an external multi-group target replacement", async () => {
      const { card, a, b } = fixture();
      const substitute = createCard(100040004),
        redirect = createCard(100040005);
      substitute.kind = "normal";
      redirect.scriptMode = "custom";
      redirect.customLua = `local s,id=GetID()
function s.initial_effect(c)
 local e=Effect.CreateEffect(c)
 e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_QUICK_O)
 e:SetCode(EVENT_CHAINING) e:SetRange(LOCATION_MZONE)
 e:SetCondition(function(e,tp,eg,ep,ev,re) return re:GetHandler():IsCode(${card.code}) end)
 e:SetOperation(function(e,tp,eg,ep,ev)
  Duel.ChangeTargetCard(ev,Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_MZONE,0,nil,${substitute.code}))
 end)
 c:RegisterEffect(e)
end`;
      const destroy = createOperation("destroy"),
        bounce = createOperation("bounce");
      destroy.players = bounce.players = "opponent";
      destroy.source = bounce.source = "monster";
      card.effects[0].operations = [destroy, bounce];
      await run([card, a, b, substitute, redirect], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          field(a),
          field(b),
          field(substitute),
          field(redirect),
        ]);
        activateFromHand(ygo, card.code);
        ygo
          .advance(
            SummonPlaceAdvancor(),
            SelectCardAdvancor({ code: a.code }),
            SelectCardAdvancor({ code: b.code }),
          )
          .state(core.YGOProMsgSelectChain, () =>
            ygo
              .getFieldCard(1, C.LOCATION_MZONE)
              .find((c) => c.code === redirect.code)!
              .activate(),
          )
          .advance(SlientAdvancor());
        expect(ygo.getFieldCard(1, C.LOCATION_MZONE)).toHaveLength(4);
        expect(ygo.getFieldCard(1, C.LOCATION_GRAVE)).toHaveLength(0);
      });
    });
  },
);
