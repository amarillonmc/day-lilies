import { useI18n } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Image, LoaderCircle } from "lucide-react";
import { renderCard } from "../io/render";
import type { Card } from "../domain/model";

export default function Preview({ card }: { card: Card }) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const data = JSON.stringify(card);
  useEffect(() => {
    let cancelled = false;
    let ownedUrl = "";
    const gen = ++generation.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const blob = await renderCard(JSON.parse(data));
        if (cancelled || gen !== generation.current) return;
        ownedUrl = URL.createObjectURL(blob);
        setUrl(ownedUrl);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
  }, [data]);
  return (
    <div className="preview-canvas">
      {url ? (
        <img src={url} alt={t("{0} 完整卡图", { "0": card.name })} />
      ) : (
        <div className="preview-placeholder">
          <Image size={38} />
          <span>{t("生成卡片预览")}</span>
        </div>
      )}
      {busy && (
        <span className="preview-loading">
          <LoaderCircle size={13} className="spin" />
          {t("绘制中")}
        </span>
      )}
      {error && <p className="preview-error">{t(error)}</p>}
    </div>
  );
}
