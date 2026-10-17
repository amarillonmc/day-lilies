import { describe, expect, it } from "vitest";
import { createCard, createEffect, createOperation } from "../src/domain/model";
import { defaultSummoning } from "../src/domain/summon-procedures";
import { createTracking } from "../src/domain/tracking";
import {
  activateFromHand,
  C,
  core,
  coreAvailable,
  createCoreHarness,
} from "./helpers/core-harness";

function materials() {
  const first = createCard(100096002),
    second = createCard(100096003);
  first.kind = second.kind = "normal";
  first.level = second.level = 4;
  const fusion = createCard(100096004);
  fusion.kind = "fusion";
  fusion.procedure = {
    ...fusion.procedure,
    mode: "fusion",
    materialCodes: [first.code, second.code],
  };
  return { first, second, fusion };
}

describe.skipIf(!coreAvailable)(
  "summoning integration regression in the real core",
  () => {
    const run = createCoreHarness("summon-regression");

    it.each(["fusion", "ritual"] as const)(
      "tracks a top-level %s result through the End Phase",
      async (kind) => {
        const { first, second, fusion } = materials();
        const summoned = kind === "fusion" ? fusion : createCard(100096005);
        if (kind === "ritual") {
          summoned.kind = "ritual";
        summoned.hasEffect = false;
          summoned.level = 8;
          first.level = 8;
        }
        const spell = createCard(100096001);
        spell.kind = "spell";
        const effect = createEffect("summoning", spell);
        effect.summoning = {
          ...defaultSummoning(kind),
          monsterFilter: { codes: [summoned.code] },
          ritualComparison: "equal",
        };
        effect.tracking = [createTracking(effect.uid)];
        spell.effects = [effect];
        await run([spell, first, second, summoned], (ygo) => {
          ygo.addCard([
            { code: spell.code, location: C.LOCATION_HAND },
            { code: first.code, location: C.LOCATION_HAND },
            { code: second.code, location: C.LOCATION_HAND },
            {
              code: summoned.code,
              location: kind === "fusion" ? C.LOCATION_EXTRA : C.LOCATION_HAND,
            },
          ]);
          activateFromHand(ygo, spell.code);
          ygo.advance(
            core.SummonPlaceAdvancor(),
            core.SelectCardAdvancor(
              { code: summoned.code },
              { code: first.code },
              { code: second.code },
            ),
            core.SlientAdvancor(),
          );
          expect(
            ygo.getFieldCard(0, C.LOCATION_MZONE).map((c) => c.code),
          ).toContain(summoned.code);
          expect(
            ygo.evaluate(
              `return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${summoned.code}):GetFirst():GetFlagEffect(${spell.code})`,
            ),
          ).toBe(1);
          ygo.state(core.YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(core.IdleCmdType.TO_EP),
          );
          ygo.advance(core.SlientAdvancor());
          expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
          expect(
            ygo.getFieldCard(0, C.LOCATION_GRAVE).map((c) => c.code),
          ).toContain(summoned.code);
          expect(
            ygo.evaluate(
              `return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${summoned.code}):GetFirst():GetFlagEffect(${spell.code})`,
            ),
          ).toBe(0);
        });
      },
    );

    it("declines an optional Fusion step without reusing the preceding search result", async () => {
      const { first, second, fusion } = materials();
      const spell = createCard(100096011);
      spell.kind = "spell";
      const effect = createEffect("sequence", spell);
      const search = createOperation("search");
      search.filter = { codes: [first.code] };
      const summon = createOperation("summoning");
      summon.optional = true;
      summon.summoning = {
        ...defaultSummoning("fusion"),
        monsterFilter: { codes: [fusion.code] },
      };
      const damage = createOperation("damage");
      damage.next = "if-failed";
      damage.value = 700;
      effect.operations = [search, summon, damage];
      effect.tracking = [createTracking(summon.uid)];
      spell.effects = [effect];
      await run([spell, first, second, fusion], (ygo) => {
        ygo.addCard([
          { code: spell.code, location: C.LOCATION_HAND },
          { code: first.code, location: C.LOCATION_DECK },
          { code: second.code, location: C.LOCATION_HAND },
          { code: fusion.code, location: C.LOCATION_EXTRA },
        ]);
        activateFromHand(ygo, spell.code);
        let declined = 0;
        ygo.advance(
          (msg) => {
            if (msg instanceof core.YGOProMsgSelectYesNo) {
              declined++;
              return msg.prepareResponse(false);
            }
            return undefined;
          },
          core.SelectCardAdvancor({ code: first.code }),
          core.SummonPlaceAdvancor(),
          core.SlientAdvancor(),
        );
        expect(declined).toBe(1);
        expect(ygo.getLP(1)).toBe(7300);
        expect(ygo.getFieldCard(0, C.LOCATION_MZONE)).toHaveLength(0);
        expect(
          ygo.getFieldCard(0, C.LOCATION_EXTRA).map((c) => c.code),
        ).toContain(fusion.code);
        expect(
          ygo.getFieldCard(0, C.LOCATION_HAND).map((c) => c.code),
        ).toContain(first.code);
        expect(
          ygo.evaluate(
            `return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${first.code}):GetFirst():GetFlagEffect(${spell.code})`,
          ),
        ).toBe(0);
      });
    });
  },
);
