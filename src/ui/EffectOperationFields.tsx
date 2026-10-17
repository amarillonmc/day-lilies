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
  anotherTarget = false,
}: {
  value: EffectBlock | EffectOperation;
  action: OperationAction;
  project: CardProject;
  onChange: (patch: Partial<EffectBlock & EffectOperation>) => void;
  sequence?: boolean;
  firstStep?: boolean;
  anotherTarget?: boolean;
}) {
  const { t } = useI18n();
  const selection =
    "selection" in value
      ? value.selection
      : ["add-counter", "remove-counter"].includes(action)
        ? "self"
        : undefined;
  const usesCards = !simple.has(action);
  const hasPosition = action === "change-position";
  const hasDuration =
    ["control", "disable", "declare-race", "declare-attribute"].includes(
      action,
    ) ||
    (sequence && action === "boost");
  const legacySingle =
    !sequence &&
    [
      "recover",
      "destroy",
      "bounce",
      "banish",
      "revive",
      "summon",
      "boost",
    ].includes(action);
  const selections = (
    [
      ["target", "发动时取对象"],
      ["select", "处理时选择"],
      ["all", "处理全部符合条件的卡"],
      ["self", "此卡自身"],
      ["previous", "沿用上一处理的卡"],
    ] as const
  ).filter(
    ([mode]) =>
      mode === selection ||
      !(
        (mode === "previous" && (firstStep || action === "attach-material")) ||
        (mode === "target" && (anotherTarget || action === "discard-hand")) ||
        (mode === "all" &&
          ["summon", "revive", "control", "equip"].includes(action)) ||
        (mode === "self" && ["equip", "attach-material"].includes(action))
      ),
  );
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
        {!["negate-activation", "negate-effect", "damage", "heal"].includes(
          action,
        ) &&
          !["self", "previous", "all"].includes(selection || "") && (
            <Field
              label="数量"
              hint={
                legacySingle ? "单体处理；多张卡请使用复合效果。" : undefined
              }
            >
              <NumberInput
                value={value.amount}
                min={1}
                max={
                  legacySingle ||
                  ["summon", "revive", "control", "equip"].includes(action)
                    ? 1
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
              value={value.position || "faceup-attack"}
              options={[
                ["faceup-attack", "表侧攻击表示"],
                ["faceup-defense", "表侧守备表示"],
                ["facedown-defense", "里侧守备表示"],
              ]}
              onChange={(position) => onChange({ position })}
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
