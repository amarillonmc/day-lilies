import type { DelayedTracking, EffectBlock } from "./model";
import { uid } from "./model";

const cardActions = new Set([
  "search",
  "recover",
  "mill",
  "destroy",
  "bounce",
  "banish",
  "revive",
  "summon",
  "self-summon",
  "boost",
  "to-deck",
  "send-grave",
  "discard-hand",
  "change-position",
  "control",
  "disable",
  "equip",
  "add-counter",
  "remove-counter",
  "attach-material",
  "set-spelltrap",
  "declare-race",
  "declare-attribute",
  "mill-top",
  "detach-material",
  "draw",
]);

export function createTracking(sourceStep = "last"): DelayedTracking {
  return {
    uid: uid(),
    sourceStep,
    phase: "end",
    schedule: "this-turn",
    turnPlayer: "either",
    action: "destroy",
    resolution: "continuous",
    validity: "any",
    resetOnMove: true,
    destination: "shuffle",
    position: "original",
  };
}

/** Avoid importing the operation emitter, which calls this module's registration hook. */
export function trackingSources(
  block: EffectBlock,
): { uid: string; action: string; source: string; name?: string }[] {
  return block.template === "sequence"
    ? (block.operations || []).map((op) => ({
        uid: op.uid,
        action: op.action,
        source: op.source,
        name: op.targetName,
      }))
    : [{ uid: block.uid, action: block.template, source: block.source }];
}

function resolvesTo(block: EffectBlock, sourceStep: string, stepUid: string) {
  const steps = trackingSources(block);
  const resolved = sourceStep === "last" ? steps.at(-1)?.uid : sourceStep;
  return resolved === (stepUid === "effect" ? block.uid : stepUid);
}

export function isTemporaryBanish(
  block: EffectBlock,
  stepUid: string,
): boolean {
  return !!block.tracking?.some(
    (t) =>
      t.action === "return-temporary" &&
      resolvesTo(block, t.sourceStep, stepUid),
  );
}

export function validateTracking(block: EffectBlock): string[] {
  const errors: string[] = [];
  const tracking = block.tracking || [];
  if (!tracking.length) return errors;
  if (tracking.length > 8) errors.push("每个效果最多配置 8 项延迟追踪。");
  if (["custom-effect", "summoning", "self-summon"].includes(block.template))
    errors.push("此类效果暂不支持延迟追踪；请使用特殊召唤等普通处理步骤。");
  if (new Set(tracking.map((t) => t.uid)).size !== tracking.length)
    errors.push("延迟追踪标识不可重复。");
  const steps = trackingSources(block);
  for (const t of tracking) {
    const source = steps.find((step) =>
      resolvesTo(block, t.sourceStep, step.uid),
    );
    if (!source) errors.push("延迟追踪的来源步骤已不存在，请重新选择。");
    else if (!cardActions.has(source.action))
      errors.push("延迟追踪只能引用会产生实际处理卡组的步骤。");
    if (t.action === "return-temporary") {
      if (
        source?.action !== "banish" ||
        !["field", "monster", "spelltrap"].includes(source.source)
      )
        errors.push("暂时除外返回必须引用从场上除外的步骤。");
      if (!t.resetOnMove)
        errors.push("暂时除外返回必须启用离开追踪区域后失效。");
      if (
        source &&
        tracking.some(
          (other) =>
            other !== t &&
            other.action === "return-temporary" &&
            resolvesTo(block, other.sourceStep, source.uid),
        )
      )
        errors.push("同一除外步骤只能配置一项暂时除外返回。");
    }
    if (
      !t.uid ||
      typeof t.uid !== "string" ||
      !t.sourceStep ||
      typeof t.sourceStep !== "string" ||
      !["standby", "end"].includes(t.phase) ||
      !["this-turn", "next-turn", "next-matching"].includes(t.schedule) ||
      !["either", "self", "opponent"].includes(t.turnPlayer) ||
      ![
        "bounce",
        "to-deck",
        "destroy",
        "banish",
        "send-grave",
        "return-temporary",
      ].includes(t.action) ||
      !["continuous", "trigger"].includes(t.resolution) ||
      !["any", "all"].includes(t.validity) ||
      typeof t.resetOnMove !== "boolean" ||
      (t.destination !== undefined &&
        !["shuffle", "top", "bottom"].includes(t.destination)) ||
      (t.position !== undefined &&
        ![
          "original",
          "faceup-attack",
          "faceup-defense",
          "facedown-defense",
        ].includes(t.position))
    )
      errors.push("延迟追踪配置包含无效选项。");
  }
  return [...new Set(errors)];
}

export function emitTrackingRegistration(
  block: EffectBlock,
  effectIndex: number,
  stepUid: string,
  groupVar: string,
): string[] {
  return (block.tracking || []).flatMap((t, index) =>
    resolvesTo(block, t.sourceStep, stepUid)
      ? [`s.track${effectIndex + 1}_${index + 1}(e,tp,${groupVar})`]
      : [],
  );
}

