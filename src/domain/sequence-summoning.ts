import type { EffectOperation, EffectBlock } from "./model";
import { summonFilterExpression, validateSummoning } from "./summon-procedures";

const materialLocations = {
  "hand-field": "LOCATION_HAND+LOCATION_MZONE",
  hand: "LOCATION_HAND",
  field: "LOCATION_MZONE",
  "hand-field-grave": "LOCATION_HAND+LOCATION_MZONE+LOCATION_GRAVE",
} as const;
const args = "e,tp,eg,ep,ev,re,r,rp";

export function validateSummoningStep(op: EffectOperation): string[] {
  const errors = validateSummoning({
    template: "summoning",
    summoning: op.summoning,
  } as EffectBlock);
  if (op.selection !== "select" || op.amount !== 1 || op.players !== "self")
    errors.push(
      "融合／仪式步骤需要处理时选择 1 只自己的召唤怪兽；素材在召唤配置中选择。",
    );
  return errors;
}

export function summoningCategories(op: EffectOperation): string {
  return `CATEGORY_SPECIAL_SUMMON${op.summoning?.kind === "fusion" ? "+CATEGORY_FUSION_SUMMON" : ""}${op.summoning?.materialSource === "hand-field-grave" ? "+CATEGORY_REMOVE" : ""}`;
}

/** The official procedure callbacks expose the selected monster after summoning.
 * Capture that card locally: GetOperatedGroup may instead contain materials or
 * cards moved by an earlier step when no summon takes place. */
export function emitSummoningStep(op: EffectOperation, fn: string): string[] {
  const s = op.summoning!;
  const funcs = [
    `function ${fn}monster(c)\n\treturn ${summonFilterExpression(s.monsterFilter)}\nend`,
    `function ${fn}material(c,e,tp)\n\treturn ${s.kind === "fusion" ? "aux.FMaterialFilter(c,e,tp) and " : ""}${summonFilterExpression(s.materialFilter)}${s.kind === "ritual" ? ` and c:IsLocation(${s.materialSource === "hand-field-grave" ? materialLocations["hand-field"] : materialLocations[s.materialSource]})` : ""}\nend`,
  ];
  let target: string, operation: string;
  if (s.kind === "fusion") {
    const params = `filter=${fn}monster,mat_location=${materialLocations[s.materialSource]},mat_filter=${fn}material,mat_operation=aux.FMaterialToGrave,grave_filter=aux.FMaterialRemoveFilter,grave_operation=aux.FMaterialRemove,removed_operation=aux.FMaterialToGrave,deck_filter=aux.FMaterialToGraveFilter,deck_operation=aux.FMaterialToGrave,extra_filter=aux.FMaterialToGraveFilter,extra_operation=aux.FMaterialToGrave,spsummon_nocheck=false`;
    target = `aux.FusionEffectUltimateTarget({${params}})`;
    operation = `aux.FusionEffectUltimateOperation({${params},foperation=function(e,tp,tc) capture(tc) end})`;
  } else {
    const level =
      s.ritualLevel === "fixed"
        ? `function(c) return ${s.ritualFixedLevel} end`
        : s.ritualLevel === "current"
          ? "Card.GetLevel"
          : "Card.GetOriginalLevel";
    const location =
      s.ritualSummonFrom === "hand-grave"
        ? "LOCATION_HAND+LOCATION_GRAVE"
        : "LOCATION_HAND";
    const grave =
      s.materialSource === "hand-field-grave" ? `${fn}grave` : "nil";
    if (grave !== "nil")
      funcs.push(
        `function ${grave}(c)\n\treturn ${summonFilterExpression(s.materialFilter)}\nend`,
      );
    const params = `${fn}monster,${level},"${s.ritualComparison === "equal" ? "Equal" : "Greater"}",${location},${grave},${fn}material`;
    target = `aux.RitualUltimateTarget(${params},nil)`;
    operation = `aux.RitualUltimateOperation(${params},function(e,tp,eg,ep,ev,re,r,rp,tc,mat) capture(tc) end)`;
  }
  funcs.push(
    `function ${fn}check(${args})\n\treturn ${target}(${args},0)\nend`,
  );
  funcs.push(
    `function ${fn}(${args},previous,targets,results)\n\tlocal result=Group.CreateGroup()\n\tif not ${fn}check(${args}) then return false,result end\n\tlocal function capture(tc)\n\t\tif tc and tc:IsLocation(LOCATION_MZONE) and tc:IsSummonType(SUMMON_TYPE_${s.kind.toUpperCase()}) and tc:GetReasonEffect()==e then result:AddCard(tc) end\n\tend\n\t${operation}(${args})\n\treturn result:GetCount()>0,result\nend`,
  );
  return funcs;
}
