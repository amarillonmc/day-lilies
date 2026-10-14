import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { TEMPLATES } from "../domain/catalog";
import {
  createEffect,
  uid,
  type Card,
  type CardProject,
  type EffectBlock,
  type TemplateId,
} from "../domain/model";
import { ATTRIBUTES, COSTS, COUNTS, RACES, TRIGGERS, ZONES } from "./options";
import { Field, NumberInput, Select } from "./Fields";

export default function EffectEditor({
  card,
  project,
  onChange,
}: {
  card: Card;
  project: CardProject;
  onChange: (patch: Partial<Card>) => void;
}) {
  const update = (index: number, patch: Partial<EffectBlock>) =>
    onChange({
      effects: card.effects.map((e, i) =>
        i === index ? { ...e, ...patch } : e,
      ),
      reviewRequired: true,
    });
  const add = (template: TemplateId) =>
    onChange({
      effects: [...card.effects, createEffect(template, card)],
      reviewRequired: true,
    });
  const allowedZones = (e: EffectBlock) =>
    ZONES.filter(([z]) =>
      e.template === "search" || e.template === "mill"
        ? z === "deck"
        : e.template === "recover" || e.template === "revive"
          ? z === "grave"
          : e.template === "summon"
            ? ["hand", "grave", "hand-grave"].includes(z)
            : e.template === "banish"
              ? ["field", "monster", "spelltrap", "grave"].includes(z)
              : ["field", "monster", "spelltrap"].includes(z),
    );
  const move = (index: number, direction: number) => {
    const effects = [...card.effects];
    [effects[index], effects[index + direction]] = [
      effects[index + direction],
      effects[index],
    ];
    onChange({ effects, reviewRequired: true });
  };
  return (
    <div className="effects-editor">
      <div className="template-picker">
        <div className="eyebrow">效果工具箱</div>
        <p>选择常用效果，再补全发动时机、范围与费用。</p>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              className="template"
              key={t.id}
              onClick={() => add(t.id)}
              title={t.summary}
            >
              <Plus size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {!card.effects.length && (
        <div className="empty-mini">
          从上方添加第一块效果，或使用「匹配文本」起步。
        </div>
      )}
      {card.effects.map((e, index) => (
        <section className="effect-block" key={e.uid}>
          <div className="block-title">
            <span className="number-badge">
              {String(index + 1).padStart(2, "0")}
            </span>
            <strong>
              {TEMPLATES.find((t) => t.id === e.template)?.label || e.template}
            </strong>
            <div className="spacer" />
            <button
              className="icon-button"
              aria-label="效果上移"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="效果下移"
              disabled={index === card.effects.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="复制效果"
              onClick={() =>
                onChange({
                  effects: [
                    ...card.effects,
                    { ...structuredClone(e), uid: uid() },
                  ],
                  reviewRequired: true,
                })
              }
            >
              <Copy size={15} />
            </button>
            <button
              className="icon-button danger"
              aria-label="删除效果"
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
                value={e.description}
                placeholder="例如：检索1只系列怪兽"
                onChange={(v) => update(index, { description: v.target.value })}
              />
            </Field>
            {e.template !== "self-summon" && (
              <Field
                label="发动时机"
                hint={
                  [
                    "summon",
                    "special-summon",
                    "summon-or-special",
                    "flip",
                    "sent-to-grave",
                  ].includes(e.trigger)
                    ? "事件入口按「场合 / If」处理。「时 / When…you can」请使用完整 Lua。"
                    : undefined
                }
              >
                <Select
                  value={e.trigger}
                  options={TRIGGERS}
                  onChange={(trigger) => update(index, { trigger })}
                />
              </Field>
            )}
            {e.template !== "self-summon" &&
              ["ignition", "quick"].includes(e.trigger) &&
              e.scope !== "pendulum" && (
                <Field label="自身发动区域">
                  <Select
                    value={e.range || "field"}
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
                  value={e.scope || "monster"}
                  options={[
                    ["monster", "怪兽效果"],
                    ["pendulum", "灵摆效果"],
                  ]}
                  onChange={(scope) => update(index, { scope })}
                />
              </Field>
            )}
            <Field label="次数限制">
              <Select
                value={e.count}
                options={COUNTS}
                onChange={(count) => update(index, { count })}
              />
            </Field>
            {e.count === "shared-use" && (
              <Field label="共用计数组" hint="同一组名在整个卡包中共用次数。">
                <input
                  value={e.countGroup || ""}
                  onChange={(v) =>
                    update(index, { countGroup: v.target.value })
                  }
                />
              </Field>
            )}
            <Field label="发动条件">
              <Select
                value={e.condition}
                options={[
                  ["none", "无额外条件"],
                  ["no-monsters", "自己场上没有怪兽"],
                  ["opponent-only", "仅对方场上有怪兽"],
                ]}
                onChange={(condition) => update(index, { condition })}
              />
            </Field>
            {e.template !== "self-summon" && (
              <Field
                label="数量"
                hint={
                  ["search", "mill", "draw"].includes(e.template)
                    ? "固定处理的张数"
                    : "首版支持单体处理"
                }
              >
                <NumberInput
                  value={e.amount}
                  min={1}
                  max={["search", "mill", "draw"].includes(e.template) ? 10 : 1}
                  onChange={(amount) => update(index, { amount })}
                />
              </Field>
            )}
            {!["self-summon", "draw"].includes(e.template) && (
              <>
                <Field label="来源区域">
                  <Select
                    value={e.source}
                    options={allowedZones(e)}
                    onChange={(source) => update(index, { source })}
                  />
                </Field>
                <Field label="适用玩家">
                  <Select
                    value={e.players}
                    options={[
                      ["self", "自己"],
                      ["opponent", "对方"],
                      ["both", "双方"],
                    ]}
                    disabled={["search", "mill", "summon"].includes(e.template)}
                    onChange={(players) => update(index, { players })}
                  />
                </Field>
              </>
            )}
            {e.template === "draw" && (
              <Field label="抽卡玩家">
                <Select
                  value={e.players}
                  options={[
                    ["self", "自己"],
                    ["opponent", "对方"],
                    ["both", "双方"],
                  ]}
                  onChange={(players) => update(index, { players })}
                />
              </Field>
            )}
            {e.template !== "self-summon" && (
              <>
                <Field label="费用">
                  <Select
                    value={e.cost}
                    options={COSTS}
                    onChange={(cost) => update(index, { cost })}
                  />
                </Field>
                {["lp", "discard", "send-hand"].includes(e.cost) && (
                  <Field label="费用数量">
                    <NumberInput
                      value={e.costAmount}
                      min={1}
                      onChange={(costAmount) => update(index, { costAmount })}
                    />
                  </Field>
                )}
              </>
            )}
            {e.template === "boost" && (
              <>
                <Field label="攻击力增减">
                  <NumberInput
                    value={e.attack}
                    onChange={(attack) => update(index, { attack })}
                  />
                </Field>
                <Field label="守备力增减">
                  <NumberInput
                    value={e.defense}
                    onChange={(defense) => update(index, { defense })}
                  />
                </Field>
                <p className="field-help wide">
                  到回合结束时为止。Link 怪兽不能改变守备力。
                </p>
              </>
            )}
          </div>
          {!["draw", "self-summon"].includes(e.template) && (
            <details className="filters" open>
              <summary>筛选条件</summary>
              <div className="form-grid">
                <Field label="卡片种类">
                  <Select
                    value={e.filter.kind || "any"}
                    options={[
                      ["any", "任意卡片"],
                      ["monster", "怪兽"],
                      ["spell", "魔法"],
                      ["trap", "陷阱"],
                    ]}
                    onChange={(kind) =>
                      update(index, { filter: { ...e.filter, kind } })
                    }
                  />
                </Field>
                <Field label="系列">
                  <select
                    value={e.filter.setcode || 0}
                    onChange={(v) =>
                      update(index, {
                        filter: {
                          ...e.filter,
                          setcode: Number(v.target.value) || undefined,
                        },
                      })
                    }
                  >
                    <option value={0}>不限定系列</option>
                    {project.archetypes.map((a) => (
                      <option value={a.code} key={a.code}>
                        {a.name} · 0x{a.code.toString(16)}
                      </option>
                    ))}
                    {e.filter.setcode &&
                      !project.archetypes.some(
                        (a) => a.code === e.filter.setcode,
                      ) && (
                        <option value={e.filter.setcode}>
                          0x{e.filter.setcode.toString(16)}
                        </option>
                      )}
                  </select>
                </Field>
                <Field label="种族">
                  <select
                    value={e.filter.race || 0}
                    onChange={(v) =>
                      update(index, {
                        filter: {
                          ...e.filter,
                          race: Number(v.target.value) || undefined,
                        },
                      })
                    }
                  >
                    <option value={0}>任意种族</option>
                    {RACES.map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="属性">
                  <select
                    value={e.filter.attribute || ""}
                    onChange={(v) =>
                      update(index, {
                        filter: {
                          ...e.filter,
                          attribute:
                            (v.target.value as typeof e.filter.attribute) ||
                            undefined,
                        },
                      })
                    }
                  >
                    <option value="">任意属性</option>
                    {ATTRIBUTES.map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="最低等级（0 为不限）">
                  <NumberInput
                    value={e.filter.minLevel || 0}
                    min={0}
                    onChange={(minLevel) =>
                      update(index, {
                        filter: {
                          ...e.filter,
                          minLevel: minLevel || undefined,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="最高等级（0 为不限）">
                  <NumberInput
                    value={e.filter.maxLevel || 0}
                    min={0}
                    onChange={(maxLevel) =>
                      update(index, {
                        filter: {
                          ...e.filter,
                          maxLevel: maxLevel || undefined,
                        },
                      })
                    }
                  />
                </Field>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!e.filter.excludeSelfName}
                    onChange={(v) =>
                      update(index, {
                        filter: {
                          ...e.filter,
                          excludeSelfName: v.target.checked,
                        },
                      })
                    }
                  />
                  不包含同名卡
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!e.filter.faceup}
                    onChange={(v) =>
                      update(index, {
                        filter: { ...e.filter, faceup: v.target.checked },
                      })
                    }
                  />
                  仅表侧表示的卡
                </label>
              </div>
            </details>
          )}
          {e.template !== "self-summon" && (
            <label className="check">
              <input
                type="checkbox"
                checked={e.optional}
                onChange={(v) => update(index, { optional: v.target.checked })}
              />
              可选发动（诱发效果）
            </label>
          )}
          <Field label="对应的原文" wide>
            <textarea
              rows={2}
              value={e.sourceText}
              placeholder="记录这块效果负责实现的原文，便于核对。"
              onChange={(v) => update(index, { sourceText: v.target.value })}
            />
          </Field>
        </section>
      ))}
      {card.effects.length > 0 && (
        <div className="review-box">
          <p>
            核对原文与每块效果，特别是费用、取对象、次数和后续限制。模板未覆盖的部分可以交给
            BYOK，或切换到完整 Lua。
          </p>
          <button
            className="button secondary"
            disabled={card.scriptMode === "custom"}
            onClick={() =>
              onChange({ matchedText: card.text, reviewRequired: false })
            }
          >
            已核对，标记效果配置完成
          </button>
          {card.scriptMode === "custom" && (
            <p>
              当前导出使用完整 Lua，请在「Lua 脚本」页核对实际脚本后标记完成。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
