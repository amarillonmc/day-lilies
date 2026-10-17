import { describe, expect, it } from "vitest";
import { compileCard } from "../src/domain/compiler";
import {
  createCard,
  createEffect,
  createProject,
  type Card,
} from "../src/domain/model";
import {
  defaultSummoning,
  emitSummonProcedure,
  fusionMaterialSlots,
  validateSummonProcedure,
} from "../src/domain/summon-procedures";

const result = (card: Card) =>
  compileCard(card, { ...createProject(), cards: [card] });
function extra(kind: "fusion" | "synchro" | "xyz" | "link") {
  const card = createCard(100041001);
  card.kind = kind;
  card.level = kind === "link" ? 3 : 8;
  if (kind === "link") card.linkMarkers = [1, 2, 4];
  card.procedure.mode = kind;
  return card;
}
describe("visual summon procedures", () => {
  it("preserves legacy named fusion materials", () => {
    const card = extra("fusion");
    card.procedure.materialCodes = [100041002, 100041003];
    expect(fusionMaterialSlots(card).map((slot) => slot.code)).toEqual(
      card.procedure.materialCodes,
    );
    expect(result(card).lua).toContain(
      "aux.AddFusionProcMix(c,true,true,100041002,100041003)",
    );
  });
  it("compiles two Tuners with independent non-Tuner restrictions", () => {
    const card = extra("synchro");
    Object.assign(card.procedure, {
      tunerCount: 2,
      min: 3,
      max: 4,
      tunerFilter: { setcode: 0x123 },
      nonTunerFilter: { attribute: "dark", minLevel: 2 },
    });
    const compiled = result(card);
    expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(compiled.lua).toContain(
      "aux.AddSynchroMixProcedure(c,aux.Tuner(s.summonTuner),aux.Tuner(s.summonTuner),nil,aux.NonTuner(s.summonNonTuner),1,2)",
    );
    expect(compiled.lua).toContain("c:IsAttribute(ATTRIBUTE_DARK)");
  });
  it("supports variable Xyz count and an independent filtered overlay route", () => {
    const card = extra("xyz");
    Object.assign(card.procedure, {
      min: 2,
      max: 4,
      materialLevel: 4,
      materialFilter: { race: 1 },
      xyzAlternative: {
        filter: { codes: [100041002], minRank: 3, maxRank: 3 },
        description: 1165,
      },
    });
    const compiled = result(card);
    expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(compiled.lua).toContain(
      "aux.AddXyzProcedure(c,s.summonMaterial,4,2,s.summonAlternative,1165,4)",
    );
    expect(compiled.lua).toContain(
      "c:IsFaceup() and c:IsType(TYPE_XYZ) and c:IsCode(100041002)",
    );
  });
  it("compiles filtered Link materials without changing the Link value", () => {
    const card = extra("link");
    Object.assign(card.procedure, {
      min: 2,
      max: 3,
      materialFilter: { attribute: "light", race: 1 },
    });
    expect(result(card).lua).toContain(
      "aux.AddLinkProcedure(c,s.summonMaterial,2,3)",
    );
    expect(result(card).lua).toContain(
      "c:IsRace(1) and c:IsAttribute(ATTRIBUTE_LIGHT)",
    );
  });
  it("supports a named fusion slot and a repeated filtered slot", () => {
    const card = extra("fusion");
    card.procedure.fusionSlots = [
      { kind: "code", code: 100041002, filter: {}, min: 1, max: 1 },
      { kind: "filter", filter: { attribute: "dark" }, min: 1, max: 3 },
    ];
    card.procedure.fusionSubstitute = false;
    const compiled = result(card);
    expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(compiled.lua).toContain(
      "aux.AddFusionProcMixRep(c,false,true,s.fusionMaterial2,1,3,100041002)",
    );
  });
  it("rejects unsupported competing variable slots and impossible tuner counts", () => {
    const card = extra("fusion");
    card.procedure.fusionSlots = Array.from({ length: 2 }, () => ({
      kind: "filter" as const,
      filter: {},
      min: 1,
      max: 2,
    }));
    expect(validateSummonProcedure(card)).toContain(
      "融合手续最多允许一个数量可变的素材槽。",
    );
    card.kind = "synchro";
    card.procedure.mode = "synchro";
    card.procedure.tunerCount = 3;
    expect(validateSummonProcedure(card)).toContain(
      "同调手续需要 1–3 只调整及至少 1 只非调整。",
    );
  });
  it("emits a repeated fixed filter function only once", () => {
    const card = extra("fusion");
    card.procedure.fusionSlots = [
      { kind: "filter", filter: { race: 1 }, min: 3, max: 3 },
    ];
    expect(emitSummonProcedure(card).funcs).toHaveLength(1);
  });
  it.each(["fusion", "ritual"] as const)(
    "compiles %s summon effects with normal costs and count limits",
    (kind) => {
      const card = createCard(100041010);
      card.kind = "spell";
      if (kind === "ritual") card.subtype = "ritual";
      const block = createEffect("summoning", card);
      block.summoning = defaultSummoning(kind);
      block.cost = "lp";
      block.costAmount = 500;
      block.count = "name-use";
      card.effects = [block];
      const compiled = result(card);
      expect(
        compiled.diagnostics.filter((d) => d.severity === "error"),
      ).toEqual([]);
      expect(compiled.lua).toContain("Duel.PayLPCost(tp,500)");
      expect(compiled.lua).toContain("e1:SetCountLimit(");
      expect(compiled.lua).toContain(
        kind === "fusion"
          ? "aux.FusionEffectUltimateOperation"
          : "aux.RitualUltimateOperation",
      );
    },
  );
  it("keeps grave materials separate from ordinary ritual material filtering", () => {
    const card = createCard(100041011);
    card.kind = "spell";
    card.subtype = "ritual";
    const block = createEffect("summoning", card);
    block.summoning = {
      ...defaultSummoning("ritual"),
      materialSource: "hand-field-grave",
      ritualLevel: "fixed",
      ritualFixedLevel: 8,
      ritualComparison: "equal",
    };
    card.effects = [block];
    const compiled = result(card);
    expect(compiled.lua).toContain(
      'function(c) return 8 end,"Equal",LOCATION_HAND,s.e1summonGrave,s.e1summonMaterial,nil',
    );
    expect(compiled.lua).toContain(
      "and c:IsLocation(LOCATION_HAND+LOCATION_MZONE)",
    );
  });
});
