import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { CardProject } from "../src/domain/model.js";
import { parseNativeProject } from "../src/io/project-schema.js";

export function validId(id: unknown): id is string {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
}

function parseServerProject(value: unknown): CardProject {
  if (
    !value ||
    typeof value !== "object" ||
    !validId((value as { id?: unknown }).id)
  )
    throw new Error("Invalid project ID");
  const project = parseNativeProject(value);
  if (project.name.length > 1000 || project.cards.length > 1000)
    throw new Error("Project exceeds server limits");
  return project;
}

export function validProject(value: unknown): boolean {
  try {
    parseServerProject(value);
    return true;
  } catch {
    return false;
  }
}

export class ProjectStore {
  constructor(readonly directory: string) {}
  async list() {
    await mkdir(this.directory, { recursive: true });
    const files = (await readdir(this.directory)).filter((file) =>
      /^[a-zA-Z0-9_-]+\.json$/.test(file),
    );
    const projects = await Promise.all(
      files.map(async (file) => {
        try {
          const project = parseServerProject(
            JSON.parse(await readFile(join(this.directory, file), "utf8")),
          );
          return {
            id: project.id,
            name: project.name,
            updatedAt: project.updatedAt,
            cardCount: project.cards.length,
          };
        } catch {
          return null;
        }
      }),
    );
    return projects
      .filter((p) => p !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string): Promise<CardProject | null> {
    if (!validId(id)) return null;
    try {
      const project = parseServerProject(
        JSON.parse(await readFile(join(this.directory, `${id}.json`), "utf8")),
      );
      return project;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async put(project: CardProject): Promise<CardProject> {
    const normalized = parseServerProject(project);
    await mkdir(this.directory, { recursive: true });
    const saved = { ...normalized, updatedAt: new Date().toISOString() };
    const tmp = join(this.directory, `${project.id}.${randomUUID()}.tmp`);
    try {
      await writeFile(tmp, JSON.stringify(saved), {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(tmp, join(this.directory, `${project.id}.json`));
    } finally {
      await rm(tmp, { force: true });
    }
    return saved;
  }
  async delete(id: string) {
    if (!validId(id)) return;
    await rm(join(this.directory, `${id}.json`), { force: true });
  }
}
