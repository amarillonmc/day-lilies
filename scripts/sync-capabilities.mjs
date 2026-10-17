import { readFile, writeFile } from "node:fs/promises";

// Uses the project's explicitly synced references; never a sibling checkout.
const source = await readFile(
  new URL("../.data/references/scripts/constant.lua", import.meta.url),
  "utf8",
);
const manifest = JSON.parse(
  await readFile(
    new URL("../.data/references/manifest.json", import.meta.url),
    "utf8",
  ),
);
const scriptSource = manifest.sources.find(
  (entry) => entry.name === "ygopro-scripts",
);
const revision = scriptSource.revision.split(" ")[0];
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error("References need a recorded script revision");
const values = new Map();
const entries = [];
for (const [index, line] of source.split(/\r?\n/).entries()) {
  const match = line.match(/^([A-Z][A-Z_0-9]*)\s*=\s*([^\r\n]*?)(?:\s*--.*)?$/);
  if (!match) continue;
  const [, id, expression] = match;
  // Numeric literals and sums suffice for the catalog. Do not evaluate Lua/code.
  const terms = expression
    .trim()
    .split("+")
    .map((term) => term.trim());
  const numbers = terms.map((term) =>
    /^(?:0x[\da-f]+|\d+)$/i.test(term) ? Number(term) : values.get(term),
  );
  const code = numbers.every((n) => n !== undefined)
    ? numbers.reduce((a, b) => a + b, 0)
    : undefined;
  if (code !== undefined) values.set(id, code);
  let category;
  if (id.startsWith("EFFECT_TYPE_")) category = "type";
  else if (id.startsWith("EFFECT_FLAG")) category = "property";
  else if (id.startsWith("EFFECT_COUNT_")) category = "count";
  else if (id.startsWith("EFFECT_")) category = "effect";
  else if (id.startsWith("EVENT_")) category = "event";
  else if (id.startsWith("CATEGORY_")) category = "category";
  else if (id.startsWith("RESET")) category = "reset";
  else if (id.startsWith("LOCATION_")) category = "location";
  else continue;
  entries.push({
    id,
    category,
    ...(code !== undefined ? { code } : {}),
    line: index + 1,
  });
}
await writeFile(
  new URL("../src/domain/engine-constants.json", import.meta.url),
  JSON.stringify(
    {
      source: `${scriptSource.url}/blob/${revision}/constant.lua`,
      entries,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Bundled ${entries.length} effect, event, flag and supporting constants.`,
);
