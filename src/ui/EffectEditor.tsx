import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { TEMPLATES, TRIGGERS } from "../domain/catalog";
import {
  createEffect,
  createOperation,
  type Card,
  type CardProject,
  type CostKind,
  type EffectBlock,
  type EffectOperation,
  type OperationAction,
  type TemplateId,
} from "../domain/model";
import { useI18n } from "../i18n";
import { COSTS, COUNTS } from "./options";
import { Field, NumberInput, Select } from "./Fields";
import { EffectOperationFields } from "./EffectOperationFields";
import { AdvancedEffectEditor } from "./AdvancedEffectEditor";
import { SummoningEffectEditor } from "./SummonProcedureEditor";
import { defaultSummoning } from "../domain/summon-procedures";
import { TrackingEditor } from "./TrackingEditor";
import { cloneEffect } from "../domain/effect-editing";

const categories: [string, string, TemplateId[]][] = [
  [
    "cards",
    "手卡与卡组",
    [
      "search",
      "recover",
      "draw",
      "mill",
      "mill-top",
      "to-deck",
      "discard-hand",
    ],
  ],
  [
    "field",
    "场上与墓地",
    [
      "destroy",
      "bounce",
      "banish",
      "send-grave",
      "equip",
      "set-spelltrap",
      "add-counter",
      "remove-counter",
    ],
  ],
  [
    "summon",
    "召唤与素材",
    [
      "revive",
      "summon",
      "self-summon",
      "summoning",
      "attach-material",
      "detach-material",
    ],
  ],
  [
    "battle",
    "战斗与数值",
    [
      "boost",
      "damage",
      "heal",
      "change-position",
      "declare-race",
      "declare-attribute",
    ],
  ],
  [
    "control",
    "无效与控制",
    ["control", "negate-activation", "negate-effect", "disable"],
  ],
  ["advanced", "组合与扩展", ["sequence", "custom-effect"]],
];
const allCosts: [CostKind, string][] = [
  ...COSTS,
  ["release-self", "解放自身"],
  ["release-monster", "解放自己怪兽"],
  ["banish-grave", "除外自己墓地的卡"],
  ["detach", "取除自身超量素材"],
  ["remove-counter", "取除自身指示物"],
];
const actionTemplates = TEMPLATES.filter(
  (template) =>
    !["self-summon", "sequence", "custom-effect"].includes(template.id),
);

