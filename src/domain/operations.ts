import luaparse from "luaparse";
import {
  createOperation,
  type Card,
  type CardFilter,
  type EffectBlock,
  type EffectOperation,
  type OperationAction,
  type Zone,
} from "./model";
import { ATTRIBUTES, RACES } from "./catalog";
import { emitTrackingRegistration, isTemporaryBanish } from "./tracking";

export const ZONE_LUA: Record<Zone, string> = {
  deck: "LOCATION_DECK",
  hand: "LOCATION_HAND",
  grave: "LOCATION_GRAVE",
  field: "LOCATION_ONFIELD",
  monster: "LOCATION_MZONE",
  spelltrap: "LOCATION_SZONE",
  banished: "LOCATION_REMOVED",
  "hand-grave": "LOCATION_HAND+LOCATION_GRAVE",
  extra: "LOCATION_EXTRA",
};
export const OPERATION_META: Record<
  OperationAction,
  { category: string; hint: string; scalar?: boolean }
> = {
  search: {
    category: "CATEGORY_SEARCH+CATEGORY_TOHAND",
    hint: "HINTMSG_ATOHAND",
  },
  recover: { category: "CATEGORY_TOHAND", hint: "HINTMSG_ATOHAND" },
  draw: { category: "CATEGORY_DRAW", hint: "HINTMSG_DRAW", scalar: true },
  mill: { category: "CATEGORY_TOGRAVE", hint: "HINTMSG_TOGRAVE" },
  destroy: { category: "CATEGORY_DESTROY", hint: "HINTMSG_DESTROY" },
  bounce: { category: "CATEGORY_TOHAND", hint: "HINTMSG_RTOHAND" },
  banish: { category: "CATEGORY_REMOVE", hint: "HINTMSG_REMOVE" },
  revive: { category: "CATEGORY_SPECIAL_SUMMON", hint: "HINTMSG_SPSUMMON" },
  summon: { category: "CATEGORY_SPECIAL_SUMMON", hint: "HINTMSG_SPSUMMON" },
  boost: {
    category: "CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE",
    hint: "HINTMSG_FACEUP",
  },
  damage: { category: "CATEGORY_DAMAGE", hint: "HINTMSG_DAMAGE", scalar: true },
  heal: { category: "CATEGORY_RECOVER", hint: "HINTMSG_RECOVER", scalar: true },
  "mill-top": {
    category: "CATEGORY_DECKDES",
    hint: "HINTMSG_TOGRAVE",
    scalar: true,
  },
  "to-deck": { category: "CATEGORY_TODECK", hint: "HINTMSG_TODECK" },
  "send-grave": { category: "CATEGORY_TOGRAVE", hint: "HINTMSG_TOGRAVE" },
  "discard-hand": { category: "CATEGORY_HANDES", hint: "HINTMSG_DISCARD" },
  "change-position": {
    category: "CATEGORY_POSITION",
    hint: "HINTMSG_POSCHANGE",
  },
  control: { category: "CATEGORY_CONTROL", hint: "HINTMSG_CONTROL" },
  "negate-activation": {
    category: "CATEGORY_NEGATE",
    hint: "HINTMSG_FACEUP",
    scalar: true,
  },
  "negate-effect": {
    category: "CATEGORY_DISABLE",
    hint: "HINTMSG_FACEUP",
    scalar: true,
  },
  disable: { category: "CATEGORY_DISABLE", hint: "HINTMSG_FACEUP" },
  equip: { category: "CATEGORY_EQUIP", hint: "HINTMSG_EQUIP" },
  "add-counter": { category: "CATEGORY_COUNTER", hint: "HINTMSG_COUNTER" },
  "remove-counter": { category: "CATEGORY_COUNTER", hint: "HINTMSG_COUNTER" },
  "attach-material": { category: "0", hint: "HINTMSG_XMATERIAL" },
  "detach-material": { category: "0", hint: "HINTMSG_REMOVEXYZ", scalar: true },
  "set-spelltrap": { category: "0", hint: "HINTMSG_SET" },
  "declare-race": { category: "0", hint: "HINTMSG_FACEUP" },
  "declare-attribute": { category: "0", hint: "HINTMSG_FACEUP" },
};
const legacy = new Set([
  "search",
  "recover",
  "draw",
  "mill",
  "destroy",
  "bounce",
  "banish",
  "revive",
  "summon",
  "self-summon",
  "boost",
]);
export const usesOperations = (block: EffectBlock) =>
  !["custom-effect", "self-summon", "summoning"].includes(block.template) &&
  (!legacy.has(block.template) || !!block.tracking?.length);
