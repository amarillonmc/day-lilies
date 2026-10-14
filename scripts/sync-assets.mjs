import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

// These are deployment assets, never runtime dependencies on another checkout.
// The manifest is versioned together with the application. Complete checkouts
// need no network; missing files are restored from one pinned upstream revision.
const root = fileURLToPath(new URL("../public/card-assets/", import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(root, "manifest.json"), "utf8"),
);
if (!/^[a-f0-9]{40}$/.test(manifest.revision))
  throw new Error("Invalid asset revision");
const sourceArgument = process.argv.indexOf("--from");
const source =
  sourceArgument >= 0
    ? path.resolve(process.argv[sourceArgument + 1] || "")
    : null;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let restored = 0;
const queue = [...manifest.files];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const entry = queue.shift();
      if (!entry || !/^yugioh\/(font|image)\/[\w.-]+$/.test(entry.path))
        throw new Error("Invalid asset path");
      const target = path.join(root, ...entry.path.split("/"));
      let contents;
      try {
        contents = await readFile(target);
      } catch {
        /* restore below */
      }
      if (contents?.length === entry.bytes && digest(contents) === entry.sha256)
        continue;
      if (source)
        contents = await readFile(
          path.join(source, manifest.sourceDirectory, entry.path),
        );
      else {
        const url = `https://raw.githubusercontent.com/kooriookami/yugioh-card/${manifest.revision}/${manifest.sourceDirectory}/${entry.path}`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok)
          throw new Error(
            `Cannot restore ${entry.path}: HTTP ${response.status}`,
          );
        contents = Buffer.from(await response.arrayBuffer());
      }
      if (contents.length !== entry.bytes || digest(contents) !== entry.sha256)
        throw new Error(`Asset checksum mismatch: ${entry.path}`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents);
      restored++;
    }
  }),
);
await writeFile(
  path.join(root, "yugioh/font/font-list.json"),
  JSON.stringify(manifest.fonts, null, 2) + "\n",
);
console.log(
  `Card assets: verified ${manifest.files.length} files (${(manifest.files.reduce((sum, file) => sum + file.bytes, 0) / 1024 / 1024).toFixed(1)} MiB); restored ${restored}.`,
);
