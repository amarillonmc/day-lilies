import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import initSqlJs from "sql.js";
const {
  useYGOProTest,
  OcgcoreScriptConstants: C,
  SlientAdvancor,
  SelectCardAdvancor,
  SummonPlaceAdvancor,
  YGOProMsgSelectIdleCmd,
} = createRequire(import.meta.url)(
  "ygopro-jstest",
) as typeof import("ygopro-jstest");
import type { YGOProTest } from "ygopro-jstest";
import type { Card, CardProject, TemplateId } from "../src/domain/model";
import { compileCard } from "../src/domain/compiler";
import { createCard, createEffect, createProject } from "../src/domain/model";
import { TEMPLATES } from "../src/domain/catalog";

// References are managed by `npm run refs:sync`. A clean install still runs all
// unit tests; these integration tests become available after that explicit sync.
const referenceScripts = path.resolve(".data/references/scripts");
const available =
  existsSync(path.join(referenceScripts, "utility.lua")) &&
  existsSync(path.join(referenceScripts, "procedure.lua"));
const cacheRoot = path.resolve(".cache/core-tests");
let outputRoot = "";
let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let sequence = 0;

function effectCard(
  template: TemplateId,
  code = 100020001,
  spell = true,
): Card {
  const card = createCard(code);
  card.name = `Core test ${template}`;
  if (spell) card.kind = "spell";
  card.effects = [createEffect(template, card)];
  return card;
}
function vanilla(code = 100020002): Card {
  const card = createCard(code);
  card.kind = "normal";
  card.name = `Material ${code}`;
  card.setcodes = [0x123];
  return card;
}
async function run(cards: Card[], callback: (ygo: YGOProTest) => void) {
  const project: CardProject = { ...createProject(), cards };
  const directory = path.join(outputRoot, String(sequence++));
  await fs.mkdir(directory);
  const db = new SQL.Database();
  db.run(
    "CREATE TABLE datas(id INTEGER PRIMARY KEY,ot INTEGER,alias INTEGER,setcode INTEGER,type INTEGER,atk INTEGER,def INTEGER,level INTEGER,race INTEGER,attribute INTEGER,category INTEGER)",
  );
  db.run(
    "CREATE TABLE texts(id INTEGER PRIMARY KEY,name TEXT,desc TEXT,str1 TEXT,str2 TEXT,str3 TEXT,str4 TEXT,str5 TEXT,str6 TEXT,str7 TEXT,str8 TEXT,str9 TEXT,str10 TEXT,str11 TEXT,str12 TEXT,str13 TEXT,str14 TEXT,str15 TEXT,str16 TEXT)",
  );
  for (const card of cards) {
    const result = compileCard(card, project);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    await fs.writeFile(path.join(directory, `c${card.code}.lua`), result.lua);
    const extraBits = {
      fusion: 0x40,
      synchro: 0x2000,
      xyz: 0x800000,
      link: 0x4000000,
    };
    const type =
      card.kind === "spell"
        ? 2
        : card.kind === "trap"
          ? 4
          : (card.kind === "normal" ? 0x11 : 0x21) +
            (extraBits[card.kind as keyof typeof extraBits] || 0) +
            (card.pendulum ? 0x1000000 : 0);
    db.run("INSERT INTO datas VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
      card.code,
      3,
      card.alias,
      card.setcodes[0] || 0,
      type,
      card.attack,
      card.kind === "link" ? 5 : card.defense,
      card.level,
      card.race,
      16,
      0,
    ]);
    db.run("INSERT INTO texts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
      card.code,
      card.name,
      "",
      ...Array.from({ length: 16 }, (_, i) => result.strings[i] || ""),
    ]);
  }
  const bytes = db.export();
  db.close();
  await useYGOProTest(
    {
      coverage: false,
      cdb: bytes,
      scriptPath: [directory, referenceScripts],
      playerInfo: [
        { startHand: 0, drawCount: 0 },
        { startHand: 0, drawCount: 0 },
      ],
    },
    callback,
  );
}
function activateFromHand(ygo: YGOProTest, code: number) {
  ygo.advance(SlientAdvancor()).state(YGOProMsgSelectIdleCmd, () => {
    const card = ygo
      .getFieldCard(0, C.LOCATION_HAND)
      .find((c) => c.code === code)!;
    expect(card).toBeDefined();
    expect(card.canActivate()).toBe(true);
    return card.activate();
  });
}