export function blockOperations(block: EffectBlock): EffectOperation[] {
  if (block.template === "sequence") return block.operations || [];
  const defaults = createOperation(block.template as OperationAction);
  return [
    {
      ...defaults,
      amount: block.amount,
      source: block.source,
      players: block.players,
      filter: block.filter,
      attack: block.attack,
      defense: block.defense,
      value: block.value,
      counterType: block.counterType,
      position: block.position,
      duration: block.duration,
      destination: block.destination,
    },
  ];
}
export function extraFilterClauses(f: CardFilter): string[] {
  const out: string[] = [];
  if (f.codes?.length) out.push(`c:IsCode(${f.codes.join(",")})`);
  for (const [key, method] of [
    ["minAttack", "IsAttackAbove"],
    ["maxAttack", "IsAttackBelow"],
    ["minDefense", "IsDefenseAbove"],
    ["maxDefense", "IsDefenseBelow"],
    ["minRank", "IsRankAbove"],
    ["maxRank", "IsRankBelow"],
    ["minLink", "IsLinkAbove"],
    ["maxLink", "IsLinkBelow"],
  ] as const)
    if (f[key] != null) out.push(`c:${method}(${f[key]})`);
  if (f.tuner != null) out.push(`${f.tuner ? "" : "not "}c:IsType(TYPE_TUNER)`);
  if (f.effect != null)
    out.push(
      `c:IsType(TYPE_MONSTER) and ${f.effect ? "" : "not "}c:IsType(TYPE_EFFECT)`,
    );
  if (f.extraDeck != null)
    out.push(
      `${f.extraDeck ? "" : "not "}c:IsType(TYPE_FUSION+TYPE_SYNCHRO+TYPE_XYZ+TYPE_LINK)`,
    );
  if (f.expression?.trim()) out.push(`(${f.expression.trim()})`);
  return out;
}
export function validateFilterExtra(f: CardFilter): string[] {
  const errors: string[] = [];
  if (f.effect != null && typeof f.effect !== "boolean")
    errors.push("效果怪兽筛选必须为布尔值。");
  if (
    f.codes &&
    (f.codes.length > 100 ||
      f.codes.some((n) => !Number.isInteger(n) || n < 128 || n > 0xfffffff))
  )
    errors.push("筛选卡号须为有效卡号，最多 100 个。");
  for (const [min, max, limit] of [
    ["minAttack", "maxAttack", 999999],
    ["minDefense", "maxDefense", 999999],
    ["minRank", "maxRank", 13],
    ["minLink", "maxLink", 8],
  ] as const) {
    if (
      [f[min], f[max]].some(
        (n) => n != null && (!Number.isInteger(n) || n < 0 || n > limit),
      ) ||
      (f[min] != null && f[max] != null && f[min]! > f[max]!)
    )
      errors.push(`${min}/${max} 筛选范围无效。`);
  }
  if (f.expression) {
    try {
      luaparse.parse(`function check(c,e,tp) return (${f.expression}) end`, {
        luaVersion: "5.3",
      });
    } catch {
      errors.push("高级筛选 Lua 表达式语法无效。");
    }
  }
  return errors;
}
export function validateOperations(block: EffectBlock): string[] {
  if (!usesOperations(block)) return [];
  const ops = blockOperations(block),
    errors: string[] = [];
  if (!ops.length || ops.length > 16)
    errors.push("复合效果需要 1–16 个处理步骤。");
  if (new Set(ops.map((op) => op.uid)).size !== ops.length)
    errors.push("处理步骤的标识不能重复。");
  for (const [i, op] of ops.entries()) {
    const add = (s: string) => errors.push(`处理 ${i + 1}：${s}`);
    if (!OPERATION_META[op.action]) {
      add("未知处理类型。");
      continue;
    }
    if (!Number.isInteger(op.amount) || op.amount < 1 || op.amount > 40)
      add("数量须为 1–40。");
    if (
      !ZONE_LUA[op.source] ||
      !["self", "opponent", "both"].includes(op.players)
    )
      add("区域或玩家无效。");
    if (
      ![
        "target",
        "select",
        "all",
        "self",
        "previous",
        "target-group",
        "result",
      ].includes(op.selection)
    )
      add("选择方式无效。");
    if (op.targetOverlap && !["allow", "disallow"].includes(op.targetOverlap))
      add("对象组重叠规则无效。");
    if (op.targetName && op.targetName.length > 80)
      add("对象组名称最多 80 个字符。");
    if (
      op.selection === "target-group" &&
      !ops.some(
        (other) =>
          other.uid === op.reference &&
          other.selection === "target" &&
          !OPERATION_META[other.action]?.scalar,
      )
    )
      add("请选择有效的发动对象组。");
    if (
      op.selection === "result" &&
      !ops.slice(0, i).some((other) => other.uid === op.reference)
    )
      add("结果来源必须是前面的处理步骤。");
    if (
      OPERATION_META[op.action].scalar &&
      ["target-group", "result"].includes(op.selection)
    )
      add("该处理不能引用卡片组。");
    if (!["always", "if-success", "if-failed"].includes(op.next))
      add("步骤衔接无效。");
    if (op.timing && !["separate", "together"].includes(op.timing))
      add("处理时点无效。");
    if (i === 0 && (op.selection === "previous" || op.next !== "always"))
      add("第一步不能依赖上一处理。");
    if (op.selection === "target" && op.optional)
      add("发动时选对象的步骤不能设为处理时任意执行。");
    if (
      op.selection === "self" &&
      !OPERATION_META[op.action].scalar &&
      op.amount !== 1
    )
      add("自身处理的卡片数量须为 1；指示物数量请使用数值字段。");
    if (
      ["damage", "heal"].includes(op.action) &&
      (!Number.isInteger(op.value ?? 800) ||
        (op.value ?? 800) < 1 ||
        (op.value ?? 800) > 999999)
    )
      add("基本分数值须为 1–999999。");
    if (
      ["add-counter", "remove-counter"].includes(op.action) &&
      (!Number.isInteger(op.counterType ?? 0x1001) ||
        (op.counterType ?? 0x1001) < 1 ||
        (op.counterType ?? 0x1001) > 0xffff)
    )
      add("指示物类型须为 1–65535。");
    if (
      ["add-counter", "remove-counter"].includes(op.action) &&
      (!Number.isInteger(op.value ?? 1) ||
        (op.value ?? 1) < 1 ||
        (op.value ?? 1) > 65535)
    )
      add("指示物数量须为 1–65535。");
    if (
      ["negate-activation", "negate-effect"].includes(op.action) &&
      block.trigger !== "chain"
    )
      add("连锁无效处理需要连锁响应入口。");
    if (op.action === "discard-hand" && op.source !== "hand")
      add("丢弃手牌的来源必须是手牌。");
    if (
      ["revive", "summon"].includes(op.action) &&
      (op.source === "extra" || op.amount !== 1 || op.selection === "all")
    )
      add("特殊召唤目前每步支持 1 只主卡组怪兽；额外或同时特召请用高级回调。");
    if (
      [
        "equip",
        "control",
        "change-position",
        "boost",
        "disable",
        "declare-race",
        "declare-attribute",
      ].includes(op.action) &&
      !["field", "monster", "spelltrap"].includes(op.source) &&
      !["previous", "result", "target-group"].includes(op.selection)
    )
      add("该处理需要场上的卡。");
    if (
      op.action === "equip" &&
      (op.amount !== 1 || ["all", "self"].includes(op.selection))
    )
      add("装备自身需要选择另一只怪兽。");
    if (op.action === "control" && (op.amount !== 1 || op.selection === "all"))
      add("获得控制权每步支持 1 只怪兽。");
    if (op.action === "attach-material" && op.selection === "self")
      add("叠放素材须选择此卡以外的卡。");
    if (op.action === "discard-hand" && op.selection === "target")
      add("手牌丢弃请使用处理时选择，不能选择隐藏手牌为对象。");
    if (
      op.position &&
      !["faceup-attack", "faceup-defense", "facedown-defense"].includes(
        op.position,
      )
    )
      add("表示形式无效。");
    if (
      op.destination &&
      !["shuffle", "top", "bottom"].includes(op.destination)
    )
      add("返回卡组位置无效。");
    if (op.duration && !["turn", "permanent"].includes(op.duration))
      add("持续时间无效。");
    const f = op.filter;
    if (f.kind && !["any", "monster", "spell", "trap"].includes(f.kind))
      add("卡种筛选无效。");
    if (f.race != null && !RACES.some((r) => r.value === f.race))
      add("种族筛选无效。");
    if (f.attribute != null && !ATTRIBUTES.some((a) => a.value === f.attribute))
      add("属性筛选无效。");
    if (
      f.setcode != null &&
      (!Number.isInteger(f.setcode) || f.setcode < 1 || f.setcode > 65535)
    )
      add("系列代码筛选无效。");
    if (
      [f.minLevel, f.maxLevel].some(
        (n) => n != null && (!Number.isInteger(n) || n < 1 || n > 13),
      ) ||
      (f.minLevel != null && f.maxLevel != null && f.minLevel > f.maxLevel)
    )
      add("等级筛选范围无效。");
    for (const value of [op.attack, op.defense])
      if (!Number.isInteger(value) || Math.abs(value) > 999999)
        add("攻守变化须为有效整数。");
    if (op.action === "boost" && op.attack === 0 && op.defense === 0)
      add("攻守变化不能均为 0。");
    for (const error of validateFilterExtra(op.filter)) add(error);
  }
  return errors;
}
function predicate(op: EffectOperation): string {
  const f = op.filter,
    out = extraFilterClauses(f);
  if (f.kind && f.kind !== "any")
    out.push(`c:IsType(TYPE_${f.kind.toUpperCase()})`);
  if (f.setcode) out.push(`c:IsSetCard(${f.setcode})`);
  if (f.race) out.push(`c:IsRace(${f.race})`);
  if (f.attribute)
    out.push(`c:IsAttribute(ATTRIBUTE_${f.attribute.toUpperCase()})`);
  if (f.minLevel != null) out.push(`c:IsLevelAbove(${f.minLevel})`);
  if (f.maxLevel != null) out.push(`c:IsLevelBelow(${f.maxLevel})`);
  if (f.faceup) out.push("c:IsFaceup()");
  if (f.excludeSelfName) out.push("not c:IsCode(id)");
  const ability: Partial<Record<OperationAction, string>> = {
    search: "c:IsAbleToHand()",
    recover: "c:IsAbleToHand()",
    bounce: "c:IsAbleToHand()",
    mill: "c:IsAbleToGrave()",
    "send-grave": "c:IsAbleToGrave()",
    "to-deck": "c:IsAbleToDeck()",
    banish: "c:IsAbleToRemove()",
    "discard-hand": "c:IsDiscardable(REASON_EFFECT)",
    summon:
      "c:IsType(TYPE_MONSTER) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)",
    revive:
      "c:IsType(TYPE_MONSTER) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)",
    boost: "c:IsFaceup() and c:IsType(TYPE_MONSTER)",
    disable: "c:IsFaceup()",
    equip: "c:IsFaceup() and c:IsType(TYPE_MONSTER) and c~=e:GetHandler()",
    control:
      "c:IsType(TYPE_MONSTER) and c:IsControler(1-tp) and c:IsControlerCanBeChanged()",
    "change-position":
      op.position === "facedown-defense"
        ? "c:IsCanTurnSet()"
        : "c:IsCanChangePosition()",
    "set-spelltrap": "c:IsType(TYPE_SPELL+TYPE_TRAP) and c:IsSSetable()",
    "add-counter": `c:IsFaceup() and c:IsCanAddCounter(${op.counterType ?? 0x1001},${op.value ?? 1})`,
    "remove-counter": `c:IsCanRemoveCounter(tp,${op.counterType ?? 0x1001},${op.value ?? 1},REASON_EFFECT)`,
    "attach-material":
      "c~=e:GetHandler() and not c:IsType(TYPE_TOKEN) and not c:IsImmuneToEffect(e)",
    "declare-race": "c:IsFaceup() and c:IsType(TYPE_MONSTER)",
    "declare-attribute": "c:IsFaceup() and c:IsType(TYPE_MONSTER)",
  };
  if (ability[op.action]) out.push(ability[op.action]!);
  if (op.action === "boost" && op.attack === 0 && op.defense !== 0)
    out.push("c:IsHasDefense()");
  return out.length ? out.join(" and ") : "true";
}
const base = "e,tp,eg,ep,ev,re,r,rp";
function players(op: EffectOperation): string[] {
  return op.players === "both"
    ? ["tp", "1-tp"]
    : [op.players === "opponent" ? "1-tp" : "tp"];
}
function zonePair(op: EffectOperation) {
  const zone = ZONE_LUA[op.source];
  return `${op.players === "opponent" ? "0" : zone},${op.players === "self" ? "0" : zone}`;
}
function scalarCheck(op: EffectOperation): string | undefined {
  if (op.action === "draw")
    return players(op)
      .map((p) => `Duel.IsPlayerCanDraw(${p},${op.amount})`)
      .join(" and ");
  if (op.action === "mill-top")
    return players(op)
      .map((p) => `Duel.IsPlayerCanDiscardDeck(${p},${op.amount})`)
      .join(" and ");
  if (op.action === "negate-activation")
    return `re~=nil and Duel.IsChainNegatable(ev)${op.players === "both" ? "" : op.players === "self" ? " and rp==tp" : " and rp==1-tp"}`;
  if (op.action === "negate-effect")
    return `re~=nil and Duel.IsChainDisablable(ev)${op.players === "both" ? "" : op.players === "self" ? " and rp==tp" : " and rp==1-tp"}`;
  if (op.action === "detach-material")
    return `e:GetHandler():CheckRemoveOverlayCard(tp,${op.amount},REASON_EFFECT)`;
  if (op.action === "damage" || op.action === "heal") return "true";
}
function extraCheck(op: EffectOperation): string {
  if (["revive", "summon", "control"].includes(op.action))
    return "Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and ";
  if (op.action === "equip")
    return "(e:GetHandler():IsLocation(LOCATION_SZONE) or Duel.GetLocationCount(tp,LOCATION_SZONE)>0) and ";
  if (op.action === "set-spelltrap")
    return `Duel.GetLocationCount(tp,LOCATION_SZONE)>=${op.selection === "all" ? 1 : op.amount} and `;
  if (op.action === "attach-material")
    return "e:GetHandler():IsFaceup() and e:GetHandler():IsType(TYPE_XYZ) and e:GetHandler():IsLocation(LOCATION_MZONE) and ";
  return "";
}
export function operationCategory(block: EffectBlock): string {
  return (
    [
      ...new Set(
        blockOperations(block).flatMap((o) =>
          (OPERATION_META[o.action]?.category || "0").split("+"),
        ),
      ),
    ]
      .filter((v) => v !== "0")
      .join("+") || "0"
  );
}
export function operationsHaveTarget(block: EffectBlock): boolean {
  return blockOperations(block).some(
    (o) => o.selection === "target" && !OPERATION_META[o.action]?.scalar,
  );
}

