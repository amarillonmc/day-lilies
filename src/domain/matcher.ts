import type {
  Card,
  CardFilter,
  CardProject,
  CountMode,
  EffectBlock,
  MatchResult,
  PlayerScope,
  TemplateId,
  Trigger,
  Zone,
} from "./model";
import { createEffect } from "./model";
import { ATTRIBUTES, RACES } from "./catalog";

// This is a deliberately closed grammar. A successful action must consume the
// entire sentence; unimplemented restrictions stay visible, never become Lua.
const normalize = (text: string) =>
  text
    .replace(/[“”「」『』]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[：]/g, ":")
    .replace(/[；]/g, ";")
    .replace(/[，]/g, ",")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/墓地/g, "墓地")
    .replace(/卡組/g, "卡组")
    .replace(/場/g, "场")
    .replace(/發動/g, "发动")
    .replace(/發/g, "发")
    .replace(/召喚/g, "召唤")
    .replace(/怪獸/g, "怪兽")
    .replace(/選擇/g, "选择")
    .replace(/對象/g, "对象")
    .replace(/張/g, "张")
    .replace(/隻/g, "只")
    .replace(/從/g, "从")
    .replace(/這/g, "这")
    .replace(/個/g, "个")
    .replace(/種/g, "种")
    .replace(/屬/g, "属")
    .replace(/級/g, "级")
    .replace(/與/g, "与")
    .replace(/時/g, "时")
    .replace(/結束/g, "结束")
    .replace(/攻擊/g, "攻击")
    .replace(/術/g, "术")
    .replace(/龍/g, "龙")
    .replace(/鳥/g, "鸟")
    .replace(/體/g, "体")
    .replace(/變/g, "变")
    .replace(/萬/g, "万")
    .replace(/機/g, "机")
    .replace(/械/g, "械")
    .replace(/魔法師/g, "魔法师")
    .replace(/戰士/g, "战士")
    .replace(/惡魔/g, "恶魔")
    .replace(/風/g, "风")
    .replace(/獸/g, "兽")
    .replace(/手卡/g, "手牌")
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .trim();

