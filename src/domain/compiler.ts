import luaparse from "luaparse";
import type {
  Card,
  CardProject,
  CompileResult,
  Diagnostic,
  EffectBlock,
  Zone,
} from "./model";
import { ATTRIBUTES, RACES, TEMPLATES, TRIGGERS } from "./catalog";

const targeted = new Set([
  "recover",
  "destroy",
  "bounce",
  "banish",
  "revive",
  "boost",
]);
const extraKinds = new Set(["fusion", "synchro", "xyz", "link"]);
const isSpellTrap = (card: Card) =>
  card.kind === "spell" || card.kind === "trap";
const integer = (n: number, min: number, max: number) =>
  Number.isInteger(n) && n >= min && n <= max;
// Client Stringid uses (code << 4) | index; IDs below 128 overlap system strings.
const validCode = (n: number) => integer(n, 128, 0x0fffffff);
type LuaNode = {
  type?: string;
  name?: string;
  identifier?: LuaNode;
  base?: LuaNode;
  body?: LuaNode[];
  variables?: LuaNode[];
  init?: LuaNode[];
  indexer?: string;
};
function scriptEntries(ast: LuaNode): string[] {
  const entries: string[] = [];
  const collect = (node: LuaNode | undefined) => {
    if (
      node?.type === "MemberExpression" &&
      node.indexer === "." &&
      node.identifier?.name === "initial_effect" &&
      node.base?.type === "Identifier"
    )
      entries.push(node.base.name || "");
  };
  for (const node of ast.body || []) {
    if (node.type === "FunctionDeclaration") collect(node.identifier);
    if (node.type === "AssignmentStatement")
      node.variables?.forEach((v, i) => {
        if (node.init?.[i]?.type === "FunctionDeclaration") collect(v);
      });
  }
  return entries;
}
const zones: Record<Zone, string> = {
  deck: "LOCATION_DECK",
  hand: "LOCATION_HAND",
  grave: "LOCATION_GRAVE",
  field: "LOCATION_ONFIELD",
  monster: "LOCATION_MZONE",
  spelltrap: "LOCATION_SZONE",
  banished: "LOCATION_REMOVED",
  "hand-grave": "LOCATION_HAND+LOCATION_GRAVE",
};
const meta: Record<
  string,
  { category: string; hint: string; ability?: string }
> = {
  search: {
    category: "CATEGORY_TOHAND+CATEGORY_SEARCH",
    hint: "HINTMSG_ATOHAND",
    ability: "c:IsAbleToHand()",
  },
  recover: {
    category: "CATEGORY_TOHAND",
    hint: "HINTMSG_ATOHAND",
    ability: "c:IsAbleToHand()",
  },
  mill: {
    category: "CATEGORY_TOGRAVE",
    hint: "HINTMSG_TOGRAVE",
    ability: "c:IsAbleToGrave()",
  },
  destroy: { category: "CATEGORY_DESTROY", hint: "HINTMSG_DESTROY" },
  bounce: {
    category: "CATEGORY_TOHAND",
    hint: "HINTMSG_RTOHAND",
    ability: "c:IsAbleToHand()",
  },
  banish: {
    category: "CATEGORY_REMOVE",
    hint: "HINTMSG_REMOVE",
    ability: "c:IsAbleToRemove()",
  },
  revive: {
    category: "CATEGORY_SPECIAL_SUMMON",
    hint: "HINTMSG_SPSUMMON",
    ability: "c:IsCanBeSpecialSummoned(e,0,tp,false,false)",
  },
  summon: {
    category: "CATEGORY_SPECIAL_SUMMON",
    hint: "HINTMSG_SPSUMMON",
    ability: "c:IsCanBeSpecialSummoned(e,0,tp,false,false)",
  },
  boost: {
    category: "CATEGORY_ATKCHANGE+CATEGORY_DEFCHANGE",
    hint: "HINTMSG_FACEUP",
    ability: "c:IsFaceup() and c:IsType(TYPE_MONSTER)",
  },
  draw: { category: "CATEGORY_DRAW", hint: "HINTMSG_DRAW" },
};

// All shared-name keys are assigned in one deterministic project pass. No id+1
// convention is used: consecutive author card IDs cannot consume another effect's limit.
function countIdentity(card: Card, block: EffectBlock, index: number) {
  if (block.count === "shared-use") return `shared:${block.countGroup?.trim()}`;
  return `${block.count}:${card.name.trim() || card.code}:${block.scope || "monster"}:${index}`;
}
export function allocateCountKeys(project: CardProject): Map<string, number> {
  // 0 means per-effect count, and 1 is EFFECT_COUNT_CODE_SINGLE in this core.
  const used = new Set([
    0,
    1,
    ...project.cards.flatMap((c) => [c.code, c.alias]).filter(validCode),
  ]);
  const identities = new Set<string>();
  for (const card of project.cards) {
    card.effects.forEach((block, index) => {
      if (["name-use", "name-activate", "shared-use"].includes(block.count))
        identities.add(countIdentity(card, block, index));
    });
  }
  const keys = new Map<string, number>();
  for (const name of [...identities].sort()) {
    let hash = 2166136261;
    for (const ch of name) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    let key = ((hash >>> 0) % 0x0ffffffe) + 1;
    while (used.has(key)) key = key === 0x0fffffff ? 1 : key + 1;
    used.add(key);
    keys.set(name, key);
  }
  return keys;
}

