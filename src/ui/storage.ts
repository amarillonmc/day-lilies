import { get, set, del, keys } from "idb-keyval";
import type { CardProject } from "../domain/model";
export type StorageMode = "local" | "server";
export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  cardCount: number;
};
const prefix = "day-lilies:project:";
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data;
}
export async function saveProject(p: CardProject, mode: StorageMode) {
  if (mode === "server")
    await request(`/api/projects/${encodeURIComponent(p.id)}`, {
      method: "PUT",
      body: JSON.stringify({ project: p }),
    });
  else await set(prefix + p.id, p);
  localStorage.setItem("day-lilies:last", p.id);
}
export async function loadProject(
  id: string,
  mode: StorageMode,
): Promise<CardProject | undefined> {
  return mode === "server"
    ? (
        await request<{ project: CardProject }>(
          `/api/projects/${encodeURIComponent(id)}`,
        )
      ).project
    : await get(prefix + id);
}
export async function listProjects(
  mode: StorageMode,
): Promise<ProjectSummary[]> {
  if (mode === "server")
    return (await request<{ projects: ProjectSummary[] }>("/api/projects"))
      .projects;
  const ids = (await keys()).filter(
    (k) => typeof k === "string" && k.startsWith(prefix),
  );
  const ps = await Promise.all(ids.map((k) => get<CardProject>(k)));
  return ps
    .filter((p): p is CardProject => !!p)
    .map((p) => ({
      id: p.id,
      name: p.name,
      updatedAt: p.updatedAt,
      cardCount: p.cards.length,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function removeProject(id: string, mode: StorageMode) {
  if (mode === "server")
    await request(`/api/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  else await del(prefix + id);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