function parseFilter(
  value: string,
  card: Card,
  project: CardProject,
): CardFilter | null {
  let text = normalize(value).trim();
  const filter: CardFilter = { kind: "any" };
  const quotes = [...text.matchAll(/"([^"]+)"/g)];
  if (quotes.length > 1) return null;
  if (quotes.length === 1) {
    const archetype = project.archetypes.find(
      (a) => normalize(a.name).toLowerCase() === quotes[0][1].toLowerCase(),
    );
    if (!archetype || archetype.code < 1 || archetype.code > 65535) return null;
    filter.setcode = archetype.code;
    text = text.replace(quotes[0][0], "").trim();
  }
  const exception = text.match(
    /(?:except|other than)\s+(?:this card|cards? with this card's name)$/i,
  );
  if (exception) {
    filter.excludeSelfName = true;
    text = text.slice(0, exception.index).trim().replace(/,$/, "").trim();
  }
  if (/^(?:face-up|表侧表示的?|表侧的?)/i.test(text)) {
    filter.faceup = true;
    text = text.replace(/^(?:face-up\s*|表侧表示的?|表侧的?)/i, "");
  }
  const levelEn = text.match(/^Level\s+(\d+)(?:\s+or\s+(lower|higher))?\s+/i);
  const levelZh = text.match(/^(\d+)星(以下|以上)?的?/);
  const level = levelEn || levelZh;
  if (level) {
    const n = Number(level[1]);
    if (n < 1 || n > 13) return null;
    if (!level[2] || /higher|以上/.test(level[2])) filter.minLevel = n;
    if (!level[2] || /lower|以下/.test(level[2])) filter.maxLevel = n;
    text = text.slice(level[0].length);
  }
  for (const attribute of ATTRIBUTES) {
    const prefix = new RegExp(
      `^(?:${attribute.value}\\s+|${attribute.label}属性(?:的)?)`,
      "i",
    );
    if (prefix.test(text)) {
      filter.attribute = attribute.value;
      text = text.replace(prefix, "");
      break;
    }
  }
  for (const race of [...RACES].sort(
    (a, b) => b.english.length - a.english.length,
  )) {
    const escaped = race.english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefix = new RegExp(
      `^(?:${escaped}(?:-Type)?\\s+|${race.label}(?:的)?)`,
      "i",
    );
    if (prefix.test(text)) {
      filter.race = race.value;
      text = text.replace(prefix, "");
      break;
    }
  }
  text = text.trim().replace(/^的/, "");
  if (/^(?:monsters?|怪兽)$/i.test(text)) filter.kind = "monster";
  else if (/^(?:spell(?: cards?)?|魔法卡?)$/i.test(text)) filter.kind = "spell";
  else if (/^(?:trap(?: cards?)?|陷阱卡?)$/i.test(text)) filter.kind = "trap";
  else if (!/^(?:cards?|卡)$/i.test(text)) return null;
  // The author can use a card-name exclusion via the manual editor; a quoted
  // proper name is not guessed to be a setcode just because it looks similar.
  void card;
  return filter;
}

type Located = { filter: CardFilter; players: PlayerScope; source: Zone };
function parseLocated(
  text: string,
  card: Card,
  project: CardProject,
): Located | null {
  let m = text.match(
    /^(.+?)\s+in\s+(your|your opponent's|either player's)\s+(GY|Graveyard)$/i,
  );
  if (m) {
    const filter = parseFilter(m[1], card, project);
    return (
      filter && {
        filter,
        players:
          m[2].toLowerCase() === "your"
            ? "self"
            : m[2].toLowerCase() === "your opponent's"
              ? "opponent"
              : "both",
        source: "grave",
      }
    );
  }
  m = text.match(
    /^(.+?)\s+(you control|your opponent controls|on the field)$/i,
  );
  if (m) {
    const filter = parseFilter(m[1], card, project);
    return (
      filter && {
        filter,
        players: /^you control$/i.test(m[2])
          ? "self"
          : /^your opponent controls$/i.test(m[2])
            ? "opponent"
            : "both",
        source: filter.kind === "monster" ? "monster" : "field",
      }
    );
  }
  m = text.match(/^(自己|对方|双方)?(墓地|场上)的?(.+)$/);
  if (m) {
    const filter = parseFilter(m[3], card, project);
    return (
      filter && {
        filter,
        players:
          m[1] === "自己" ? "self" : m[1] === "对方" ? "opponent" : "both",
        source:
          m[2] === "墓地"
            ? "grave"
            : filter.kind === "monster"
              ? "monster"
              : "field",
      }
    );
  }
  return null;
}

function parseAction(
  input: string,
  card: Card,
  project: CardProject,
): EffectBlock | null {
  let text = input
    .trim()
    .replace(/^you can\s+/i, "")
    .replace(/^(?:可以|可)/, "");
  const make = (template: TemplateId) => createEffect(template, card);
  let m: RegExpMatchArray | null;
  // Simple Special Summon procedures are checked before the normal colon grammar.
  m = text.match(
    /^If (you control no monsters|only your opponent controls a monster), you can Special Summon this card \(from your hand\)$/i,
  );
  if (m) {
    const b = make("self-summon");
    b.condition = /^you control/i.test(m[1]) ? "no-monsters" : "opponent-only";
    return b;
  }
  m = text.match(
    /^(自己场上没有怪兽|只有对方场上有怪兽)(?:存在)?的场合,?这张卡可以从手牌特殊召唤$/,
  );
  if (m) {
    const b = make("self-summon");
    b.condition = m[1].startsWith("自己") ? "no-monsters" : "opponent-only";
    return b;
  }
  m = text.match(
    /^(对方场上有怪兽[、,]自己场上没有怪兽|自己场上没有怪兽)(?:存在)?的场合,?(?:可以)?从手牌特殊召唤这张卡$/,
  );
  if (m) {
    const b = make("self-summon");
    b.condition = m[1].startsWith("自己") ? "no-monsters" : "opponent-only";
    return b;
  }
  m =
    text.match(/^Add (\d+) (.+?) from your Deck to your hand$/i) ||
    text.match(/^从(?:自己的?|自己)?卡组把?(\d+)[张只体](.+?)加入手牌$/);
  if (m) {
    const f = parseFilter(m[2], card, project);
    if (!f) return null;
    const b = make("search");
    b.amount = Number(m[1]);
    b.filter = f;
    return b;
  }
  m =
    text.match(/^Send (\d+) (.+?) from your Deck to the (?:GY|Graveyard)$/i) ||
    text.match(/^从(?:自己的?|自己)?卡组把?(\d+)[张只体](.+?)送去墓地$/);
  if (m) {
    const f = parseFilter(m[2], card, project);
    if (!f) return null;
    const b = make("mill");
    b.amount = Number(m[1]);
    b.filter = f;
    return b;
  }
  m =
    text.match(/^(?:(Your opponent|Each player) draws?|Draw) (\d+) cards?$/i) ||
    text.match(/^(?:(自己|对方|双方)(?:各)?|)(?:从卡组)?抽(\d+)张(?:卡)?$/);
  if (m) {
    const b = make("draw");
    b.amount = Number(m[2]);
    b.players = /opponent|对方/i.test(m[1] || "")
      ? "opponent"
      : /Each player|双方/i.test(m[1] || "")
        ? "both"
        : "self";
    return b;
  }
  m =
    text.match(
      /^Special Summon 1 (.+?) from your (hand or (?:GY|Graveyard)|hand|GY|Graveyard)$/i,
    ) ||
    text.match(
      /^从(?:自己的?|自己)?(手牌[·、或和]?墓地|手牌|墓地)(?:中)?(?:把|将)?1[只体张](.+?)特殊召唤$/,
    );
  if (m) {
    const english = /^Special/i.test(text),
      descriptor = english ? m[1] : m[2],
      source = english ? m[2] : m[1];
    const f = parseFilter(descriptor, card, project);
    if (!f || f.kind !== "monster") return null;
    const b = make("summon");
    b.filter = f;
    b.source = /hand or|手牌.+墓地|手牌墓地/i.test(source)
      ? "hand-grave"
      : /hand|手牌/i.test(source)
        ? "hand"
        : "grave";
    return b;
  }
  // PSCT targeting is distinguished from selecting at resolution.
  m = text.match(/^Target 1 (.+?);\s*(.+)$/i);
  let located: Located | null = null,
    operation = "";
  if (m) {
    located = parseLocated(m[1], card, project);
    operation = m[2];
  } else {
    m = text.match(
      /^以((?:自己|对方|双方)?(?:墓地|场上))的?1[张只体](.+?)为对象(?:才能|可以)?发动[,:;]?\s*(.+)$/,
    );
    if (m) {
      located = parseLocated(`${m[1]}的${m[2]}`, card, project);
      operation = m[3];
    }
  }
  if (located) {
    let b: EffectBlock | null = null;
    if (
      /^(?:add it to your hand|(?:将)?(?:那张卡|那只怪兽)加入手牌)$/i.test(
        operation,
      ) &&
      located.source === "grave" &&
      located.players === "self"
    )
      b = make("recover");
    if (
      /^(?:destroy it|(?:将)?(?:那张卡|那只怪兽)破坏)$/i.test(operation) &&
      located.source !== "grave"
    )
      b = make("destroy");
    if (
      /^(?:return it to (?:the|its owner's) hand|(?:使)?(?:那张卡|那只怪兽)回到(?:持有者)?手牌)$/i.test(
        operation,
      ) &&
      located.source !== "grave"
    )
      b = make("bounce");
    if (/^(?:banish it|(?:将)?(?:那张卡|那只怪兽)除外)$/i.test(operation))
      b = make("banish");
    if (
      /^(?:Special Summon it|将那只怪兽特殊召唤|那只怪兽特殊召唤)$/i.test(
        operation,
      ) &&
      located.source === "grave" &&
      located.filter.kind === "monster"
    )
      b = make("revive");
    const boost =
      operation.match(
        /^it (gains|loses) (\d+) (ATK|DEF|ATK\/DEF)(?: until the end of this turn| until the End Phase)$/i,
      ) ||
      operation.match(
        /^那只怪兽的(攻击力|守备力|攻击力[·和]守备力)(上升|下降)(\d+),?直到回合结束$/,
      );
    if (boost && located.source === "monster" && located.filter.faceup) {
      b = make("boost");
      const en = /^it /i.test(operation),
        value =
          Number(en ? boost[2] : boost[3]) *
          (/loses|下降/i.test(en ? boost[1] : boost[2]) ? -1 : 1),
        stat = en ? boost[3] : boost[1];
      b.attack = /ATK|攻击力/i.test(stat) ? value : 0;
      b.defense = /DEF|守备力/i.test(stat) ? value : 0;
    }
    if (b) {
      b.filter = located.filter;
      b.players = located.players;
      b.source = located.source;
      return b;
    }
  }
  // A small fixed Japanese grammar, rather than translation-based guessing.
  m = text.match(/^自分はデッキから(\d+)枚ドローする$/);
  if (m) {
    const b = make("draw");
    b.amount = Number(m[1]);
    return b;
  }
  m = text.match(/^デッキから"([^"]+)"(モンスター|カード)1枚を手札に加える$/);
  if (m) {
    const archetype = project.archetypes.find(
      (a) => normalize(a.name) === m![1],
    );
    if (!archetype) return null;
    const b = make("search");
    b.filter = {
      kind: m[2] === "モンスター" ? "monster" : "any",
      setcode: archetype.code,
    };
    return b;
  }
  return null;
}

function parseSentence(
  source: string,
  card: Card,
  project: CardProject,
): EffectBlock | null {
  let text = normalize(source)
    .replace(/[.。]\s*$/, "")
    .replace(/^(?:[①②③④⑤⑥⑦⑧⑨⑩]|\([1-9]\)|[1-9][.)])\s*/, "")
    .trim();
  const direct = parseAction(text, card, project);
  if (direct) {
    direct.sourceText = source;
    return direct;
  }
  let trigger: Trigger | undefined,
    count: CountMode = "none",
    optional = false;
  let cost: EffectBlock["cost"] = "none",
    costAmount = 1;
  let range: EffectBlock["range"];
  const once =
    text.match(/^Once per turn(?:,|:)\s*/i) || text.match(/^1回合1次[,,:]?\s*/);
  if (once) {
    count = "soft";
    text = text.slice(once[0].length);
  }
  const events: [RegExp, Trigger][] = [
    [/^If this card is Normal or Special Summoned:\s*/i, "summon-or-special"],
    [/^If this card is Normal Summoned:\s*/i, "summon"],
    [/^If this card is Special Summoned:\s*/i, "special-summon"],
    [/^(?:If this card is flipped face-up:|FLIP:)\s*/i, "flip"],
    [/^If this card is sent to the (?:GY|Graveyard):\s*/i, "sent-to-grave"],
    [/^\(Quick Effect\):\s*/i, "quick"],
    [/^During your Main Phase:\s*/i, "ignition"],
    [/^自己主要阶段[,,:]?\s*/, "ignition"],
    [/^这张卡召唤[·、或和／/]特殊召唤成功的场合[,,:]?\s*/, "summon-or-special"],
    [/^这张卡召唤成功的场合[,,:]?\s*/, "summon"],
    [/^这张卡特殊召唤成功的场合[,,:]?\s*/, "special-summon"],
    [/^这张卡反转的场合[,,:]?\s*/, "flip"],
    [/^这张卡(?:被)?送去墓地的场合[,,:]?\s*/, "sent-to-grave"],
    [/^自分・相手ターンに(?:1度)?[,,:]?\s*/, "quick"],
  ];
  for (const [pattern, event] of events) {
    const m = text.match(pattern);
    if (m) {
      trigger = event;
      text = text.slice(m[0].length);
      break;
    }
  }
  optional =
    /^(?:You can\s+|可以|可)/i.test(text) || /(?:可以|才能)发动/.test(text);
  text = text.replace(/^(?:You can\s+|可以|可)/i, "");
  // Costs have explicit separators. Unknown costs keep the whole sentence unmatched.
  const removeSelf =
    text.match(/^Banish this card from your (GY|Graveyard);\s*(.+)$/i) ||
    text.match(
      /^(?:将|把)(?:自己)?(墓地)的这张卡除外(?:才能|可以)?发动[,:;]\s*(.+)$/,
    );
  const sendSelf = text.match(
    /^Send this card from your (hand|field) to the (?:GY|Graveyard);\s*(.+)$/i,
  );
  const enCost = text.match(
    /^(Discard|Send) (\d+) cards?(?: from your hand)?( to the (?:GY|Graveyard))?(?:, and |;\s*)(.+)$/i,
  );
  if (removeSelf) {
    cost = "banish-self";
    range = "grave";
    text = removeSelf[2];
  } else if (sendSelf) {
    cost = "send-self";
    range = sendSelf[1].toLowerCase() === "hand" ? "hand" : "field";
    text = sendSelf[2];
  } else if (enCost && (/discard/i.test(enCost[1]) || !!enCost[3])) {
    cost = /discard/i.test(enCost[1]) ? "discard" : "send-hand";
    costAmount = Number(enCost[2]);
    text = enCost[4];
  } else {
    const lp =
      text.match(/^Pay (\d+) LP;\s*(.+)$/i) ||
      text.match(/^支付(\d+)(?:基本分|LP)(?:才能|可以)?发动[,:;]\s*(.+)$/i);
    if (lp) {
      cost = "lp";
      costAmount = Number(lp[1]);
      text = lp[2];
    }
    const discard = text.match(
      /^丢弃(\d+)张手牌(?:才能|可以)?发动[,:;]\s*(.+)$/,
    );
    if (discard) {
      cost = "discard";
      costAmount = Number(discard[1]);
      text = discard[2];
    }
  }
  text = text.replace(/^(?:才能|可以)发动[,:;]?\s*/, "");
  const b = parseAction(text, card, project);
  if (!b || b.template === "self-summon") return null;
  b.sourceText = source;
  b.count = count;
  b.cost = cost;
  b.costAmount = costAmount;
  if (range) {
    b.range = range;
    if (b.trigger === "activate")
      b.trigger = card.kind === "trap" ? "quick" : "ignition";
  }
  if (trigger) {
    b.trigger = trigger;
    b.optional = optional;
  }
  return b;
}

