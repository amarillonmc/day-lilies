import { Plus, Trash2 } from "lucide-react";
import type { DelayedTracking, EffectBlock } from "../domain/model";
import { TEMPLATES } from "../domain/catalog";
import { createTracking, trackingSources } from "../domain/tracking";
import { useI18n } from "../i18n";
import { Field, Select } from "./Fields";

export function TrackingEditor({
  block,
  onChange,
}: {
  block: EffectBlock;
  onChange: (value: DelayedTracking[]) => void;
}) {
  const { t } = useI18n();
  const entries = block.tracking || [];
  const sources = trackingSources(block);
  const patch = (index: number, value: Partial<DelayedTracking>) =>
    onChange(
      entries.map((entry, i) => (i === index ? { ...entry, ...value } : entry)),
    );
  const sourceOptions: [string, string][] = [
    ["last", t("最后配置步骤的实际处理卡")],
    ...sources.map((source, index): [string, string] => [
      source.uid,
      t("步骤 {0}：{1}", {
        0: index + 1,
        1: `${source.name ? `${source.name} · ` : ""}${t(TEMPLATES.find((item) => item.id === source.action)?.label || source.action)}`,
      }),
    ]),
  ];
  return (
    <details className="advanced-options" open={entries.length > 0}>
      <summary>
        {t("跨时点追踪")} · {entries.length}
      </summary>
      <p className="muted">
        {t(
          "保存指定步骤实际处理成功的卡，在预定阶段执行一次后续处理。上游 YGOPRO 与 KoishiPRO 均支持。",
        )}
      </p>
      {entries.map((entry, index) => (
        <section className="operation-step" key={entry.uid}>
          <div className="operation-step-header">
            <strong>{t("延迟追踪 {0}", { 0: index + 1 })}</strong>
            <button
              type="button"
              className="icon-button danger"
              aria-label={t("删除延迟追踪 {0}", { 0: index + 1 })}
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="form-grid">
            <Field label="追踪来源步骤" wide>
              <Select
                value={entry.sourceStep}
                options={sourceOptions}
                translateOptions={false}
                onChange={(sourceStep) => patch(index, { sourceStep })}
              />
            </Field>
            <Field label="执行回合">
              <Select
                value={entry.schedule}
                options={[
                  ["this-turn", "本回合"],
                  ["next-turn", "下回合"],
                  ["next-matching", "最近的指定玩家阶段"],
                ]}
                onChange={(schedule) =>
                  patch(index, {
                    schedule,
                    turnPlayer:
                      schedule === "next-matching"
                        ? entry.turnPlayer
                        : "either",
                  })
                }
              />
            </Field>
            <Field label="执行阶段">
              <Select
                value={entry.phase}
                options={[
                  ["standby", "准备阶段"],
                  ["end", "结束阶段"],
                ]}
                onChange={(phase) => patch(index, { phase })}
              />
            </Field>
            {entry.schedule === "next-matching" && (
              <Field label="该回合玩家">
                <Select
                  value={entry.turnPlayer}
                  options={[
                    ["either", "任意玩家"],
                    ["self", "自己"],
                    ["opponent", "对方"],
                  ]}
                  onChange={(turnPlayer) => patch(index, { turnPlayer })}
                />
              </Field>
            )}
            <Field label="延迟执行动作">
              <Select
                value={entry.action}
                options={[
                  ["destroy", "破坏追踪卡"],
                  ["bounce", "回到持有者手牌"],
                  ["to-deck", "回到持有者卡组"],
                  ["banish", "表侧除外追踪卡"],
                  ["send-grave", "送追踪卡去墓地"],
                  ["return-temporary", "暂时除外后返回原场地"],
                ]}
                onChange={(action) =>
                  patch(index, {
                    action,
                    ...(action === "return-temporary"
                      ? { resetOnMove: true }
                      : {}),
                  })
                }
              />
            </Field>
            {entry.action === "to-deck" && (
              <Field label="卡组位置">
                <Select
                  value={entry.destination || "shuffle"}
                  options={[
                    ["shuffle", "洗切卡组"],
                    ["top", "卡组顶"],
                    ["bottom", "卡组底"],
                  ]}
                  onChange={(destination) => patch(index, { destination })}
                />
              </Field>
            )}
            {entry.action === "return-temporary" && (
              <Field label="返回时表示形式">
                <Select
                  value={entry.position || "original"}
                  options={[
                    ["original", "除外前的表示形式"],
                    ["faceup-attack", "表侧攻击表示"],
                    ["faceup-defense", "表侧守备表示"],
                    ["facedown-defense", "里侧守备表示"],
                  ]}
                  onChange={(position) => patch(index, { position })}
                />
              </Field>
            )}
            <Field label="阶段处理方式">
              <Select
                value={entry.resolution}
                options={[
                  ["continuous", "不入连锁的延迟处理"],
                  ["trigger", "必发阶段效果（入连锁）"],
                ]}
                onChange={(resolution) => patch(index, { resolution })}
              />
            </Field>
            <Field label="追踪卡有效条件">
              <Select
                value={entry.validity}
                options={[
                  ["any", "至少一张仍有效，处理有效卡"],
                  ["all", "全部仍有效才处理"],
                ]}
                onChange={(validity) => patch(index, { validity })}
              />
            </Field>
            <Field label="追踪失效规则" wide>
              <Select
                value={entry.resetOnMove ? "reset" : "follow"}
                disabled={entry.action === "return-temporary"}
                options={[
                  ["reset", "离开追踪区域或变为里侧后失效"],
                  ["follow", "移动后仍追踪同一张卡"],
                ]}
                onChange={(value) =>
                  patch(index, { resetOnMove: value === "reset" })
                }
              />
            </Field>
          </div>
          {entry.action === "return-temporary" && (
            <p className="muted">
              {t(
                "仅可引用从场上除外的步骤；该步骤会自动使用暂时除外原因。返回不是特殊召唤，场地区域不足时可能无法返回。",
              )}
            </p>
          )}
          {!entry.resetOnMove && (
            <p className="diagnostic warning">
              {t(
                "跨区域保留追踪可能不符合卡片通常裁定；此选项不会自动判断卡片应否视为新的实例。",
              )}
            </p>
          )}
        </section>
      ))}
      <p className="muted">
        {t(
          "所有追踪计划在预定回合结束后失效；指定阶段被跳过时不补发。最近的指定玩家阶段从当前时点向后计算，本回合／下回合配置不会追补已经过去的阶段。",
        )}
      </p>
      <p className="muted">
        {t(
          "入连锁方式由卡片文本与裁定决定；可视化配置不自动判断。暂时除外默认使用不入连锁的返回处理。",
        )}
      </p>
      <button
        type="button"
        disabled={entries.length >= 8}
        onClick={() => onChange([...entries, createTracking()])}
      >
        <Plus size={15} /> {t("添加延迟追踪")}
      </button>
    </details>
  );
}
