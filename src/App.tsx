import { useI18n, UI_LANGUAGES } from "./i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Code2,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Layers3,
  Leaf,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  createCard,
  createProject,
  uid,
  type ByokSettings,
  type Card,
  type CardProject,
  type MatchResult,
} from "./domain/model";
import { compileCard, validateProject } from "./domain/compiler";
import { matchEffects } from "./domain/matcher";
import { TEMPLATES } from "./domain/catalog";
import { demoProject } from "./domain/demo";
import CardEditor from "./ui/CardEditor";
import EffectEditor from "./ui/EffectEditor";
import Preview from "./ui/Preview";
import Modal from "./ui/Modal";
import AssistantPanel from "./ui/AssistantPanel";
import { Field, NumberInput, Select } from "./ui/Fields";
import { KINDS } from "./ui/options";
import {
  download,
  listProjects,
  loadProject,
  removeProject,
  saveProject,
  type ProjectSummary,
  type StorageMode,
} from "./ui/storage";

type Tab = "card" | "effects" | "lua" | "assistant";
type Dialog = "settings" | "projects" | "export" | "help" | null;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export default function App() {
  const { t, language, setLanguage } = useI18n();
  const [project, setProject] = useState<CardProject>(() => createProject());
  const [selected, setSelected] = useState("");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<StorageMode>(() =>
    localStorage.getItem("day-lilies:storage") === "server"
      ? "server"
      : "local",
  );
  const [tab, setTab] = useState<Tab>("card");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("正在加载");
  const [busy, setBusy] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [matched, setMatched] = useState<MatchResult | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[] | null>(null);
  const [draft, setDraft] = useState(false);
  const [byok, setByok] = useState<ByokSettings>(() => {
    let s = { endpoint: "", model: "" };
    try {
      s = JSON.parse(localStorage.getItem("day-lilies:byok") || "{}");
    } catch {}
    return { endpoint: s.endpoint || "", model: s.model || "", apiKey: "" };
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const loadOnce = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const latest = useRef({ project, mode });
  latest.current = { project, mode };
  function enqueueSave(snapshot: CardProject, storage: StorageMode) {
    const task = saveQueue.current
      .catch(() => {})
      .then(() => saveProject(snapshot, storage));
    saveQueue.current = task;
    return task.then(() => {
      if (
        latest.current.project === snapshot &&
        latest.current.mode === storage
      )
        setSaved(storage === "local" ? "已保存到此浏览器" : "已保存到服务端");
    });
  }
  const card =
    project.cards.find((c) => c.uid === selected) || project.cards[0];
  const diagnostics = useMemo(() => validateProject(project), [project]);
  const compiled = useMemo(
    () => (card ? compileCard(card, project) : null),
    [card, project],
  );
  const cardIssues = diagnostics.filter((d) => d.cardUid === card?.uid);
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const filtered = project.cards.filter((c) =>
    `${c.name} ${c.code}`.toLowerCase().includes(filter.toLowerCase()),
  );

  useEffect(() => {
    if (loadOnce.current) return;
    loadOnce.current = true;
    void (async () => {
      try {
        const last = localStorage.getItem("day-lilies:last");
        const existing = last ? await loadProject(last, mode) : undefined;
        const next = existing || demoProject();
        setProject(next);
        setSelected(next.cards[0]?.uid || "");
      } catch (e) {
        setError(
          `读取上次卡包失败：${errorMessage(e)}。已打开空白卡包；原保存数据没有删除。`,
        );
      } finally {
        setReady(true);
      }
    })();
  }, [mode]);
  useEffect(() => {
    if (!ready) return;
    setSaved("有未保存的修改");
    const timer = setTimeout(() => {
      const snapshot = project;
      setSaved("保存中…");
      void enqueueSave(snapshot, mode).catch((e) => {
        if (latest.current.project === snapshot) setSaved("保存失败");
        setError(errorMessage(e));
      });
    }, 650);
    return () => clearTimeout(timer);
  }, [project, mode, ready]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (["有未保存的修改", "保存中…", "保存失败"].includes(saved)) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saved]);
  const updateProject = (patch: Partial<CardProject>) =>
    setProject((p) => ({
      ...p,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  const updateCard = (patch: Partial<Card>) => {
    if (!card) return;
    setProject((p) => ({
      ...p,
      cards: p.cards.map((c) => (c.uid === card.uid ? { ...c, ...patch } : c)),
      updatedAt: new Date().toISOString(),
    }));
  };
  const activate = (p: CardProject) => {
    setProject(p);
    setSelected(p.cards[0]?.uid || "");
    setTab("card");
    setFilter("");
    setDialog(null);
  };
  async function persist() {
    await enqueueSave(project, mode);
  }
  async function openProjects() {
    try {
      await persist();
      setProjects(await listProjects(mode));
      setDialog("projects");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function addCard() {
    let code = project.nextCode;
    const used = new Set(project.cards.map((c) => c.code));
    while (used.has(code)) code++;
    if (!Number.isInteger(code) || code < 128 || code > 268435455) {
      setError("请在设置中填写 128–268435455 之间的下一个可用卡号。");
      return;
    }
    const next = createCard(code);
    updateProject({
      cards: [...project.cards, next],
      nextCode: code + 1,
    });
    setSelected(next.uid);
    setTab("card");
  }
  function assignCodes() {
    const used = new Set(
      project.cards.filter((c) => c.code > 0).map((c) => c.code),
    );
    let next = project.nextCode;
    if (!Number.isInteger(next) || next < 128 || next > 268435455) {
      setError("请填写 128–268435455 之间的下一个可用卡号。");
      return;
    }
    const cards = project.cards.map((c) => {
      if (c.code > 0) return c;
      while (used.has(next)) next++;
      used.add(next);
      return { ...c, code: next++, reviewRequired: true };
    });
    if (next > 268435456) {
      setError("剩余卡号不足以分配给这些卡片，请调整卡号区间。");
      return;
    }
    updateProject({ cards, nextCode: next });
    setNotice("已为没有卡号的卡片分配连续卡号。");
  }
  function matchUnconfiguredCards() {
    const report: string[] = [];
    let changed = 0;
    const cards = project.cards.map((c) => {
      if (
        c.scriptMode === "custom" ||
        c.effects.length ||
        (!c.text.trim() && !c.pendulumText.trim()) ||
        (!c.pendulum && ["normal", "token"].includes(c.kind))
      )
        return c;
      const result = matchEffects(c, project);
      report.push(
        t("{0}：识别到 {1} 块效果。{2}", {
          0: c.name,
          1: result.effects.length,
          2: result.unmatched.length
            ? t("未匹配：{0}", { 0: result.unmatched.join(" / ") })
            : t("请逐卡核对费用、时机与次数限制。"),
        }),
      );
      if (!result.effects.length) return c;
      changed++;
      return {
        ...c,
        effects: result.effects,
        matchedText: "",
        reviewRequired: true,
      };
    });
    if (!report.length) {
      setNotice("没有待匹配的空白配置；已有积木和完整 Lua 会保留。");
      return;
    }
    updateProject({ cards });
    setDialog(null);
    setImportWarnings(report);
    setNotice(`已为 ${changed} 张卡片填写效果候选，等待逐卡核对。`);
  }
  async function importFiles(files: FileList | null) {
    if (!files) return;
    setBusy("正在读取卡片…");
    try {
      await enqueueSave(project, mode);
      const { importCards } = await import("./io/import");
      let cards: Card[] = [];
      let restored: CardProject | undefined;
      const warnings: string[] = [];
      for (const f of Array.from(files)) {
        const r = await importCards(f);
        if (r.project) {
          if (files.length !== 1)
            throw new Error("恢复卡包备份时请只选择一个文件。");
          restored = r.project;
        } else cards.push(...r.cards);
        warnings.push(...r.warnings);
      }
      if (restored) {
        activate(restored);
        setNotice(`已恢复「${restored.name}」。`);
      } else if (cards.length) {
        cards = cards.map((c) => ({ ...c, uid: uid(), reviewRequired: true }));
        updateProject({ cards: [...project.cards, ...cards] });
        setSelected(cards[0].uid);
        setTab("card");
        setNotice(`已导入 ${cards.length} 张卡片。`);
      }
      if (warnings.length) setImportWarnings(warnings);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  async function exportPack() {
    setBusy("准备扩展包…");
    try {
      const { exportProject } = await import("./io/export");
      const blob = await exportProject(project, {
        allowDraft: draft,
        onProgress: (done, total) =>
          setBusy(`正在生成卡图 ${done} / ${total}…`),
      });
      download(blob, `${project.name || "cards"}.zip`);
      setDialog(null);
      setNotice("完整扩展包已下载，请在本地 YGOPro / KoishiPro 中测试。");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  function backup() {
    download(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      `${project.name}.daylilies.json`,
    );
  }
  async function changeStorage(next: StorageMode) {
    try {
      await enqueueSave(project, mode);
      await enqueueSave(project, next);
      localStorage.setItem("day-lilies:storage", next);
      setMode(next);
      setNotice(
        next === "local"
          ? "当前卡包已保存到浏览器。"
          : "当前卡包已保存到服务端。",
      );
    } catch (e) {
      setError(`切换存储失败：${errorMessage(e)}`);
    }
  }
  const statusFor = (c: Card) =>
    diagnostics.some((d) => d.cardUid === c.uid && d.severity === "error")
      ? "error"
      : diagnostics.some((d) => d.cardUid === c.uid)
        ? "warning"
        : "ready";
  if (!ready)
    return (
      <div className="loading-screen">
        <Leaf size={32} />
        <span>{t("正在打开萱草工坊…")}</span>
      </div>
    );
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-icon">
            <Leaf size={25} />
          </span>
          <span>
            {t("萱草")}
            <small>DAY LILIES</small>
          </span>
        </a>
        <span className="topbar-divider" />
        <button className="project-switch" onClick={() => void openProjects()}>
          <span>{project.name}</span>
          <ChevronDown size={15} />
        </button>
        <span className="save-state">
          <span className={saved.includes("失败") ? "dot error-dot" : "dot"} />
          {t(saved)}
        </span>
        <div className="spacer" />
        <select
          className="ui-language-select"
          aria-label={t("界面语言")}
          title={t("界面语言")}
          value={language}
          onChange={(e) => setLanguage(e.target.value as typeof language)}
        >
          {UI_LANGUAGES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="button ghost"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} />
          <span>{t("导入")}</span>
        </button>
        <button className="button ghost" onClick={() => setDialog("settings")}>
          <Settings2 size={17} />
          <span>{t("设置")}</span>
        </button>
        <button
          className="button primary"
          onClick={() => {
            setDraft(false);
            setDialog("export");
          }}
        >
          <Download size={16} />
          <span>{t("导出卡包")}</span>
        </button>
      </header>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".json,.mse-set"
        multiple
        onChange={(e) => void importFiles(e.target.files)}
      />
      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <div className="eyebrow">{t("YOUR COLLECTION")}</div>
              <h2>
                {t("卡片库")}{" "}
                <span>{project.cards.length.toString().padStart(2, "0")}</span>
              </h2>
            </div>
            <button
              className="icon-button add-card"
              aria-label={t("新建卡片")}
              onClick={addCard}
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label={t("筛选卡片")}
              value={filter}
              placeholder={t("搜索卡名或卡号")}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="collection-list">
            {filtered.map((c, i) => (
              <button
                key={c.uid}
                onClick={() => {
                  setSelected(c.uid);
                  setMatched(null);
                }}
                className={`collection-card ${card?.uid === c.uid ? "selected" : ""}`}
              >
                <div className={`card-thumb ${c.kind}`}>
                  {c.art ? <img src={c.art} alt="" /> : <Leaf size={18} />}
                </div>
                <div className="card-list-copy">
                  <strong>{c.name || t("未命名卡片")}</strong>
                  <span>
                    {c.code || t("等待分配卡号")} ·{" "}
                    {t(KINDS.find(([k]) => k === c.kind)?.[1] || "")}
                  </span>
                </div>
                <span
                  className={`status-dot ${statusFor(c)}`}
                  title={statusFor(c) === "ready" ? t("可导出") : t("需要检查")}
                />
              </button>
            ))}
          </div>
          {!project.cards.length && (
            <button className="empty-library" onClick={addCard}>
              <Plus size={28} />
              <span>{t("创建第一张卡片")}</span>
            </button>
          )}
          <div className="sidebar-bottom">
            <button className="button secondary full" onClick={addCard}>
              <Plus size={16} />
              {t("新建卡片")}
            </button>
            <button className="help-link" onClick={() => setDialog("help")}>
              <CircleHelp size={15} />
              {t("第一次使用？看看工作流")}
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
        <main className="editor-area">
          {card ? (
            <>
              <div className="editor-heading">
                <div className="breadcrumb">
                  {t("卡片工坊")}
                  <span>/</span>{" "}
                  {t(KINDS.find(([k]) => k === card.kind)?.[1] || "")}
                </div>
                <div className="title-row">
                  <h1>{card.name || t("未命名卡片")}</h1>
                  <button
                    className="icon-button"
                    aria-label={t("复制卡片")}
                    onClick={() => {
                      const copy = {
                        ...structuredClone(card),
                        uid: uid(),
                        code: project.nextCode,
                        name: card.name + " · 副本",
                        reviewRequired: true,
                      };
                      updateProject({
                        cards: [...project.cards, copy],
                        nextCode: project.nextCode + 1,
                      });
                      setSelected(copy.uid);
                    }}
                  >
                    <Copy size={17} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={t("删除当前卡片")}
                    onClick={() => {
                      if (
                        window.confirm(t("删除「{0}」？", { "0": card.name }))
                      ) {
                        updateProject({
                          cards: project.cards.filter(
                            (c) => c.uid !== card.uid,
                          ),
                        });
                        setSelected("");
                      }
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <p>{t("从一个想法，到可以上场的卡片。")}</p>
              </div>
              <nav className="editor-tabs">
                {(
                  [
                    ["card", "卡片信息", Layers3],
                    ["effects", "效果积木", WandSparkles],
                    ["lua", "Lua 脚本", Code2],
                    ["assistant", "BYOK 助手", Sparkles],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    className={tab === key ? "active" : ""}
                    onClick={() => setTab(key)}
                  >
                    <Icon size={16} />
                    {t(label)}
                    {key === "effects" && !!card.effects.length && (
                      <span>{card.effects.length}</span>
                    )}
                  </button>
                ))}
              </nav>
              <div className="editor-content" key={card.uid}>
                {tab === "card" && (
                  <CardEditor
                    card={card}
                    project={project}
                    onChange={updateCard}
                    onError={setError}
                  />
                )}
                {tab === "effects" && (
                  <>
                    <div className="mode-banner">
                      <div>
                        <strong>{t("把效果拆成可以核对的步骤")}</strong>
                        <p>{t("先试试匹配原文，再补全每块效果的参数。")}</p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => setMatched(matchEffects(card, project))}
                      >
                        <WandSparkles size={16} />
                        {t("匹配文本")}
                      </button>
                    </div>
                    {card.scriptMode === "custom" && (
                      <div className="notice warning">
                        <p>
                          {t(
                            "当前导出使用完整 Lua。这里的积木仍保留；切回积木模式后才会参与生成。",
                          )}
                        </p>
                        <button
                          className="text-button"
                          onClick={() =>
                            updateCard({
                              scriptMode: "blocks",
                              reviewRequired: true,
                            })
                          }
                        >
                          {t("切回积木模式")}
                        </button>
                      </div>
                    )}
                    <EffectEditor
                      card={card}
                      project={project}
                      onChange={updateCard}
                    />
                  </>
                )}
                {tab === "lua" && (
                  <>
                    <div className="mode-banner">
                      <div>
                        <strong>
                          {card.scriptMode === "blocks"
                            ? t("由效果积木生成")
                            : t("完整 Lua 模式")}
                        </strong>
                        <p>
                          {card.scriptMode === "blocks"
                            ? t("调整积木后脚本自动更新。")
                            : t(
                                "你可以自由编辑；更改卡号后也请更新脚本中的标识。",
                              )}
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() =>
                          card.scriptMode === "blocks"
                            ? updateCard({
                                scriptMode: "custom",
                                customLua: card.customLua.trim()
                                  ? card.customLua
                                  : compiled?.lua || "",
                                customStrings: card.customLua.trim()
                                  ? card.customStrings
                                  : compiled?.strings || [],
                                reviewRequired: true,
                              })
                            : updateCard({
                                scriptMode: "blocks",
                                reviewRequired: true,
                              })
                        }
                      >
                        {card.scriptMode === "blocks"
                          ? card.customLua.trim()
                            ? t("恢复已保存的 Lua")
                            : t("转为完整 Lua")
                          : t("切回积木模式")}
                      </button>
                    </div>
                    {card.scriptMode === "blocks" && card.customLua.trim() && (
                      <div className="notice">
                        <p>
                          {t(
                            "已有手写 / BYOK 脚本保留在工程中。可以恢复旧稿，也可以明确用当前积木生成的新代码替换。",
                          )}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => {
                            if (
                              window.confirm(
                                t(
                                  "用当前积木生成的代码覆盖此前保存的完整 Lua 及提示字符串？建议先备份工程。",
                                ),
                              )
                            )
                              updateCard({
                                scriptMode: "custom",
                                customLua: compiled?.lua || "",
                                customStrings: compiled?.strings || [],
                                reviewRequired: true,
                              });
                          }}
                        >
                          {t("用积木覆盖旧稿")}
                        </button>
                      </div>
                    )}
                    <div className="code-caption">
                      <span>c{card.code || t("卡号")}.lua</span>
                      <button
                        className="text-button"
                        onClick={() => {
                          download(
                            new Blob([compiled?.lua || ""], {
                              type: "text/plain",
                            }),
                            `c${card.code}.lua`,
                          );
                        }}
                      >
                        {t("下载脚本")}
                      </button>
                    </div>
                    <textarea
                      className="code-editor"
                      aria-label={t("Lua 脚本")}
                      spellCheck={false}
                      readOnly={card.scriptMode === "blocks"}
                      value={
                        card.scriptMode === "custom"
                          ? card.customLua
                          : compiled?.lua || ""
                      }
                      onChange={(e) =>
                        updateCard({
                          customLua: e.target.value,
                          reviewRequired: true,
                        })
                      }
                    />
                    <Field label="CDB 提示字符串（每行一个）">
                      <textarea
                        rows={4}
                        readOnly={card.scriptMode === "blocks"}
                        value={(card.scriptMode === "custom"
                          ? card.customStrings
                          : compiled?.strings || []
                        ).join("\n")}
                        onChange={(e) =>
                          updateCard({
                            customStrings: e.target.value.split("\n"),
                            reviewRequired: true,
                          })
                        }
                      />
                    </Field>
                    {card.scriptMode === "custom" && (
                      <button
                        className="button secondary"
                        onClick={() =>
                          updateCard({
                            matchedText: card.text,
                            reviewRequired: false,
                          })
                        }
                      >
                        {t("已核对完整脚本")}
                      </button>
                    )}
                    <p className="field-help">
                      {t(
                        "检查覆盖静态语法和基础数据。效果裁定与运行结果，请在本地客户端中确认。",
                      )}
                    </p>
                  </>
                )}
                {tab === "assistant" && (
                  <AssistantPanel
                    key={card.uid}
                    card={card}
                    project={project}
                    settings={byok}
                    onError={setError}
                    onApply={(lua, strings) => {
                      updateCard({
                        scriptMode: "custom",
                        customLua: lua,
                        customStrings: strings,
                        reviewRequired: true,
                      });
                      setTab("lua");
                      setNotice("已应用模型脚本，请核对后标记完成。");
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="empty-workspace">
              <Leaf size={46} />
              <h1>{t("下一套系统，从这里开始。")}</h1>
              <p>{t("创建卡片，或导入现有制卡器的文件。")}</p>
              <div className="button-row">
                <button className="button primary" onClick={addCard}>
                  <Plus size={16} />
                  {t("新建卡片")}
                </button>
                <button
                  className="button secondary"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={16} />
                  {t("导入文件")}
                </button>
              </div>
              <button
                className="text-button"
                onClick={() => activate(demoProject())}
              >
                {t("打开三张示例卡")}
              </button>
            </div>
          )}
        </main>
        <aside className="preview-panel">
          <div className="preview-heading">
            <span className="eyebrow">{t("LIVE PREVIEW")}</span>
            <span className="small-badge">
              {project.target === "ygopro" ? "YGOPro" : "KoishiPro"}
            </span>
          </div>
          {card ? (
            <>
              <Preview card={card} />
              <div className="preview-caption">
                <strong>{card.name}</strong>
                <span>{card.code || t("尚未分配卡号")}</span>
              </div>
              <div className="checks-panel">
                <div className="checks-title">
                  <h3>{t("制作检查")}</h3>
                  <span>
                    {cardIssues.length
                      ? t("{0} 项待确认", { 0: cardIssues.length })
                      : t("基础检查通过")}
                  </span>
                </div>
                {cardIssues.length ? (
                  <ul>
                    {cardIssues.map((d, i) => (
                      <li key={i} className={d.severity}>
                        <span className="status-dot" />
                        {t(d.message)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="all-good">
                    <CheckCircle2 size={18} />
                    <p>{t("可以生成扩展包。导出后请在客户端测试效果。")}</p>
                  </div>
                )}
                <div className="export-contents">
                  <span>
                    <Check size={13} />
                    {t("CDB 卡片数据")}
                  </span>
                  <span>
                    <Check size={13} />
                    {t("完整卡图")}
                  </span>
                  <span>
                    <Check size={13} />
                    {t("Lua 效果脚本")}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="preview-placeholder">
              <Leaf size={38} />
            </div>
          )}
          <div className="quiet-note">
            {t("让灵感有形，让效果可运行。")}
            <span>{t("YOUR IDEAS, READY TO PLAY.")}</span>
          </div>
        </aside>
      </div>
      {notice && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {t(notice)}
          <button
            className="icon-button"
            aria-label={t("关闭提示")}
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {busy && (
        <div className="busy-overlay">
          <LoaderCircle className="spin" size={24} />
          <span>{t(busy)}</span>
        </div>
      )}
      {error && (
        <Modal title={t("需要处理的问题")} onClose={() => setError("")}>
          <p className="error-message">{t(error)}</p>
          <button className="button primary" onClick={() => setError("")}>
            {t("知道了")}
          </button>
        </Modal>
      )}
      {matched && (
        <Modal title={t("文本匹配结果")} onClose={() => setMatched(null)} wide>
          <p>
            {t(
              "识别到 {0} 块效果。应用后仍需核对原文，未识别内容不会自动获得脚本。",
              { 0: matched.effects.length },
            )}
          </p>
          {matched.effects.map((e, i) => (
            <div className="match-result" key={e.uid}>
              <strong>
                {i + 1}.{" "}
                {e.description ||
                  t(
                    TEMPLATES.find((template) => template.id === e.template)
                      ?.label || "",
                  ) ||
                  e.template}
              </strong>
              <p>{e.sourceText}</p>
            </div>
          ))}
          {matched.warnings.map((w, i) => (
            <p className="notice warning" key={i}>
              {t(w)}
            </p>
          ))}
          {!!matched.unmatched.length && (
            <div className="unmatched">
              <h3>{t("以下内容需要手工组装或 BYOK")}</h3>
              {matched.unmatched.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </div>
          )}
          <div className="button-row">
            <button
              className="button primary"
              disabled={!matched.effects.length}
              onClick={() => {
                updateCard({
                  effects: matched.effects,
                  scriptMode: "blocks",
                  matchedText: "",
                  reviewRequired: true,
                });
                setMatched(null);
                setTab("effects");
              }}
            >
              {t("替换为这些效果积木")}
            </button>
            <button
              className="button secondary"
              onClick={() => setMatched(null)}
            >
              {t("保留当前配置")}
            </button>
          </div>
        </Modal>
      )}
      {importWarnings && (
        <Modal
          title={t("处理结果 · 请核对")}
          onClose={() => setImportWarnings(null)}
        >
          <ul className="warning-list">
            {importWarnings.map((w, i) => (
              <li key={i}>{t(w)}</li>
            ))}
          </ul>
          <button
            className="button primary"
            onClick={() => setImportWarnings(null)}
          >
            {t("继续编辑")}
          </button>
        </Modal>
      )}
      {dialog === "settings" && (
        <Modal
          title={t("卡包与工作台设置")}
          onClose={() => setDialog(null)}
          wide
        >
          <div className="settings-grid">
            <section>
              <h3>{t("卡包")}</h3>
              <Field label="卡包名称">
                <input
                  value={project.name}
                  onChange={(e) => updateProject({ name: e.target.value })}
                />
              </Field>
              <Field label="简介">
                <textarea
                  rows={3}
                  value={project.description}
                  onChange={(e) =>
                    updateProject({ description: e.target.value })
                  }
                />
              </Field>
              <Field label="目标客户端">
                <Select
                  value={project.target}
                  options={[
                    ["ygopro", "官方 YGOPro"],
                    ["koishipro", "KoishiPro"],
                  ]}
                  onChange={(target) => updateProject({ target })}
                />
              </Field>
              <Field label="下一个可用卡号">
                <NumberInput
                  value={project.nextCode}
                  min={128}
                  max={268435455}
                  onChange={(nextCode) => updateProject({ nextCode })}
                />
              </Field>
              <button className="button secondary full" onClick={assignCodes}>
                {t("给未编号的卡片分配卡号")}
              </button>
              <button className="text-button" onClick={matchUnconfiguredCards}>
                {t("批量匹配尚未配置的卡片")}
              </button>
              <h3>{t("系列代码")}</h3>
              {project.archetypes.map((a, i) => (
                <div className="archetype-row" key={i}>
                  <input
                    aria-label={t("系列名称")}
                    value={a.name}
                    onChange={(e) =>
                      updateProject({
                        archetypes: project.archetypes.map((b, j) =>
                          j === i ? { ...b, name: e.target.value } : b,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={t("系列代码")}
                    key={i + ":" + a.code}
                    defaultValue={"0x" + a.code.toString(16)}
                    onBlur={(e) => {
                      const code = Number(e.target.value);
                      if (Number.isInteger(code) && code > 0 && code < 65536)
                        updateProject({
                          archetypes: project.archetypes.map((b, j) =>
                            j === i ? { ...b, code } : b,
                          ),
                        });
                      else setError("系列代码必须为 1–65535。");
                    }}
                  />
                  <button
                    className="icon-button"
                    aria-label={t("删除系列名称")}
                    onClick={() =>
                      updateProject({
                        archetypes: project.archetypes.filter(
                          (_, j) => i !== j,
                        ),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                className="text-button"
                onClick={() =>
                  updateProject({
                    archetypes: [
                      ...project.archetypes,
                      {
                        name: "新系列",
                        code: 0x7d00 + project.archetypes.length + 1,
                      },
                    ],
                  })
                }
              >
                {t("＋ 添加系列")}
              </button>
              <p className="field-help">
                {t("修改系列代码后，请同步调整卡片所属系列与积木筛选条件。")}
              </p>
            </section>
            <section>
              <Field
                label="界面语言"
                hint="仅改变工作台界面；卡面语言可在每张卡的信息中独立选择。"
              >
                <Select
                  value={language}
                  options={UI_LANGUAGES}
                  translateOptions={false}
                  onChange={setLanguage}
                />
              </Field>
              <h3>{t("存储位置")}</h3>
              <Field label="自动保存到">
                <Select
                  value={mode}
                  options={[
                    ["local", "此浏览器（IndexedDB）"],
                    ["server", "应用服务端"],
                  ]}
                  onChange={(v) => void changeStorage(v)}
                />
              </Field>
              <p className="field-help">
                {t(
                  "切换时会复制当前卡包。浏览器清理数据可能删除本地卡包，请定期导出 JSON 备份。服务端保存适用于你自己的应用实例。",
                )}
              </p>
              <button className="button secondary" onClick={backup}>
                <Save size={16} />
                {t("导出卡包备份")}
              </button>
              <h3>{t("自己的模型 · BYOK")}</h3>
              <Field label="OpenAI 兼容 API 地址">
                <input
                  placeholder="https://example.com/v1"
                  value={byok.endpoint}
                  onChange={(e) =>
                    setByok({ ...byok, endpoint: e.target.value })
                  }
                />
              </Field>
              <Field label="模型名称">
                <input
                  placeholder={t("填写服务商提供的 model ID")}
                  value={byok.model}
                  onChange={(e) => setByok({ ...byok, model: e.target.value })}
                />
              </Field>
              <Field label="API Key（本次会话）">
                <input
                  type="password"
                  autoComplete="off"
                  value={byok.apiKey}
                  onChange={(e) => setByok({ ...byok, apiKey: e.target.value })}
                />
              </Field>
              <p className="field-help">
                {t(
                  "Key 不会写入浏览器存储、卡包或服务器日志。端点和模型名称可以保存。自托管私网端点需要在服务端允许相应主机。",
                )}
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  localStorage.setItem(
                    "day-lilies:byok",
                    JSON.stringify({
                      endpoint: byok.endpoint,
                      model: byok.model,
                    }),
                  );
                  setNotice("已记住端点和模型；API Key 仅留在本页。");
                }}
              >
                {t("记住端点与模型")}
              </button>
            </section>
          </div>
        </Modal>
      )}
      {dialog === "projects" && (
        <Modal title={t("我的卡包")} onClose={() => setDialog(null)}>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => activate(createProject())}
            >
              <FilePlus2 size={16} />
              {t("空白卡包")}
            </button>
            <button
              className="button secondary"
              onClick={() => activate(demoProject())}
            >
              {t("载入示例")}
            </button>
          </div>
          <p className="field-help">
            {t("当前查看：{0}保存的卡包。", {
              0: t(mode === "local" ? "此浏览器" : "服务端"),
            })}
          </p>
          <div className="project-list">
            {projects.map((p) => (
              <div key={p.id}>
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      const loaded = await loadProject(p.id, mode);
                      if (loaded) activate(loaded);
                    } catch (e) {
                      setError(errorMessage(e));
                    }
                  }}
                >
                  <FolderOpen size={21} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {t("{0} 张卡", { 0: p.cardCount })} ·{" "}
                      {new Date(p.updatedAt).toLocaleDateString(language)}
                    </small>
                  </span>
                </button>
                <button
                  className="icon-button danger"
                  aria-label={t("删除卡包 {0}", { "0": p.name })}
                  disabled={p.id === project.id}
                  onClick={async () => {
                    if (
                      window.confirm(
                        t("删除已保存的「{0}」？", { "0": p.name }),
                      )
                    ) {
                      try {
                        await removeProject(p.id, mode);
                        setProjects(await listProjects(mode));
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {dialog === "export" && (
        <Modal title={t("导出完整扩展包")} onClose={() => setDialog(null)}>
          <div className="export-summary">
            <ArrowDownToLine size={26} />
            <div>
              <strong>{project.name}</strong>
              <span>
                {t("{0} 张卡", { 0: project.cards.length })} ·{" "}
                {project.target === "ygopro" ? "YGOPro" : "KoishiPro"}
              </span>
            </div>
          </div>
          <pre className="file-tree">
            {t(
              "expansions/\n  {0}.cdb\n  pics/卡号.png\n  script/c卡号.lua\n  strings.conf（自定义系列）\nexport-report.json\nREADME.txt",
              { "0": project.name || "cards" },
            )}
          </pre>
          <p>
            {t(
              "将 expansions 的内容合并到客户端对应目录中，进入本地决斗测试。自定义系列名称可能需要合并 strings.conf 并重启客户端。",
            )}
          </p>
          {diagnostics.length > 0 && (
            <ul className="export-diagnostics">
              {diagnostics.map((d, i) => (
                <li className={d.severity} key={i}>
                  <strong>
                    {d.severity === "error" ? t("错误") : t("待确认")} ·{" "}
                    {project.cards.find((c) => c.uid === d.cardUid)?.name ||
                      t("卡包")}
                  </strong>
                  <span>{t(d.message)}</span>
                </li>
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <label className="check">
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
              />
              {t("我已阅读这些问题，导出草稿供本地测试")}
            </label>
          )}
          {!project.cards.length && (
            <p className="error-message">{t("请先加入卡片。")}</p>
          )}
          <div className="button-row">
            <button
              className="button primary"
              disabled={
                !!errors.length ||
                !project.cards.length ||
                (!!warnings.length && !draft)
              }
              onClick={() => void exportPack()}
            >
              <Download size={16} />
              {t("下载 ZIP 扩展包")}
            </button>
            <button className="button secondary" onClick={backup}>
              {t("同时备份工程")}
            </button>
          </div>
        </Modal>
      )}
      {dialog === "help" && (
        <Modal
          title={t("从卡片设计到本地对局")}
          onClose={() => setDialog(null)}
        >
          <ol className="workflow-steps">
            <li>
              <strong>{t("建立一套卡")}</strong>
              <p>
                {t(
                  "新建或导入 MSE-SET、YGO Carder / yugioh-card JSON。先在设置里确认自己的卡号区间和系列代码。",
                )}
              </p>
            </li>
            <li>
              <strong>{t("确认卡面")}</strong>
              <p>
                {t(
                  "正文用于效果设计；MSE 中文注释保留为参考。上传中间图后，系统会用自带卡模生成完整卡图。",
                )}
              </p>
            </li>
            <li>
              <strong>{t("完成效果")}</strong>
              <p>
                {t(
                  "点击「匹配文本」得到候选积木，再手动核对和调整。无法表达的设计可以使用 BYOK 或编辑完整 Lua。",
                )}
              </p>
            </li>
            <li>
              <strong>{t("导出并测试")}</strong>
              <p>
                {t(
                  "查看制作检查，下载包含 CDB、图片和脚本的 ZIP。在本地 YGOPro / KoishiPro 验证裁定与效果。",
                )}
              </p>
            </li>
          </ol>
          <p className="field-help">
            {t(
              "当前模板适合常见 OCG 式效果。复杂连锁、替代费用、无效、持续关系和复合选择仍应使用完整 Lua。",
            )}
          </p>
          <button className="button primary" onClick={() => setDialog(null)}>
            {t("开始制作")}
          </button>
        </Modal>
      )}
    </div>
  );
}