type Limit = {
  kind: "each" | "last" | "activation";
  name: string;
  source: string;
};
function parseLimit(sentence: string): Limit | null {
  const text = normalize(sentence).replace(/[.。]\s*$/, "");
  let m = text.match(
    /^You can only (use (each effect|this effect) of|activate 1) "([^"]+)" (?:once )?per turn$/i,
  );
  if (m)
    return {
      kind: /^activate/i.test(m[1])
        ? "activation"
        : /^each/i.test(m[2])
          ? "each"
          : "last",
      name: m[3],
      source: sentence,
    };
  m = text.match(/^这个卡名的(各效果|这个效果)1回合只能使用1次$/);
  if (m)
    return {
      kind: m[1] === "各效果" ? "each" : "last",
      name: "",
      source: sentence,
    };
  m = text.match(/^"([^"]+)"在?1回合只能发动1张$/);
  if (m) return { kind: "activation", name: m[1], source: sentence };
  if (/^这个卡名的卡1回合只能发动1张$/.test(text))
    return { kind: "activation", name: "", source: sentence };
  return null;
}

export function matchEffects(card: Card, project: CardProject): MatchResult {
  const result: MatchResult = { effects: [], unmatched: [], warnings: [] };
  const texts = [
    { text: card.text, scope: "monster" as const },
    ...(card.pendulum
      ? [{ text: card.pendulumText, scope: "pendulum" as const }]
      : []),
  ];
  for (const { text, scope } of texts) {
    // Periods in quoted names do not end sentences. A newline or effect number
    // can separate effects; semicolons remain part of the PSCT structure.
    const sentences: string[] = [];
    let current = "",
      quote = false;
    for (const ch of text) {
      if ('"“”「」『』'.includes(ch)) quote = !quote;
      if (
        !quote &&
        ("\n。".includes(ch) || ch === "." || /[①②③④⑤⑥⑦⑧⑨⑩]/.test(ch))
      ) {
        if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(ch)) {
          if (current.trim()) sentences.push(current.trim());
          current = ch;
        } else {
          current += ch;
          if (current.trim()) sentences.push(current.trim());
          current = "";
        }
      } else current += ch;
    }
    if (current.trim()) sentences.push(current.trim());
    // Chinese targeting and cost clauses often end in 发动。 followed by the
    // operation. Keep that pair together, while preserving the actual source.
    for (let i = 0; i < sentences.length - 1; i++) {
      if (/发动[。.]$/.test(normalize(sentences[i])))
        sentences.splice(i, 2, `${sentences[i]}${sentences[i + 1]}`);
    }
    const start = result.effects.length;
    const pending: Limit[] = [];
    for (const sentence of sentences) {
      const limit = parseLimit(sentence);
      if (limit) {
        if (
          limit.name &&
          normalize(limit.name).toLowerCase() !==
            normalize(card.name).toLowerCase()
        ) {
          result.unmatched.push(sentence);
          result.warnings.push(
            `次数限制中的卡名「${limit.name}」与当前卡名不同，请核对。`,
          );
          continue;
        }
        if (limit.kind === "last" && result.effects.length > start) {
          result.effects[result.effects.length - 1].count = "name-use";
        } else pending.push(limit);
        continue;
      }
      const block = parseSentence(
        sentence.replace(/发动[。.]\s*/g, "发动:"),
        card,
        project,
      );
      if (block) {
        block.sourceText = sentence;
        block.scope = scope;
        // A pendulum effect defaults to an ignition effect, not a monster summon event.
        if (scope === "pendulum" && block.trigger === "activate")
          block.trigger = "ignition";
        result.effects.push(block);
      } else {
        result.unmatched.push(sentence);
        const names = [...normalize(sentence).matchAll(/"([^"]+)"/g)].map(
          (m) => m[1],
        );
        for (const name of names)
          if (
            normalize(card.name) !== name &&
            !project.archetypes.some(
              (a) => normalize(a.name).toLowerCase() === name.toLowerCase(),
            )
          )
            result.warnings.push(
              `「${name}」尚未关联系列代码，或可能是指定卡名；请手动确认。`,
            );
      }
    }
    for (const limit of pending) {
      const blocks = result.effects.slice(start);
      if (limit.kind === "each" && blocks.length)
        blocks.forEach((b) => {
          b.count = "name-use";
        });
      else if (
        limit.kind === "activation" &&
        blocks.filter((b) => b.trigger === "activate").length === 1
      )
        blocks.find((b) => b.trigger === "activate")!.count = "name-activate";
      else if (limit.kind === "last" && blocks.length === 1)
        blocks[0].count = "name-use";
      else result.unmatched.push(limit.source);
    }
  }
  if (result.unmatched.length)
    result.warnings.push(
      "仍有未匹配内容；请补齐积木或使用 BYOK／自定义 Lua，不能将当前草稿视为完整实现。",
    );
  if (result.effects.length)
    result.warnings.push(
      "匹配结果是待复核草稿。请核对对象、区域、费用、次数与召唤条件，再确认覆盖。",
    );
  result.warnings = [...new Set(result.warnings)];
  return result;
}
