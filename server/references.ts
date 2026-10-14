import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Language, ReferenceCard } from "../src/domain/model.js";

export interface ReferenceManifest {
  updatedAt: string;
  count: number;
  languages: string[];
  sources: { name: string; url: string; revision: string }[];
}

/** Managed JSON indexes keep SQLite, git and sibling checkouts out of runtime. */
export class ReferenceStore {
  private indexes = new Map<string, ReferenceCard[]>();
  private stamp = 0;
  constructor(readonly directory: string) {}

  async manifest(): Promise<ReferenceManifest | null> {
    try {
      const path = join(this.directory, "manifest.json");
      const changed = (await stat(path)).mtimeMs;
      if (changed !== this.stamp) {
        this.indexes.clear();
        this.stamp = changed;
      }
      return JSON.parse(await readFile(path, "utf8")) as ReferenceManifest;
    } catch {
      return null;
    }
  }

  async cards(language: Language | string = "sc"): Promise<ReferenceCard[]> {
    const manifest = await this.manifest();
    if (!manifest) return [];
    const key = ["sc", "en", "jp"].includes(language) ? language : "sc";
    if (!manifest.languages.includes(key)) return [];
    if (!this.indexes.has(key)) {
      this.indexes.set(
        key,
        JSON.parse(await readFile(join(this.directory, `${key}.json`), "utf8")),
      );
    }
    return this.indexes.get(key)!;
  }

  async search(
    query: string,
    language = "sc",
    limit = 30,
  ): Promise<ReferenceCard[]> {
    const cards = await this.cards(language);
    const q = query.trim().toLocaleLowerCase().slice(0, 300);
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return cards
      .map((card) => {
        const name = card.name.toLocaleLowerCase();
        const text = card.text.toLocaleLowerCase();
        const score =
          String(card.code) === q
            ? 10000
            : name === q
              ? 5000
              : name.includes(q)
                ? 1000
                : tokens.every((t) => `${name} ${text}`.includes(t))
                  ? 100 + tokens.filter((t) => name.includes(t)).length * 20
                  : 0;
        return { card, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.card.code - b.card.code)
      .slice(0, limit)
      .map((x) => x.card);
  }

  async get(code: number, language = "sc"): Promise<ReferenceCard | null> {
    const card = (await this.cards(language)).find(
      (card) => card.code === code,
    );
    if (!card) return null;
    let script: string | undefined;
    try {
      script = await readFile(
        join(this.directory, "scripts", `c${code}.lua`),
        "utf8",
      );
    } catch {
      /* Normal monsters and new database entries may have no script. */
    }
    return { ...card, script };
  }

  async apiSummary(): Promise<string> {
    try {
      return await readFile(join(this.directory, "engine-api.txt"), "utf8");
    } catch {
      return "No managed engine API cache. Only use APIs verified by the provided reference scripts.";
    }
  }
}