/** Builds a jointly feasible assignment before offering any activation target. */
function emitTargetGroups(
  targeted: { op: EffectOperation; i: number }[],
  block: EffectBlock,
  fn: string,
  func: (name: string, args: string, lines: string[]) => void,
) {
  const counts = targeted.map(({ op }) => op.amount).join(",");
  const overlaps = targeted
    .map(({ op }) => (op.targetOverlap === "allow" ? "true" : "false"))
    .join(",");
  func(`${fn}targetpool`, "e,tp", [
    "local pool={}",
    ...targeted.map(({ op, i }, n) => {
      const exclude =
        ["attach-material", "equip"].includes(op.action) ||
        block.trigger === "activate"
          ? "e:GetHandler()"
          : "nil";
      return `pool[${n + 1}]=Duel.GetMatchingGroup(function(c) return c:IsCanBeEffectTarget(e) and ${fn}step${i + 1}filter(c,e,tp) end,tp,${zonePair(op)},${exclude})`;
    }),
    "return pool",
  ]);
  func(`${fn}assignment`, "pool,picked", [
    `local counts={${counts}}`,
    `local overlap={${overlaps}}`,
    "local allowcount=0",
    "for i=1,#pool do if overlap[i] then allowcount=allowcount+1 end end",
    "for i,g in ipairs(picked) do",
    "\tfor j=1,i-1 do",
    "\t\tif not (overlap[i] and overlap[j]) and g:IsExists(function(c) return picked[j]:IsContains(c) end,1,nil) then return false end",
    "\tend",
    "end",
    "local function available(c,index)",
    "\tfor j,g in ipairs(picked) do",
    "\t\tif g:IsContains(c) and (j==index or not (overlap[index] and overlap[j])) then return false end",
    "\tend",
    "\treturn true",
    "end",
    // With at most one shareable group the problem is ordinary capacitated
    // bipartite matching. Augmenting paths avoid exponential subset enumeration.
    "if allowcount<=1 then",
    "\tlocal fixed={} local owner={} local slots={}",
    "\tfor i,g in ipairs(picked) do",
    "\t\tfor c in aux.Next(g) do if fixed[c] then return false end fixed[c]=true end",
    "\t\tfor n=g:GetCount()+1,counts[i] do slots[#slots+1]=i end",
    "\tend",
    "\tlocal function augment(slot,seen)",
    "\t\tfor c in aux.Next(pool[slots[slot]]) do",
    "\t\t\tif not fixed[c] and not seen[c] then",
    "\t\t\t\tseen[c]=true",
    "\t\t\t\tif not owner[c] or augment(owner[c],seen) then owner[c]=slot return true end",
    "\t\t\tend",
    "\t\tend",
    "\t\treturn false",
    "\tend",
    "\tfor slot=1,#slots do if not augment(slot,{}) then return false end end",
    "\treturn true",
    "end",
    // Shareable groups can share with one another, but never with exclusive
    // groups. Only the exclusive assignments need searching.
    "local function solve()",
    "\tlocal choice=nil local choices=nil local slack=nil",
    "\tfor i,g in ipairs(picked) do",
    "\t\tlocal needed=counts[i]-g:GetCount()",
    "\t\tlocal candidates=pool[i]:Filter(available,nil,i)",
    "\t\tif candidates:GetCount()<needed then return false end",
    "\t\tif not overlap[i] and needed>0 and (not slack or candidates:GetCount()-needed<slack) then",
    "\t\t\tchoice=i choices=candidates slack=candidates:GetCount()-needed",
    "\t\tend",
    "\tend",
    "\tif not choice then return true end",
    "\tfor c in aux.Next(choices) do",
    "\t\tpicked[choice]:AddCard(c)",
    "\t\tlocal ok=solve()",
    "\t\tpicked[choice]:RemoveCard(c)",
    "\t\tif ok then return true end",
    "\tend",
    "\treturn false",
    "end",
    "return solve()",
  ]);
  func(`${fn}canselect`, "e,tp,chkc", [
    `local pool=${fn}targetpool(e,tp)`,
    "local picked={}",
    "for i=1,#pool do picked[i]=Group.CreateGroup() end",
    `if not chkc then return ${fn}assignment(pool,picked) end`,
    "for i,g in ipairs(pool) do",
    "\tif g:IsContains(chkc) then",
    "\t\tpicked[i]:AddCard(chkc)",
    `\t\tlocal ok=${fn}assignment(pool,picked)`,
    "\t\tpicked[i]:RemoveCard(chkc)",
    "\t\tif ok then return true end",
    "\tend",
    "end",
    "return false",
  ]);
  func(`${fn}selecttargets`, "e,tp", [
    `local pool=${fn}targetpool(e,tp)`,
    "local picked={} local targets={} local combined=Group.CreateGroup()",
    "for i=1,#pool do picked[i]=Group.CreateGroup() end",
    ...targeted.flatMap(({ op }, index) => [
      ...(targeted.length === 1
        ? [
            `Duel.Hint(HINT_SELECTMSG,tp,${OPERATION_META[op.action].hint})`,
            `picked[1]=pool[1]:Select(tp,${op.amount},${op.amount},nil)`,
          ]
        : [
            `for n=1,${op.amount} do`,
            `\tlocal options=pool[${index + 1}]:Filter(function(c)`,
            `\t\tif picked[${index + 1}]:IsContains(c) then return false end`,
            `\t\tpicked[${index + 1}]:AddCard(c)`,
            `\t\tlocal ok=${fn}assignment(pool,picked)`,
            `\t\tpicked[${index + 1}]:RemoveCard(c)`,
            "\t\treturn ok",
            "\tend,nil)",
            `\tDuel.Hint(HINT_SELECTMSG,tp,${OPERATION_META[op.action].hint})`,
            `\tpicked[${index + 1}]:Merge(options:Select(tp,1,1,nil))`,
            "end",
          ]),
      `targets[${JSON.stringify(op.uid)}]=picked[${index + 1}]`,
      `picked[${index + 1}]:KeepAlive()`,
      `combined:Merge(picked[${index + 1}])`,
    ]),
    "Duel.SetTargetCard(combined)",
    "local chainid=Duel.GetChainInfo(0,CHAININFO_CHAIN_ID)",
    "local cleanup={} local closed=false",
    "local function close()",
    "\tif closed then return end closed=true",
    "\tfor _,g in pairs(targets) do g:DeleteGroup() end",
    `\t${fn}contexts[chainid]=nil`,
    "\tfor _,ce in ipairs(cleanup) do ce:Reset() end",
    "end",
    `for _,code in ipairs({EVENT_CHAIN_NEGATED,EVENT_CHAIN_DISABLED,EVENT_CHAIN_END}) do`,
    "\tlocal ce=Effect.CreateEffect(e:GetHandler())",
    "\tce:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)",
    "\tce:SetCode(code)",
    "\tce:SetOperation(function(_,_,_,_,ev)",
    "\t\tif code==EVENT_CHAIN_END or Duel.GetChainInfo(ev,CHAININFO_CHAIN_ID)==chainid then close() end",
    "\tend)",
    "\tce:SetReset(RESET_CHAIN)",
    "\tDuel.RegisterEffect(ce,tp)",
    "\tcleanup[#cleanup+1]=ce",
    "end",
    `${fn}contexts[chainid]={targets=targets,close=close}`,
    "return targets",
  ]);
}