function actionLines(t: DelayedTracking): string[] {
  switch (t.action) {
    case "destroy":
      return ["Duel.Destroy(g,REASON_EFFECT)"];
    case "banish":
      return ["Duel.Remove(g,POS_FACEUP,REASON_EFFECT)"];
    case "send-grave":
      return ["Duel.SendtoGrave(g,REASON_EFFECT)"];
    case "bounce":
      return [
        "Duel.SendtoHand(g,nil,REASON_EFFECT)",
        "local hg=Duel.GetOperatedGroup():Filter(Card.IsLocation,nil,LOCATION_HAND)",
        "for p=0,1 do",
        "  local pg=hg:Filter(Card.IsControler,nil,p)",
        "  if #pg>0 then Duel.ConfirmCards(1-p,pg) end",
        "end",
      ];
    case "to-deck":
      return [
        `Duel.SendtoDeck(g,nil,${t.destination === "top" ? "SEQ_DECKTOP" : t.destination === "bottom" ? "SEQ_DECKBOTTOM" : "SEQ_DECKSHUFFLE"},REASON_EFFECT)`,
        ...(t.destination === "top" || t.destination === "bottom"
          ? []
          : [
              "local dg=Duel.GetOperatedGroup():Filter(Card.IsLocation,nil,LOCATION_DECK)",
              "for p=0,1 do if dg:IsExists(Card.IsControler,1,nil,p) then Duel.ShuffleDeck(p) end end",
            ]),
      ];
    case "return-temporary": {
      const position = {
        original: "positions[tc]",
        "faceup-attack": "POS_FACEUP_ATTACK",
        "faceup-defense": "POS_FACEUP_DEFENSE",
        "facedown-defense": "POS_FACEDOWN_DEFENSE",
      }[t.position || "original"];
      return [
        "for tc in aux.Next(g) do",
        `  if tc:IsLocation(LOCATION_REMOVED) then Duel.ReturnToField(tc,${position}) end`,
        "end",
      ];
    }
  }
}

/**
 * Uses only upstream OCGCORE APIs. Card userdata are retained in a Lua table,
 * so no KeepAlive group can leak when a delayed chain is negated. Per-instance
 * flags and the phase effect expire at the scheduled turn's End Phase.
 */
export function emitTrackingFunctions(
  block: EffectBlock,
  effectIndex: number,
): string[] {
  return (block.tracking || []).flatMap((t, index) => {
    const fn = `s.track${effectIndex + 1}_${index + 1}`;
    const phase = t.phase === "standby" ? "PHASE_STANDBY" : "PHASE_END";
    const category = {
      destroy: "CATEGORY_DESTROY",
      bounce: "CATEGORY_TOHAND",
      "to-deck": "CATEGORY_TODECK",
      banish: "CATEGORY_REMOVE",
      "send-grave": "CATEGORY_TOGRAVE",
      "return-temporary": "0",
    }[t.action];
    const lines = [
      `function ${fn}(source,tp,operated)`,
      "  if not operated or #operated==0 then return end",
      "  local c=source:GetHandler()",
      "  local start=Duel.GetTurnCount()",
      `  local due=start${t.schedule === "next-turn" ? "+1" : ""}`,
    ];
    if (t.schedule === "next-matching") {
      lines.push(`  if Duel.GetCurrentPhase()>=${phase} then due=due+1 end`);
      if (t.turnPlayer !== "either") {
        lines.push(
          `  local wanted=${t.turnPlayer === "self" ? "tp" : "1-tp"}`,
          "  local predicted=(Duel.GetTurnPlayer()+(due-start))%2",
          "  if predicted~=wanted then due=due+1 end",
        );
      }
    }
    lines.push(
      "  local lifetime=due-start+1",
      "  s.tracking_serial=(s.tracking_serial or 0)+1",
      "  local token=s.tracking_serial",
      "  local cards,positions={},{}",
      "  for tc in aux.Next(operated) do",
      "    cards[#cards+1]=tc",
      "    positions[tc]=tc:GetPreviousPosition()",
      `    tc:RegisterFlagEffect(id,${t.resetOnMove ? "RESET_EVENT+RESETS_STANDARD+RESET_OVERLAY+RESET_MSCHANGE+" : ""}RESET_PHASE+PHASE_END,0,lifetime,token)`,
      "  end",
      "  local function current()",
      "    local g=Group.CreateGroup()",
      "    for _,tc in ipairs(cards) do",
      "      for _,label in ipairs({tc:GetFlagEffectLabel(id)}) do",
      "        if label==token then g:AddCard(tc) break end",
      "      end",
      "    end",
      `    if ${t.validity === "all" ? "#g~=#cards" : "#g==0"} then return nil end`,
      "    return g",
      "  end",
      "  local delayed=Effect.CreateEffect(c)",
      `  delayed:SetDescription(aux.Stringid(id,${effectIndex}))`,
      ...(t.resolution === "trigger"
        ? [`  delayed:SetCategory(${category})`]
        : []),
      `  delayed:SetType(EFFECT_TYPE_FIELD+${t.resolution === "trigger" ? "EFFECT_TYPE_TRIGGER_F" : "EFFECT_TYPE_CONTINUOUS"})`,
      `  delayed:SetCode(EVENT_PHASE+${phase})`,
      "  delayed:SetCountLimit(1)",
      "  delayed:SetReset(RESET_PHASE+PHASE_END,lifetime)",
      "  delayed:SetCondition(function(e)",
      `    return Duel.GetTurnCount()==due${t.schedule === "next-matching" && t.turnPlayer !== "either" ? " and Duel.GetTurnPlayer()==wanted" : ""} and current()~=nil`,
      "  end)",
      ...(t.resolution === "trigger"
        ? [
            "  delayed:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk)",
            "    if chk==0 then return current()~=nil end",
            ...(category !== "0"
              ? [
                  "    local g=current()",
                  `    if g then Duel.SetOperationInfo(0,${category},g,#g,0,0) end`,
                ]
              : []),
            "  end)",
          ]
        : []),
      "  delayed:SetOperation(function(e)",
      "    local g=current()",
      "    if g then",
      "      Duel.Hint(HINT_CARD,0,id)",
      ...actionLines(t).map((line) => `      ${line}`),
      "    end",
      "    e:Reset()",
      "  end)",
      "  Duel.RegisterEffect(delayed,tp)",
      "end",
    );
    return lines;
  });
}
