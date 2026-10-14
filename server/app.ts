import express, { type ErrorRequestHandler } from "express";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { ProjectStore, validId, validProject } from "./projects.js";
import { ReferenceStore } from "./references.js";
import { ApiError, generateLua, type ChatTransport } from "./byok.js";

export interface AppOptions {
  dataDirectory?: string;
  distDirectory?: string;
  publicOrigin?: string;
  allowedByokHosts?: string[];
  chatTransport?: ChatTransport;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  const data = resolve(
    options.dataDirectory ?? process.env.DATA_DIR ?? ".data",
  );
  const projects = new ProjectStore(join(data, "projects"));
  const references = new ReferenceStore(join(data, "references"));
  const publicOrigin = options.publicOrigin ?? process.env.PUBLIC_ORIGIN;
  const allowedHosts =
    options.allowedByokHosts ??
    (process.env.BYOK_ALLOWED_HOSTS ?? "").split(",").filter(Boolean);

  app.use("/api", (req, res, next) => {
    // Validate Host even for reads: protects a local server from DNS rebinding.
    let requestOrigin: URL;
    try {
      requestOrigin = new URL(`${req.protocol}://${req.headers.host}`);
    } catch {
      res.status(403).json({ error: "无效的请求来源。" });
      return;
    }
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
      requestOrigin.hostname,
    );
    const configuredUrl = publicOrigin ? new URL(publicOrigin) : undefined;
    const configured = configuredUrl?.origin;
    if (!loopback && requestOrigin.host !== configuredUrl?.host) {
      res
        .status(403)
        .json({
          error: "此服务默认仅供本机使用；网络部署需配置 PUBLIC_ORIGIN。",
        });
      return;
    }
    const origin = req.headers.origin;
    if (origin && origin !== requestOrigin.origin && origin !== configured) {
      res.status(403).json({ error: "只接受同源请求。" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(express.json({ limit: "100mb" }));

  app.get("/api/health", async (_req, res) => {
    const manifest = await references.manifest();
    res.json({
      ok: true,
      references: {
        ready: Boolean(manifest),
        count: manifest?.count ?? 0,
        updatedAt: manifest?.updatedAt,
      },
      storage: "server",
    });
  });
  app.get("/api/references", async (req, res) => {
    res.json({
      cards: await references.search(
        String(req.query.q ?? ""),
        String(req.query.language ?? "sc"),
      ),
    });
  });
  app.get("/api/references/:code", async (req, res) => {
    if (!/^\d{1,10}$/.test(req.params.code))
      throw new ApiError(400, "无效卡号。");
    const card = await references.get(
      Number(req.params.code),
      String(req.query.language ?? "sc"),
    );
    if (!card)
      throw new ApiError(404, "参考卡未找到；请先同步参考资料或切换语言。");
    res.json(card);
  });
  app.get("/api/projects", async (_req, res) => {
    res.json({ projects: await projects.list() });
  });
  app.get("/api/projects/:id", async (req, res) => {
    if (!validId(req.params.id)) throw new ApiError(400, "无效工程 ID。");
    const project = await projects.get(req.params.id);
    if (!project) throw new ApiError(404, "卡包不存在。");
    res.json({ project });
  });
  app.put("/api/projects/:id", async (req, res) => {
    const project = req.body?.project;
    if (!validProject(project) || req.params.id !== project.id)
      throw new ApiError(400, "卡包格式无效或 ID 不一致。");
    res.json({ project: await projects.put(project) });
  });
  app.delete("/api/projects/:id", async (req, res) => {
    if (!validId(req.params.id)) throw new ApiError(400, "无效工程 ID。");
    await projects.delete(req.params.id);
    res.json({ ok: true });
  });
  let pendingByok = 0;
  app.post("/api/byok", async (req, res) => {
    if (pendingByok >= 2)
      throw new ApiError(429, "已有两个模型任务进行中，请稍后重试。");
    pendingByok++;
    try {
      res.json(
        await generateLua(
          req.body ?? {},
          references,
          allowedHosts,
          options.chatTransport,
        ),
      );
    } finally {
      pendingByok--;
    }
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API 不存在。" });
  });

  const dist = resolve(options.distDirectory ?? "dist");
  if (existsSync(join(dist, "index.html"))) {
    app.use(express.static(dist, { index: false }));
    app.use((req, res, next) => {
      if (req.method === "GET" && req.accepts("html"))
        res.sendFile(join(dist, "index.html"));
      else next();
    });
  }
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error?.type === "entity.too.large") {
      res
        .status(413)
        .json({ error: "卡包超过 100 MB，请拆分卡包或缩小图片。" });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ error: "请求 JSON 无效。" });
      return;
    }
    // Never log bodies, provider responses, credentials or request objects.
    res
      .status(500)
      .json({ error: "服务器处理失败，请检查数据目录权限和请求内容。" });
  };
  app.use(errors);
  return app;
}
