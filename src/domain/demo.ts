import { createCard, createEffect, createProject } from "./model";

function artwork(color: string, seed: number) {
  const petals = Array.from(
    { length: 8 },
    (_, i) =>
      `<ellipse cx="320" cy="210" rx="48" ry="146" fill="${color}" fill-opacity=".7" transform="rotate(${i * 45 + seed} 320 320)"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><radialGradient id="b"><stop stop-color="#35574b"/><stop offset="1" stop-color="#102b29"/></radialGradient></defs><rect width="640" height="640" fill="url(#b)"/><circle cx="320" cy="320" r="260" fill="none" stroke="#ccbda0" stroke-opacity=".3"/><circle cx="320" cy="320" r="232" fill="none" stroke="#ccbda0" stroke-opacity=".2"/>${petals}<circle cx="320" cy="320" r="53" fill="#eedbbc"/><circle cx="320" cy="320" r="24" fill="#887444"/><path d="M0 600 Q160 380 320 520 T640 580" fill="none" stroke="#a7cba4" stroke-width="3" opacity=".5"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
export function demoProject() {
  const p = createProject();
  p.name = "昼庭 · 入门卡包";
  p.description =
    "一个可以直接编辑、导出的示例。三张卡演示系列检索、手卡特殊召唤和抽卡。";
  p.nextCode = 100000004;
  p.archetypes = [{ name: "昼庭", code: 0x7d01 }];
  const a = createCard(100000001);
  Object.assign(a, {
    name: "昼庭的寻花人",
    art: artwork("#cf9c59", 10),
    race: 1,
    level: 4,
    attack: 1600,
    defense: 1200,
    setcodes: [0x7d01],
    text: "这张卡召唤成功的场合才能发动。从卡组把1只「昼庭」怪兽加入手卡。这个卡名的这个效果1回合只能使用1次。",
  });
  const ea = createEffect("search", a);
  Object.assign(ea, {
    trigger: "summon",
    count: "name-use",
    description: "检索「昼庭」怪兽",
    sourceText: a.text,
    filter: { kind: "monster", setcode: 0x7d01 },
  });
  a.effects = [ea];
  a.matchedText = a.text;
  const b = createCard(100000002);
  Object.assign(b, {
    name: "昼庭的旅风",
    art: artwork("#a2c7c1", 35),
    race: 1,
    attribute: "wind",
    level: 3,
    attack: 1200,
    defense: 800,
    setcodes: [0x7d01],
    text: "对方场上有怪兽、自己场上没有怪兽的场合，可以从手卡特殊召唤这张卡。",
  });
  const eb = createEffect("self-summon", b);
  eb.sourceText = b.text;
  eb.description = "从手卡特殊召唤";
  b.effects = [eb];
  b.matchedText = b.text;
  const c = createCard(100000003);
  Object.assign(c, {
    name: "昼庭的小憩",
    kind: "spell",
    art: artwork("#b8a4c6", 65),
    setcodes: [0x7d01],
    text: "自己从卡组抽1张。这个卡名的卡1回合只能发动1张。",
  });
  const ec = createEffect("draw", c);
  Object.assign(ec, {
    count: "name-activate",
    description: "抽1张卡",
    sourceText: c.text,
  });
  c.effects = [ec];
  c.matchedText = c.text;
  p.cards = [a, b, c];
  return p;
}