/** The core stores one operation-info entry per category; repeated calls overwrite. */
function emitOperationInfo(ops: EffectOperation[]): string[] {
  const buckets = new Map<string, EffectOperation[]>();
  for (const op of ops) {
    for (const category of OPERATION_META[op.action].category.split("+")) {
      if (category === "0") continue;
      buckets.set(category, [...(buckets.get(category) || []), op]);
    }
  }
  const lines: string[] = [];
  const numeric = new Set(["draw", "mill-top", "damage", "heal"]);
  for (const [category, entries] of buckets) {
    const conditional =
      entries.length > 1 &&
      entries.some((op) => op.optional || op.next !== "always");
    const scopes = new Set(entries.map((op) => op.players));
    const player =
      scopes.has("both") || scopes.size > 1
        ? "PLAYER_ALL"
        : scopes.has("opponent")
          ? "1-tp"
          : "tp";
    if (entries.every((op) => numeric.has(op.action))) {
      const amountFor = (scope: "self" | "opponent") =>
        entries.reduce(
          (total, op) =>
            total +
            (op.players === scope || op.players === "both"
              ? ["damage", "heal"].includes(op.action)
                ? (op.value ?? 800)
                : op.amount
              : 0),
          0,
        );
      const own = amountFor("self"),
        opposing = amountFor("opponent");
      // One slot cannot express different totals for each player. Zero means
      // an unknown amount, rather than falsely reporting one player's total.
      const value = conditional
        ? 0
        : player === "PLAYER_ALL"
          ? own === opposing
            ? own
            : 0
          : player === "tp"
            ? own
            : opposing;
      lines.push(
        `Duel.SetOperationInfo(0,${category},nil,0,${player},${value})`,
      );
      continue;
    }
    const groups: string[] = [];
    let dynamic = conditional;
    const zones = new Set<string>();
    for (const op of entries) {
      if (["negate-activation", "negate-effect"].includes(op.action))
        groups.push("eg");
      else {
        zones.add(ZONE_LUA[op.source]);
        if (op.selection === "target")
          groups.push(`targets[${JSON.stringify(op.uid)}]`);
        else if (op.selection === "target-group")
          groups.push(`targets[${JSON.stringify(op.reference || "")}]`);
        else if (op.selection === "self")
          groups.push("Group.FromCards(e:GetHandler())");
        else dynamic = true;
      }
    }
    const location = [...zones].map((zone) => `(${zone})`).join("|") || "0";
    if (dynamic) {
      // A later selection/result can overlap earlier groups and can change
      // cardinality. Do not publish a partial group as the complete target set.
      const count =
        entries.length === 1 && entries[0].selection === "select"
          ? entries[0].amount
          : 0;
      lines.push(
        `Duel.SetOperationInfo(0,${category},nil,${count},${player},${location})`,
      );
    } else {
      lines.push("do", "\tlocal info=Group.CreateGroup()");
      for (const group of new Set(groups)) lines.push(`\tinfo:Merge(${group})`);
      lines.push(
        `\tDuel.SetOperationInfo(0,${category},info,info:GetCount(),${player},${location})`,
        "end",
      );
    }
  }
  return lines;
}

