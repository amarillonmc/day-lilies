import type {
  CardProject,
  EffectBlock,
  EffectOperation,
  OperationAction,
  OperationOptions,
  Zone,
} from "../domain/model";
import { useI18n } from "../i18n";
import { Field, NumberInput, Select } from "./Fields";
import { ZONES } from "./options";
import { EffectFilterEditor } from "./EffectFilterEditor";
import { SummoningEffectEditor } from "./SummonProcedureEditor";
import { defaultSummoning } from "../domain/summon-procedures";

export const EFFECT_ZONES: [Zone, string][] = [...ZONES, ["extra", "额外卡组"]];
export const EFFECT_PLAYERS = [
  ["self", "自己"],
  ["opponent", "对方"],
  ["both", "双方"],
] as const;
const simple = new Set([
  "draw",
  "damage",
  "heal",
  "mill-top",
  "negate-activation",
  "negate-effect",
  "detach-material",
]);

export function EffectOperationFields({
  value,
  action,
  project,
  onChange,
  sequence = false,
  firstStep = false,
  operations = [],
  stepIndex = 0,
}: {
  value: EffectBlock | EffectOperation;
  action: OperationAction;
  project: CardProject;
  onChange: (patch: Partial<EffectBlock & EffectOperation>) => void;
  sequence?: boolean;
  firstStep?: boolean;
  operations?: EffectOperation[];
  stepIndex?: number;
}) {
  const { t } = useI18n();
  if (action === "summoning")
    return (
      <SummoningEffectEditor
        value={value.summoning || defaultSummoning()}
        project={project}
        onChange={(summoning) => onChange({ summoning })}
      />
    );
  const isSpecialSummon = ["summon", "revive"].includes(action);
  const selection =
    "selection" in value
      ? value.selection
      : ["add-counter", "remove-counter"].includes(action)
        ? "self"
        : undefined;
  const usesCards = !simple.has(action);
  const hasPosition = action === "change-position" || isSpecialSummon;
  const hasDuration =
    ["control", "disable", "declare-race", "declare-attribute"].includes(
      action,
    ) ||
    (sequence && action === "boost");
  const legacySingle =
    !sequence &&
    ["recover", "destroy", "bounce", "banish", "boost"].includes(action);
  const selections = (
    [
      ["target", "发动时取对象"],
      ["select", "处理时选择"],
      ["all", "处理全部符合条件的卡"],
      ["self", "此卡自身"],
      ["previous", "沿用上一处理的卡"],
      ["target-group", "引用已定义的对象组"],
      ["result", "引用前面步骤的实际结果"],
    ] as const
  ).filter(
    ([mode]) =>
      mode === selection ||
      !(
        (mode === "previous" && firstStep) ||
        (mode === "result" && firstStep) ||
        (mode === "target" && action === "discard-hand") ||
        (mode === "all" && ["control", "equip"].includes(action)) ||
        (mode === "self" && ["equip", "attach-material"].includes(action))
      ),
  );
  const referenceOptions: [string, string][] = [
    ["", t("选择来源…")],
    ...operations.flatMap((op, index): [string, string][] => {
      if (
        selection === "target-group"
          ? op.selection !== "target" ||
            simple.has(op.action) ||
            op.action === "summoning"
          : index >= stepIndex
      )
        return [];
      return [
        [
          op.uid,
          `${index + 1}. ${op.targetName || t(selection === "target-group" ? "对象组" : "处理结果")}`,
        ],
      ];
    }),
  ];
  const zones =
    !sequence && ["search", "mill"].includes(action)
      ? EFFECT_ZONES.filter(([zone]) => zone === "deck")
      : !sequence && ["recover", "revive"].includes(action)
        ? EFFECT_ZONES.filter(([zone]) => zone === "grave")
        : !sequence && action === "summon"
          ? EFFECT_ZONES.filter(([zone]) =>
              ["hand", "grave", "hand-grave"].includes(zone),
            )
          : !sequence && ["destroy", "bounce", "boost"].includes(action)
            ? EFFECT_ZONES.filter(([zone]) =>
                ["field", "monster", "spelltrap"].includes(zone),
              )
            : !sequence && action === "banish"
              ? EFFECT_ZONES.filter(([zone]) =>
                  ["field", "monster", "spelltrap", "grave"].includes(zone),
                )
              : action === "discard-hand"
                ? EFFECT_ZONES.filter(([zone]) => zone === "hand")
                : [
                      "boost",
                      "control",
                      "disable",
                      "equip",
                      "declare-race",
                      "declare-attribute",
                      "change-position",
                    ].includes(action)
                  ? EFFECT_ZONES.filter(([zone]) =>
                      ["field", "monster", "spelltrap"].includes(zone),
                    )
                  : isSpecialSummon
                    ? EFFECT_ZONES.filter(([zone]) =>
                        [
                          "hand",
                          "deck",
                          "grave",
                          "banished",
                          "hand-grave",
                        ].includes(zone),
                      )
                    : EFFECT_ZONES;
  return (
    <>
      <div className="form-grid">
        {sequence && usesCards && (
          <Field label="处理方式">
            <Select
              value={selection || "select"}
              options={selections}
              onChange={(selection) =>
                onChange({
                  selection,
                  ...(selection === "target" ? { optional: false } : {}),
                  ...(selection === "self" ? { amount: 1 } : {}),
                })
              }
            />
          </Field>
        )}
        {sequence && selection === "target" && usesCards && (
          <>
            <Field
              label="对象组名称"
              hint="名称仅用于编辑器；其他步骤通过稳定标识引用此组。"
            >
              <input
                value={("targetName" in value && value.targetName) || ""}
                maxLength={80}
                placeholder={t("对象组")}
                onChange={(e) => onChange({ targetName: e.target.value })}
              />
            </Field>
            <Field
              label="对象组重叠"
              hint="只有两组都允许时，同一卡才可同时属于两组。"
            >
              <Select
                value={
                  ("targetOverlap" in value && value.targetOverlap) ||
                  "disallow"
                }
                options={[
                  ["disallow", "禁止与其他组重叠"],
                  ["allow", "允许与同样允许的组重叠"],
                ]}
                onChange={(targetOverlap) => onChange({ targetOverlap })}
              />
            </Field>
          </>
        )}
        {sequence &&
          ["target-group", "result"].includes(selection || "") &&
          usesCards && (
            <Field
              label={selection === "target-group" ? "来源对象组" : "来源步骤"}
              hint={
                selection === "target-group"
                  ? "结算时仅处理仍与此连锁关联、且符合当前筛选的对象。"
                  : "仅引用所选步骤实际处理成功的卡；失败或跳过时为空。"
              }
            >
              <Select
                value={("reference" in value && value.reference) || ""}
                options={referenceOptions}
                translateOptions={false}
                onChange={(reference) => onChange({ reference })}
              />
            </Field>
          )}
        {!["negate-activation", "negate-effect", "damage", "heal"].includes(
          action,
        ) &&
          (isSpecialSummon
            ? !["self", "all"].includes(selection || "")
            : !["self", "previous", "all", "target-group", "result"].includes(
                selection || "",
              )) && (
            <Field
              label={
                isSpecialSummon &&
                ["previous", "target-group", "result"].includes(selection || "")
                  ? "特召数量上限"
                  : "数量"
              }
              hint={
                legacySingle ? "单体处理；多张卡请使用复合效果。" : undefined
              }
            >
              <NumberInput
                value={value.amount}
                min={1}
                max={
                  legacySingle || ["control", "equip"].includes(action)
                    ? 1
                    : isSpecialSummon
                      ? 5
                      : !sequence && ["draw", "search", "mill"].includes(action)
                        ? 10
                        : 40
                }
                onChange={(amount) => onChange({ amount })}
              />
            </Field>
          )}
        {usesCards && selection !== "self" && (
          <Field label="来源区域">
            <Select
              value={value.source}
              options={zones}
              onChange={(source) => onChange({ source })}
            />
          </Field>
        )}
        {action !== "detach-material" && selection !== "self" && (
          <Field label="适用玩家">
            <Select
              value={value.players}
              options={EFFECT_PLAYERS}
              disabled={
                !sequence && ["search", "mill", "summon"].includes(action)
              }
              onChange={(players) => onChange({ players })}
            />
          </Field>
        )}
        {["damage", "heal", "add-counter", "remove-counter"].includes(
          action,
        ) && (
          <Field
            label={
              ["add-counter", "remove-counter"].includes(action)
                ? "指示物数量"
                : "数值"
            }
          >
            <NumberInput
              value={
                value.value ?? (["damage", "heal"].includes(action) ? 800 : 1)
              }
              min={1}
              onChange={(value) => onChange({ value })}
            />
          </Field>
        )}
        {action === "boost" && (
          <>
            <Field label="攻击力增减">
              <NumberInput
                value={value.attack}
                onChange={(attack) => onChange({ attack })}
              />
            </Field>
            <Field label="守备力增减">
              <NumberInput
                value={value.defense}
                onChange={(defense) => onChange({ defense })}
              />
            </Field>
            <p className="field-help wide">{t("Link 怪兽不能改变守备力。")}</p>
          </>
        )}
        {["add-counter", "remove-counter"].includes(action) && (
          <Field label="计数器种类">
            <NumberInput
              value={value.counterType ?? 0x1001}
              min={1}
              max={65535}
              onChange={(counterType) => onChange({ counterType })}
            />
          </Field>
        )}
        {hasPosition && (
          <Field label="表示形式">
            <Select
              value={value.position || (isSpecialSummon ? "" : "faceup-attack")}
              options={[
                ...(isSpecialSummon
                  ? ([["", "表侧表示（结算时选择）"]] as const)
                  : []),
                ["faceup-attack", "表侧攻击表示"],
                ["faceup-defense", "表侧守备表示"],
                ["facedown-defense", "里侧守备表示"],
              ]}
              onChange={(position) =>
                onChange({
                  position: position
                    ? (position as OperationOptions["position"])
                    : undefined,
                })
              }
            />
          </Field>
        )}
        {action === "to-deck" && (
          <Field label="返回卡组的位置">
            <Select
              value={value.destination || "shuffle"}
              options={[
                ["shuffle", "洗切卡组"],
                ["top", "卡组顶"],
                ["bottom", "卡组底"],
              ]}
              onChange={(destination) => onChange({ destination })}
            />
          </Field>
        )}
        {hasDuration && (
          <Field label="持续时间">
            <Select
              value={value.duration || "turn"}
              options={[
                ["turn", "直到回合结束"],
                ["permanent", "不设回合结束重置"],
              ]}
              onChange={(duration) =>
                onChange({ duration } as OperationOptions)
              }
            />
          </Field>
        )}
      </div>
      {isSpecialSummon && (
        <div className="effect-help">
          <p>
            {t(
              selection === "all"
                ? "同一次特殊召唤处理全部符合条件的怪兽（最多 5 只）；空位不足或受到一次只能特召一只的限制时，此步不处理。"
                : "多只怪兽在同一次特殊召唤中出场；对象失效或可用空位减少时，仅处理仍合法且可容纳的怪兽。结果引用和延迟追踪只记录实际召唤成功的怪兽。",
            )}
          </p>
          {selection !== "all" && (
            <p>
              {t(
                "结算时若仍需同时特召多只，但受到一次只能特召一只的限制，此步不处理。",
              )}
            </p>
          )}
        </div>
      )}
      {usesCards && (
        <EffectFilterEditor
          filter={value.filter}
          project={project}
          onChange={(filter) => onChange({ filter })}
        />
      )}
    </>
  );
}