export default function EffectEditor({
  card,
  project,
  onChange,
}: {
  card: Card;
  project: CardProject;
  onChange: (patch: Partial<Card>) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const update = (index: number, patch: Partial<EffectBlock>) =>
    onChange({
      effects: card.effects.map((effect, i) =>
        i === index ? { ...effect, ...patch } : effect,
      ),
      reviewRequired: true,
    });
  const move = (index: number, direction: number) => {
    const effects = [...card.effects];
    [effects[index], effects[index + direction]] = [
      effects[index + direction],
      effects[index],
    ];
    onChange({ effects, reviewRequired: true });
  };
  const visibleTemplates = TEMPLATES.filter(
    (template) =>
      (category === "all" ||
        categories
          .find(([key]) => key === category)?.[2]
          .includes(template.id)) &&
      `${template.id} ${template.label} ${template.summary} ${t(template.label)} ${t(template.summary)}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="effects-editor">
      <div className="template-picker">
        <div className="eyebrow">{t("效果工具箱")}</div>
        <p>{t("选择效果积木，配置发动条件；使用顺序处理组合多个操作。")}</p>
        <div className="toolbox-filters">
          <input
            type="search"
            value={search}
            aria-label={t("搜索效果、处理或 API")}
            placeholder={t("搜索效果、处理或 API")}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            value={category}
            options={[
              ["all", "全部"],
              ...categories.map(([key, label]): [string, string] => [
                key,
                label,
              ]),
            ]}
            onChange={setCategory}
          />
        </div>
        <div className="template-grid">
          {visibleTemplates.map((template) => (
            <button
              className="template"
              key={template.id}
              onClick={() =>
                onChange({
                  effects: [...card.effects, createEffect(template.id, card)],
                  reviewRequired: true,
                })
              }
              title={t(template.summary)}
            >
              <Plus size={14} />
              <span>{t(template.label)}</span>
            </button>
          ))}
        </div>
        {!visibleTemplates.length && <p>{t("没有匹配的效果积木。")}</p>}
      </div>
      {!card.effects.length && (
        <div className="empty-mini">
          {t("从上方添加第一块效果，或使用「匹配文本」起步。")}
        </div>
      )}
      {card.effects.map((effect, index) => {
        const isCustom = effect.template === "custom-effect";
        const isSequence = effect.template === "sequence";
        const isSummoning = effect.template === "summoning";
        const isProcedure = effect.template === "self-summon";
        const operations = effect.operations || [];
        const updateOperation = (
          operationIndex: number,
          patch: Partial<EffectOperation>,
        ) =>
          update(index, {
            operations: operations.map((step, i) =>
              i === operationIndex ? { ...step, ...patch } : step,
            ),
          });
        const moveOperation = (operationIndex: number, direction: number) => {
          const next = [...operations];
          [next[operationIndex], next[operationIndex + direction]] = [
            next[operationIndex + direction],
            next[operationIndex],
          ];
          update(index, { operations: next });
        };
        return (
          <section className="effect-block" key={effect.uid}>
            <div className="block-title">
              <span className="number-badge">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>
                {t(
                  TEMPLATES.find((template) => template.id === effect.template)
                    ?.label || effect.template,
                )}
              </strong>
              <div className="spacer" />
              <button
                className="icon-button"
                aria-label={t("效果上移")}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={t("效果下移")}
                disabled={index === card.effects.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={t("复制效果")}
                onClick={() =>
                  onChange({
                    effects: [...card.effects, cloneEffect(effect)],
                    reviewRequired: true,
                  })
                }
              >
                <Copy size={15} />
              </button>
              <button
                className="icon-button danger"
                aria-label={t("删除效果")}
                onClick={() =>
                  onChange({
                    effects: card.effects.filter((_, i) => i !== index),
                    reviewRequired: true,
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="form-grid">
              <Field label="提示文字" wide>
                <input
                  value={effect.description}
                  placeholder={t("例如：检索1只系列怪兽")}
                  onChange={(event) =>
                    update(index, { description: event.target.value })
                  }
                />
              </Field>
              {!isCustom && !isProcedure && (
                <Field
                  label="发动时机"
                  hint={
                    !["activate", "ignition", "quick", "chain"].includes(
                      effect.trigger,
                    )
                      ? "事件入口按「场合 / If」处理。「时 / When…you can」请使用完整 Lua。"
                      : undefined
                  }
                >
                  <Select
                    value={effect.trigger}
                    options={TRIGGERS.map(({ value, label }) => [value, label])}
                    onChange={(trigger) => update(index, { trigger })}
                  />
                </Field>
              )}
              {!isCustom &&
                !isProcedure &&
                [
                  "ignition",
                  "quick",
                  "chain",
                  "any-summon",
                  "any-special-summon",
                  "damage",
                  "attack-announce",
                  "standby",
                  "end-phase",
                ].includes(effect.trigger) &&
                effect.scope !== "pendulum" && (
                  <Field label="自身发动区域">
                    <Select
                      value={effect.range || "field"}
                      options={[
                        ["field", "场上"],
                        ["hand", "手卡"],
                        ["grave", "墓地"],
                        ["banished", "除外"],
                      ]}
                      onChange={(range) => update(index, { range })}
                    />
                  </Field>
                )}
              {card.pendulum && (
                <Field label="所属效果">
                  <Select
                    value={effect.scope || "monster"}
                    options={[
                      ["monster", "怪兽效果"],
                      ["pendulum", "灵摆效果"],
                    ]}
                    onChange={(scope) => update(index, { scope })}
                  />
                </Field>
              )}
              <Field
                label="次数限制"
                hint={
                  !isCustom &&
                  ["standby", "end-phase"].includes(effect.trigger) &&
                  effect.count === "none"
                    ? "阶段效果默认每回合一次，防止在同一阶段反复处理；其他次数规则可用高级回调。"
                    : undefined
                }
              >
                <Select
                  value={effect.count}
                  options={COUNTS}
                  onChange={(count) => update(index, { count })}
                />
              </Field>
              {effect.count === "shared-use" && (
                <Field label="共用计数组" hint="同一组名在整个卡包中共用次数。">
                  <input
                    value={effect.countGroup || ""}
                    onChange={(event) =>
                      update(index, { countGroup: event.target.value })
                    }
                  />
                </Field>
              )}
              {!isCustom && (
                <Field label="发动条件">
                  <Select
                    value={effect.condition}
                    options={[
                      ["none", "无额外条件"],
                      ["no-monsters", "自己场上没有怪兽"],
                      ["opponent-only", "仅对方场上有怪兽"],
                    ]}
                    onChange={(condition) => update(index, { condition })}
                  />
                </Field>
              )}
              {!isCustom && !isProcedure && (
                <>
                  <Field label="费用">
                    <Select
                      value={effect.cost}
                      options={allCosts}
                      onChange={(cost) =>
                        update(index, {
                          cost,
                          ...([
                            "banish-self",
                            "send-self",
                            "release-self",
                          ].includes(cost)
                            ? { costAmount: 1 }
                            : {}),
                        })
                      }
                    />
                  </Field>
                  {![
                    "none",
                    "banish-self",
                    "send-self",
                    "release-self",
                  ].includes(effect.cost) && (
                    <Field label="费用数量">
                      <NumberInput
                        value={effect.costAmount}
                        min={1}
                        onChange={(costAmount) => update(index, { costAmount })}
                      />
                    </Field>
                  )}
                  {effect.cost === "remove-counter" && (
                    <Field label="计数器种类">
                      <NumberInput
                        value={effect.counterType ?? 0x1001}
                        min={1}
                        max={65535}
                        onChange={(counterType) =>
                          update(index, { counterType })
                        }
                      />
                    </Field>
                  )}
                </>
              )}
            </div>
            {!isCustom && !isProcedure && !isSequence && !isSummoning && (
              <EffectOperationFields
                value={effect}
                action={effect.template as OperationAction}
                project={project}
                onChange={(patch) => update(index, patch)}
              />
            )}
            {isSequence && (
              <div className="operation-sequence">
                <h4>{t("顺序处理")}</h4>
                <p className="effect-help">
                  {t(
                    "按顺序执行最多 16 步；可分别选择多组对象，并引用任意对象组或较早步骤的实际结果。条件分支依据上一步的实际处理结果。",
                  )}
                </p>
                {operations.map((step, operationIndex) => (
                  <div className="operation-step" key={step.uid}>
                    <div className="block-title">
                      <span className="number-badge">{operationIndex + 1}</span>
                      <Field label="处理动作">
                        <Select
                          value={step.action}
                          options={actionTemplates.map((template) => [
                            template.id as OperationAction,
                            template.label,
                          ])}
                          onChange={(action) => {
                            const replacement = createOperation(action);
                            updateOperation(operationIndex, {
                              ...replacement,
                              uid: step.uid,
                              next: step.next,
                              optional:
                                replacement.selection === "target"
                                  ? false
                                  : step.optional,
                            });
                          }}
                        />
                      </Field>
                      <div className="spacer" />
                      <button
                        className="icon-button"
                        aria-label={t("处理上移")}
                        disabled={operationIndex === 0}
                        onClick={() => moveOperation(operationIndex, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={t("处理下移")}
                        disabled={operationIndex === operations.length - 1}
                        onClick={() => moveOperation(operationIndex, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={t("删除处理")}
                        onClick={() =>
                          update(index, {
                            operations: operations.filter(
                              (_, i) => i !== operationIndex,
                            ),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {(operationIndex > 0 || step.next !== "always") && (
                      <div className="form-grid">
                        <Field label="与上一处理的关系">
                          <Select
                            value={step.next}
                            options={[
                              ["always", "无论上一步结果都处理"],
                              ["if-success", "上一步成功时才处理"],
                              ["if-failed", "上一步失败时才处理"],
                            ]}
                            onChange={(next) =>
                              updateOperation(operationIndex, { next })
                            }
                          />
                        </Field>
                        <Field
                          label="处理时点"
                          hint="同时处理选项不插入 BreakEffect；具体效果是否可同时处理仍须核对规则。"
                        >
                          <Select
                            value={step.timing || "separate"}
                            options={[
                              ["separate", "不同时间处理（那之后）"],
                              ["together", "视为同时处理"],
                            ]}
                            onChange={(timing) =>
                              updateOperation(operationIndex, { timing })
                            }
                          />
                        </Field>
                      </div>
                    )}
                    <EffectOperationFields
                      value={step}
                      action={step.action}
                      project={project}
                      sequence
                      firstStep={operationIndex === 0}
                      operations={operations}
                      stepIndex={operationIndex}
                      onChange={(patch) =>
                        updateOperation(operationIndex, patch)
                      }
                    />
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={step.optional}
                        disabled={step.selection === "target"}
                        onChange={(event) =>
                          updateOperation(operationIndex, {
                            optional: event.target.checked,
                          })
                        }
                      />
                      {t("处理时可选择是否执行此步")}
                    </label>
                  </div>
                ))}
                <button
                  className="button secondary"
                  disabled={operations.length >= 16}
                  onClick={() =>
                    update(index, {
                      operations: [...operations, createOperation("draw")],
                    })
                  }
                >
                  <Plus size={14} />
                  {t("添加后续处理")}
                </button>
              </div>
            )}
            {isSummoning && (
              <SummoningEffectEditor
                value={effect.summoning || defaultSummoning()}
                project={project}
                onChange={(summoning) => update(index, { summoning })}
              />
            )}
            {!isCustom && !isProcedure && (
              <TrackingEditor
                block={effect}
                onChange={(tracking) => update(index, { tracking })}
              />
            )}
            {isCustom && (
              <AdvancedEffectEditor
                value={
                  effect.advanced || {
                    type: "EFFECT_TYPE_SINGLE",
                    code: "EFFECT_UPDATE_ATTACK",
                  }
                }
                target={project.target}
                onChange={(patch) =>
                  update(index, {
                    advanced: {
                      type: "EFFECT_TYPE_SINGLE",
                      code: "EFFECT_UPDATE_ATTACK",
                      ...effect.advanced,
                      ...patch,
                    },
                  })
                }
                onReplace={(advanced) => update(index, { advanced })}
              />
            )}
            {!isCustom && !isProcedure && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={effect.optional}
                  onChange={(event) =>
                    update(index, { optional: event.target.checked })
                  }
                />
                {t("可选发动（诱发效果）")}
              </label>
            )}
            <Field label="对应的原文" wide>
              <textarea
                rows={2}
                value={effect.sourceText}
                placeholder={t("记录这块效果负责实现的原文，便于核对。")}
                onChange={(event) =>
                  update(index, { sourceText: event.target.value })
                }
              />
            </Field>
          </section>
        );
      })}
      {card.effects.length > 0 && (
        <div className="review-box">
          <p>
            {t(
              "核对原文与每块效果，特别是费用、取对象、次数和后续限制。未覆盖的处理可以使用自定义效果回调或完整 Lua。",
            )}
          </p>
          <button
            className="button secondary"
            disabled={card.scriptMode === "custom"}
            onClick={() =>
              onChange({ matchedText: card.text, reviewRequired: false })
            }
          >
            {t("已核对，标记效果配置完成")}
          </button>
          {card.scriptMode === "custom" && (
            <p>
              {t(
                "当前导出使用完整 Lua，请在「Lua 脚本」页核对实际脚本后标记完成。",
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
