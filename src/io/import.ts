import JSZip from "jszip";
import {
  createCard,
  type Card,
  type CardKind,
  type ImportResult,
  type Language,
  type SpellTrapKind,
} from "../domain/model";
import {
  CARDER_LINK_MARKERS,
  RENDER_LINK_MARKERS,
  raceFromText,
} from "./card-data";
import { parseNativeProject } from "./project-schema";

type Input = Record<string, unknown>;
const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);
const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const stat = (value: unknown) =>
  /[?？]/.test(str(value)) ? -2 : /∞/.test(str(value)) ? -2 : num(value);
const record = (value: unknown): Input =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Input)
    : {};
const lang = (value: unknown): Language =>
  (({
    english: "en",
    japanese: "jp",
    chinese: "sc",
    "simplified chinese": "sc",
    "traditional chinese": "tc",
    ja: "jp",
    "zh-CN": "sc",
    "zh-TW": "tc",
  })[str(value)] as Language) ||
  (["sc", "tc", "en", "jp"].includes(str(value)) ? (value as Language) : "en");

export function cleanMseText(value: string): string {
  let text = value.trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      text = JSON.parse(text);
    } catch {
      text = text
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }
  return text
    .replace(/<soft-line\s*\/?\s*>/gi, "\n")
    .replace(/<\/soft-line>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function inferKind(text: string): CardKind {
  const value = text.toLowerCase();
  const choices: [CardKind, RegExp][] = [
    ["spell", /\bspell\b|魔法(?!使|师|師)/],
    ["trap", /\btrap\b|陷阱|罠/],
    ["token", /token|衍生物|トークン/],
    ["link", /link|连接|連接|リンク/],
    ["xyz", /xyz|超量|エクシーズ/],
    ["synchro", /synchro|同调|同步|シンクロ/],
    ["fusion", /fusion|融合/],
    ["ritual", /ritual|仪式|儀式/],
    ["normal", /normal|通常/],
  ];
  return choices.find(([, pattern]) => pattern.test(value))?.[0] || "effect";
}
function subtype(text: string): SpellTrapKind {
  const value = text.toLowerCase();
  return /quick|速攻|\$/.test(value)
    ? "quick-play"
    : /continuous|永续|永續|%/.test(value)
      ? "continuous"
      : /equip|装备|裝備|\+/.test(value)
        ? "equip"
        : /field|场地|場地|フィールド|&/.test(value)
          ? "field"
          : /ritual|仪式|儀式|#/.test(value)
            ? "ritual"
            : /counter|反击|反擊|カウンター|!/.test(value)
              ? "counter"
              : "normal";
}
function finish(card: Card, typeLine: string, warnings: string[]): Card {
  const monster = !["spell", "trap"].includes(card.kind);
  if (!monster) card.attribute = "light"; // The editable schema keeps a dormant monster attribute; CDB writes 0 for spell/trap.
  card.race = monster ? raceFromText(typeLine) : 0;
  if (monster && !card.race)
    warnings.push(`${card.name}：未识别种族，请在资料中选择。`);
  card.tuner = /(?:^|[\s/])tuner(?:$|[\s/])|调整|協調|チューナー/i.test(
    typeLine,
  );
  card.hasEffect =
    !monster || card.kind === "effect" || /effect|效果|効果/i.test(typeLine);
  if (["normal", "token"].includes(card.kind)) card.hasEffect = false;
  card.reviewRequired = Boolean(
    card.text && card.kind !== "normal" && card.kind !== "token",
  );
  if (
    /flip|spirit|union|gemini|二重|灵魂|靈魂|反转|反轉|スピリット|ユニオン|デュアル|リバース/i.test(
      typeLine,
    )
  )
    warnings.push(
      `${card.name}：反转／灵魂／同盟／二重等额外类型暂不自动映射，请核对资料和专用脚本。`,
    );
  if (["fusion", "synchro", "xyz", "link"].includes(card.kind)) {
    // Material requirements are authored rules. Import must not silently invent a generic procedure.
    warnings.push(
      `${card.name}：请设置${card.kind.toUpperCase()}召唤手续，或通过 BYOK / 自定义 Lua 实现原素材限制。`,
    );
  }
  return card;
}
function embeddedArt(value: unknown, warnings: string[], name: string): string {
  const image = str(value);
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(image)) return image;
  if (image)
    warnings.push(`${name}：图片为外部地址或不支持的格式，请重新上传中间图。`);
  return "";
}

