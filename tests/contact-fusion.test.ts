import { describe, expect, it } from "vitest";
import { compileCard } from "../src/domain/compiler";
import { createCard, createProject } from "../src/domain/model";
import {
  defaultContactFusion,
  validateSummonProcedure,
} from "../src/domain/summon-procedures";

function fusion() {
  const card = createCard(100045001);
  card.kind = "fusion";
  card.procedure.mode = "fusion";
  card.procedure.materialCodes = [100045002, 100045003];
  card.procedure.contactFusion = defaultContactFusion();
  return card;
}
describe("Contact Fusion configuration", () => {
  it("does not add a contact procedure to existing Fusion cards", () => {
    const card = fusion();
    delete card.procedure.contactFusion;
    expect(compileCard(card, createProject()).lua).not.toContain(
      "AddContactFusionProcedure",
    );
  });
  it("generates the upstream helper with normal Fusion slots and explicit restrictions", () => {
    const card = fusion();
    const result = compileCard(card, createProject());
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(result.lua).toContain(
      "aux.AddFusionProcMix(c,true,true,100045002,100045003)",
    );
    expect(result.lua).toContain(
      "aux.AddContactFusionProcedure(c,s.contactMaterial,LOCATION_MZONE,0,aux.ContactFusionSendToDeck(c))",
    );
    expect(result.lua).toContain("c:IsAbleToDeckOrExtraAsCost()");
    expect(result.lua).toContain("(st&SUMMON_TYPE_FUSION)==SUMMON_TYPE_FUSION");
  });
  it.each([
    [
      "banish",
      "c:IsAbleToRemoveAsCost()",
      "Duel.Remove,POS_FACEUP,REASON_COST",
    ],
    ["send-grave", "c:IsAbleToGraveAsCost()", "Duel.SendtoGrave,REASON_COST"],
    [
      "release",
      "c:IsReleasable(REASON_SPSUMMON)",
      "Duel.Release,REASON_SPSUMMON+REASON_MATERIAL",
    ],
  ] as const)("checks legal %s payment", (materialAction, filter, payment) => {
    const card = fusion();
    card.procedure.contactFusion!.materialAction = materialAction;
    const result = compileCard(card, createProject());
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(result.lua).toContain(filter);
    expect(result.lua).toContain(payment);
  });
  it("rejects hidden opponent materials, grave tributes and non-Fusion procedures", () => {
    const card = fusion();
    Object.assign(card.procedure.contactFusion!, {
      materialPlayers: "both",
      materialSource: "field-grave",
      materialAction: "release",
      faceup: false,
    });
    expect(validateSummonProcedure(card)).toContain(
      "使用对方素材的接触融合仅支持表侧怪兽区域。",
    );
    expect(validateSummonProcedure(card)).toContain(
      "接触融合的解放素材仅支持手牌和怪兽区域。",
    );
    card.procedure.mode = "none";
    expect(validateSummonProcedure(card)).toContain(
      "接触融合需要启用融合怪兽的融合素材槽。",
    );
  });
});
