/** Phase tracking UI and compiler diagnostics. Card content is never translated. */
export const trackingTranslations: Record<string, [string, string]> = {
  跨时点追踪: ["Delayed card tracking", "時点をまたぐカード追跡"],
  "保存指定步骤实际处理成功的卡，在预定阶段执行一次后续处理。上游 YGOPRO 与 KoishiPRO 均支持。":
    [
      "Track cards actually affected by a selected step and resolve one follow-up at the scheduled phase. Supported by both upstream YGOPRO and KoishiPRO.",
      "指定したステップで実際に処理されたカードを追跡し、予定のフェイズに１度だけ後続処理を行います。上流 YGOPRO と KoishiPRO の両方に対応します。",
    ],
  最后配置步骤的实际处理卡: [
    "Actual results of the final configured step",
    "最後に設定したステップの実際の処理結果",
  ],
  "步骤 {0}：{1}": ["Step {0}: {1}", "ステップ {0}：{1}"],
  "延迟追踪 {0}": ["Delayed tracking {0}", "遅延追跡 {0}"],
  "删除延迟追踪 {0}": ["Delete delayed tracking {0}", "遅延追跡 {0} を削除"],
  追踪来源步骤: ["Step to track", "追跡元のステップ"],
  执行回合: ["Scheduled turn", "処理するターン"],
  本回合: ["This turn", "このターン"],
  下回合: ["Next turn", "次のターン"],
  最近的指定玩家阶段: [
    "Next phase of the selected player",
    "指定プレイヤーの次の該当フェイズ",
  ],
  执行阶段: ["Scheduled phase", "処理するフェイズ"],
  准备阶段: ["Standby Phase", "スタンバイフェイズ"],
  结束阶段: ["End Phase", "エンドフェイズ"],
  该回合玩家: ["Turn player", "ターンプレイヤー"],
  任意玩家: ["Either player", "どちらのプレイヤーでも"],
  延迟执行动作: ["Delayed action", "遅延処理"],
  破坏追踪卡: ["Destroy tracked cards", "追跡カードを破壊"],
  回到持有者手牌: ["Return to their owners' hands", "持ち主の手札に戻す"],
  回到持有者卡组: ["Return to their owners' Decks", "持ち主のデッキに戻す"],
  表侧除外追踪卡: ["Banish tracked cards face-up", "追跡カードを表側で除外"],
  送追踪卡去墓地: ["Send tracked cards to the GY", "追跡カードを墓地へ送る"],
  暂时除外后返回原场地: [
    "Return from temporary banishment",
    "一時除外から元のフィールドへ戻す",
  ],
  返回时表示形式: ["Position on return", "戻すときの表示形式"],
  除外前的表示形式: ["Position before banishment", "除外前の表示形式"],
  阶段处理方式: ["Phase resolution", "フェイズ処理の方式"],
  不入连锁的延迟处理: [
    "Delayed processing without a Chain",
    "チェーンを作らない遅延処理",
  ],
  "必发阶段效果（入连锁）": [
    "Mandatory phase trigger (starts a Chain)",
    "必ず発動するフェイズ効果（チェーンを作る）",
  ],
  追踪卡有效条件: ["Tracked-card validity", "追跡カードの有効条件"],
  "至少一张仍有效，处理有效卡": [
    "At least one remains valid; process valid cards",
    "１枚以上が有効なら、有効なカードを処理",
  ],
  全部仍有效才处理: [
    "Process only if all remain valid",
    "全てが有効な場合のみ処理",
  ],
  追踪失效规则: ["When tracking expires", "追跡が無効になる条件"],
  离开追踪区域或变为里侧后失效: [
    "Invalidate on movement or being turned face-down",
    "追跡領域を離れる、または裏側になると無効",
  ],
  移动后仍追踪同一张卡: [
    "Keep tracking the same card after movement",
    "移動後も同じカードを追跡",
  ],
  "仅可引用从场上除外的步骤；该步骤会自动使用暂时除外原因。返回不是特殊召唤，场地区域不足时可能无法返回。":
    [
      "Requires a step that banishes from the field; it automatically uses the temporary-banish reason. Returning is not a Special Summon and may fail when no suitable zone is available.",
      "フィールドから除外するステップが必要です。そのステップは自動的に一時除外として処理します。戻すことは特殊召喚ではなく、適切なゾーンが空いていなければ戻せない場合があります。",
    ],
  "跨区域保留追踪可能不符合卡片通常裁定；此选项不会自动判断卡片应否视为新的实例。":
    [
      "Tracking through zone changes may differ from the card's usual ruling; this option does not decide whether the card should count as a new instance.",
      "領域をまたいだ追跡は通常の裁定と異なる場合があります。この設定は、移動後のカードを別のカードとして扱うべきかを自動判定しません。",
    ],
  "所有追踪计划在预定回合结束后失效；指定阶段被跳过时不补发。最近的指定玩家阶段从当前时点向后计算，本回合／下回合配置不会追补已经过去的阶段。":
    [
      "All tracking schedules expire at the end of their assigned turn; a skipped phase is not replayed later. The selected player's next phase is calculated from the current point. This-turn and next-turn schedules do not catch up on phases that have already passed.",
      "全ての追跡は予定ターンの終了時に失効し、指定フェイズがスキップされても後から処理しません。指定プレイヤーの次のフェイズは現在の時点から計算します。このターン／次のターンの設定は、既に過ぎたフェイズの処理を後から行いません。",
    ],
  "入连锁方式由卡片文本与裁定决定；可视化配置不自动判断。暂时除外默认使用不入连锁的返回处理。":
    [
      "Whether to start a Chain depends on the card text and rulings; visual configuration does not decide this. Temporary banishment defaults to returning without a Chain.",
      "チェーンを作るかどうかはカードのテキストと裁定に従って設定してください。自動判定は行いません。一時除外からの帰還は、既定ではチェーンを作りません。",
    ],
  添加延迟追踪: ["Add delayed tracking", "遅延追跡を追加"],
  "每个效果最多配置 8 项延迟追踪。": [
    "Each effect supports up to 8 delayed tracking rules.",
    "１つの効果には最大８件の遅延追跡を設定できます。",
  ],
  "此类效果暂不支持延迟追踪；请使用特殊召唤等普通处理步骤。": [
    "This effect type does not support delayed tracking yet; use a regular operation such as Special Summon.",
    "この種類の効果は遅延追跡に未対応です。特殊召喚などの通常の処理ステップを使用してください。",
  ],
  "延迟追踪标识不可重复。": [
    "Delayed tracking IDs must be unique.",
    "遅延追跡の ID は重複できません。",
  ],
  "延迟追踪的来源步骤已不存在，请重新选择。": [
    "The tracked source step no longer exists; choose another step.",
    "追跡元のステップが存在しません。選択し直してください。",
  ],
  "延迟追踪只能引用会产生实际处理卡组的步骤。": [
    "Delayed tracking requires a step that produces an actual operated card group.",
    "遅延追跡には、実際に処理したカードのグループを生成するステップが必要です。",
  ],
  "暂时除外返回必须引用从场上除外的步骤。": [
    "Returning from temporary banishment requires a step that banishes cards from the field.",
    "一時除外から戻す処理には、フィールドから除外するステップが必要です。",
  ],
  "暂时除外返回必须启用离开追踪区域后失效。": [
    "Returning from temporary banishment requires invalidation when tracked cards move.",
    "一時除外から戻す場合、追跡中のカードが領域を離れたときの無効化が必要です。",
  ],
  "同一除外步骤只能配置一项暂时除外返回。": [
    "A banish step may have only one temporary-return rule.",
    "１つの除外ステップには、一時除外から戻す設定を１件だけ追加できます。",
  ],
  "延迟追踪配置包含无效选项。": [
    "Delayed tracking contains an invalid option.",
    "遅延追跡に無効な設定があります。",
  ],
};