async function carder(input: Input, warnings: string[]): Promise<Card> {
  const card = createCard();
  const compact = "na" in input || "fr" in input;
  const get = (short: string, long: string) => input[compact ? short : long];
  card.name = str(get("na", "name")) || card.name;
  card.language = lang(
    get("rg", "region") || (get("fm", "format") === "ocg" ? "jp" : "en"),
  );
  const typeLine = Array.isArray(get("ta", "typeAbility"))
    ? (get("ta", "typeAbility") as unknown[]).map(str).join("/")
    : str(get("ta", "typeAbility"));
  card.kind = inferKind(`${str(get("fr", "frame"))} ${typeLine}`);
  if (get("il", "isLink")) card.kind = "link";
  card.pendulum = get("ip", "isPendulum") === true;
  card.attribute = (str(get("at", "attribute")).toLowerCase() ||
    "light") as Card["attribute"];
  card.subtype = subtype(str(get("sf", "subFamily")));
  card.text = str(get("ef", "effect"));
  card.pendulumText = card.pendulum ? str(get("pe", "pendulumEffect")) : "";
  card.leftScale = num(get("bs", "blueScale"));
  card.rightScale = num(get("rs", "redScale"));
  card.linkMarkers =
    card.kind === "link" && Array.isArray(get("lm", "linkMap"))
      ? (get("lm", "linkMap") as unknown[])
          .map((item) => CARDER_LINK_MARKERS[str(item)])
          .filter(Boolean)
      : [];
  card.level =
    card.kind === "link" ? card.linkMarkers.length : num(get("st", "star"));
  card.attack = stat(get("atk", "atk"));
  card.defense = stat(get("def", "def"));
  card.artworkCredit = str(get("act", "artist"));
  const source = get("as", "artSource");
  const art = source === "offline" ? get("ad", "artData") : get("ar", "art");
  card.art = embeddedArt(art || get("ad", "artData"), warnings, card.name);
  const crop = record(get("arc", "artCrop"));
  if (card.art && Object.keys(crop).length)
    card.art = await cropArt(card.art, crop, warnings, card.name);
  return finish(card, typeLine, warnings);
}

async function cropArt(
  art: string,
  crop: Input,
  warnings: string[],
  name: string,
): Promise<string> {
  const x = num(crop.arx ?? crop.x),
    y = num(crop.ary ?? crop.y);
  const w = num(crop.arw ?? crop.width, 100),
    h = num(crop.arh ?? crop.height, 100);
  if (x === 0 && y === 0 && w === 100 && h === 100) return art;
  if (typeof document === "undefined") {
    warnings.push(`${name}：当前环境无法处理裁剪；保留原中间图。`);
    return art;
  }
  try {
    const image = new Image();
    image.src = art;
    await image.decode();
    const percent = str(crop.aru ?? crop.unit) !== "px";
    const unitX = percent ? image.naturalWidth / 100 : 1,
      unitY = percent ? image.naturalHeight / 100 : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.min(2048, Math.round(w * unitX)));
    canvas.height = Math.max(1, Math.min(2048, Math.round(h * unitY)));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(
      image,
      x * unitX,
      y * unitY,
      w * unitX,
      h * unitY,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvas.toDataURL("image/png");
  } catch {
    warnings.push(`${name}：裁剪未能应用，已保留原中间图。`);
    return art;
  }
}

