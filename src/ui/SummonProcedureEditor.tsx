import type {
  Card,
  CardFilter,
  CardProject,
  FusionMaterialSlot,
  SummonProcedure,
  SummoningEffect,
} from "../domain/model";
import { fusionMaterialSlots } from "../domain/summon-procedures";
import { useI18n } from "../i18n";
import { EffectFilterEditor } from "./EffectFilterEditor";
import { Field, NumberInput, Select } from "./Fields";

function MaterialFilter({
  label,
  value,
  project,
  onChange,
}: {
  label: string;
  value?: CardFilter;
  project: CardProject;
  onChange: (filter: CardFilter) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="form-section">
      <strong>{t(label)}</strong>
      <EffectFilterEditor
        filter={value || {}}
        project={project}
        onChange={onChange}
      />
    </div>
  );
}

export function SummonProcedureEditor({
  card,
  project,
  onChange,
}: {
  card: Card;
  project: CardProject;
  onChange: (procedure: SummonProcedure) => void;
}) {
  const { t } = useI18n();
  const p = card.procedure;
  const update = (patch: Partial<SummonProcedure>) =>
    onChange({ ...p, ...patch });
  const slots = fusionMaterialSlots(card);
  const slotUpdate = (index: number, patch: Partial<FusionMaterialSlot>) =>
    update({
      fusionSlots: slots.map((slot, i) =>
        i === index ? { ...slot, ...patch } : slot,
      ),
    });
  return (
    <details className="details" open>
      <summary>{t("可视化召唤手续")}</summary>
      <p className="field-help">
        {t(
          "这些召唤手续兼容 YGOPRO 与 KoishiPRO。素材筛选表达式仅提供候选卡 c。",
        )}
      </p>
      <div className="form-grid">
        <Field label="手续">
          <Select
            value={p.mode}
            options={[
              ["none", "自定义 Lua 中处理"],
              [
                card.kind as SummonProcedure["mode"],
                (
                  {
                    synchro: "同调素材配置",
                    xyz: "超量素材与叠放路线",
                    link: "连接素材配置",
                    fusion: "融合素材槽",
                  } as Record<string, string>
                )[card.kind],
              ],
            ]}
            onChange={(mode) => update({ mode })}
          />
        </Field>
        {p.mode !== "none" && p.mode !== "fusion" && (
          <>
            <Field label="素材总数下限">
              <NumberInput
                min={p.mode === "synchro" ? (p.tunerCount ?? 1) + 1 : 1}
                max={8}
                value={p.min}
                onChange={(min) => update({ min, max: Math.max(min, p.max) })}
              />
            </Field>
            <Field label="素材总数上限">
              <NumberInput
                min={p.min}
                max={8}
                value={p.max}
                onChange={(max) => update({ max })}
              />
            </Field>
          </>
        )}
        {p.mode === "synchro" && (
          <Field label="调整素材数量">
            <Select
              value={p.tunerCount ?? 1}
              options={[
                [1, "1"],
                [2, "2"],
                [3, "3"],
              ]}
              onChange={(tunerCount) =>
                update({
                  tunerCount,
                  min: Math.max(p.min, tunerCount + 1),
                  max: Math.max(p.max, tunerCount + 1),
                })
              }
            />
          </Field>
        )}
        {p.mode === "xyz" && (
          <Field label="素材等级">
            <NumberInput
              value={p.materialLevel}
              min={1}
              max={13}
              onChange={(materialLevel) => update({ materialLevel })}
            />
          </Field>
        )}
      </div>
      {p.mode === "synchro" && (
        <>
          <MaterialFilter
            label="调整素材筛选"
            value={p.tunerFilter}
            project={project}
            onChange={(tunerFilter) => update({ tunerFilter })}
          />
          <MaterialFilter
            label="非调整素材筛选"
            value={p.nonTunerFilter}
            project={project}
            onChange={(nonTunerFilter) => update({ nonTunerFilter })}
          />
        </>
      )}
      {["xyz", "link"].includes(p.mode) && (
        <MaterialFilter
          label="通常路线素材筛选"
          value={p.materialFilter}
          project={project}
          onChange={(materialFilter) => update({ materialFilter })}
        />
      )}
      {p.mode === "xyz" && (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={!!p.xyzAlternative}
              onChange={(event) =>
                update({
                  xyzAlternative: event.target.checked
                    ? { filter: { kind: "monster" }, description: 1165 }
                    : undefined,
                })
              }
            />
            {t("允许在一只超量怪兽上重叠召唤")}
          </label>
          {p.xyzAlternative && (
            <>
              <p className="field-help">
                {t(
                  "选择自己场上符合筛选的表侧超量怪兽；其原有超量素材随之转移。此路线不要求通常路线的素材等级。",
                )}
              </p>
              <MaterialFilter
                label="叠放路线素材筛选"
                value={p.xyzAlternative.filter}
                project={project}
                onChange={(filter) =>
                  update({ xyzAlternative: { ...p.xyzAlternative!, filter } })
                }
              />
              <Field
                label="叠放路线系统提示编号"
                hint="默认 1165 使用客户端的超量召唤提示。"
              >
                <NumberInput
                  value={p.xyzAlternative.description}
                  min={1}
                  onChange={(description) =>
                    update({
                      xyzAlternative: { ...p.xyzAlternative!, description },
                    })
                  }
                />
              </Field>
            </>
          )}
        </>
      )}
      {p.mode === "fusion" && (
        <>
          <p className="field-help">
            {t(
              "每个素材槽都必须满足，槽内数量可重复；合计 2–8 张，最多一个槽可设数量范围。",
            )}
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={p.fusionSubstitute !== false}
              onChange={(event) =>
                update({ fusionSubstitute: event.target.checked })
              }
            />
            {t("允许融合素材代用怪兽替代指定卡名素材")}
          </label>
          {slots.map((slot, index) => (
            <fieldset className="operation-step" key={index}>
              <legend>{t("素材槽 {0}", { "0": index + 1 })}</legend>
              <div className="form-grid">
                <Field label="素材要求">
                  <Select
                    value={slot.kind}
                    options={[
                      ["code", "指定卡号"],
                      ["filter", "符合筛选的怪兽"],
                    ]}
                    onChange={(kind) =>
                      slotUpdate(index, { kind, code: slot.code ?? 100000001 })
                    }
                  />
                </Field>
                {slot.kind === "code" && (
                  <Field label="素材卡号">
                    <NumberInput
                      value={slot.code ?? 0}
                      min={128}
                      max={268435455}
                      onChange={(code) => slotUpdate(index, { code })}
                    />
                  </Field>
                )}
                <Field label="素材数下限">
                  <NumberInput
                    value={slot.min}
                    min={1}
                    max={8}
                    onChange={(min) =>
                      slotUpdate(index, { min, max: Math.max(slot.max, min) })
                    }
                  />
                </Field>
                <Field label="素材数上限">
                  <NumberInput
                    value={slot.max}
                    min={slot.min}
                    max={8}
                    onChange={(max) => slotUpdate(index, { max })}
                  />
                </Field>
              </div>
              {slot.kind === "filter" && (
                <EffectFilterEditor
                  filter={slot.filter}
                  project={project}
                  onChange={(filter) => slotUpdate(index, { filter })}
                />
              )}
              <button
                type="button"
                className="button subtle"
                onClick={() =>
                  update({ fusionSlots: slots.filter((_, i) => i !== index) })
                }
              >
                {t("删除素材槽")}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={slots.length >= 8}
            onClick={() =>
              update({
                fusionSlots: [
                  ...slots,
                  {
                    kind: "filter",
                    filter: { kind: "monster" },
                    min: 1,
                    max: 1,
                  },
                ],
              })
            }
          >
            {t("添加素材槽")}
          </button>
        </>
      )}
    </details>
  );
}

export function SummoningEffectEditor({
  value,
  project,
  onChange,
}: {
  value: SummoningEffect;
  project: CardProject;
  onChange: (value: SummoningEffect) => void;
}) {
  const { t } = useI18n();
  const update = (patch: Partial<SummoningEffect>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="summoning-editor">
      <p className="field-help">
        {t(
          "通过效果进行正规融合或仪式召唤，支持通常的发动条件、费用与次数限制；兼容两种内核。",
        )}
      </p>
      <div className="form-grid">
        <Field label="召唤处理">
          <Select
            value={value.kind}
            options={[
              ["fusion", "融合召唤"],
              ["ritual", "仪式召唤"],
            ]}
            onChange={(kind) => update({ kind })}
          />
        </Field>
        <Field label="召唤素材来源">
          <Select
            value={value.materialSource}
            options={[
              ["hand-field", "自己的手牌和怪兽区域"],
              ["hand", "仅自己的手牌"],
              ["field", "仅自己的怪兽区域"],
              ["hand-field-grave", "自己的手牌、怪兽区域和墓地"],
            ]}
            onChange={(materialSource) => update({ materialSource })}
          />
        </Field>
        {value.kind === "ritual" && (
          <>
            <Field label="仪式怪兽来源">
              <Select
                value={value.ritualSummonFrom ?? "hand"}
                options={[
                  ["hand", "手牌"],
                  ["hand-grave", "手牌与墓地"],
                ]}
                onChange={(ritualSummonFrom) => update({ ritualSummonFrom })}
              />
            </Field>
            <Field label="仪式等级计算">
              <Select
                value={value.ritualLevel ?? "original"}
                options={[
                  ["original", "仪式怪兽的原本等级"],
                  ["current", "仪式怪兽的当前等级"],
                  ["fixed", "指定固定等级"],
                ]}
                onChange={(ritualLevel) =>
                  update({
                    ritualLevel,
                    ritualFixedLevel: value.ritualFixedLevel ?? 8,
                  })
                }
              />
            </Field>
            {value.ritualLevel === "fixed" && (
              <Field label="仪式固定等级">
                <NumberInput
                  value={value.ritualFixedLevel ?? 8}
                  min={1}
                  max={13}
                  onChange={(ritualFixedLevel) => update({ ritualFixedLevel })}
                />
              </Field>
            )}
            <Field label="素材等级合计">
              <Select
                value={value.ritualComparison ?? "at-least"}
                options={[
                  ["at-least", "达到或超过所需等级"],
                  ["equal", "恰好等于所需等级"],
                ]}
                onChange={(ritualComparison) => update({ ritualComparison })}
              />
            </Field>
          </>
        )}
      </div>
      <p className="field-help">
        {value.kind === "fusion"
          ? t(
              "融合怪兽从额外卡组选择，素材要求由其融合手续决定。通常素材送去墓地；启用墓地素材时，那些素材除外。",
            )
          : t(
              "通常仪式素材解放；启用墓地素材时，那些素材除外。筛选不会跳过怪兽本身的召唤限制。",
            )}
      </p>
      <MaterialFilter
        label="可召唤怪兽筛选"
        value={value.monsterFilter}
        project={project}
        onChange={(monsterFilter) => update({ monsterFilter })}
      />
      <MaterialFilter
        label="可使用素材筛选"
        value={value.materialFilter}
        project={project}
        onChange={(materialFilter) => update({ materialFilter })}
      />
      <p className="field-help">{t("召唤筛选表达式仅提供候选卡 c。")}</p>
    </div>
  );
}
