import { useState } from "react";
import { BookOpen, Check, Search, Sparkles } from "lucide-react";
import type {
  ByokSettings,
  Card,
  CardProject,
  ReferenceCard,
} from "../domain/model";
import { request } from "./storage";
import { Field } from "./Fields";

export default function AssistantPanel({
  card,
  project,
  settings,
  onApply,
  onError,
}: {
  card: Card;
  project: CardProject;
  settings: ByokSettings;
  onApply: (lua: string, strings: string[]) => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReferenceCard[]>([]);
  const [refs, setRefs] = useState<ReferenceCard[]>([]);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    lua: string;
    strings: string[];
    notes: string;
  } | null>(null);
  const [inspected, setInspected] = useState<ReferenceCard | null>(null);
  async function search() {
    setBusy(true);
    try {
      const d = await request<{ cards: ReferenceCard[] }>(
        `/api/references?q=${encodeURIComponent(query)}&language=${card.language}`,
      );
      setResults(d.cards);
    } catch (e) {
      onError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function inspect(code: number) {
    try {
      const d = await request<ReferenceCard>(
        `/api/references/${code}?language=${card.language}`,
      );
      setInspected(d);
    } catch (e) {
      onError(String(e));
    }
  }
  async function generate() {
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await request("/api/byok", {
          method: "POST",
          body: JSON.stringify({
            settings,
            card,
            project,
            referenceCodes: refs.map((r) => r.code),
            instruction,
          }),
        }),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="assistant-panel">
      <div className="notice">
        <BookOpen size={18} />
        <p>
          参考已有 OCG 卡片的实现，为模型提供具体依据。参考库可用{" "}
          <code>npm run refs:sync</code> 更新。
        </p>
      </div>
      <div className="search-row">
        <input
          aria-label="搜索参考卡"
          placeholder="卡名、卡号或效果关键词"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <button
          className="button secondary"
          onClick={() => void search()}
          disabled={!query || busy}
        >
          <Search size={15} />
          搜索
        </button>
      </div>
      {results.length > 0 && (
        <div className="reference-results">
          {results.map((r) => (
            <div key={r.code}>
              <button
                className="text-button"
                onClick={() => void inspect(r.code)}
              >
                <strong>{r.name}</strong>
                <small>{r.code}</small>
              </button>
              <button
                className="icon-button"
                aria-label={`选择参考 ${r.name}`}
                disabled={
                  refs.some((x) => x.code === r.code) || refs.length >= 5
                }
                onClick={() => setRefs([...refs, r])}
              >
                {refs.some((x) => x.code === r.code) ? (
                  <Check size={16} />
                ) : (
                  <span>＋</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
      {!!refs.length && (
        <div className="chip-list">
          {refs.map((r) => (
            <button
              className="chip active"
              key={r.code}
              onClick={() => setRefs(refs.filter((x) => x.code !== r.code))}
            >
              {r.name} ×
            </button>
          ))}
        </div>
      )}
      {inspected && (
        <details className="details" open>
          <summary>
            {inspected.name} · {inspected.code}
          </summary>
          <p className="reference-text">{inspected.text}</p>
          <pre className="reference-code">
            {inspected.script || "缓存中没有这张卡的脚本。"}
          </pre>
        </details>
      )}
      <Field label="补充设计意图">
        <textarea
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="例如：参照增援的筛选方式，改成昼庭系列；请保留墓地效果。"
        />
      </Field>
      <button
        className="button primary"
        disabled={busy || !settings.endpoint || !settings.model}
        onClick={() => void generate()}
      >
        <Sparkles size={16} />
        {busy ? "处理中…" : "使用我的模型生成 Lua"}
      </button>
      {!settings.endpoint && (
        <p className="field-help">
          先在右上角「设置」中填写 OpenAI 兼容端点和模型。
        </p>
      )}
      <p className="field-help">
        只在点击生成时发送当前卡、卡包内卡名／卡号／卡文、系列信息及选中的参考。API
        Key 仅保留在当前页面内存中。模型结果仍需自行核对和本地测试。
      </p>
      {result && (
        <section className="generation-result">
          <h3>待应用的脚本</h3>
          <p>{result.notes}</p>
          <textarea
            className="code-editor"
            rows={18}
            value={result.lua}
            onChange={(e) => setResult({ ...result, lua: e.target.value })}
          />
          <Field label="CDB 提示字符串（每行一个）">
            <textarea
              rows={3}
              value={result.strings.join("\n")}
              onChange={(e) =>
                setResult({ ...result, strings: e.target.value.split("\n") })
              }
            />
          </Field>
          <button
            className="button primary"
            onClick={() => onApply(result.lua, result.strings)}
          >
            应用为这张卡的完整 Lua
          </button>
          <p className="field-help">
            应用后切换到完整 Lua 模式；原有效果积木仍保留，可以手动切回。
          </p>
        </section>
      )}
    </div>
  );
}