function yugiohCard(input: Input, warnings: string[]): Card {
  const card = createCard();
  card.name = str(input.name) || card.name;
  card.language = lang(input.language);
  const typeLine = str(input.monsterType);
  card.pendulum = input.type === "pendulum";
  card.kind =
    input.type === "spell" || input.type === "trap"
      ? input.type
      : inferKind(str(card.pendulum ? input.pendulumType : input.cardType));
  card.attribute = (str(input.attribute).toLowerCase() ||
    "light") as Card["attribute"];
  card.subtype = subtype(str(input.icon));
  card.text = str(input.description);
  card.pendulumText = card.pendulum ? str(input.pendulumDescription) : "";
  card.leftScale = card.rightScale = num(input.pendulumScale);
  card.linkMarkers =
    card.kind === "link" && Array.isArray(input.arrowList)
      ? input.arrowList
          .map((item) => RENDER_LINK_MARKERS[num(item) - 1])
          .filter(Boolean)
      : [];
  card.level =
    card.kind === "link"
      ? card.linkMarkers.length
      : num(card.kind === "xyz" ? input.rank : input.level);
  card.attack = num(input.atk) === -1 ? -2 : stat(input.atk);
  card.defense = num(input.def) === -1 ? -2 : stat(input.def);
  if (num(input.atk) === -2 || num(input.def) === -2)
    warnings.push(
      `${card.name}：原卡图使用无限攻守，内核无此数值，已转为 ?，请核对实现。`,
    );
  card.art = embeddedArt(input.image, warnings, card.name);
  return finish(card, typeLine, warnings);
}

/** Parse only direct fields. Nested styling and dates are intentionally ignored. */
export function parseMseSet(source: string): { meta: Input; cards: Input[] } {
  const lines = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const cards: Input[] = [];
  const meta: Input = {};
  let current: Input | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^card:\s*$/.test(line)) {
      current = {};
      cards.push(current);
      continue;
    }
    if (/^\S/.test(line)) {
      current = null;
      const entry = line.match(/^([^:]+):\s*(.*)$/);
      if (entry) meta[entry[1]] = cleanMseText(entry[2]);
    }
    if (!current) continue;
    const entry = line.match(/^\t([^\t:]+):[ \t]*(.*)$/);
    if (!entry) continue;
    let value = entry[2];
    if (!value) {
      const continuation: string[] = [];
      while (
        i + 1 < lines.length &&
        (lines[i + 1].startsWith("\t\t") || lines[i + 1] === "")
      ) {
        continuation.push(lines[++i].replace(/^\t\t/, ""));
      }
      value = continuation.join("\n").trimEnd();
    }
    current[entry[1].replace(/ /g, "_")] = cleanMseText(value);
  }
  return { meta, cards };
}

