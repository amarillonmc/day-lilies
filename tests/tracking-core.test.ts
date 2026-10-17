import { describe, expect, it } from "vitest";
import type { YGOProTest } from "ygopro-jstest";
import { createCard, createEffect, createOperation } from "../src/domain/model";
import { createTracking } from "../src/domain/tracking";
import {
  activateFromHand,
  C,
  core,
  coreAvailable,
  createCoreHarness,
} from "./helpers/core-harness";

function spell(template: "revive" | "banish" | "sequence" = "revive") {
  const card = createCard(100031001);
  card.kind = "spell";
  card.effects = [createEffect(template, card)];
  return card;
}
function material(code = 100031002) {
  const card = createCard(code);
  card.kind = "normal";
  return card;
}
function finishTurn(ygo: YGOProTest) {
  ygo.state(core.YGOProMsgSelectIdleCmd, (msg) =>
    msg.prepareResponse(core.IdleCmdType.TO_EP),
  );
  ygo.advance(
    (msg) =>
      msg instanceof core.YGOProMsgSelectChain &&
      msg.chains.some((c) => c.forced)
        ? msg.prepareResponse(
            core.IndexResponse(msg.chains.findIndex((c) => c.forced)),
          )
        : undefined,
    core.SummonPlaceAdvancor(),
    core.SlientAdvancor(),
  );
}
function activate(ygo: YGOProTest, cardCode: number, targetCode: number) {
  activateFromHand(ygo, cardCode);
  ygo.advance(
    core.SummonPlaceAdvancor(),
    core.SelectCardAdvancor({ code: targetCode }),
    core.SlientAdvancor(),
  );
}

