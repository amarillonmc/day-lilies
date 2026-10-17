/** Multi-target editor labels; user-created group names remain unchanged. */
export const targetTranslations: Record<string, [string, string]> = {
  引用已定义的对象组: [
    "Use a defined target group",
    "定義済みの対象グループを使用",
  ],
  引用前面步骤的实际结果: [
    "Use an earlier step's actual result",
    "前のステップで実際に処理したカードを使用",
  ],
  "选择来源…": ["Choose a source…", "参照元を選択…"],
  对象组: ["Target group", "対象グループ"],
  处理结果: ["Operation result", "処理結果"],
  对象组名称: ["Target group name", "対象グループ名"],
  "名称仅用于编辑器；其他步骤通过稳定标识引用此组。": [
    "Names are for the editor; other steps refer to this group by a stable identifier.",
    "名前は編集用です。他のステップは固定の識別子でこのグループを参照します。",
  ],
  对象组重叠: ["Target group overlap", "対象グループの重複"],
  "只有两组都允许时，同一卡才可同时属于两组。": [
    "A card can belong to two groups only when both allow overlap.",
    "両方のグループが許可した場合のみ、同じカードを重複して選択できます。",
  ],
  禁止与其他组重叠: [
    "Do not overlap with other groups",
    "他のグループとの重複を禁止",
  ],
  允许与同样允许的组重叠: [
    "Allow overlap with other allowing groups",
    "重複を許可したグループ同士で共有",
  ],
  来源对象组: ["Source target group", "参照する対象グループ"],
  来源步骤: ["Source step", "参照するステップ"],
  "结算时仅处理仍与此连锁关联、且符合当前筛选的对象。": [
    "At resolution, use only targets still related to this chain and matching the current filter.",
    "解決時にこのチェーンとの関係があり、現在の条件を満たす対象のみを処理します。",
  ],
  "仅引用所选步骤实际处理成功的卡；失败或跳过时为空。": [
    "Use only cards actually affected by the selected step. Failed or skipped steps yield no cards.",
    "指定ステップで実際に処理に成功したカードのみを使います。不発・省略時は空になります。",
  ],
  "处理步骤的标识不能重复。": [
    "Operation step identifiers must be unique.",
    "処理ステップの識別子は重複できません。",
  ],
  "对象组重叠规则无效。": [
    "The target overlap rule is invalid.",
    "対象グループの重複ルールが無効です。",
  ],
  "对象组名称最多 80 个字符。": [
    "Target group names may contain up to 80 characters.",
    "対象グループ名は 80 文字以内で入力してください。",
  ],
  "请选择有效的发动对象组。": [
    "Choose a valid activation target group.",
    "有効な発動時の対象グループを選んでください。",
  ],
  "结果来源必须是前面的处理步骤。": [
    "The result source must be an earlier operation step.",
    "結果の参照元には前の処理ステップを指定してください。",
  ],
  "该处理不能引用卡片组。": [
    "This operation cannot reference a card group.",
    "この処理はカードグループを参照できません。",
  ],
};
