import { useI18n } from "../i18n";
import { ImagePlus, X } from "lucide-react";
import type { Card, CardProject } from "../domain/model";
import { Field, NumberInput, Select } from "./Fields";
import { SummonProcedureEditor } from "./SummonProcedureEditor";
import {
  ATTRIBUTES,
  KINDS,
  LANGUAGES,
  LINK_ARROWS,
  RACES,
  SUBTYPES,
} from "./options";

export default function CardEditor({
  card,
  project,
  onChange,
  onError,
}: {
  card: Card;
  project: CardProject;
  onChange: (patch: Partial<Card>) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const monster = !["spell", "trap"].includes(card.kind);
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      onError("中间图请小于 20 MB。");
      return;
    }
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      onError("支持 PNG、JPEG、WebP 和 GIF 中间图。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ art: String(reader.result) });
    reader.onerror = () => onError("无法读取图片。");
    reader.readAsDataURL(file);
  }
  return (
    <div className="card-form">
      <div className="section-label">
        <span>01</span>
        {t("卡片信息")}
      </div>
      <div className="form-grid">
        <Field label="卡片名称" wide>
          <input
            className="name-input"
            value={card.name}
            onChange={(e) =>
              onChange({ name: e.target.value, reviewRequired: true })
            }
          />
        </Field>
        <Field label="卡号 / 密码" hint="由作者管理；用于 CDB 与 Lua 文件名。">
          <NumberInput
            value={card.code}
            min={128}
            max={268435455}
            onChange={(code) => onChange({ code, reviewRequired: true })}
          />
        </Field>
        <Field
          label="卡面语言"
          hint="独立于界面语言，控制卡框、字体和系统标签；不会翻译卡名或卡片正文。"
        >
          <Select
            value={card.language}
            options={LANGUAGES}
            translateOptions={false}
            onChange={(language) => onChange({ language })}
          />
        </Field>
        <Field label="卡片种类">
          <Select
            value={card.kind}
            options={KINDS}
            onChange={(kind) =>
              onChange({
                kind,
                subtype:
                  (kind === "spell" && card.subtype === "counter") ||
                  (kind === "trap" &&
                    !["normal", "continuous", "counter"].includes(card.subtype))
                    ? "normal"
                    : card.subtype,
                hasEffect: !["normal", "token"].includes(kind),
                pendulum: ["link", "spell", "trap", "token"].includes(kind)
                  ? false
                  : card.pendulum,
                race: card.race || 1,
                reviewRequired: true,
                procedure: {
                  ...card.procedure,
                  contactFusion:
                    kind === "fusion"
                      ? card.procedure.contactFusion
                      : undefined,
                  mode: ["fusion", "synchro", "xyz", "link"].includes(kind)
                    ? (kind as Card["procedure"]["mode"])
                    : "none",
                },
              })
            }
          />
        </Field>
        {!monster ? (
          <Field label="魔法 / 陷阱类型">
            <Select
              value={card.subtype}
              options={SUBTYPES.filter(([subtype]) =>
                card.kind === "trap"
                  ? ["normal", "continuous", "counter"].includes(subtype)
                  : subtype !== "counter",
              )}
              onChange={(subtype) =>
                onChange({ subtype, reviewRequired: true })
              }
            />
          </Field>
        ) : (
          <>
            <Field label="属性">
              <Select
                value={card.attribute}
                options={ATTRIBUTES}
                onChange={(attribute) => onChange({ attribute })}
              />
            </Field>
            <Field label="种族">
              <Select
                value={card.race}
                options={RACES}
                onChange={(race) => onChange({ race })}
              />
            </Field>
            <Field
              label={
                card.kind === "xyz"
                  ? t("阶级")
                  : card.kind === "link"
                    ? t("LINK 值")
                    : t("等级")
              }
            >
              <NumberInput
                value={card.level}
                min={1}
                max={13}
                onChange={(level) => onChange({ level })}
              />
            </Field>
            <Field label="攻击力（-2 为 ?）">
              <NumberInput
                value={card.attack}
                min={-2}
                onChange={(attack) => onChange({ attack })}
              />
            </Field>
            {card.kind !== "link" && (
              <Field label="守备力（-2 为 ?）">
                <NumberInput
                  value={card.defense}
                  min={-2}
                  onChange={(defense) => onChange({ defense })}
                />
              </Field>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={card.tuner}
                onChange={(e) => onChange({ tuner: e.target.checked })}
              />
              {t("调整")}
            </label>
            {!["normal", "token", "effect"].includes(card.kind) && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={card.hasEffect !== false}
                  onChange={(e) =>
                    onChange({
                      hasEffect: e.target.checked,
                      reviewRequired: true,
                    })
                  }
                />
                {t("效果怪兽")}
              </label>
            )}
            {card.kind !== "link" && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={card.pendulum}
                  onChange={(e) =>
                    onChange({
                      pendulum: e.target.checked,
                      reviewRequired: true,
                    })
                  }
                />
                {t("灵摆怪兽")}
              </label>
            )}
          </>
        )}
        {project.archetypes.length > 0 && (
          <Field label="所属系列" wide>
            <div className="chip-list">
              {project.archetypes.map((a) => (
                <button
                  className={`chip ${card.setcodes.includes(a.code) ? "active" : ""}`}
                  type="button"
                  key={a.code}
                  onClick={() =>
                    onChange({
                      setcodes: card.setcodes.includes(a.code)
                        ? card.setcodes.filter((c) => c !== a.code)
                        : [...card.setcodes, a.code],
                    })
                  }
                >
                  {a.name}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field
          label="系列代码（逗号分隔，可用 0x）"
          wide
          hint="对应 CDB setcode；卡包设置中可为代码命名。"
        >
          <input
            key={card.uid + ":setcode:" + card.setcodes.join(",")}
            defaultValue={card.setcodes
              .map((c) => "0x" + c.toString(16))
              .join(", ")}
            onBlur={(e) => {
              const values = e.target.value
                .split(/[,，\s]+/)
                .filter(Boolean)
                .map(Number);
              if (
                values.some(
                  (n) => !Number.isInteger(n) || n < 1 || n > 65535,
                ) ||
                values.length > 4
              ) {
                onError("最多 4 个系列代码，每个应为 1–65535。");
                return;
              }
              onChange({ setcodes: values });
            }}
          />
        </Field>
        {card.kind === "link" && (
          <Field label="连接箭头" wide>
            <div className="link-arrows">
              {LINK_ARROWS.map(([bit, label]) => (
                <button
                  type="button"
                  key={bit}
                  aria-label={t("连接箭头 {0}", { "0": label })}
                  className={`chip ${card.linkMarkers.includes(bit) ? "active" : ""}`}
                  onClick={() =>
                    onChange({
                      linkMarkers: card.linkMarkers.includes(bit)
                        ? card.linkMarkers.filter((b) => b !== bit)
                        : [...card.linkMarkers, bit],
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>
      <div className="section-label">
        <span>02</span>
        {t("效果与原文")}
      </div>
      <Field
        label={card.kind === "normal" ? t("描述文字") : t("卡片效果")}
        wide
        hint="可以使用中文、英文 PSCT 或日文。匹配不完整时，请补充积木或完整脚本。"
      >
        <textarea
          className="effect-text"
          rows={8}
          value={card.text}
          onChange={(e) =>
            onChange({ text: e.target.value, reviewRequired: true })
          }
        />
      </Field>
      {card.pendulum && (
        <>
          <div className="form-grid">
            <Field label="左刻度">
              <NumberInput
                value={card.leftScale}
                min={0}
                max={13}
                onChange={(leftScale) => onChange({ leftScale })}
              />
            </Field>
            <Field label="右刻度">
              <NumberInput
                value={card.rightScale}
                min={0}
                max={13}
                onChange={(rightScale) => onChange({ rightScale })}
              />
            </Field>
          </div>
          <Field label="灵摆效果">
            <textarea
              rows={4}
              value={card.pendulumText}
              onChange={(e) =>
                onChange({ pendulumText: e.target.value, reviewRequired: true })
              }
            />
          </Field>
        </>
      )}
      <details className="details">
        <summary>{t("翻译 / 设计备注")}</summary>
        <p className="field-help">
          {t("MSE 的中文注释放在这里，仅供参考，不自动覆盖正文。")}
        </p>
        <textarea
          rows={4}
          value={card.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </details>
      {["synchro", "xyz", "link", "fusion"].includes(card.kind) && (
        <SummonProcedureEditor
          card={card}
          project={project}
          onChange={(procedure) =>
            onChange({ procedure, reviewRequired: true })
          }
        />
      )}
      <div className="section-label">
        <span>03</span>
        {t("中间图")}
      </div>
      <div className="art-upload">
        {card.art ? (
          <>
            <img src={card.art} alt={t("中间图")} />
            <button
              className="icon-button remove-art"
              aria-label={t("移除中间图")}
              onClick={() => onChange({ art: "" })}
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <ImagePlus size={28} />
        )}
        <label className="upload-label">
          <strong>{card.art ? t("替换中间图") : t("上传你的中间图")}</strong>
          <small>{t("PNG / JPEG / WebP · 最大 20 MB")}</small>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <Field label="绘图署名">
        <input
          value={card.artworkCredit}
          onChange={(e) => onChange({ artworkCredit: e.target.value })}
        />
      </Field>
    </div>
  );
}
