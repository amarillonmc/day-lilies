import { useEffect, useState } from "react";
import type { CardFilter, CardProject } from "../domain/model";
import { useI18n } from "../i18n";
import { ATTRIBUTES, RACES } from "./options";
import { Field, NumberInput, Select } from "./Fields";

export function EffectFilterEditor({
  filter,
  project,
  onChange,
}: {
  filter: CardFilter;
  project: CardProject;
  onChange: (filter: CardFilter) => void;
}) {
  const { t } = useI18n();
  const update = (patch: Partial<CardFilter>) =>
    onChange({ ...filter, ...patch });
  const [codes, setCodes] = useState((filter.codes || []).join(", "));
  useEffect(() => setCodes((filter.codes || []).join(", ")), [filter.codes]);
  const codeParts = codes
    .trim()
    .split(/[,，\s]+/)
    .filter(Boolean)
    .map(Number);
  const validCodes = codeParts.every(
    (code) => Number.isInteger(code) && code > 0 && code <= 4294967295,
  );
  const numberFilters = [
    ["minAttack", "最低攻击力"],
    ["maxAttack", "最高攻击力"],
    ["minDefense", "最低守备力"],
    ["maxDefense", "最高守备力"],
    ["minRank", "最低阶级"],
    ["maxRank", "最高阶级"],
    ["minLink", "最低连接数"],
    ["maxLink", "最高连接数"],
  ] as const;
  return (
    <details className="filters">
      <summary>{t("筛选条件")}</summary>
      <div className="form-grid">
        <Field label="卡片种类">
          <Select
            value={filter.kind || "any"}
            options={[
              ["any", "任意卡片"],
              ["monster", "怪兽"],
              ["spell", "魔法"],
              ["trap", "陷阱"],
            ]}
            onChange={(kind) => update({ kind })}
          />
        </Field>
        <Field label="怪兽效果类型">
          <Select
            value={
              filter.effect == null
                ? "any"
                : filter.effect
                  ? "effect"
                  : "non-effect"
            }
            options={[
              ["any", "不限定效果类型"],
              ["effect", "效果怪兽"],
              ["non-effect", "非效果怪兽"],
            ]}
            onChange={(value) =>
              update({
                effect: value === "any" ? undefined : value === "effect",
              })
            }
          />
        </Field>
        <Field label="系列">
          <select
            value={filter.setcode || 0}
            onChange={(event) =>
              update({ setcode: Number(event.target.value) || undefined })
            }
          >
            <option value={0}>{t("不限定系列")}</option>
            {project.archetypes.map((archetype) => (
              <option value={archetype.code} key={archetype.code}>
                {archetype.name} · 0x{archetype.code.toString(16)}
              </option>
            ))}
            {filter.setcode &&
              !project.archetypes.some(
                (archetype) => archetype.code === filter.setcode,
              ) && (
                <option value={filter.setcode}>
                  0x{filter.setcode.toString(16)}
                </option>
              )}
          </select>
        </Field>
        <Field label="种族">
          <select
            value={filter.race || 0}
            onChange={(event) =>
              update({ race: Number(event.target.value) || undefined })
            }
          >
            <option value={0}>{t("任意种族")}</option>
            {RACES.map(([value, label]) => (
              <option value={value} key={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="属性">
          <select
            value={filter.attribute || ""}
            onChange={(event) =>
              update({
                attribute:
                  (event.target.value as CardFilter["attribute"]) || undefined,
              })
            }
          >
            <option value="">{t("任意属性")}</option>
            {ATTRIBUTES.map(([value, label]) => (
              <option value={value} key={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="最低等级（0 为不限）">
          <NumberInput
            value={filter.minLevel || 0}
            min={0}
            onChange={(minLevel) => update({ minLevel: minLevel || undefined })}
          />
        </Field>
        <Field label="最高等级（0 为不限）">
          <NumberInput
            value={filter.maxLevel || 0}
            min={0}
            onChange={(maxLevel) => update({ maxLevel: maxLevel || undefined })}
          />
        </Field>
        <Field
          label="指定卡号（逗号分隔）"
          wide
          hint={!validCodes ? "请输入有效的正整数卡号。" : undefined}
        >
          <input
            value={codes}
            aria-invalid={!validCodes}
            onChange={(event) => setCodes(event.target.value)}
            onBlur={() => {
              if (validCodes)
                update({ codes: codeParts.length ? codeParts : undefined });
            }}
          />
        </Field>
        {numberFilters.map(([key, label]) => (
          <Field label={label} key={key} hint="留空为不限">
            <input
              type="number"
              value={filter[key] ?? ""}
              onChange={(event) =>
                update({
                  [key]:
                    event.target.value === ""
                      ? undefined
                      : event.target.valueAsNumber,
                })
              }
            />
          </Field>
        ))}
        <label className="check">
          <input
            type="checkbox"
            checked={!!filter.excludeSelfName}
            onChange={(event) =>
              update({ excludeSelfName: event.target.checked })
            }
          />
          {t("不包含同名卡")}
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={!!filter.faceup}
            onChange={(event) => update({ faceup: event.target.checked })}
          />
          {t("仅表侧表示的卡")}
        </label>
        <Field label="调整筛选">
          <Select
            value={
              filter.tuner === undefined ? "any" : filter.tuner ? "yes" : "no"
            }
            options={[
              ["any", "不限定"],
              ["yes", "仅调整怪兽"],
              ["no", "仅非调整怪兽"],
            ]}
            onChange={(value) =>
              update({ tuner: value === "any" ? undefined : value === "yes" })
            }
          />
        </Field>
        <Field label="额外卡组种类筛选">
          <Select
            value={
              filter.extraDeck === undefined
                ? "any"
                : filter.extraDeck
                  ? "yes"
                  : "no"
            }
            options={[
              ["any", "不限定"],
              ["yes", "仅额外卡组怪兽"],
              ["no", "排除额外卡组怪兽"],
            ]}
            onChange={(value) =>
              update({
                extraDeck: value === "any" ? undefined : value === "yes",
              })
            }
          />
        </Field>
        <Field
          label="自定义筛选表达式"
          wide
          hint="可使用 c、e、tp；填写返回真假的 Lua 表达式。"
        >
          <textarea
            className="code-input"
            rows={2}
            value={filter.expression || ""}
            spellCheck={false}
            onChange={(event) =>
              update({ expression: event.target.value || undefined })
            }
            placeholder="c:IsAbleToHand()"
          />
        </Field>
      </div>
    </details>
  );
}
