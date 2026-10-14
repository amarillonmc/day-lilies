import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
  stat,
} from "node:fs/promises";
import { resolve, join, relative, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import JSZip from "jszip";
import initSqlJs from "sql.js";
import { YGOProCdb } from "ygopro-cdb-encode";
import type { ReferenceCard } from "../src/domain/model.js";
import type { ReferenceManifest } from "../server/references.js";

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const args = process.argv.slice(2);
const argument = (name: string) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
if (args.includes("--help")) {
  console.log(
    "npm run refs:sync [-- --data-dir .data] [--from-workflow PATH --database PATH]\nWithout local paths, downloads latest upstream source snapshots. Local paths are read only during this command.",
  );
  process.exit(0);
}
for (let i = 0; i < args.length; i += 2) {
  if (
    !["--data-dir", "--from-workflow", "--database"].includes(args[i]) ||
    !args[i + 1] ||
    args[i + 1].startsWith("--")
  )
    throw new Error(`Unknown or incomplete argument: ${args[i]}`);
}
const workflow = argument("--from-workflow");
const database = argument("--database");
if (Boolean(workflow) !== Boolean(database))
  throw new Error("--from-workflow and --database must be supplied together.");
const dataDir = resolve(
  argument("--data-dir") ?? process.env.DATA_DIR ?? ".data",
);
const staging = join(dataDir, `.references-stage-${randomUUID()}`);
const sources: ReferenceManifest["sources"] = [];
type Source = {
  read(name: string): Promise<Buffer>;
  files(): Promise<string[]>;
};

async function localSource(
  path: string,
  name: string,
  url: string,
): Promise<Source> {
  const directory = resolve(path);
  let revision = "local-working-tree";
  try {
    revision = (
      await promisify(execFile)("git", ["-C", directory, "rev-parse", "HEAD"])
    ).stdout.trim();
  } catch {
    /* Archives need not contain git metadata. */
  }
  sources.push({ name, url, revision: `${revision} (local working tree)` });
  return {
    read: (file) => readFile(join(directory, file)),
    files: async () =>
      (await readdir(directory)).filter((file) => !file.startsWith(".")),
  };
}

async function remoteSource(repo: string, name: string): Promise<Source> {
  console.log(`Resolving latest ${repo}…`);
  const headers: Record<string, string> = {
    "User-Agent": "day-lilies-reference-sync",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const revisionResponse = await fetch(
    `https://api.github.com/repos/${repo}/commits/HEAD`,
    { headers, signal: AbortSignal.timeout(30_000) },
  );
  if (!revisionResponse.ok)
    throw new Error(`Cannot resolve ${repo}: HTTP ${revisionResponse.status}`);
  const revision = ((await revisionResponse.json()) as { sha: string }).sha;
  if (!/^[a-f0-9]{40}$/.test(revision))
    throw new Error(`Invalid revision for ${repo}`);
  const archiveResponse = await fetch(
    `https://codeload.github.com/${repo}/zip/${revision}`,
    { signal: AbortSignal.timeout(120_000) },
  );
  if (!archiveResponse.ok)
    throw new Error(`Cannot download ${repo}: HTTP ${archiveResponse.status}`);
  const zip = await JSZip.loadAsync(await archiveResponse.arrayBuffer());
  const root = Object.keys(zip.files)[0]?.split("/")[0];
  if (!root) throw new Error(`Empty archive: ${repo}`);
  sources.push({ name, url: `https://github.com/${repo}`, revision });
  return {
    read: async (file) => {
      const entry = zip.file(`${root}/${file}`);
      if (!entry) throw new Error(`Missing ${file} in ${repo}`);
      return entry.async("nodebuffer");
    },
    files: async () =>
      Object.keys(zip.files)
        .filter((file) => !zip.files[file].dir)
        .map((file) => file.slice(root.length + 1)),
  };
}

async function removeOwned(path: string) {
  const target = resolve(path);
  const rel = relative(dataDir, target);
  if (
    !rel ||
    rel.startsWith(`..${sep}`) ||
    rel === ".." ||
    resolve(dataDir, rel) !== target
  )
    throw new Error("Refusing to remove outside the managed data directory");
  await rm(target, { recursive: true, force: true });
}

async function main() {
  await mkdir(join(staging, "scripts"), { recursive: true });
  await mkdir(join(staging, "licenses"), { recursive: true });
  const scriptSource = workflow
    ? await localSource(
        join(workflow, "ygopro", "script"),
        "ygopro-scripts",
        "https://github.com/Smile-DK/ygopro-scripts",
      )
    : await remoteSource("Smile-DK/ygopro-scripts", "ygopro-scripts");
  const coreSource = workflow
    ? await localSource(
        join(workflow, "ygopro", "ocgcore"),
        "ygopro-core",
        "https://github.com/purerosefallen/ygopro-core",
      )
    : await remoteSource("purerosefallen/ygopro-core", "ygopro-core");
  const dbSource = database
    ? await localSource(
        database,
        "ygopro-database",
        "https://github.com/mycard/ygopro-database",
      )
    : await remoteSource("mycard/ygopro-database", "ygopro-database");
  const scriptFiles = (await scriptSource.files()).filter((name) =>
    /^[a-zA-Z0-9_-]+\.lua$/.test(name),
  );
  console.log(`Copying ${scriptFiles.length} reference scripts…`);
  // Bounded batches avoid opening thousands of files at once on Windows.
  for (let offset = 0; offset < scriptFiles.length; offset += 64) {
    await Promise.all(
      scriptFiles
        .slice(offset, offset + 64)
        .map(async (name) =>
          writeFile(
            join(staging, "scripts", name),
            await scriptSource.read(name),
          ),
        ),
    );
  }
  await writeFile(
    join(staging, "licenses", "ygopro-scripts-LICENSE"),
    await scriptSource.read("LICENSE"),
  );
  await writeFile(
    join(staging, "licenses", "ygopro-core-LICENSE"),
    await coreSource.read("LICENSE"),
  );
  for (const filename of ["LICENSE", "LICENSE.md", "COPYING"]) {
    try {
      await writeFile(
        join(staging, "licenses", "ygopro-database-LICENSE"),
        await dbSource.read(filename),
      );
      break;
    } catch {
      /* Upstream currently has no general asset license. */
    }
  }

  const apiSections: string[] = [];
  for (const name of ["card", "effect", "group", "duel"]) {
    const text = (await coreSource.read(`lib${name}.cpp`)).toString("utf8");
    const entries = [
      ...text.matchAll(/\{\s*"([A-Za-z0-9_]+)"\s*,\s*scriptlib::/g),
    ].map((match) => `${name[0].toUpperCase() + name.slice(1)}.${match[1]}`);
    apiSections.push(`${name} methods:\n${entries.join(", ")}`);
  }
  for (const filename of ["utility.lua", "procedure.lua"]) {
    const text = (await scriptSource.read(filename)).toString("utf8");
    const functions = [...text.matchAll(/^function\s+([^\n\r]+)/gm)].map(
      (match) => match[1],
    );
    apiSections.push(
      `${filename} function signatures:\n${functions.join("\n")}`,
    );
  }
  const constants = (await scriptSource.read("constant.lua")).toString("utf8");
  apiSections.push(`Core constants:\n${constants}`);
  const effects = (await coreSource.read("effect.h")).toString("utf8");
  const start = effects.indexOf("// KoishiPro effects");
  if (start >= 0)
    apiSections.unshift(
      `KoishiPro extension effect definitions (not assumed available in official target):\n${effects.slice(start, effects.indexOf("//", start + 4) > start ? effects.indexOf("//", start + 4) : start + 4000)}`,
    );
  await writeFile(join(staging, "engine-api.txt"), apiSections.join("\n\n"));

  const SQL = await initSqlJs();
  const languages = { sc: "zh-CN", en: "en-US", jp: "ja-JP" };
  let count = 0;
  for (const [language, locale] of Object.entries(languages)) {
    const bytes = await dbSource.read(`locales/${locale}/cards.cdb`);
    // sql.js opens only an in-memory copy and cannot create WAL/SHM next to source files.
    const cdb = new YGOProCdb(SQL).from(new Uint8Array(bytes));
    try {
      const cards: ReferenceCard[] = [...cdb.step()].map((card) => ({
        code: card.code,
        name: card.name,
        text: card.desc,
        type: card.type,
        language,
      }));
      count = Math.max(count, cards.length);
      await writeFile(join(staging, `${language}.json`), JSON.stringify(cards));
      console.log(`Indexed ${cards.length} cards (${locale}).`);
    } finally {
      cdb.finalize();
    }
  }
  const manifest: ReferenceManifest = {
    updatedAt: new Date().toISOString(),
    count,
    languages: Object.keys(languages),
    sources,
  };
  await writeFile(
    join(staging, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  const target = join(dataDir, "references");
  const backup = join(dataDir, `.references-old-${randomUUID()}`);
  let replaced = false;
  try {
    await stat(target);
    await rename(target, backup);
    replaced = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await rename(staging, target);
  } catch (error) {
    if (replaced) await rename(backup, target);
    throw error;
  }
  if (replaced) await removeOwned(backup);
  console.log(
    `Reference cache ready: ${target}. No sibling repository is needed at runtime.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(`Reference sync failed: ${(error as Error).message}`);
  await removeOwned(staging);
  process.exitCode = 1;
}
