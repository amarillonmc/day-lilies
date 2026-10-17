export const workflowTranslations: Record<string, readonly [string, string]> = {
  怪兽效果类型: ["Monster effect type", "モンスターの効果有無"],
  不限定效果类型: ["Any effect type", "効果の有無を指定しない"],
  非效果怪兽: ["Non-Effect Monster", "効果を持たないモンスター"],
  "效果怪兽筛选必须为布尔值。": [
    "The effect-monster filter must be a boolean.",
    "効果モンスターの絞り込みは真偽値で指定してください。",
  ],
  "按顺序执行最多 16 步；可分别选择多组对象，并引用任意对象组或较早步骤的实际结果。条件分支依据上一步的实际处理结果。":
    [
      "Run up to 16 steps in order. Select separate target groups and reuse any target group or an earlier step's actual results. Branches use the preceding step's actual outcome.",
      "最大16ステップを順番に処理します。複数の対象グループを選び、任意の対象グループや前のステップで実際に処理したカードを再利用できます。分岐は直前の処理結果に基づきます。",
    ],
  "装备魔法需要装备处理；仪式魔法需要仪式召唤处理。": [
    "Equip Spells need an equip action; Ritual Spells need a Ritual Summon action.",
    "装備魔法には装備処理、儀式魔法には儀式召喚処理が必要です。",
  ],
  "此单步模板支持 1 张卡；多对象请使用复合效果，批量特殊召唤仍需高级回调。": [
    "This single-step template supports one card. Use a sequence for multiple targets; simultaneous Special Summons still need an advanced callback.",
    "この単一処理テンプレートは1枚に対応します。複数の対象には複合効果を使ってください。同時に複数体を特殊召喚する場合は高度なコールバックが必要です。",
  ],
  "{0} 含有重复的追踪内部 ID。": [
    "{0} contains duplicate internal tracking IDs.",
    "{0} に重複する追跡内部IDがあります。",
  ],
};