/** Target groups are isolated by chain ID, including multiple activations of the same Effect. */
export function emitOperations(
  block: EffectBlock,
  fn: string,
  descriptionIndex: number,
): string[] {
  const ops = blockOperations(block),
    functions: string[] = [];
  const func = (name: string, args: string, lines: string[]) =>
    functions.push(
      `function ${name}(${args})\n${lines.map((l) => `\t${l}`).join("\n")}\nend`,
    );
  const checks: string[] = [];
  const targeted = ops
    .map((op, i) => ({ op, i }))
    .filter(
      ({ op }) =>
        op.selection === "target" && !OPERATION_META[op.action].scalar,
    );
  const references = ["previous", "target-group", "result"];
  if (targeted.length) {
    functions.push(`${fn}contexts=${fn}contexts or {}`);
    emitTargetGroups(targeted, block, fn, func);
    checks.push(`${fn}canselect(e,tp)`);
  }
  ops.forEach((op, i) => {
    const step = `${fn}step${i + 1}`,
      filter = `${step}filter`;
    const isScalar = OPERATION_META[op.action].scalar;
    const temporary = isTemporaryBanish(
      block,
      block.template === "sequence" ? op.uid : block.uid,
    );
    if (!isScalar)
      func(filter, "c,e,tp", [
        `return ${predicate(op)}${temporary ? " and c:IsOnField()" : ""}`,
      ]);
    // Necrovalley is tested during resolution; its presence does not forbid targeting.
    const resolutionFilter = op.source.includes("grave")
      ? `aux.NecroValleyFilter(${filter})`
      : filter;
    const exclude =
      op.action === "attach-material" ||
      op.action === "equip" ||
      block.trigger === "activate"
        ? "e:GetHandler()"
        : "nil";
    const exist = isScalar
      ? scalarCheck(op)!
      : references.includes(op.selection)
        ? "true"
        : op.selection === "self"
          ? `${filter}(e:GetHandler(),e,tp)`
          : `Duel.${op.selection === "target" ? "IsExistingTarget" : "IsExistingMatchingCard"}(${filter},tp,${zonePair(op)},${op.selection === "all" ? 1 : op.amount},${exclude},e,tp)`;
    const check = `${extraCheck(op)}${exist}`;
    // Mandatory independent steps must be possible when the effect is activated.
    if (
      op.selection === "target" ||
      (!op.optional &&
        op.next === "always" &&
        !references.includes(op.selection))
    )
      checks.push(`(${check})`);
    const opLines: string[] = [];
    if (isScalar) {
      if (["negate-activation", "negate-effect"].includes(op.action)) {
        opLines.push(
          `if not (${check}) then return false,nil end`,
          `local affected=Duel.${op.action === "negate-activation" ? "NegateActivation" : "NegateEffect"}(ev)`,
          "return affected,re:GetHandler():IsRelateToEffect(re) and Group.FromCards(re:GetHandler()) or nil",
        );
      } else if (op.action === "detach-material") {
        opLines.push(
          `if not (${check}) then return false,nil end`,
          `local affected=e:GetHandler():RemoveOverlayCard(tp,${op.amount},${op.amount},REASON_EFFECT)`,
          "return affected>0,Duel.GetOperatedGroup():Clone()",
        );
      } else {
        const method = {
          draw: "Draw",
          damage: "Damage",
          heal: "Recover",
          "mill-top": "DiscardDeck",
        }[op.action as "draw" | "damage" | "heal" | "mill-top"];
        const value = ["damage", "heal"].includes(op.action)
          ? (op.value ?? 800)
          : op.amount;
        const cards = ["draw", "mill-top"].includes(op.action);
        opLines.push(
          "local affected=0",
          ...(cards ? ["local result=Group.CreateGroup()"] : []),
        );
        for (const p of players(op))
          opLines.push(
            `affected=affected+Duel.${method}(${p},${value},REASON_EFFECT)`,
            ...(cards
              ? [
                  `result:Merge(Duel.GetOperatedGroup():Filter(Card.IsLocation,nil,${op.action === "draw" ? "LOCATION_HAND" : "LOCATION_GRAVE"}))`,
                ]
              : []),
          );
        opLines.push(
          `return ${cards ? "result:GetCount()>0,result" : "affected>0,nil"}`,
        );
      }
    } else {
      if (extraCheck(op))
        opLines.push(
          `if not (${extraCheck(op)}true) then return false,nil end`,
        );
      if (op.action === "attach-material" || op.selection === "self")
        opLines.push(
          "if not e:GetHandler():IsRelateToEffect(e) then return false,nil end",
        );
      if (op.selection === "target")
        opLines.push(
          `local g=targets[${JSON.stringify(op.uid)}]`,
          "if not g then return false,nil end",
          "g=g:Filter(Card.IsRelateToChain,nil,Duel.GetCurrentChain())",
        );
      else if (references.includes(op.selection))
        opLines.push(
          `local g=${op.selection === "previous" ? "previous" : `${op.selection === "result" ? "results" : "targets"}[${JSON.stringify(op.reference || "")}]`}`,
          "if not g then return false,nil end",
          ...(op.selection === "target-group"
            ? ["g=g:Filter(Card.IsRelateToChain,nil,Duel.GetCurrentChain())"]
            : []),
          `g=g:Filter(function(c) return c:IsLocation(${ZONE_LUA[op.source]})${op.players === "both" ? "" : ` and c:IsControler(${op.players === "self" ? "tp" : "1-tp"})`} and ${resolutionFilter}(c,e,tp) end,nil)`,
        );
      else if (op.selection === "self")
        opLines.push(
          `if not ${resolutionFilter}(e:GetHandler(),e,tp) then return false,nil end`,
          "local g=Group.FromCards(e:GetHandler())",
        );
      else if (op.selection === "all")
        opLines.push(
          `local g=Duel.GetMatchingGroup(${resolutionFilter},tp,${zonePair(op)},${exclude},e,tp)`,
        );
      else
        opLines.push(
          `if not Duel.IsExistingMatchingCard(${resolutionFilter},tp,${zonePair(op)},${op.amount},${exclude},e,tp) then return false,nil end`,
          `Duel.Hint(HINT_SELECTMSG,tp,${OPERATION_META[op.action].hint})`,
          `local g=Duel.SelectMatchingCard(tp,${resolutionFilter},tp,${zonePair(op)},${op.amount},${op.amount},${exclude},e,tp)`,
        );
      if (
        op.source.includes("grave") &&
        ["target", ...references].includes(op.selection)
      )
        opLines.push("g=g:Filter(aux.NecroValleyFilter(),nil)");
      opLines.push("if g:GetCount()==0 then return false,g end");
      opLines.push(...cardOperation(op, temporary));
    }
    func(step, `${base},previous,targets,results`, opLines);
  });
  const chkcGuard = targeted.length
    ? `if chkc then return ${fn}canselect(e,tp,chkc) end`
    : "if chkc then return false end";
  func(`${fn}target`, `${base},chk,chkc`, [
    chkcGuard,
    `if chk==0 then return ${checks.join(" and ") || "true"} end`,
    ...(targeted.length ? [`local targets=${fn}selecttargets(e,tp)`] : []),
    ...emitOperationInfo(ops),
  ]);
  const runner = [
    "local success=true",
    "local previous=nil",
    "local results={}",
    ...(targeted.length
      ? [
          "local chainid=Duel.GetChainInfo(0,CHAININFO_CHAIN_ID)",
          `local context=${fn}contexts[chainid]`,
          "local targets={}",
          "if context then for key,g in pairs(context.targets) do targets[key]=g end end",
          ...(targeted.length === 1
            ? [
                `targets[${JSON.stringify(targeted[0].op.uid)}]=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS)`,
              ]
            : []),
        ]
      : ["local targets={}"]),
  ];
  ops.forEach((op, i) => {
    const condition = [
      op.next === "if-success"
        ? "success"
        : op.next === "if-failed"
          ? "not success"
          : "true",
      op.optional
        ? `Duel.SelectYesNo(tp,aux.Stringid(id,${descriptionIndex}))`
        : "true",
    ].join(" and ");
    runner.push(
      `if ${condition} then`,
      ...(i && op.timing !== "together" ? ["\tDuel.BreakEffect()"] : []),
      `\tsuccess,previous=${fn}step${i + 1}(${base},previous,targets,results)`,
      "\tif not success then previous=nil end",
      `\tif previous then previous:KeepAlive() results[${JSON.stringify(op.uid)}]=previous end`,
      ...emitTrackingRegistration(
        block,
        descriptionIndex,
        block.template === "sequence" ? op.uid : block.uid,
        "previous",
      ).map((line) => `\t${line}`),
      "else",
      "\tsuccess=false",
      "\tprevious=nil",
      "end",
    );
  });
  runner.push("for _,g in pairs(results) do g:DeleteGroup() end");
  if (targeted.length) runner.push("if context then context.close() end");
  func(`${fn}operation`, base, runner);
  return functions;
}
function cardOperation(op: EffectOperation, temporary = false): string[] {
  const action = op.action,
    reset = `RESET_EVENT+RESETS_STANDARD${op.duration === "permanent" ? "" : "+RESET_PHASE+PHASE_END"}`;
  const moved = (expression: string, destination?: string) => [
    `local affected=${expression}`,
    ...(destination
      ? [
          `local result=Duel.GetOperatedGroup():Filter(Card.IsLocation,nil,${destination})`,
          "return result:GetCount()>0,result",
        ]
      : ["return affected>0,Duel.GetOperatedGroup():Clone()"]),
  ];
  if (action === "destroy") return moved("Duel.Destroy(g,REASON_EFFECT)");
  if (["recover", "bounce", "search"].includes(action))
    return [
      "local affected=Duel.SendtoHand(g,nil,REASON_EFFECT)",
      ...(action === "search"
        ? [
            "local revealed=Duel.GetOperatedGroup():Filter(Card.IsLocation,nil,LOCATION_HAND)",
            "Duel.ConfirmCards(1-tp,revealed)",
          ]
        : []),
      "local result=Duel.GetOperatedGroup():Filter(Card.IsLocation,nil,LOCATION_HAND)",
      "return result:GetCount()>0,result",
    ];
  if (["mill", "send-grave", "discard-hand"].includes(action))
    return moved(
      `Duel.SendtoGrave(g,REASON_EFFECT${action === "discard-hand" ? "+REASON_DISCARD" : ""})`,
      "LOCATION_GRAVE",
    );
  if (action === "banish")
    return moved(
      `Duel.Remove(g,POS_FACEUP,REASON_EFFECT${temporary ? "+REASON_TEMPORARY" : ""})`,
      "LOCATION_REMOVED",
    );
  if (action === "to-deck")
    return moved(
      `Duel.SendtoDeck(g,nil,${op.destination === "top" ? 0 : op.destination === "bottom" ? 1 : 2},REASON_EFFECT)`,
      "LOCATION_DECK+LOCATION_EXTRA",
    );
  if (["revive", "summon"].includes(action))
    return moved(
      "Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)",
      "LOCATION_MZONE",
    );
  if (action === "change-position")
    return moved(
      `Duel.ChangePosition(g,${op.position === "faceup-attack" ? "POS_FACEUP_ATTACK" : op.position === "faceup-defense" ? "POS_FACEUP_DEFENSE" : "POS_FACEDOWN_DEFENSE"})`,
    );
  if (action === "control")
    return moved(
      `Duel.GetControl(g,tp,${op.duration === "permanent" ? "0,0" : "PHASE_END,1"})`,
    );
  if (action === "set-spelltrap") return moved("Duel.SSet(tp,g)");
  if (action === "attach-material")
    return [
      "Duel.Overlay(e:GetHandler(),g)",
      "local attached=g:Filter(function(tc) return tc:GetOverlayTarget()==e:GetHandler() end,nil)",
      "return attached:GetCount()>0,attached",
    ];
  if (action === "equip")
    return [
      "local tc=g:GetFirst()",
      "local c=e:GetHandler()",
      "if not c:IsRelateToEffect(e) or not tc:IsFaceup() or not tc:IsLocation(LOCATION_MZONE) then return false,g end",
      "if not Duel.Equip(tp,c,tc) then return false,g end",
      "local limit=Effect.CreateEffect(c)",
      "limit:SetType(EFFECT_TYPE_SINGLE)",
      "limit:SetCode(EFFECT_EQUIP_LIMIT)",
      "limit:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)",
      "limit:SetReset(RESET_EVENT+RESETS_STANDARD)",
      "limit:SetValue(function(e,c) return c==e:GetHandler():GetEquipTarget() end)",
      "c:RegisterEffect(limit)",
      "return true,g",
    ];
  const lines = [
    "local affected=Group.CreateGroup()",
    "local tc=g:GetFirst()",
    "while tc do",
  ];
  if (["add-counter", "remove-counter"].includes(action)) {
    const counter = op.counterType ?? 0x1001;
    lines.push(
      `\tlocal before=tc:GetCounter(${counter})`,
      `\ttc:${action === "add-counter" ? `AddCounter(${counter},${op.value ?? 1})` : `RemoveCounter(tp,${counter},${op.value ?? 1},REASON_EFFECT)`}`,
      `\tif tc:GetCounter(${counter})~=before then affected:AddCard(tc) end`,
    );
  } else {
    lines.push(
      `\tif tc:IsFaceup() and tc:IsOnField() and not tc:IsImmuneToEffect(e)${action === "boost" || action.startsWith("declare-") ? " and tc:IsType(TYPE_MONSTER)" : ""} then`,
    );
    if (action === "disable")
      lines.push("\t\tDuel.NegateRelatedChain(tc,RESET_TURN_SET)");
    const changes: [string, string][] =
      action === "boost"
        ? ([
            ["EFFECT_UPDATE_ATTACK", String(op.attack)],
            ["EFFECT_UPDATE_DEFENSE", String(op.defense)],
          ].filter(([, v]) => v !== "0") as [string, string][])
        : action === "disable"
          ? [
              ["EFFECT_DISABLE", "1"],
              ["EFFECT_DISABLE_EFFECT", "1"],
            ]
          : [
              [
                action === "declare-race"
                  ? "EFFECT_CHANGE_RACE"
                  : "EFFECT_CHANGE_ATTRIBUTE",
                action === "declare-race"
                  ? "Duel.AnnounceRace(tp,1,RACE_ALL)"
                  : "Duel.AnnounceAttribute(tp,1,ATTRIBUTE_ALL)",
              ],
            ];
    for (const [code, value] of changes) {
      if (code === "EFFECT_UPDATE_DEFENSE")
        lines.push("\t\tif tc:IsHasDefense() then");
      lines.push(
        "\t\tlocal change=Effect.CreateEffect(e:GetHandler())",
        "\t\tchange:SetType(EFFECT_TYPE_SINGLE)",
        `\t\tchange:SetCode(${code})`,
        `\t\tchange:SetValue(${value})`,
        `\t\tchange:SetReset(${reset})`,
        "\t\ttc:RegisterEffect(change)",
        "\t\taffected:AddCard(tc)",
      );
      if (code === "EFFECT_UPDATE_DEFENSE") lines.push("\t\tend");
    }
    lines.push("\tend");
  }
  lines.push(
    "\ttc=g:GetNext()",
    "end",
    "return affected:GetCount()>0,affected",
  );
  return lines;
}