function validateCard(card: Card): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const add = (
    severity: Diagnostic["severity"],
    message: string,
    block?: EffectBlock,
  ) =>
    diagnostics.push({
      severity,
      message,
      cardUid: card.uid,
      effectUid: block?.uid,
    });
  if (!validCode(card.code))
    add(
      "error",
      "卡号必须是 128–268435455 之间的整数（较小编号保留给系统提示）。",
    );
  if (!card.name.trim()) add("error", "请填写卡名。");
  if (
    card.kind === "spell" &&
    ![
      "normal",
      "quick-play",
      "continuous",
      "equip",
      "field",
      "ritual",
    ].includes(card.subtype)
  )
    add("error", "魔法卡不能使用反击陷阱等不适用的副类型。");
  if (
    card.kind === "trap" &&
    !["normal", "continuous", "counter"].includes(card.subtype)
  )
    add("error", "陷阱卡只支持通常、永续或反击副类型。");
  if (card.alias !== 0 && !validCode(card.alias))
    add("error", "同名卡 alias 必须是有效卡号或 0。");
  if (
    card.setcodes.length > 4 ||
    card.setcodes.some((n) => !integer(n, 1, 65535))
  )
    add("error", "最多填写 4 个 1–65535 的系列代码。");
  if (!integer(card.level, 0, 13))
    add("error", "等级／阶级／连接值须为 0–13 的整数。");
  if (!integer(card.attack, -2, 999999) || !integer(card.defense, -2, 999999))
    add("error", "攻守须为 -2–999999 的整数（-2 表示 ?）。");
  if (!integer(card.leftScale, 0, 13) || !integer(card.rightScale, 0, 13))
    add("error", "灵摆刻度须为 0–13 的整数。");
  if (card.pendulum && ["link", "spell", "trap", "token"].includes(card.kind))
    add(
      "error",
      "当前卡种不支持 OCG 灵摆卡模；请使用通常／效果／仪式／融合／同调／超量怪兽。",
    );
  if (
    !isSpellTrap(card) &&
    (!RACES.some((r) => r.value === card.race) ||
      !ATTRIBUTES.some((a) => a.value === card.attribute))
  )
    add("error", "怪兽需要有效的种族和属性。");
  if (
    card.kind === "link" &&
    (card.level < 1 ||
      card.level > 8 ||
      new Set(card.linkMarkers).size !== card.level ||
      card.linkMarkers.some((n) => ![1, 2, 4, 8, 32, 64, 128, 256].includes(n)))
  )
    add("error", "连接怪兽需要与 LINK 值相同数量的有效连接箭头。");
  if (!card.art) add("warning", "未上传中间图，将输出带占位图的卡片图片。");
  if (card.reviewRequired)
    add("warning", "效果仍待作者复核；请检查未匹配卡文或 BYOK 草稿。");
  if (card.matchedText && card.matchedText !== card.text)
    add("warning", "主效果文本已修改，现有脚本／积木需要重新核对。");
  if (card.scriptMode === "custom") {
    if (!card.customLua.trim()) add("error", "自定义 Lua 不能为空。");
    else {
      if (/SetCountLimit\s*\(/.test(card.customLua))
        add(
          "warning",
          "自定义 Lua 的次数代码由作者维护，请检查与其他卡和积木计数代码的冲突。",
        );
      try {
        const ast = luaparse.parse(card.customLua, {
          luaVersion: "5.3",
        }) as LuaNode;
        const entries = scriptEntries(ast);
        if (!entries.some((entry) => entry === "s" || /^c\d+$/.test(entry)))
          add(
            "error",
            "自定义脚本需要 s.initial_effect(c) 或 c卡号.initial_effect(c) 入口。",
          );
        for (const entry of entries)
          if (/^c\d+$/.test(entry) && Number(entry.slice(1)) !== card.code)
            add("error", `脚本入口 ${entry} 与当前卡号 ${card.code} 不一致。`);
        const getId = ast.body?.some(
          (node) =>
            node.type === "LocalStatement" &&
            node.variables?.[0]?.name === "s" &&
            node.init?.[0]?.type === "CallExpression" &&
            node.init[0].base?.name === "GetID",
        );
        if (entries.includes("s") && !getId)
          add(
            "error",
            "使用 s.initial_effect 的脚本需要通过 local s,id,o=GetID() 获取脚本表。",
          );
      } catch (error) {
        add(
          "error",
          `Lua 语法错误：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (card.customStrings.length > 16)
      add("error", "CDB 最多支持 16 条效果提示。");
    return diagnostics;
  }
  const meaningful =
    isSpellTrap(card) ||
    (card.kind !== "normal" &&
      card.kind !== "token" &&
      card.hasEffect !== false);
  if (meaningful && card.effects.length === 0 && !extraKinds.has(card.kind))
    add("error", "尚未添加效果积木；可匹配卡文、手动添加或使用自定义 Lua。");
  if (
    card.pendulumText.trim() &&
    !card.effects.some((b) => b.scope === "pendulum")
  )
    add("warning", "灵摆文本尚未对应任何灵摆效果积木。");
  if (
    card.text.trim() &&
    card.effects.length === 0 &&
    extraKinds.has(card.kind) &&
    card.hasEffect !== false
  )
    add("warning", "额外怪兽仅生成素材手续，卡文中的其他效果尚未实现。");
  if (
    card.hasEffect === false &&
    card.effects.some((b) => b.scope !== "pendulum")
  )
    add("error", "已标记无效果，但存在怪兽效果积木。");
  if (card.kind === "token" && (card.effects.length || card.pendulum))
    add("error", "首版衍生物只支持无效果的基本数据。");
  if (
    card.kind === "normal" &&
    card.effects.some((b) => b.scope !== "pendulum")
  )
    add(
      "error",
      "通常怪兽不能有怪兽效果；请改为效果怪兽或将积木设为灵摆效果。",
    );
  if (card.effects.length > 16)
    add("error", "首版每卡最多支持 16 个效果积木（对应 CDB 提示）。");
  if (extraKinds.has(card.kind) && card.procedure.mode !== card.kind)
    add("error", `请配置${card.kind}对应的额外召唤手续，或使用自定义 Lua。`);
  if (!extraKinds.has(card.kind) && card.procedure.mode !== "none")
    add("error", "当前卡种与额外召唤手续不一致。");
  const proc = card.procedure;
  if (proc.mode !== "none") {
    if (!integer(proc.min, 1, 8) || !integer(proc.max, proc.min, 8))
      add("error", "素材数范围须为 1–8，最大数不能小于最小数。");
    if (proc.mode === "synchro" && proc.min < 2)
      add("error", "同调手续需要 1 只调整及至少 1 只非调整。");
    if (
      proc.mode === "xyz" &&
      (proc.min !== proc.max || !integer(proc.materialLevel, 1, 13))
    )
      add("error", "首版超量手续使用固定素材数和 1–13 的素材等级。");
    if (
      proc.mode === "link" &&
      (proc.min > card.level || proc.max > card.level)
    )
      add("error", "连接素材数量不能超过 LINK 值。");
    if (
      proc.mode === "fusion" &&
      (proc.materialCodes.length < 2 ||
        proc.materialCodes.length > 4 ||
        proc.materialCodes.some((n) => !validCode(n)))
    )
      add("error", "融合手续需要 2–4 个有效的指定素材卡号。");
  }
  if (card.kind === "ritual")
    add(
      "warning",
      "仪式怪兽生成苏生限制；仪式召唤魔法／效果请另外配置自定义 Lua。",
    );
  if (isSpellTrap(card) && ["equip", "ritual"].includes(card.subtype))
    add("error", "装备／仪式魔法需要专用处理，首版请使用自定义 Lua。");
  const activations = card.effects.filter(
    (b) => b.trigger === "activate" && b.template !== "self-summon",
  );
  if (activations.length > 1)
    add(
      "error",
      "一张卡只能配置一个卡的发动积木；同一次发动内的复合处理请使用自定义 Lua。",
    );
  if (
    card.effects.filter(
      (b) => b.count === "soft" && b.trigger === "summon-or-special",
    ).length > 1
  )
    add(
      "error",
      "一张卡有多个召唤／特召入口时，请使用卡名次数；内核的单卡共享次数仅有一个槽位。",
    );
  for (const block of card.effects) {
    if (
      !TEMPLATES.some((t) => t.id === block.template) ||
      !TRIGGERS.some((t) => t.value === block.trigger)
    ) {
      add("error", "未知效果模板或发动入口。", block);
      continue;
    }
    if (
      !["none", "soft", "name-use", "name-activate", "shared-use"].includes(
        block.count,
      )
    )
      add("error", "未知次数限制类型。", block);
    if (block.count === "shared-use" && !block.countGroup?.trim())
      add("error", "共享次数需要填写共享组名称。", block);
    if (
      !["self", "opponent", "both"].includes(block.players) ||
      !zones[block.source]
    )
      add("error", "玩家或来源区域无效。", block);
    if (!["none", "no-monsters", "opponent-only"].includes(block.condition))
      add("error", "未知条件预设。", block);
    if (
      ![
        "none",
        "discard",
        "send-hand",
        "banish-self",
        "send-self",
        "lp",
      ].includes(block.cost)
    )
      add("error", "未知费用类型。", block);
    if (block.scope && !["monster", "pendulum"].includes(block.scope))
      add("error", "未知效果区域。", block);
    if (
      block.range &&
      !["field", "hand", "grave", "banished"].includes(block.range)
    )
      add("error", "自身发动区域无效。", block);
    if (!integer(block.amount, 1, 40))
      add("error", "处理数量须为 1–40 的整数。", block);
    if (
      (targeted.has(block.template) ||
        block.template === "summon" ||
        block.template === "self-summon") &&
      block.amount !== 1
    )
      add(
        "error",
        "该模板首版只支持 1 张；多对象或同时特召请使用自定义 Lua。",
        block,
      );
    if (
      block.cost !== "none" &&
      !integer(block.costAmount, 1, block.cost === "lp" ? 999999 : 40)
    )
      add("error", "请填写有效的费用数量。", block);
    if (
      ["banish-self", "send-self"].includes(block.cost) &&
      block.costAmount !== 1
    )
      add("error", "自身费用的数量必须为 1。", block);
    const f = block.filter;
    if (f.setcode != null && !integer(f.setcode, 1, 65535))
      add("error", "筛选的系列代码须为 1–65535。", block);
    if (f.race != null && !RACES.some((r) => r.value === f.race))
      add("error", "筛选种族无效。", block);
    if (f.attribute != null && !ATTRIBUTES.some((a) => a.value === f.attribute))
      add("error", "筛选属性无效。", block);
    if (f.kind != null && !["any", "monster", "spell", "trap"].includes(f.kind))
      add("error", "筛选卡种无效。", block);
    if (
      (f.minLevel != null && !integer(f.minLevel, 1, 13)) ||
      (f.maxLevel != null && !integer(f.maxLevel, 1, 13)) ||
      (f.minLevel != null && f.maxLevel != null && f.minLevel > f.maxLevel)
    )
      add("error", "等级筛选须为 1–13，且下限不大于上限。", block);
    if (
      !integer(block.attack, -999999, 999999) ||
      !integer(block.defense, -999999, 999999)
    )
      add("error", "攻守增减值须为有效整数。", block);
    if (block.template === "boost" && block.attack === 0 && block.defense === 0)
      add("error", "攻守变化至少一项不能为 0。", block);
    if (block.scope === "pendulum" && !card.pendulum)
      add("error", "灵摆效果需要将卡片设为灵摆怪兽。", block);
    if (block.scope === "pendulum" && block.range && block.range !== "field")
      add("error", "灵摆效果的自身发动区域必须为场上灵摆区。", block);
    if (
      block.scope === "pendulum" &&
      !["activate", "ignition", "quick"].includes(block.trigger)
    )
      add("error", "首版灵摆效果支持卡的发动、起动或快速入口。", block);
    if (
      block.trigger === "activate" &&
      !isSpellTrap(card) &&
      block.scope !== "pendulum"
    )
      add("error", "卡的发动入口仅用于魔法、陷阱或灵摆区效果。", block);
    if (block.trigger === "activate" && block.range && block.range !== "field")
      add(
        "error",
        "墓地／除外／手牌中的单独效果请使用起动或快速入口，不能当作魔陷卡的发动。",
        block,
      );
    if (card.kind === "trap" && block.trigger === "ignition")
      add(
        "error",
        "陷阱效果不能作为怪兽式起动效果；请改用快速入口，特殊阶段条件使用自定义 Lua。",
        block,
      );
    if (
      isSpellTrap(card) &&
      ["summon", "special-summon", "summon-or-special", "flip"].includes(
        block.trigger,
      )
    )
      add("error", "登场入口用于该怪兽自身的召唤事件。", block);
    if (
      isSpellTrap(card) &&
      !["continuous", "field"].includes(card.subtype) &&
      ["ignition", "quick"].includes(block.trigger) &&
      (!block.range || block.range === "field")
    )
      add(
        "error",
        "普通魔陷的场上非发动效果需要自定义 Lua；或改为永续／场地卡。",
        block,
      );
    if (card.kind === "trap" && card.subtype === "counter")
      add("error", "反击陷阱需要连锁条件，首版请使用自定义 Lua。", block);
    if (block.template === "self-summon") {
      if (
        isSpellTrap(card) ||
        extraKinds.has(card.kind) ||
        card.kind === "ritual" ||
        block.scope === "pendulum"
      )
        add("error", "简单手牌特召手续仅用于主卡组非仪式怪兽。", block);
      if (block.cost !== "none")
        add(
          "error",
          "简单手牌特召手续不支持费用；复杂手续请使用自定义 Lua。",
          block,
        );
      if (block.condition === "none")
        add("error", "手牌特召手续需要选择明确的场上条件。", block);
    }
    if (
      ["search", "mill"].includes(block.template) &&
      (block.source !== "deck" || block.players !== "self")
    )
      add("error", "检索／选送墓地模板只支持自己的卡组。", block);
    if (block.template === "recover" && block.source !== "grave")
      add("error", "回收模板的来源须为墓地。", block);
    if (block.template === "revive" && block.source !== "grave")
      add("error", "苏生模板的来源须为墓地。", block);
    if (
      ["destroy", "bounce", "boost"].includes(block.template) &&
      !["field", "monster", "spelltrap"].includes(block.source)
    )
      add("error", "该模板的对象必须来自场上。", block);
    if (
      block.template === "banish" &&
      !["field", "monster", "spelltrap", "grave"].includes(block.source)
    )
      add("error", "除外模板支持场上或墓地的表侧除外。", block);
    if (
      block.template === "summon" &&
      (!["hand", "grave", "hand-grave"].includes(block.source) ||
        block.players !== "self")
    )
      add("error", "处理时选择特召只支持自己的手牌／墓地。", block);
    if (
      ["revive", "summon", "boost"].includes(block.template) &&
      f.kind &&
      f.kind !== "monster" &&
      f.kind !== "any"
    )
      add("error", "该模板必须选择怪兽。", block);
    if (block.count === "soft" && block.trigger === "summon-or-special")
      add(
        "warning",
        "登场的两个事件通过单卡共享计数关联；离场再登场将重置此限制。",
        block,
      );
  }
  return diagnostics;
}

export function validateProject(project: CardProject): Diagnostic[] {
  const diagnostics = project.cards.flatMap(validateCard);
  const codes = new Map<number, number>();
  for (const card of project.cards)
    codes.set(card.code, (codes.get(card.code) || 0) + 1);
  for (const card of project.cards)
    if ((codes.get(card.code) || 0) > 1)
      diagnostics.push({
        severity: "error",
        cardUid: card.uid,
        message: `卡号 ${card.code} 重复；图片和脚本文件会互相覆盖。`,
      });
  if (!project.cards.length)
    diagnostics.push({ severity: "error", message: "卡包中还没有卡片。" });
  const names = new Map<string, number>();
  for (const archetype of project.archetypes) {
    if (!archetype.name.trim() || !integer(archetype.code, 1, 65535))
      diagnostics.push({
        severity: "error",
        message: "系列需要名称及 1–65535 的代码。",
      });
    const old = names.get(archetype.name.trim().toLowerCase());
    if (old && old !== archetype.code)
      diagnostics.push({
        severity: "error",
        message: `系列「${archetype.name}」对应多个代码，无法可靠匹配。`,
      });
    names.set(archetype.name.trim().toLowerCase(), archetype.code);
  }
  return diagnostics;
}

function range(card: Card, block: EffectBlock): string {
  if (block.scope === "pendulum") return "LOCATION_PZONE";
  if (block.range && block.range !== "field") return zones[block.range];
  return isSpellTrap(card) ? "LOCATION_SZONE" : "LOCATION_MZONE";
}
function locationPair(block: EffectBlock): [string, string] {
  const loc = zones[block.source];
  return [
    block.players === "opponent" ? "0" : loc,
    block.players === "self" ? "0" : loc,
  ];
}
function filterExpression(block: EffectBlock) {
  const f = block.filter;
  const clauses: string[] = [];
  if (f.kind && f.kind !== "any")
    clauses.push(`c:IsType(TYPE_${f.kind.toUpperCase()})`);
  if (["revive", "summon"].includes(block.template) && f.kind !== "monster")
    clauses.push("c:IsType(TYPE_MONSTER)");
  if (f.setcode) clauses.push(`c:IsSetCard(0x${f.setcode.toString(16)})`);
  if (f.race) clauses.push(`c:IsRace(${f.race})`);
  if (f.attribute)
    clauses.push(`c:IsAttribute(ATTRIBUTE_${f.attribute.toUpperCase()})`);
  if (f.minLevel != null) clauses.push(`c:IsLevelAbove(${f.minLevel})`);
  if (f.maxLevel != null) clauses.push(`c:IsLevelBelow(${f.maxLevel})`);
  if (f.excludeSelfName) clauses.push("not c:IsCode(id)");
  if (f.faceup) clauses.push("c:IsFaceup()");
  if (block.template === "boost" && block.attack === 0 && block.defense !== 0)
    clauses.push("c:IsHasDefense()");
  if (meta[block.template]?.ability)
    clauses.push(meta[block.template].ability!);
  return clauses.length ? clauses.join(" and ") : "true";
}
function conditionExpression(block: EffectBlock) {
  return block.condition === "no-monsters"
    ? "Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)==0"
    : "Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)==0 and Duel.GetFieldGroupCount(tp,0,LOCATION_MZONE)>0";
}

function emitBlock(
  card: Card,
  block: EffectBlock,
  index: number,
  countKeys: Map<string, number>,
): { init: string[]; funcs: string[] } {
  const n = index + 1,
    ev = `e${n}`,
    fn = `s.e${n}`,
    init: string[] = [],
    funcs: string[] = [];
  const func = (suffix: string, args: string, lines: string[]) =>
    funcs.push(
      `function ${fn}${suffix}(${args})\n${lines.map((l) => `\t${l}`).join("\n")}\nend`,
    );
  const baseArgs = "e,tp,eg,ep,ev,re,r,rp";
  const key = countKeys.get(countIdentity(card, block, index));
  const setCount = () => {
    if (block.count === "soft")
      init.push(
        `${ev}:SetCountLimit(1${block.trigger === "summon-or-special" ? ",EFFECT_COUNT_CODE_SINGLE" : ""})`,
      );
    if (key)
      init.push(
        `${ev}:SetCountLimit(1,${key}${block.count === "name-activate" ? "+EFFECT_COUNT_CODE_OATH" : ""})`,
      );
  };
  init.push(
    `local ${ev}=Effect.CreateEffect(c)`,
    `${ev}:SetDescription(aux.Stringid(id,${index}))`,
  );
  if (block.template === "self-summon") {
    init.push(
      `${ev}:SetType(EFFECT_TYPE_FIELD)`,
      `${ev}:SetCode(EFFECT_SPSUMMON_PROC)`,
      `${ev}:SetProperty(EFFECT_FLAG_UNCOPYABLE)`,
      `${ev}:SetRange(LOCATION_HAND)`,
      `${ev}:SetCondition(${fn}condition)`,
    );
    setCount();
    init.push(`c:RegisterEffect(${ev})`);
    func("condition", "e,c", [
      "if c==nil then return true end",
      "local tp=c:GetControler()",
      `return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and ${conditionExpression(block)}`,
    ]);
    return { init, funcs };
  }
  const category =
    block.template === "boost"
      ? [
          block.attack !== 0 ? "CATEGORY_ATKCHANGE" : "",
          block.defense !== 0 ? "CATEGORY_DEFCHANGE" : "",
        ]
          .filter(Boolean)
          .join("+")
      : meta[block.template].category;
  init.push(`${ev}:SetCategory(${category})`);
  const properties = targeted.has(block.template)
    ? ["EFFECT_FLAG_CARD_TARGET"]
    : block.template === "draw"
      ? ["EFFECT_FLAG_PLAYER_TARGET"]
      : [];
  const triggerEvents: Record<string, string> = {
    summon: "EVENT_SUMMON_SUCCESS",
    "special-summon": "EVENT_SPSUMMON_SUCCESS",
    "summon-or-special": "EVENT_SUMMON_SUCCESS",
    flip: "EVENT_FLIP",
    "sent-to-grave": "EVENT_TO_GRAVE",
  };
  if (block.trigger === "activate")
    init.push(
      `${ev}:SetType(EFFECT_TYPE_ACTIVATE)`,
      `${ev}:SetCode(EVENT_FREE_CHAIN)`,
    );
  else if (block.trigger === "ignition" || block.trigger === "quick") {
    init.push(
      `${ev}:SetType(${block.trigger === "quick" ? "EFFECT_TYPE_QUICK_O" : "EFFECT_TYPE_IGNITION"})`,
      `${ev}:SetRange(${range(card, block)})`,
    );
    if (block.trigger === "quick") init.push(`${ev}:SetCode(EVENT_FREE_CHAIN)`);
  } else {
    init.push(
      `${ev}:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_${block.optional ? "O" : "F"})`,
      `${ev}:SetCode(${triggerEvents[block.trigger]})`,
    );
    properties.push("EFFECT_FLAG_DELAY");
    if (block.trigger === "sent-to-grave")
      properties.push("EFFECT_FLAG_DAMAGE_STEP");
  }
  if (properties.length)
    init.push(`${ev}:SetProperty(${properties.join("+")})`);
  setCount();
  const conditions: string[] = [];
  if (block.condition !== "none") conditions.push(conditionExpression(block));
  if (conditions.length) {
    init.push(`${ev}:SetCondition(${fn}condition)`);
    func("condition", baseArgs, [`return ${conditions.join(" and ")}`]);
  }
  if (block.cost !== "none") {
    init.push(`${ev}:SetCost(${fn}cost)`);
    const cost: string[] = [];
    if (block.cost === "discard" || block.cost === "send-hand") {
      const filter =
        block.cost === "discard"
          ? "Card.IsDiscardable"
          : "Card.IsAbleToGraveAsCost";
      const reason =
        block.cost === "discard" ? "REASON_COST+REASON_DISCARD" : "REASON_COST";
      cost.push(
        `if chk==0 then return Duel.IsExistingMatchingCard(${filter},tp,LOCATION_HAND,0,${block.costAmount},e:GetHandler()) end`,
        `Duel.DiscardHand(tp,${filter},${block.costAmount},${block.costAmount},${reason},e:GetHandler())`,
      );
    } else if (block.cost === "lp")
      cost.push(
        `if chk==0 then return Duel.CheckLPCost(tp,${block.costAmount}) end`,
        `Duel.PayLPCost(tp,${block.costAmount})`,
      );
    else if (block.cost === "banish-self")
      cost.push(
        "if chk==0 then return e:GetHandler():IsAbleToRemoveAsCost() end",
        "Duel.Remove(e:GetHandler(),POS_FACEUP,REASON_COST)",
      );
    else
      cost.push(
        "if chk==0 then return e:GetHandler():IsAbleToGraveAsCost() end",
        "Duel.SendtoGrave(e:GetHandler(),REASON_COST)",
      );
    func("cost", `${baseArgs},chk`, cost);
  }
  init.push(
    `${ev}:SetTarget(${fn}target)`,
    `${ev}:SetOperation(${fn}operation)`,
    `c:RegisterEffect(${ev})`,
  );
  if (block.trigger === "summon-or-special")
    init.push(
      `local ${ev}b=${ev}:Clone()`,
      `${ev}b:SetCode(EVENT_SPSUMMON_SUCCESS)`,
      `c:RegisterEffect(${ev}b)`,
    );
  if (block.template === "draw") {
    const ps =
      block.players === "both"
        ? ["tp", "1-tp"]
        : [block.players === "opponent" ? "1-tp" : "tp"];
    func("target", `${baseArgs},chk`, [
      `if chk==0 then return ${ps.map((p) => `Duel.IsPlayerCanDraw(${p},${block.amount})`).join(" and ")} end`,
      ...(ps.length === 1
        ? [
            `Duel.SetTargetPlayer(${ps[0]})`,
            `Duel.SetTargetParam(${block.amount})`,
          ]
        : []),
      `Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,${ps.length === 1 ? ps[0] : "PLAYER_ALL"},${block.amount})`,
    ]);
    func(
      "operation",
      baseArgs,
      ps.length === 1
        ? [
            "local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)",
            "Duel.Draw(p,d,REASON_EFFECT)",
          ]
        : ps.map((p) => `Duel.Draw(${p},${block.amount},REASON_EFFECT)`),
    );
    return { init, funcs };
  }
  func("filter", "c,e,tp", [`return ${filterExpression(block)}`]);
  const [own, opponent] = locationPair(block),
    area = zones[block.source];
  const special = block.template === "revive" || block.template === "summon";
  const space = special
    ? "Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and "
    : "";
  const exclude =
    block.trigger === "activate" &&
    ["destroy", "bounce", "banish"].includes(block.template)
      ? "e:GetHandler()"
      : "nil";
  if (targeted.has(block.template)) {
    const owner =
      block.players === "both"
        ? ""
        : ` and chkc:IsControler(${block.players === "self" ? "tp" : "1-tp"})`;
    const targetLines = [
      `if chkc then return chkc:IsLocation(${area})${owner}${exclude !== "nil" ? ` and chkc~=${exclude}` : ""} and ${fn}filter(chkc,e,tp) end`,
      `if chk==0 then return ${space}Duel.IsExistingTarget(${fn}filter,tp,${own},${opponent},1,${exclude},e,tp) end`,
      `Duel.Hint(HINT_SELECTMSG,tp,${meta[block.template].hint})`,
      `local g=Duel.SelectTarget(tp,${fn}filter,tp,${own},${opponent},1,1,${exclude},e,tp)`,
    ];
    if (block.template !== "boost")
      targetLines.push(
        `Duel.SetOperationInfo(0,${meta[block.template].category},g,1,0,0)`,
      );
    func("target", `${baseArgs},chk,chkc`, targetLines);
    const op = [
      "local tc=Duel.GetFirstTarget()",
      "if not tc or not tc:IsRelateToEffect(e) then return end",
    ];
    if (block.source === "grave")
      op.push("if not aux.NecroValleyFilter()(tc) then return end");
    // Do not recheck the entire original filter: target changes such as a Level
    // change do not normally make an otherwise related target disappear.
    if (block.template === "destroy") op.push("Duel.Destroy(tc,REASON_EFFECT)");
    else if (block.template === "recover" || block.template === "bounce")
      op.push("Duel.SendtoHand(tc,nil,REASON_EFFECT)");
    else if (block.template === "banish")
      op.push("Duel.Remove(tc,POS_FACEUP,REASON_EFFECT)");
    else if (block.template === "revive")
      op.push(
        "if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end",
        "Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)",
      );
    else {
      op.push(
        "if not tc:IsFaceup() or not tc:IsType(TYPE_MONSTER) then return end",
      );
      for (const [name, value] of [
        ["ATTACK", block.attack],
        ["DEFENSE", block.defense],
      ] as const)
        if (value !== 0)
          op.push(
            `local change${name}=Effect.CreateEffect(e:GetHandler())`,
            `change${name}:SetType(EFFECT_TYPE_SINGLE)`,
            `change${name}:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)`,
            `change${name}:SetCode(EFFECT_UPDATE_${name})`,
            `change${name}:SetValue(${value})`,
            `change${name}:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)`,
            `tc:RegisterEffect(change${name})`,
          );
    }
    func("operation", baseArgs, op);
  } else {
    const filter = block.source.includes("grave")
      ? `aux.NecroValleyFilter(${fn}filter)`
      : `${fn}filter`;
    func("target", `${baseArgs},chk`, [
      `if chk==0 then return ${space}Duel.IsExistingMatchingCard(${fn}filter,tp,${own},${opponent},${block.amount},nil,e,tp) end`,
      `Duel.SetOperationInfo(0,${block.template === "search" ? "CATEGORY_TOHAND" : meta[block.template].category},nil,${block.amount},tp,${area})`,
    ]);
    const op: string[] = [];
    if (special)
      op.push("if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end");
    op.push(
      `if not Duel.IsExistingMatchingCard(${filter},tp,${own},${opponent},${block.amount},nil,e,tp) then return end`,
      `Duel.Hint(HINT_SELECTMSG,tp,${meta[block.template].hint})`,
      `local g=Duel.SelectMatchingCard(tp,${filter},tp,${own},${opponent},${block.amount},${block.amount},nil,e,tp)`,
      `if g:GetCount()~=${block.amount} then return end`,
    );
    if (block.template === "search")
      op.push(
        "Duel.SendtoHand(g,nil,REASON_EFFECT)",
        "Duel.ConfirmCards(1-tp,g)",
      );
    if (block.template === "mill") op.push("Duel.SendtoGrave(g,REASON_EFFECT)");
    if (block.template === "summon")
      op.push("Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)");
    func("operation", baseArgs, op);
  }
  return { init, funcs };
}

export function compileCard(card: Card, project: CardProject): CompileResult {
  const diagnostics = validateCard(card);
  if (card.scriptMode === "custom")
    return { lua: card.customLua, strings: card.customStrings, diagnostics };
  if (diagnostics.some((d) => d.severity === "error"))
    return { lua: "", strings: [], diagnostics };
  const init: string[] = [],
    functions: string[] = [];
  if (card.pendulum)
    init.push(
      `aux.EnablePendulumAttribute(c,${card.effects.some((b) => b.scope === "pendulum" && b.trigger === "activate") ? "false" : "true"})`,
    );
  const proc = card.procedure;
  if (proc.mode !== "none" || card.kind === "ritual")
    init.push("c:EnableReviveLimit()");
  if (proc.mode === "synchro")
    init.push(
      `aux.AddSynchroProcedure(c,nil,aux.NonTuner(nil),${proc.min - 1},${proc.max - 1})`,
    );
  if (proc.mode === "xyz")
    init.push(`aux.AddXyzProcedure(c,nil,${proc.materialLevel},${proc.min})`);
  if (proc.mode === "link")
    init.push(`aux.AddLinkProcedure(c,nil,${proc.min},${proc.max})`);
  if (proc.mode === "fusion")
    init.push(
      `aux.AddFusionProcMix(c,true,true,${proc.materialCodes.join(",")})`,
    );
  if (isSpellTrap(card) && !card.effects.some((b) => b.trigger === "activate"))
    init.push(
      "local activation=Effect.CreateEffect(c)",
      "activation:SetType(EFFECT_TYPE_ACTIVATE)",
      "activation:SetCode(EVENT_FREE_CHAIN)",
      "c:RegisterEffect(activation)",
    );
  const completeProject = {
    ...project,
    cards: project.cards.some((c) => c.uid === card.uid)
      ? project.cards.map((c) => (c.uid === card.uid ? card : c))
      : [...project.cards, card],
  };
  const countKeys = allocateCountKeys(completeProject);
  const strings = card.effects.map(
    (block) =>
      block.description.trim() ||
      TEMPLATES.find((t) => t.id === block.template)!.label,
  );
  card.effects.forEach((block, index) => {
    const result = emitBlock(card, block, index, countKeys);
    init.push(...result.init);
    functions.push(...result.funcs);
  });
  const title = card.name.replace(/[\r\n\u2028\u2029]+/g, " ");
  const lua = `-- ${title}\n-- Generated by Day Lilies. Target: ${project.target}; author must playtest.\nlocal s,id,o=GetID()\nfunction s.initial_effect(c)\n${init.map((line) => `\t${line}`).join("\n")}\nend\n\n${functions.join("\n\n")}\n`;
  try {
    luaparse.parse(lua, { luaVersion: "5.3" });
  } catch (error) {
    diagnostics.push({
      severity: "error",
      cardUid: card.uid,
      message: `生成器语法检查失败：${String(error)}`,
    });
  }
  return { lua, strings, diagnostics };
}
