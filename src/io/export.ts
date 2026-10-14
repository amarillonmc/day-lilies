import JSZip from "jszip";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { CardProject, CompileResult, Diagnostic } from "../domain/model";
import { compileCard, validateProject } from "../domain/compiler";
import {
  ATTRIBUTES,
  cardDescription,
  cardTypeBits,
  packedSetcode,
} from "./card-data";
import { renderCard } from "./render";

let sqlReady: Promise<SqlJsStatic> | undefined;
export function getSql(): Promise<SqlJsStatic> {
  sqlReady ??= initSqlJs(
    typeof window === "undefined" ? {} : { locateFile: () => sqlWasmUrl },
  );
  return sqlReady;
}

/** Build in-memory SQLite. 64-bit setcode is bound as text and CAST in SQLite. */
export async function createCdb(
  project: CardProject,
  compiled: CompileResult[],
  SQL?: SqlJsStatic,
): Promise<Uint8Array> {
  const sql = SQL || (await getSql());
  const db = new sql.Database();
  const textColumns = Array.from({ length: 16 }, (_, i) => `str${i + 1}`);
  try {
    db.run(
      "CREATE TABLE datas(id integer primary key,ot integer,alias integer,setcode integer,type integer,atk integer,def integer,level integer,race integer,attribute integer,category integer)",
    );
    db.run(
      `CREATE TABLE texts(id integer primary key,name text,desc text,${textColumns.map((column) => `${column} text`).join(",")})`,
    );
    const dataStmt = db.prepare(
      "INSERT INTO datas VALUES (?,?,?,CAST(? AS INTEGER),?,?,?,?,?,?,?)",
    );
    const textStmt = db.prepare(
      `INSERT INTO texts VALUES (${Array(19).fill("?").join(",")})`,
    );
    try {
      project.cards.forEach((card, index) => {
        const monster = !["spell", "trap"].includes(card.kind);
        const level = monster
          ? card.level +
            (card.pendulum
              ? card.rightScale * 0x10000 + card.leftScale * 0x1000000
              : 0)
          : 0;
        dataStmt.run([
          card.code,
          4,
          card.alias,
          packedSetcode(card.setcodes),
          cardTypeBits(card),
          monster ? card.attack : 0,
          card.kind === "link"
            ? card.linkMarkers.reduce((bits, bit) => bits | bit, 0)
            : monster
              ? card.defense
              : 0,
          level,
          monster ? card.race : 0,
          monster ? ATTRIBUTES[card.attribute] : 0,
          0,
        ]);
        textStmt.run([
          card.code,
          card.name,
          cardDescription(card),
          ...Array.from(
            { length: 16 },
            (_, i) => compiled[index]?.strings[i] || "",
          ),
        ]);
      });
    } finally {
      dataStmt.free();
      textStmt.free();
    }
    return db.export();
  } finally {
    db.close();
  }
}

function diagnosticsFor(
  project: CardProject,
  compiled: CompileResult[],
): Diagnostic[] {
  const all = [
    ...validateProject(project),
    ...compiled.flatMap((result) => result.diagnostics),
  ];
  return all.filter(
    (item, i) =>
      all.findIndex(
        (other) =>
          other.cardUid === item.cardUid &&
          other.effectUid === item.effectUid &&
          other.message === item.message &&
          other.severity === item.severity,
      ) === i,
  );
}
export function safePackName(name: string): string {
  const safe =
    name
      .normalize("NFKC")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/^[. ]+|[. ]+$/g, "")
      .slice(0, 80) || "day-lilies";
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(safe)
    ? `pack-${safe}`
    : safe;
}

export async function exportProject(
  project: CardProject,
  options: {
    allowDraft?: boolean;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<Blob> {
  // Validation is unconditional: a draft still needs valid IDs and valid Lua.
  const preliminary = validateProject(project);
  if (preliminary.some((issue) => issue.severity === "error"))
    throw new Error(
      preliminary
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message)
        .join("\n"),
    );
  const compiled = project.cards.map((card) => compileCard(card, project));
  const issues = diagnosticsFor(project, compiled);
  if (issues.some((issue) => issue.severity === "error"))
    throw new Error(
      issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message)
        .join("\n"),
    );
  if (
    !options.allowDraft &&
    issues.some((issue) => issue.severity === "warning")
  )
    throw new Error("卡包含有待核对项目，请先处理，或明确选择导出草稿包。");
  const zip = new JSZip();
  const name = safePackName(project.name);
  zip.file(`expansions/${name}.cdb`, await createCdb(project, compiled));
  options.onProgress?.(0, project.cards.length);
  for (let i = 0; i < project.cards.length; i++) {
    const card = project.cards[i];
    const picture = await renderCard(card);
    zip.file(`expansions/pics/${card.code}.png`, await picture.arrayBuffer());
    zip.file(`expansions/script/c${card.code}.lua`, compiled[i].lua);
    options.onProgress?.(i + 1, project.cards.length);
  }
  if (project.archetypes.length)
    zip.file(
      "expansions/strings.conf",
      project.archetypes
        .map(
          (archetype) =>
            `!setname 0x${archetype.code.toString(16)} ${archetype.name.replace(/[\r\n]+/g, " ")}`,
        )
        .join("\n") + "\n",
    );
  const report = {
    application: "Day Lilies",
    schemaVersion: 1,
    project: project.name,
    target: project.target,
    exportedAt: new Date().toISOString(),
    draft: Boolean(options.allowDraft),
    cards: project.cards.map((card) => ({
      code: card.code,
      name: card.name,
      mode: card.scriptMode,
      blocks: card.effects.length,
      reviewRequired: card.reviewRequired,
      hasArtwork: Boolean(card.art),
    })),
    diagnostics: issues,
  };
  zip.file("export-report.json", JSON.stringify(report, null, 2));
  zip.file(
    "README.txt",
    `${project.name}\n目标：${project.target === "koishipro" ? "KoishiPRO" : "官方 YGOPro"}\n\n将 expansions 目录中的 CDB、pics 和 script 合并到本地客户端的 expansions 中。\n同卡号文件会覆盖既有内容，请确认使用自己管理的卡号区间。\n${project.archetypes.length ? "strings.conf 包含新增系列名称：请将这些行合并到客户端已有的 expansions/strings.conf，不要覆盖原内容。\n" : ""}\n本包${options.allowDraft ? "为草稿，含待核对事项；" : ""}由作者在本地客户端进行最终实机测试。\nexport-report.json 记录本次输出的检查结果。\n卡片缺少中间图时会生成带 ARTWORK PLACEHOLDER 标记的完整卡图。\n\n此输出包用于游玩；如需继续编辑，请另外下载 Day Lilies 工程备份。\n`,
  );
  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/zip",
  });
}