describe.skipIf(!coreAvailable)("phase tracking in the real core", () => {
  const run = createCoreHarness("tracking");
  it("destroys the revived card once in this End Phase", async () => {
    const card = spell(),
      target = material();
    card.effects[0].tracking = [createTracking()];
    await run([card, target], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
      ]);
      activate(ygo, card.code, target.code);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
      finishTurn(ygo);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_GRAVE)
          .some((c) => c.code === target.code),
      ).toBe(true);
      expect(
        ygo.evaluate(
          `return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${target.code}):GetFirst():GetFlagEffect(${card.code})`,
        ),
      ).toBe(0);
    });
  });
  it("returns a temporarily banished monster without Special Summoning it", async () => {
    const card = spell("banish"),
      target = material();
    card.effects[0].source = "monster";
    card.effects[0].tracking = [
      { ...createTracking(), action: "return-temporary" },
    ];
    await run([card, target], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        {
          code: target.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_DEFENSE,
        },
      ]);
      activate(ygo, card.code, target.code);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_REMOVED)
          .some((c) => c.code === target.code),
      ).toBe(true);
      finishTurn(ygo);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_MZONE)
          .some((c) => c.code === target.code),
      ).toBe(true);
      expect(ygo.getFieldCard(0, C.LOCATION_REMOVED)).toHaveLength(0);
      expect(
        ygo.evaluate(
          "return Duel.GetFieldCard(0,LOCATION_MZONE,0):GetPosition()",
        ),
      ).toBe(C.POS_FACEUP_DEFENSE);
    });
  });
  it.each([true, false])(
    "applies the movement invalidation setting (%s)",
    async (resetOnMove) => {
      const card = spell("sequence"),
        target = material();
      const revive = createOperation("revive"),
        banish = createOperation("banish");
      banish.source = "monster";
      banish.selection = "previous";
      card.effects[0].operations = [revive, banish];
      card.effects[0].tracking = [
        { ...createTracking(revive.uid), action: "bounce", resetOnMove },
      ];
      await run([card, target], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          { code: target.code, location: C.LOCATION_GRAVE },
        ]);
        activate(ygo, card.code, target.code);
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_REMOVED)
            .some((c) => c.code === target.code),
        ).toBe(true);
        finishTurn(ygo);
        expect(
          ygo
            .getFieldCard(0, resetOnMove ? C.LOCATION_REMOVED : C.LOCATION_HAND)
            .some((c) => c.code === target.code),
        ).toBe(true);
      });
    },
  );
  it("starts a mandatory phase Chain and resolves the delayed action", async () => {
    const card = spell(),
      target = material();
    card.effects[0].tracking = [
      { ...createTracking(), action: "bounce", resolution: "trigger" },
    ];
    await run([card, target], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
      ]);
      activate(ygo, card.code, target.code);
      const chainsBefore = ygo.allMessages.filter(
        (msg) => msg instanceof core.YGOProMsgChaining,
      ).length;
      finishTurn(ygo);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_HAND)
          .some((c) => c.code === target.code),
      ).toBe(true);
      expect(
        ygo.allMessages.filter((msg) => msg instanceof core.YGOProMsgChaining)
          .length,
      ).toBeGreaterThan(chainsBefore);
    });
  });
  it("waits for the next turn rather than the registration turn", async () => {
    const card = spell(),
      target = material();
    card.effects[0].tracking = [
      { ...createTracking(), action: "bounce", schedule: "next-turn" },
    ];
    await run([card, target], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
      ]);
      activate(ygo, card.code, target.code);
      finishTurn(ygo);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
      finishTurn(ygo);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_HAND)
          .some((c) => c.code === target.code),
      ).toBe(true);
    });
  });
  it.each(["any", "all"] as const)(
    "honors the tracked-group validity rule (%s)",
    async (validity) => {
      const card = spell("sequence"),
        first = material(),
        second = material(100031003);
      const boost = createOperation("boost"),
        bounce = createOperation("bounce");
      boost.selection = "all";
      boost.source = "monster";
      bounce.selection = "select";
      bounce.source = "monster";
      bounce.filter.codes = [first.code];
      card.effects[0].operations = [boost, bounce];
      card.effects[0].tracking = [{ ...createTracking(boost.uid), validity }];
      await run([card, first, second], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          {
            code: first.code,
            location: C.LOCATION_MZONE,
            position: C.POS_FACEUP_ATTACK,
          },
          {
            code: second.code,
            location: C.LOCATION_MZONE,
            position: C.POS_FACEUP_ATTACK,
          },
        ]);
        activate(ygo, card.code, first.code);
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_HAND)
            .some((c) => c.code === first.code),
        ).toBe(true);
        finishTurn(ygo);
        expect(
          ygo
            .getFieldCard(
              0,
              validity === "any" ? C.LOCATION_GRAVE : C.LOCATION_MZONE,
            )
            .some((c) => c.code === second.code),
        ).toBe(true);
      });
    },
  );
  it("keeps separate registrations on the same card independent", async () => {
    const card = spell(),
      target = material();
    card.effects[0].tracking = [
      { ...createTracking(), action: "bounce" },
      {
        ...createTracking(),
        action: "banish",
        schedule: "next-turn",
        resetOnMove: false,
      },
    ];
    await run([card, target], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
      ]);
      activate(ygo, card.code, target.code);
      finishTurn(ygo);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_HAND)
          .some((c) => c.code === target.code),
      ).toBe(true);
      finishTurn(ygo);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_REMOVED)
          .some((c) => c.code === target.code),
      ).toBe(true);
    });
  });
  it("does not regain a reset tracking instance when the card leaves and returns", async () => {
    const card = spell("sequence"),
      target = material();
    const revive = createOperation("revive"),
      bounce = createOperation("bounce"),
      summon = createOperation("summon");
    bounce.source = "monster";
    bounce.selection = "previous";
    summon.source = "hand";
    summon.selection = "previous";
    card.effects[0].operations = [revive, bounce, summon];
    card.effects[0].tracking = [createTracking(revive.uid)];
    await run([card, target], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
      ]);
      activate(ygo, card.code, target.code);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
      finishTurn(ygo);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
    });
  });
  it("cleans up a negated phase trigger without retrying it", async () => {
    const card = spell(),
      target = material(),
      negate = createCard(100031004);
    negate.effects = [createEffect("negate-activation", negate)];
    negate.effects[0].count = "soft";
    card.effects[0].tracking = [
      { ...createTracking(), action: "bounce", resolution: "trigger" },
    ];
    await run([card, target, negate], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
        {
          code: negate.code,
          location: C.LOCATION_MZONE,
          controller: 1,
          position: C.POS_FACEUP_ATTACK,
        },
      ]);
      activate(ygo, card.code, target.code);
      let responded = false;
      ygo.state(core.YGOProMsgSelectIdleCmd, (msg) =>
        msg.prepareResponse(core.IdleCmdType.TO_EP),
      );
      ygo.advance((msg) => {
        if (!(msg instanceof core.YGOProMsgSelectChain)) return;
        const response = msg.chains.findIndex((c) => c.code === negate.code);
        if (!responded && response !== -1) {
          responded = true;
          return msg.prepareResponse(core.IndexResponse(response));
        }
        const forced = msg.chains.findIndex((c) => c.forced);
        if (forced !== -1)
          return msg.prepareResponse(core.IndexResponse(forced));
      }, core.SlientAdvancor());
      expect(responded).toBe(true);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
      expect(
        ygo.evaluate(
          `return Duel.GetFieldCard(0,LOCATION_MZONE,0):GetFlagEffect(${card.code})`,
        ),
      ).toBe(0);
      finishTurn(ygo);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
    });
  });
  it("waits for its controller's next Standby Phase", async () => {
    const card = spell(),
      target = material();
    card.effects[0].tracking = [
      {
        ...createTracking(),
        action: "bounce",
        phase: "standby",
        schedule: "next-matching",
        turnPlayer: "self",
      },
    ];
    await run([card, target], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
      ]);
      activate(ygo, card.code, target.code);
      finishTurn(ygo);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(1);
      finishTurn(ygo);
      expect(
        ygo
          .getFieldCard(0, C.LOCATION_HAND)
          .some((c) => c.code === target.code),
      ).toBe(true);
    });
  });
  it("invalidates tracked cards that become Xyz Material", async () => {
    const card = createCard(100031001),
      target = material();
    card.kind = "xyz";
    card.procedure.mode = "xyz";
    const boost = createOperation("boost"),
      attach = createOperation("attach-material");
    boost.source = "monster";
    boost.filter.codes = [target.code];
    attach.source = "monster";
    attach.selection = "previous";
    const block = createEffect("sequence", card);
    block.operations = [boost, attach];
    block.tracking = [{ ...createTracking(boost.uid), action: "send-grave" }];
    card.effects = [block];
    await run([card, target], (ygo) => {
      ygo.addCard([
        {
          code: card.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        },
        {
          code: target.code,
          location: C.LOCATION_MZONE,
          position: C.POS_FACEUP_ATTACK,
        },
      ]);
      ygo
        .advance(core.SlientAdvancor())
        .state(core.YGOProMsgSelectIdleCmd, () =>
          ygo.getFieldCard(0, C.LOCATION_MZONE)[0].activate(),
        );
      ygo.advance(
        core.SelectCardAdvancor({ code: target.code }),
        core.SlientAdvancor(),
      );
      expect(
        ygo.evaluate(
          "return Duel.GetFieldCard(0,LOCATION_MZONE,0):GetOverlayCount()",
        ),
      ).toBe(1);
      expect(
        ygo.evaluate(
          `return Duel.GetFieldCard(0,LOCATION_MZONE,0):GetOverlayGroup():GetFirst():GetFlagEffect(${card.code})`,
        ),
      ).toBe(0);
      finishTurn(ygo);
      expect(
        ygo.evaluate(
          "return Duel.GetFieldCard(0,LOCATION_MZONE,0):GetOverlayCount()",
        ),
      ).toBe(1);
    });
  });
  it("reports the delayed destruction category and actual group to chain responders", async () => {
    const card = spell(),
      target = material(),
      observer = createCard(100031005);
    card.effects[0].tracking = [{ ...createTracking(), resolution: "trigger" }];
    observer.effects = [createEffect("custom-effect", observer)];
    observer.effects[0].advanced = {
      type: "EFFECT_TYPE_FIELD+EFFECT_TYPE_QUICK_O",
      code: "EVENT_CHAINING",
      range: "LOCATION_MZONE",
      condition: `local ex,g,ct=Duel.GetOperationInfo(ev,CATEGORY_DESTROY)\nreturn ex and g and ct==1 and g:IsExists(Card.IsCode,1,nil,${target.code})`,
      operation: "Duel.Recover(tp,1,REASON_EFFECT)",
    };
    await run([card, target, observer], (ygo) => {
      ygo.addCard([
        { code: card.code, location: C.LOCATION_HAND },
        { code: target.code, location: C.LOCATION_GRAVE },
        {
          code: observer.code,
          location: C.LOCATION_MZONE,
          controller: 1,
          position: C.POS_FACEUP_ATTACK,
        },
      ]);
      activate(ygo, card.code, target.code);
      let offered = false;
      ygo.state(core.YGOProMsgSelectIdleCmd, (msg) =>
        msg.prepareResponse(core.IdleCmdType.TO_EP),
      );
      ygo.advance((msg) => {
        if (!(msg instanceof core.YGOProMsgSelectChain)) return;
        if (msg.chains.some((c) => c.code === observer.code)) offered = true;
        const forced = msg.chains.findIndex((c) => c.forced);
        if (forced !== -1)
          return msg.prepareResponse(core.IndexResponse(forced));
      }, core.SlientAdvancor());
      expect(offered).toBe(true);
      expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
    });
  });
});
