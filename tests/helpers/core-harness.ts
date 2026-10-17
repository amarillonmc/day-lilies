import { afterAll, beforeAll, expect } from "vitest";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import initSqlJs from "sql.js";
import type { YGOProTest } from "ygopro-jstest";
import { compileCard } from "../../src/domain/compiler";
import {
  createProject,
  type Card,
  type TargetCore,
} from "../../src/domain/model";
import { ATTRIBUTES, cardTypeBits } from "../../src/io/card-data";

export const core = createRequire(import.meta.url)(
  "ygopro-jstest",
) as typeof import("ygopro-jstest");
export const { OcgcoreScriptConstants: C } = core;
export const referenceScripts = path.resolve(".data/references/scripts");
export const coreAvailable =
  existsSync(path.join(referenceScripts, "utility.lua")) &&
  existsSync(path.join(referenceScripts, "procedure.lua"));

/** Call inside describe.skipIf(!coreAvailable); each suite gets an isolated fixture directory. */
export function createCoreHarness(name: string) {
  const cacheRoot = path.resolve(".cache/core-tests");
  let directory = "";
  let SQL: Awaited<ReturnType<typeof initSqlJs>>;
  let sequence = 0;
  beforeAll(async () => {
    SQL = await initSqlJs();
    await fs.mkdir(cacheRoot, { recursive: true });
    directory = await fs.mkdtemp(path.join(cacheRoot, `${name}-`));
  });
  afterAll(async () => {
    const resolved = path.resolve(directory);
    if (directory && resolved.startsWith(`${cacheRoot}${path.sep}`))
      await fs.rm(resolved, { recursive: true, force: true });
  });

  return async function run(
    cards: Card[],
    callback: (ygo: YGOProTest) => void,
    target: TargetCore = "ygopro",
  ) {
    const project = { ...createProject(), target, cards };
    const output = path.join(directory, String(sequence++));
    await fs.mkdir(output);
    const db = new SQL.Database();
    db.run(
      "CREATE TABLE datas(id INTEGER PRIMARY KEY,ot INTEGER,alias INTEGER,setcode INTEGER,type INTEGER,atk INTEGER,def INTEGER,level INTEGER,race INTEGER,attribute INTEGER,category INTEGER)",
    );
    db.run(
      "CREATE TABLE texts(id INTEGER PRIMARY KEY,name TEXT,desc TEXT,str1 TEXT,str2 TEXT,str3 TEXT,str4 TEXT,str5 TEXT,str6 TEXT,str7 TEXT,str8 TEXT,str9 TEXT,str10 TEXT,str11 TEXT,str12 TEXT,str13 TEXT,str14 TEXT,str15 TEXT,str16 TEXT)",
    );
    for (const card of cards) {
      const result = compileCard(card, project);
      expect(
        result.diagnostics.filter((d) => d.severity === "error"),
        card.name,
      ).toEqual([]);
      await fs.writeFile(path.join(output, `c${card.code}.lua`), result.lua);
      db.run("INSERT INTO datas VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
        card.code,
        3,
        card.alias,
        card.setcodes[0] || 0,
        cardTypeBits(card),
        card.attack,
        card.kind === "link"
          ? card.linkMarkers.reduce((mask, marker) => mask | marker, 0)
          : card.defense,
        card.level | (card.leftScale << 24) | (card.rightScale << 16),
        card.race,
        ATTRIBUTES[card.attribute],
        0,
      ]);
      db.run(
        "INSERT INTO texts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          card.code,
          card.name,
          card.text,
          ...Array.from({ length: 16 }, (_, i) => result.strings[i] || ""),
        ],
      );
    }
    const cdb = db.export();
    db.close();
    await core.useYGOProTest(
      {
        coverage: false,
        cdb,
        scriptPath: [output, referenceScripts],
        playerInfo: [
          { startHand: 0, drawCount: 0 },
          { startHand: 0, drawCount: 0 },
        ],
      },
      callback,
    );
  };
}

export function activateFromHand(ygo: YGOProTest, code: number) {
  ygo.advance(core.SlientAdvancor()).state(core.YGOProMsgSelectIdleCmd, () => {
    const card = ygo
      .getFieldCard(0, C.LOCATION_HAND)
      .find((c) => c.code === code)!;
    expect(card).toBeDefined();
    expect(card.canActivate()).toBe(true);
    return card.activate();
  });
}
