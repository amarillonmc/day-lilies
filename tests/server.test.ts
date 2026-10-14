import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { request, type Server } from "node:http";
import { createApp } from "../server/app.js";
import { createCard, createProject } from "../src/domain/model.js";
import {
  isPrivateAddress,
  parseByokResult,
  resolveEndpoint,
  type ChatMessage,
} from "../server/byok.js";

let directory: string;
let base: string;
let server: Server;
let capturedMessages: ChatMessage[] = [];
let replies: string[] = [];
const validLua = "local s,id=GetID()\nfunction s.initial_effect(c)\nend";

beforeAll(async () => {
  const cache = resolve(".cache");
  await mkdir(cache, { recursive: true });
  directory = await mkdtemp(join(cache, "server-tests-"));
  const refs = join(directory, "references");
  await mkdir(join(refs, "scripts"), { recursive: true });
  await writeFile(
    join(refs, "manifest.json"),
    JSON.stringify({
      updatedAt: "2026-01-01",
      count: 2,
      languages: ["en", "sc"],
      sources: [],
    }),
  );
  const cards = [
    {
      code: 32807846,
      name: "Reinforcement of the Army",
      text: "Add 1 Level 4 or lower Warrior monster from your Deck to your hand.",
      type: 2,
      language: "en",
    },
    {
      code: 83764718,
      name: "Monster Reborn",
      text: "Target 1 monster in either GY; Special Summon it.",
      type: 2,
      language: "en",
    },
  ];
  await writeFile(join(refs, "en.json"), JSON.stringify(cards));
  await writeFile(join(refs, "sc.json"), JSON.stringify(cards));
  await writeFile(join(refs, "scripts", "c32807846.lua"), validLua);
  await writeFile(
    join(refs, "engine-api.txt"),
    "Duel.SendtoHand, Card.IsSetCard",
  );
  server = createApp({
    dataDirectory: directory,
    distDirectory: join(directory, "missing-dist"),
    chatTransport: async (_settings, messages) => {
      capturedMessages = structuredClone(messages);
      return (
        replies.shift() ??
        JSON.stringify({ lua: validLua, strings: ["检索"], notes: "已生成。" })
      );
    },
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolveReady) =>
    server.once("listening", resolveReady),
  );
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolveClosed, reject) =>
    server.close((error) => (error ? reject(error) : resolveClosed())),
  );
  if (!resolve(directory).startsWith(resolve(".cache") + sep))
    throw new Error("Unexpected test directory");
  await rm(directory, { recursive: true, force: true });
});

