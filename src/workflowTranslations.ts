export const workflowTranslations: Record<string, readonly [string, string]> = {
  手牌: ["Hand", "手札"],
  手牌与墓地: ["Hand and GY", "手札・墓地"],
  "以墓地 1–5 只怪兽为对象，同时特殊召唤到自己场上。": [
    "Target 1–5 monsters in the GY and Special Summon them to your field at the same time.",
    "墓地のモンスター1～5体を対象に取り、自分フィールドに同時に特殊召喚します。",
  ],
  "处理时从自己的手牌或墓地选 1–5 只怪兽，同时特殊召唤。": [
    "At resolution, choose 1–5 monsters from your hand or GY and Special Summon them at the same time.",
    "処理時に自分の手札・墓地からモンスター1～5体を選び、同時に特殊召喚します。",
  ],
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
  "此单步模板支持 1 张卡；多对象请使用复合效果。": [
    "This single-step template supports one card. Use a sequence for multiple targets.",
    "この単一処理テンプレートは1枚に対応します。複数の対象には複合効果を使ってください。",
  ],
  特召数量上限: ["Maximum monsters to summon", "特殊召喚する最大数"],
  "融合／仪式步骤需要处理时选择 1 只自己的召唤怪兽；素材在召唤配置中选择。": [
    "A Fusion/Ritual step selects one of your monsters on resolution. Configure materials in its summoning settings.",
    "融合・儀式ステップでは処理時に自分の召喚するモンスター1体を選びます。素材は召喚設定で指定してください。",
  ],
  "普通特殊召唤每步支持 1–5 只非额外卡组的怪兽；融合／仪式请使用召唤步骤。": [
    "A regular Special Summon step supports 1–5 monsters from outside the Extra Deck. Use a summoning step for Fusion/Ritual Summons.",
    "通常の特殊召喚ステップはエクストラデッキ以外から1～5体に対応します。融合・儀式召喚には召喚ステップを使用してください。",
  ],
  "表侧表示（结算时选择）": [
    "Face-up (choose on resolution)",
    "表側表示（処理時に選択）",
  ],
  "结算时若仍需同时特召多只，但受到一次只能特召一只的限制，此步不处理。": [
    "If multiple monsters still need to be summoned at resolution, a one-monster-at-a-time restriction prevents this step.",
    "処理時に複数体を同時に特殊召喚する必要があり、1度に1体しか特殊召喚できない制限を受けている場合、このステップは処理しません。",
  ],
  "同一次特殊召唤处理全部符合条件的怪兽（最多 5 只）；空位不足或受到一次只能特召一只的限制时，此步不处理。":
    [
      "Special Summon all eligible monsters at once (up to 5). This step does nothing if there are too few zones or a one-monster-at-a-time restriction prevents it.",
      "条件を満たすモンスターを全て同時に特殊召喚します（最大5体）。空きゾーンの不足や1度に1体しか特殊召喚できない制限で全てを出せない場合、このステップは処理しません。",
    ],
  "多只怪兽在同一次特殊召唤中出场；对象失效或可用空位减少时，仅处理仍合法且可容纳的怪兽。结果引用和延迟追踪只记录实际召唤成功的怪兽。":
    [
      "Monsters are Special Summoned at the same time. If targets become invalid or fewer zones remain, summon only the eligible monsters that fit. Result references and delayed tracking include only monsters successfully summoned.",
      "複数体を同時に特殊召喚します。対象が無効になったり空きゾーンが減った場合、合法かつ出せるモンスターのみを処理します。結果の参照と遅延追跡には実際に特殊召喚に成功したモンスターだけを記録します。",
    ],
  "{0} 含有重复的追踪内部 ID。": [
    "{0} contains duplicate internal tracking IDs.",
    "{0} に重複する追跡内部IDがあります。",
  ],
};
