import { useId, useState } from "react";
import {
  ENGINE_CAPABILITIES,
  ENGINE_CATEGORIES,
  ENGINE_EFFECT_CODES,
  ENGINE_EVENTS,
  ENGINE_LOCATIONS,
  ENGINE_PROPERTIES,
  ENGINE_RESETS,
  ENGINE_TYPES,
  KOISHI_CAPABILITIES,
  type EngineCapability,
} from "../domain/engine-capabilities";
import type { AdvancedEffect, TargetCore } from "../domain/model";
import { ADVANCED_EFFECT_PRESETS } from "../domain/advanced-presets";
import { useI18n } from "../i18n";
import { Field, NumberInput, Select } from "./Fields";

const callbackFields = [
  ["condition", "条件回调", "e,tp,eg,ep,ev,re,r,rp"],
  ["cost", "费用回调", "e,tp,eg,ep,ev,re,r,rp,chk"],
  ["target", "对象回调", "e,tp,eg,ep,ev,re,r,rp,chk,chkc"],
  ["operation", "处理回调", "e,tp,eg,ep,ev,re,r,rp"],
  ["valueFunction", "数值回调", "e,..."],
] as const;

export function AdvancedEffectEditor({
  value,
  target,
  onChange,
  onReplace,
}: {
  value: AdvancedEffect;
  target: TargetCore;
  onChange: (patch: Partial<AdvancedEffect>) => void;
  onReplace: (value: AdvancedEffect) => void;
}) {
  const { t } = useI18n();
  const prefix = useId();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("effect");
  const [preset, setPreset] = useState("");
  const koishi =
    value.requiredCore === "koishipro" ||
    KOISHI_CAPABILITIES.some(
      (item) => item.id === value.code || String(item.code) === value.code,
    );
  const catalogField = (
    label: string,
    field:
      "type" | "code" | "category" | "property" | "value" | "reset" | "range",
    choices: EngineCapability[],
  ) => (
    <Field label={label}>
      <input
        className="code-input"
        value={value[field] || ""}
        list={`${prefix}-${field}`}
        onChange={(event) => onChange({ [field]: event.target.value })}
        spellCheck={false}
      />
      <datalist id={`${prefix}-${field}`}>
        {choices
          .filter(
            (item) =>
              target === "koishipro" || item.requiredCore !== "koishipro",
          )
          .map((item) => (
            <option value={item.id} key={item.id}>
              {t(item.label)}
            </option>
          ))}
      </datalist>
    </Field>
  );
  const insert = (item: EngineCapability) => {
    const field = (
      {
        effect: "code",
        event: "code",
        type: "type",
        property: "property",
        category: "category",
        reset: "reset",
        location: "range",
      } as const
    )[item.category as "effect"];
    if (!field) return;
    const previous = value[field];
    const additive = [
      "type",
      "property",
      "category",
      "reset",
      "range",
    ].includes(field);
    const expression =
      additive && previous
        ? previous.split(/\s*[+|]\s*/).includes(item.id)
          ? previous
          : `${previous}+${item.id}`
        : item.id;
    onChange({
      [field]: expression,
      ...(item.requiredCore ? { requiredCore: item.requiredCore } : {}),
    });
  };
  return (
    <div className="advanced-effect">
      <Field
        label="应用高级效果预设"
        hint="选择预设会替换本块的高级参数与回调。"
      >
        <select
          value={preset}
          onChange={(event) => {
            const selected = ADVANCED_EFFECT_PRESETS.find(
              (item) => item.id === event.target.value,
            );
            if (selected) {
              setPreset(selected.id);
              onReplace(structuredClone(selected.config));
            }
          }}
        >
          <option value="">{t("选择预设…")}</option>
          {ADVANCED_EFFECT_PRESETS.map((item) => (
            <option
              key={item.id}
              value={item.id}
              disabled={
                target === "ygopro" && item.requiredCore === "koishipro"
              }
            >
              {t(item.label)}
              {item.requiredCore === "koishipro"
                ? ` · ${t("KoishiPRO 专用")}`
                : ""}
            </option>
          ))}
        </select>
      </Field>
      {preset && (
        <p className="effect-help">
          {t(
            ADVANCED_EFFECT_PRESETS.find((item) => item.id === preset)
              ?.summary || "",
          )}
        </p>
      )}
      <div className="effect-help">
        {t(
          "填写 Lua 函数体，不要包含 function/end 外壳。导出前请在目标内核测试。",
        )}
      </div>
      {koishi && (
        <div
          className={
            target === "ygopro" ? "effect-core-warning" : "effect-core-note"
          }
        >
          <span className="core-badge koishi">{t("KoishiPRO 专用")}</span>
          {target === "ygopro" && (
            <p>
              {t(
                "当前目标是 YGOPRO。此效果需要 KoishiPRO，请切换卡包目标后再导出。",
              )}
            </p>
          )}
        </div>
      )}
      <div className="form-grid">
        <Field label="兼容内核">
          <Select
            value={koishi ? "koishipro" : "ygopro"}
            options={[
              ["ygopro", "两种内核"],
              ["koishipro", "KoishiPRO 专用"],
            ]}
            onChange={(requiredCore) => onChange({ requiredCore })}
          />
        </Field>
        {catalogField("效果类型", "type", ENGINE_TYPES)}
        {catalogField("事件 / 效果代码", "code", [
          ...ENGINE_EFFECT_CODES,
          ...ENGINE_EVENTS,
        ])}
        {catalogField("作用区域", "range", ENGINE_LOCATIONS)}
        {catalogField("属性标志", "property", ENGINE_PROPERTIES)}
        {catalogField("分类标志", "category", ENGINE_CATEGORIES)}
        {catalogField("重置标志", "reset", ENGINE_RESETS)}
        {catalogField("固定数值或表达式", "value", [])}
        <label className="check wide">
          <input
            type="checkbox"
            checked={value.targetRange !== undefined}
            onChange={(event) =>
              onChange({
                targetRange: event.target.checked ? [1, 0] : undefined,
              })
            }
          />
          {t("指定双方的适用范围（SetTargetRange）")}
        </label>
        {value.targetRange && (
          <>
            <Field label="自己范围 / 玩家标志">
              <NumberInput
                value={value.targetRange[0]}
                min={0}
                onChange={(own) =>
                  onChange({ targetRange: [own, value.targetRange![1]] })
                }
              />
            </Field>
            <Field label="对方范围 / 玩家标志">
              <NumberInput
                value={value.targetRange[1]}
                min={0}
                onChange={(opponent) =>
                  onChange({ targetRange: [value.targetRange![0], opponent] })
                }
              />
            </Field>
          </>
        )}
      </div>
      <details className="filters capability-browser">
        <summary>{t("内核常量参考")}</summary>
        <p className="effect-help">
          {t(
            "点击插入对应字段；同类标志会累加。常量可用不代表任意组合均有效。",
          )}
        </p>
        <div className="toolbox-filters">
          <input
            aria-label={t("搜索效果、处理或 API")}
            placeholder={t("搜索效果、处理或 API")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            value={category}
            options={[
              ["effect", "效果代码"],
              ["event", "事件"],
              ["type", "效果类型"],
              ["property", "属性标志"],
              ["category", "分类标志"],
              ["reset", "重置标志"],
              ["location", "作用区域"],
            ]}
            onChange={setCategory}
          />
        </div>
        <div className="capability-list">
          {ENGINE_CAPABILITIES.filter(
            (item) =>
              item.category === category &&
              `${item.id} ${item.label} ${t(item.label)}`
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase()),
          ).map((item) => (
            <button
              type="button"
              key={item.id}
              className="capability-item"
              disabled={
                target === "ygopro" && item.requiredCore === "koishipro"
              }
              onClick={() => insert(item)}
              title={t(item.label)}
            >
              <code>{item.id}</code>
              {item.label !== item.id && <span>{t(item.label)}</span>}
              {item.requiredCore === "koishipro" && (
                <span className="core-badge koishi">{t("KoishiPRO 专用")}</span>
              )}
            </button>
          ))}
        </div>
      </details>
      {callbackFields.map(([field, label, parameters]) => (
        <details
          className="filters"
          key={field}
          open={value[field] ? true : undefined}
        >
          <summary>
            {t(label)}{" "}
            <code>({value.callbackArgs?.[field] ?? parameters})</code>
          </summary>
          <Field
            label="回调参数"
            hint="根据该效果代码的 API 签名修改参数，例如场地筛选通常使用 e,c。"
          >
            <input
              className="code-input"
              value={value.callbackArgs?.[field] ?? parameters}
              spellCheck={false}
              onChange={(event) =>
                onChange({
                  callbackArgs: {
                    ...value.callbackArgs,
                    [field]: event.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label={label} wide>
            <textarea
              className="code-input lua-callback"
              rows={5}
              spellCheck={false}
              value={value[field] || ""}
              onChange={(event) =>
                onChange({ [field]: event.target.value || undefined })
              }
            />
          </Field>
        </details>
      ))}
    </div>
  );
}