export function validateAdvanced(block: EffectBlock): string[] {
  if (block.template !== "custom-effect") return [];
  const config = block.advanced,
    errors: string[] = [];
  if (!config?.type.trim() || !config.code.trim())
    return ["高级效果需要填写 Effect 类型和代码。"];
  for (const key of [
    "type",
    "code",
    "category",
    "property",
    "value",
    "reset",
    "range",
  ] as const)
    if (config[key]?.trim()) {
      try {
        luaparse.parse(`local value=(${config[key]})`, { luaVersion: "5.3" });
      } catch {
        errors.push(`高级效果 ${key} 表达式语法无效。`);
      }
    }
  for (const key of [
    "condition",
    "cost",
    "target",
    "operation",
    "valueFunction",
  ] as const)
    if (config[key]?.trim()) {
      try {
        luaparse.parse(
          `function callback(${config.callbackArgs?.[key] || "e,tp,eg,ep,ev,re,r,rp,chk,chkc,..."})\n${config[key]}\nend`,
          { luaVersion: "5.3" },
        );
      } catch {
        errors.push(`高级效果 ${key} 回调 Lua 语法无效。`);
      }
    }
  if (
    config.targetRange?.some(
      (n) => !Number.isInteger(n) || n < 0 || n > 0xffffffff,
    )
  )
    errors.push("高级效果目标范围须为有效位掩码。");
  return errors;
}
export function emitAdvanced(
  card: Card,
  block: EffectBlock,
  fn: string,
  ev: string,
): { init: string[]; funcs: string[] } {
  const config = block.advanced!,
    init: string[] = [],
    funcs: string[] = [];
  for (const [key, setter] of [
    ["type", "SetType"],
    ["code", "SetCode"],
    ["category", "SetCategory"],
    ["property", "SetProperty"],
    ["reset", "SetReset"],
  ] as const)
    if (config[key]?.trim()) init.push(`${ev}:${setter}(${config[key]})`);
  init.push(
    `${ev}:SetRange(${config.range?.trim() || (block.scope === "pendulum" ? "LOCATION_PZONE" : block.range && block.range !== "field" ? ZONE_LUA[block.range] : ["spell", "trap"].includes(card.kind) ? "LOCATION_SZONE" : "LOCATION_MZONE")})`,
  );
  if (config.targetRange)
    init.push(`${ev}:SetTargetRange(${config.targetRange.join(",")})`);
  if (config.value?.trim() && !config.valueFunction?.trim())
    init.push(`${ev}:SetValue(${config.value})`);
  for (const [key, setter, args] of [
    ["condition", "SetCondition", base],
    ["cost", "SetCost", `${base},chk`],
    ["target", "SetTarget", `${base},chk,chkc`],
    ["operation", "SetOperation", base],
    ["valueFunction", "SetValue", "e,..."],
  ] as const)
    if (config[key]?.trim()) {
      init.push(`${ev}:${setter}(${fn}${key})`);
      funcs.push(
        `function ${fn}${key}(${config.callbackArgs?.[key] || args})\n${config[key]}\nend`,
      );
    }
  return { init, funcs };
}