describe.skipIf(!available)(
  "generated scripts in the managed Koishi core",
  () => {
    beforeAll(async () => {
      SQL = await initSqlJs();
      await fs.mkdir(cacheRoot, { recursive: true });
      outputRoot = await fs.mkdtemp(path.join(cacheRoot, "run-"));
    });
    afterAll(async () => {
      // mkdtemp is anchored under the project cache; verify again before cleanup.
      const resolved = path.resolve(outputRoot);
      if (outputRoot && resolved.startsWith(`${cacheRoot}${path.sep}`))
        await fs.rm(resolved, { recursive: true, force: true });
    });
    it("loads all templates, standard extra procedures, and pendulum procedures without redtext", async () => {
      const cards = TEMPLATES.map((t, i) =>
        effectCard(t.id, 100020010 + i, false),
      );
      for (const kind of ["fusion", "synchro", "xyz", "link"] as const) {
        const c = effectCard("draw", 100020100 + cards.length, false);
        c.kind = kind;
        c.level = kind === "link" ? 2 : 8;
        c.linkMarkers = [1, 4];
        c.procedure = {
          mode: kind,
          min: 2,
          max: 2,
          materialLevel: 4,
          materialCodes: [100020010, 100020011],
        };
        cards.push(c);
      }
      const pendulum = effectCard("search", 100020200, false);
      pendulum.pendulum = true;
      pendulum.effects[0].scope = "pendulum";
      cards.push(pendulum);
      await run(cards, (ygo) => {
        for (const card of cards)
          ygo.addCard({ code: card.code, location: C.LOCATION_DECK });
        ygo.advance(SlientAdvancor());
        expect(
          ygo.getFieldCard(0, C.LOCATION_DECK).length +
            ygo.getFieldCard(0, C.LOCATION_EXTRA).length,
        ).toBe(cards.length);
      });
    });
    it("activates and resolves a set-filtered search, then prevents a second name-count activation", async () => {
      const card = effectCard("search");
      card.effects[0].filter.setcode = 0x123;
      card.effects[0].count = "name-activate";
      const copy = {
        ...card,
        code: card.code + 10,
        uid: "art-variant",
        effects: card.effects.map((b) => ({ ...b, uid: "art-effect" })),
      };
      const target = vanilla();
      const second = vanilla(100020003);
      await run([card, copy, target, second], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          { code: copy.code, location: C.LOCATION_HAND },
          { code: target.code, location: C.LOCATION_DECK },
          { code: second.code, location: C.LOCATION_DECK },
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: target.code }),
          SlientAdvancor(),
        );
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_HAND)
            .some((c) => c.code === target.code),
        ).toBe(true);
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_GRAVE)
            .some((c) => c.code === card.code),
        ).toBe(true);
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_HAND)
            .find((c) => c.code === copy.code)!
            .canActivate(),
        ).toBe(false);
      });
    });
    it("resolves draw count through the core chain target data", async () => {
      const card = effectCard("draw");
      card.effects[0].amount = 2;
      const a = vanilla(),
        b = vanilla(100020003);
      await run([card, a, b], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          { code: a.code, location: C.LOCATION_DECK },
          { code: b.code, location: C.LOCATION_DECK },
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(SummonPlaceAdvancor(), SlientAdvancor());
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_HAND)
            .map((c) => c.code)
            .sort(),
        ).toEqual([a.code, b.code]);
      });
    });
    it("selects and destroys an opponent target", async () => {
      const card = effectCard("destroy");
      card.effects[0].players = "opponent";
      card.effects[0].source = "monster";
      const target = vanilla();
      await run([card, target], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          {
            code: target.code,
            location: C.LOCATION_MZONE,
            controller: 1,
            position: C.POS_FACEUP_ATTACK,
          },
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: target.code }),
          SlientAdvancor(),
        );
        expect(ygo.getFieldCard(1, C.LOCATION_MZONE)).toHaveLength(0);
        expect(
          ygo
            .getFieldCard(1, C.LOCATION_GRAVE)
            .some((c) => c.code === target.code),
        ).toBe(true);
      });
    });
    it("resolves target revival without ignoring summon conditions", async () => {
      const card = effectCard("revive"),
        target = vanilla();
      await run([card, target], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          { code: target.code, location: C.LOCATION_GRAVE },
        ]);
        activateFromHand(ygo, card.code);
        ygo.advance(
          SummonPlaceAdvancor(),
          SelectCardAdvancor({ code: target.code }),
          SlientAdvancor(),
        );
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_MZONE)
            .some((c) => c.code === target.code),
        ).toBe(true);
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_GRAVE)
            .some((c) => c.code === target.code),
        ).toBe(false);
      });
    });
    it("performs the hand Special Summon procedure without an activation chain", async () => {
      const card = effectCard("self-summon", 100020001, false),
        opponent = vanilla();
      await run([card, opponent], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_HAND },
          {
            code: opponent.code,
            location: C.LOCATION_MZONE,
            controller: 1,
            position: C.POS_FACEUP_ATTACK,
          },
        ]);
        ygo
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const hand = ygo.getFieldCard(0, C.LOCATION_HAND)[0];
            expect(hand.canSpecialSummon()).toBe(true);
            return hand.specialSummon();
          })
          .advance(SummonPlaceAdvancor(), SlientAdvancor());
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_MZONE)
            .some((c) => c.code === card.code),
        ).toBe(true);
      });
    });
    it("banishes itself from the GY as cost and still resolves the draw", async () => {
      const card = effectCard("draw", 100020001, false),
        target = vanilla();
      card.effects[0].range = "grave";
      card.effects[0].cost = "banish-self";
      await run([card, target], (ygo) => {
        ygo.addCard([
          { code: card.code, location: C.LOCATION_GRAVE },
          { code: target.code, location: C.LOCATION_DECK },
        ]);
        ygo
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const grave = ygo.getFieldCard(0, C.LOCATION_GRAVE)[0];
            expect(grave.canActivate()).toBe(true);
            return grave.activate();
          })
          .advance(SlientAdvancor());
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_REMOVED)
            .some((c) => c.code === card.code),
        ).toBe(true);
        expect(
          ygo
            .getFieldCard(0, C.LOCATION_HAND)
            .some((c) => c.code === target.code),
        ).toBe(true);
      });
    });
  },
);