async function mse(source: string, zip?: JSZip): Promise<ImportResult> {
  const parsed = parseMseSet(source);
  if (parsed.meta.game !== "yugioh")
    throw new Error("仅支持 yugioh 游戏的 MSE 文件。");
  const warnings = [
    "MSE 正文作为效果依据，注释保留为中文参考；卡号请由作者分配。",
  ];
  if (parsed.meta.stylesheet !== "series10")
    warnings.push("此 MSE 模板不是 series10，已尽量提取共通字段，请核对资料。");
  const cards: Card[] = [];
  for (const input of parsed.cards) {
    const card = createCard();
    card.name = str(input.name) || card.name;
    card.text = str(input.rule_text);
    card.notes = str(input.notes);
    const ownLanguage = str(input.styling_data).match(
      /^language:\s*"?([^"\n]+)/m,
    )?.[1];
    const defaultLanguage = source.match(/^\t\tlanguage:\s*"?([^"\n]+)/m)?.[1];
    card.language = lang(ownLanguage || defaultLanguage || "en");
    const typeLine =
      str(input.monster_type) ||
      [input.type_1, input.type_2, input.type_3, input.type_4, input.type_5]
        .map(str)
        .filter(Boolean)
        .join("/");
    card.kind = inferKind(
      `${input.attribute} ${typeLine} ${str(input.card_type)}`,
    );
    if (
      card.kind === "effect" &&
      !/effect|效果|効果|flip|spirit|union|gemini/i.test(typeLine)
    )
      card.kind = "normal";
    card.attribute = (str(input.attribute) || "light") as Card["attribute"];
    card.subtype = subtype(str(input.level));
    card.pendulum = /pendulum|灵摆|靈擺|ペンデュラム/i.test(
      `${typeLine} ${str(input.pendulum)} ${str(input.card_type)}`,
    );
    card.pendulumText = card.pendulum ? str(input.pendulum_text) : "";
    card.leftScale = num(input.blue_scale);
    card.rightScale = num(input.red_scale);
    const arrows: Record<string, number> = {
      linkdl: 1,
      linkd: 2,
      linkdr: 4,
      linkl: 8,
      linkr: 32,
      linkul: 64,
      linku: 128,
      linkur: 256,
    };
    card.linkMarkers =
      card.kind === "link"
        ? Object.entries(arrows)
            .filter(([key]) => input[key] === "on")
            .map(([, bit]) => bit)
        : [];
    card.level =
      card.kind === "link"
        ? card.linkMarkers.length
        : str(input.level).match(/\*/g)?.length || num(input.level);
    card.attack = stat(input.attack);
    card.defense = stat(input.defense);
    card.artworkCredit = str(input.gamecode);
    const imageName = str(input.image).match(
      /^local_image_file\("([^"]+)"\)$/,
    )?.[1];
    if (imageName && zip) {
      const entry = zip.file(imageName);
      if (entry) {
        const bytes = await entry.async("uint8array");
        const mime =
          bytes[0] === 0xff && bytes[1] === 0xd8
            ? "image/jpeg"
            : bytes[0] === 0x89 && bytes[1] === 0x50
              ? "image/png"
              : "";
        if (mime)
          card.art = `data:${mime};base64,${await entry.async("base64")}`;
        else warnings.push(`${card.name}：MSE 图片格式无法识别，请重新上传。`);
      } else warnings.push(`${card.name}：MSE 中缺少图片 ${imageName}。`);
    } else if (imageName)
      warnings.push(
        `${card.name}：纯 set 文本不含中间图，请上传完整 .mse-set。`,
      );
    cards.push(finish(card, typeLine, warnings));
  }
  if (!cards.length) throw new Error("MSE 中未找到卡片。");
  return { cards, warnings };
}

export async function importCards(file: File): Promise<ImportResult> {
  if (file.size > 150 * 1024 * 1024)
    throw new Error("文件超过 150 MB，请拆分后导入。");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const zip = await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files);
    if (entries.length > 3000) throw new Error("压缩包条目过多。");
    const set = zip.file("set");
    if (!set) throw new Error("此压缩包不是 MSE-SET：缺少 set 文件。");
    return mse(await set.async("string"), zip);
  }
  const text = new TextDecoder().decode(bytes).replace(/^\uFEFF/, "");
  if (/^mse_version:/m.test(text)) return mse(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("文件不是有效的 JSON 或 MSE-SET。");
  }
  const input = record(parsed);
  if (input.schemaVersion === 1 && Array.isArray(input.cards)) {
    const project = parseNativeProject(input);
    return { cards: project.cards, warnings: [], project };
  }
  const inputs = Array.isArray(parsed)
    ? parsed
    : Array.isArray(input.cards)
      ? input.cards
      : [parsed];
  const cards: Card[] = [],
    warnings: string[] = [
      "制卡器的密码/署名不作为卡号；请在导出前填写作者分配的卡号。",
    ];
  for (const value of inputs) {
    const item = record(value);
    if (
      ("na" in item && "fr" in item) ||
      ("frame" in item && "typeAbility" in item)
    )
      cards.push(await carder(item, warnings));
    else if ("cardType" in item && "description" in item)
      cards.push(yugiohCard(item, warnings));
    else
      throw new Error(
        "无法识别 JSON：支持 YGO Carder、yugioh-card 和 Day Lilies 工程。",
      );
  }
  if (!cards.length) throw new Error("文件中没有卡片。");
  return { cards, warnings: [...new Set(warnings)] };
}