async function api(path: string, method = "GET", body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("server workflow", () => {
  it("reports available reference data and searches text, name and code", async () => {
    const health = await (await api("/api/health")).json();
    expect(health.references).toMatchObject({ ready: true, count: 2 });
    for (const query of ["32807846", "reinforcement", "Warrior Deck"]) {
      const result = await (
        await api(`/api/references?language=en&q=${encodeURIComponent(query)}`)
      ).json();
      expect(result.cards[0].code).toBe(32807846);
    }
    const reference = await (
      await api("/api/references/32807846?language=en")
    ).json();
    expect(reference.script).toBe(validLua);
    expect((await api("/api/references/123?language=en")).status).toBe(404);
    expect((await (await api("/api/references?q=")).json()).cards).toEqual([]);
  });

  it("round-trips a card project including artwork and custom Lua", async () => {
    const project = createProject();
    const card = createCard(100000001);
    card.art = "data:image/png;base64,TEST";
    card.customLua = validLua;
    project.cards = [card];
    expect(
      (await api(`/api/projects/${project.id}`, "PUT", { project })).status,
    ).toBe(200);
    const saved = await (await api(`/api/projects/${project.id}`)).json();
    expect(saved.project.cards[0]).toEqual(card);
    const list = await (await api("/api/projects")).json();
    expect(list.projects).toContainEqual(
      expect.objectContaining({ id: project.id, cardCount: 1 }),
    );
    expect(
      JSON.parse(
        await readFile(
          join(directory, "projects", `${project.id}.json`),
          "utf8",
        ),
      ).cards[0].code,
    ).toBe(card.code);
    expect((await api(`/api/projects/${project.id}`, "DELETE")).status).toBe(
      200,
    );
    expect((await api(`/api/projects/${project.id}`)).status).toBe(404);
  });

  it("rejects malformed projects, mismatching IDs, cross-origin mutation and hostile Host", async () => {
    const project = createProject();
    expect(
      (await api("/api/projects/wrong-id", "PUT", { project })).status,
    ).toBe(400);
    expect(
      (
        await api("/api/projects/test", "PUT", {
          project: { id: "../outside" },
        })
      ).status,
    ).toBe(400);
    const malformedCard = { ...createCard(100000004), effects: [{}] };
    expect(
      (
        await api(`/api/projects/${project.id}`, "PUT", {
          project: { ...project, cards: [malformedCard] },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api(`/api/projects/${project.id}`, "PUT", {
          project: { ...project, cards: [createCard()], archetypes: null },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api(`/api/projects/${project.id}`, "PUT", {
          project: {
            ...project,
            cards: [{ ...createCard(), procedure: null }],
          },
        })
      ).status,
    ).toBe(400);
    const crossOrigin = await fetch(`${base}/api/projects/${project.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://unrelated.example",
      },
      body: JSON.stringify({ project }),
    });
    expect(crossOrigin.status).toBe(403);
    const hostileHostStatus = await new Promise<number | undefined>(
      (resolveResponse, reject) => {
        const req = request(
          `${base}/api/projects`,
          { headers: { Host: "unrelated.example" } },
          (response) => {
            response.resume();
            resolveResponse(response.statusCode);
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
    expect(hostileHostStatus).toBe(403);
  });

  it("grounds BYOK with references and custom card IDs without sending art or persisting the Key", async () => {
    const project = createProject();
    const card = createCard(100000002);
    card.language = "en";
    card.text = "Add 1 Warrior monster from your Deck to your hand.";
    card.art = "SHOULD-NOT-BE-SENT";
    project.cards = [card];
    const result = await api("/api/byok", "POST", {
      settings: {
        endpoint: "https://llm.example/v1",
        apiKey: "secret-only-in-transport",
        model: "test-model",
      },
      project,
      card,
      referenceCodes: [32807846],
    });
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.lua).toBe(validLua);
    expect(body.notes).toContain("尚未进行内核加载");
    const prompt = JSON.stringify(capturedMessages);
    expect(prompt).toContain("Reinforcement of the Army");
    expect(prompt).toContain("100000002");
    expect(prompt).not.toContain("secret-only-in-transport");
    expect(prompt).not.toContain("SHOULD-NOT-BE-SENT");
    expect((await (await api("/api/projects")).json()).projects).toEqual([]);
  });

  it("repairs invalid provider JSON once and reports incomplete configuration", async () => {
    const project = createProject();
    const card = createCard(100000003);
    card.text = "Draw 1 card.";
    replies = [
      "not json",
      JSON.stringify({ lua: validLua, strings: [], notes: "" }),
    ];
    expect(
      (
        await api("/api/byok", "POST", {
          settings: {
            endpoint: "https://llm.example/v1",
            apiKey: "",
            model: "test",
          },
          project,
          card,
        })
      ).status,
    ).toBe(200);
    expect(capturedMessages).toHaveLength(4);
    expect(
      (await api("/api/byok", "POST", { settings: {}, project, card })).status,
    ).toBe(400);
  });
});

describe("provider endpoint and result boundaries", () => {
  it("classifies private and reserved addresses, including mapped IPv6", () => {
    for (const address of [
      "127.0.0.1",
      "10.2.3.4",
      "169.254.169.254",
      "172.16.1.1",
      "192.168.1.1",
      "::1",
      "fc00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
    ])
      expect(isPrivateAddress(address)).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
  });
  it("requires explicit operator permission for private HTTP providers", async () => {
    await expect(resolveEndpoint("http://127.0.0.1:11434/v1")).rejects.toThrow(
      "HTTPS",
    );
    const endpoint = await resolveEndpoint("http://127.0.0.1:11434/v1", [
      "127.0.0.1",
    ]);
    expect(endpoint.url.pathname).toBe("/v1/chat/completions");
    await expect(resolveEndpoint("https://127.0.0.1/v1")).rejects.toThrow(
      "私有网络",
    );
    await expect(
      resolveEndpoint("https://user:secret@example.com/v1"),
    ).rejects.toThrow("用户名");
  });
  it("refuses invalid Lua and mismatching hardcoded entry points", () => {
    expect(() =>
      parseByokResult(
        JSON.stringify({ lua: "function invalid(", strings: [], notes: "" }),
        100000001,
      ),
    ).toThrow("语法错误");
    expect(() =>
      parseByokResult(
        JSON.stringify({
          lua: "function c123.initial_effect(c) end",
          strings: [],
          notes: "",
        }),
        100000001,
      ),
    ).toThrow("c100000001");
    expect(
      parseByokResult(
        `\`\`\`json\n${JSON.stringify({ lua: validLua, strings: [], notes: "" })}\n\`\`\``,
        100000001,
      ).lua,
    ).toBe(validLua);
  });
});
