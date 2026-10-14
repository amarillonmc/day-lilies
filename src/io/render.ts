import type { Card, Language } from "../domain/model";
import { raceName, RENDER_LINK_MARKERS } from "./card-data";

const assets = `${import.meta.env.BASE_URL || "/"}card-assets`;
const fonts = [
  "ygo-sc",
  "ygo-tc",
  "ygo-jp",
  "ygo-en",
  "ygo-en-name",
  "ygo-en-race",
  "ygo-en-italic",
  "ygo-atk-def",
  "ygo-link",
  "ygo-password",
];
let fontReady: Promise<void> | undefined;
function loadFonts(): Promise<void> {
  fontReady ??= Promise.all(
    fonts.map(async (family) => {
      const face = new FontFace(
        family,
        `url(${assets}/yugioh/font/${family}.woff2)`,
      );
      document.fonts.add(face);
      await face.load();
    }),
  )
    .then(() => undefined)
    .catch((error) => {
      fontReady = undefined;
      throw new Error(`卡片字体加载失败，请检查部署资源：${String(error)}`);
    });
  return fontReady;
}
const typeNames: Record<string, Record<Language, string>> = {
  effect: { en: "Effect", sc: "效果", tc: "效果", jp: "効果" },
  ritual: { en: "Ritual", sc: "仪式", tc: "儀式", jp: "儀式" },
  fusion: { en: "Fusion", sc: "融合", tc: "融合", jp: "融合" },
  synchro: { en: "Synchro", sc: "同调", tc: "同步", jp: "シンクロ" },
  xyz: { en: "Xyz", sc: "超量", tc: "超量", jp: "エクシーズ" },
  link: { en: "Link", sc: "连接", tc: "連接", jp: "リンク" },
  tuner: { en: "Tuner", sc: "调整", tc: "協調", jp: "チューナー" },
  pendulum: { en: "Pendulum", sc: "灵摆", tc: "靈擺", jp: "ペンデュラム" },
};
function monsterType(card: Card) {
  const parts = [raceName(card.race, card.language)];
  if (["fusion", "ritual", "synchro", "xyz", "link"].includes(card.kind))
    parts.push(typeNames[card.kind][card.language]);
  if (card.pendulum) parts.push(typeNames.pendulum[card.language]);
  if (card.tuner) parts.push(typeNames.tuner[card.language]);
  if (
    card.kind !== "normal" &&
    card.kind !== "token" &&
    card.hasEffect !== false
  )
    parts.push(typeNames.effect[card.language]);
  return parts.join("/");
}
function placeholder(): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 800;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#d8dfdb";
  ctx.fillRect(0, 0, 800, 800);
  ctx.strokeStyle = "#b5c5bc";
  ctx.lineWidth = 3;
  for (let x = -800; x < 1600; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 800, 800);
    ctx.stroke();
  }
  ctx.fillStyle = "#415b4f";
  ctx.textAlign = "center";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("ARTWORK PLACEHOLDER", 400, 400);
  return canvas.toDataURL("image/png");
}

async function rasterArt(value: string): Promise<string> {
  if (!/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml)[;,]/i.test(value))
    throw new Error("请上传本地中间图；卡图渲染不读取外部图片地址。");
  const image = new Image();
  image.src = value;
  try {
    await image.decode();
  } catch {
    throw new Error("中间图无法解码，请重新上传 PNG、JPEG、WebP 或 SVG 图片。");
  }
  // Decode SVG only as an image, then flatten to PNG. No SVG markup is inserted
  // into the application DOM or executed as a document.
  if (!value.startsWith("data:image/svg+xml")) return value;
  const canvas = document.createElement("canvas");
  const scale = Math.min(
    1,
    2048 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 不可用。");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function toRenderData(card: Card) {
  return {
    language: card.language,
    name: card.name,
    type: ["spell", "trap"].includes(card.kind)
      ? card.kind
      : card.pendulum
        ? "pendulum"
        : "monster",
    cardType: card.kind,
    pendulumType: `${card.kind}-pendulum`,
    attribute: card.attribute,
    icon: card.subtype === "normal" ? "" : card.subtype,
    image: card.art,
    level: card.level,
    rank: card.level,
    pendulumScale: card.leftScale,
    pendulumDescription: card.pendulumText,
    monsterType: monsterType(card),
    atk: card.attack === -2 ? -1 : card.attack,
    def: card.defense === -2 ? -1 : card.defense,
    arrowList: card.linkMarkers
      .map((bit) => RENDER_LINK_MARKERS.indexOf(bit) + 1)
      .filter((index) => index > 0),
    description: card.text,
    password: card.code > 0 ? String(card.code) : "",
    copyright: "",
    package: "",
    laser: "",
    rare: "",
    radius: false,
    scale: 0.5,
  };
}

/** Render a complete 697×1015 card using the bundled card frames and fonts. */
export async function renderCard(card: Card): Promise<Blob> {
  if (typeof document === "undefined")
    throw new Error("完整卡图渲染需要浏览器 Canvas。");
  await loadFonts();
  const { YugiohCard } = await import("yugioh-card");
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;width:1394px;height:2031px;pointer-events:none";
  document.body.append(host);
  // Upstream exposes the Pendulum text leaves. Override only the two scale values;
  // the CDB supports independent scales, while upstream's data schema has one.
  let disposed = false;
  class IndependentScaleCard extends YugiohCard {
    // Upstream schedules a font-ready redraw from its constructor. A quick
    // export can finish first; do not let that callback touch a disposed tree.
    draw() {
      if (!disposed) super.draw();
    }
    drawImageStatus(imageLeaf: unknown, status: unknown) {
      if (!disposed) super.drawImageStatus(imageLeaf, status);
    }
    drawPendulum() {
      super.drawPendulum();
      this.pendulumLeaf.children[0].set({ text: card.leftScale });
      this.pendulumLeaf.children[1].set({ text: card.rightScale });
    }
  }
  let renderer: InstanceType<typeof IndependentScaleCard> | undefined;
  try {
    const data = toRenderData(card);
    if (!data.image) data.image = placeholder();
    data.image = await rasterArt(data.image);
    renderer = new IndependentScaleCard({
      view: host,
      resourcePath: assets,
      data,
    });
    const result = await renderer.leafer.export("png", {
      screenshot: true,
      pixelRatio: 1,
    });
    if (!result?.data || result.error)
      throw new Error(`卡图导出失败：${result?.error || "未得到图像"}`);
    const url = result.data as string;
    if (!url.startsWith("data:image/"))
      throw new Error("卡图导出未返回图像数据。");
    return await (await fetch(url)).blob();
  } finally {
    disposed = true;
    if (renderer) {
      // Clear children while Leafer's watcher is still alive. Its default
      // deferred destroy tears controllers down before sorting child removal.
      renderer.leafer.clear();
      renderer.leafer.destroy(true);
    }
    host.remove();
  }
}

export async function renderCardDataUrl(card: Card): Promise<string> {
  const blob = await renderCard(card);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
