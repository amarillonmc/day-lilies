import luaparse from "luaparse";
import constants from "./engine-constants.json";
import type { TargetCore } from "./model";

export interface EngineCapability {
  id: string;
  label: string;
  category: string;
  code?: number;
  requiredCore?: TargetCore;
  source: string;
}

const koishiSource =
  "https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/effect.h#L132-L144";
/** Explicitly marked KoishiPro effects, absent from Fluorohydride/effect.h checked 2026-10-17.
 * A catalog entry documents an interface, not a promise that every combination is valid.
 */
export const KOISHI_CAPABILITIES: (EngineCapability & {
  code: number;
  requiredCore: "koishipro";
})[] = [
  ["EFFECT_CHANGE_LINK_MARKER_KOISHI", 710253, "变更连接箭头"],
  ["EFFECT_ADD_LINK_MARKER_KOISHI", 37564151, "增加连接箭头"],
  ["EFFECT_REMOVE_LINK_MARKER_KOISHI", 37564152, "移除连接箭头"],
  ["EFFECT_CANNOT_LOSE_KOISHI", 37564153, "不败规则（需验证具体败北条件）"],
  ["EFFECT_EXTRA_TOMAIN_KOISHI", 37564154, "额外卡组召唤区域扩展"],
  [
    "EFFECT_OVERLAY_REMOVE_COST_CHANGE_KOISHI",
    37564155,
    "变更取除素材的最小费用",
  ],
  ["EFFECT_ADD_SUMMON_TYPE_KOISHI", 37564158, "增加召唤类型信息"],
  ["EFFECT_REMOVE_SUMMON_TYPE_KOISHI", 37564159, "移除召唤类型信息"],
  ["EFFECT_CHANGE_SUMMON_TYPE_KOISHI", 37564160, "变更召唤类型信息"],
  ["EFFECT_CHANGE_SUMMON_LOCATION_KOISHI", 37564161, "变更召唤来源信息"],
  ["EFFECT_LINK_SPELL_KOISHI", 37564162, "连接魔法规则"],
  ["EFFECT_MAP_OF_HEAVEN", 77702007, "Map of Heaven 专用规则"],
].map(([id, code, label]) => ({
  id: String(id),
  code: Number(code),
  label: String(label),
  category: "effect",
  requiredCore: "koishipro",
  source: koishiSource,
}));

export const ENGINE_CAPABILITIES: EngineCapability[] = [
  ...constants.entries.map(({ id, category, code, line }) => ({
    id,
    label: id,
    category,
    code,
    source: `${constants.source}#L${line}`,
  })),
  ...KOISHI_CAPABILITIES,
];
export const ENGINE_EFFECT_CODES = ENGINE_CAPABILITIES.filter(
  (entry) => entry.category === "effect",
);
export const ENGINE_EVENTS = ENGINE_CAPABILITIES.filter(
  (entry) => entry.category === "event",
);
export const ENGINE_PROPERTIES = ENGINE_CAPABILITIES.filter(
  (entry) => entry.category === "property",
);
export const ENGINE_TYPES = ENGINE_CAPABILITIES.filter(
  (entry) => entry.category === "type",
);
export const ENGINE_CATEGORIES = ENGINE_CAPABILITIES.filter(
  (entry) => entry.category === "category",
);
export const ENGINE_RESETS = ENGINE_CAPABILITIES.filter(
  (entry) => entry.category === "reset",
);
export const ENGINE_LOCATIONS = ENGINE_CAPABILITIES.filter(
  (entry) => entry.category === "location",
);

type Ast = { type?: string; [key: string]: unknown };
const koishiNames = new Set(KOISHI_CAPABILITIES.map((item) => item.id));
const koishiNumbers = new Map(
  KOISHI_CAPABILITIES.map((item) => [item.code, item.id]),
);

/** Static diagnostics only: ignores comments/strings; never executes author Lua.
 * Numeric detection is limited to SetCode's argument, so card IDs aren't mistaken
 * for engine features. Dynamic aliases/computed calls still require playtesting.
 */
export function findUnsupportedCoreSymbols(
  lua: string,
  target: TargetCore,
): string[] {
  if (target === "koishipro") return [];
  let tree: unknown;
  try {
    tree = luaparse.parse(lua, { luaVersion: "5.3", comments: false });
  } catch {
    return [];
  } // Syntax errors belong to the compiler's syntax diagnostic.
  const found = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as Ast;
    if (
      node.type === "Identifier" &&
      typeof node.name === "string" &&
      (koishiNames.has(node.name) || node.name.endsWith("_KOISHI"))
    )
      found.add(node.name);
    if (node.type === "CallExpression") {
      const base = node.base as Ast | undefined;
      const member = base?.identifier as Ast | undefined;
      const args = node.arguments as Ast[] | undefined;
      if (base?.type === "MemberExpression" && member?.name === "SetCode") {
        const arg = args?.[base.indexer === ":" ? 0 : 1];
        if (arg?.type === "NumericLiteral") {
          const name = koishiNumbers.get(Number(arg.value));
          if (name) found.add(name);
        }
      }
    }
    Object.values(node).forEach(visit);
  };
  visit(tree);
  return [...found].sort();
}
