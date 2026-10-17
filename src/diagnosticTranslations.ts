/** Application diagnostics only. Placeholders preserve author names and parser details verbatim. */
export const diagnosticTranslations: Record<string, [string, string]> = {
  "自身处理的卡片数量须为 1；指示物数量请使用数值字段。": ["An operation on this card must use a card amount of 1. Set counter amounts in the value field.", "自身への処理ではカードの数量を 1 にしてください。カウンターの数は数値欄で指定してください。"],
  "卡种筛选无效。": ["Invalid card type filter.", "カードの種類の絞り込みが無効です。"],
  "种族筛选无效。": ["Invalid monster type filter.", "種族の絞り込みが無効です。"],
  "属性筛选无效。": ["Invalid Attribute filter.", "属性の絞り込みが無効です。"],
  "系列代码筛选无效。": ["Invalid archetype code filter.", "テーマコードの絞り込みが無効です。"],
  "等级筛选范围无效。": ["Invalid Level filter range.", "レベルの絞り込み範囲が無効です。"],
  "指示物费用需要有效的指示物类型。": ["Counter costs require a valid counter type.", "カウンターを使用するコストには有効なカウンターの種類が必要です。"],
  "筛选卡号须为有效卡号，最多 100 个。": [
    "Card ID filters must contain valid IDs, up to 100.",
    "カード ID の絞り込みには有効な ID を最大 100 個まで指定してください。",
  ],
  "{0}/{1} 筛选范围无效。": [
    "Invalid {0}/{1} filter range.",
    "{0}/{1} の絞り込み範囲が無効です。",
  ],
  "高级筛选 Lua 表达式语法无效。": [
    "Invalid syntax in the advanced Lua filter expression.",
    "高度な Lua フィルター式の構文が無効です。",
  ],
  "复合效果需要 1–16 个处理步骤。": [
    "A compound effect requires 1–16 operation steps.",
    "複合効果には 1～16 個の処理ステップが必要です。",
  ],
  "同一次发动只配置一组对象；后续步骤可沿用上一组卡或处理时选择。": [
    "Use one target group per activation. Later steps can reuse the previous group or select at resolution.",
    "1 回の発動に設定できる対象は 1 グループです。後続ステップでは前のグループを引き継ぐか、処理時に選択できます。",
  ],
  "处理 {0}：{1}": ["Step {0}: {1}", "処理 {0}：{1}"],
  "未知处理类型。": ["Unknown operation type.", "不明な処理タイプです。"],
  "数量须为 1–40。": [
    "The amount must be from 1 to 40.",
    "数量は 1～40 にしてください。",
  ],
  "区域或玩家无效。": [
    "Invalid location or player.",
    "場所またはプレイヤーが無効です。",
  ],
  "选择方式无效。": ["Invalid selection method.", "選択方法が無効です。"],
  "步骤衔接无效。": [
    "Invalid step dependency.",
    "ステップ間の接続条件が無効です。",
  ],
  "处理时点无效。": [
    "Invalid operation timing.",
    "処理のタイミングが無効です。",
  ],
  "第一步不能依赖上一处理。": [
    "The first step cannot depend on a previous operation.",
    "最初のステップは前の処理に依存できません。",
  ],
  "发动时选对象的步骤不能设为处理时任意执行。": [
    "A step that targets at activation cannot be optional at resolution.",
    "発動時に対象を選ぶステップは、処理時の任意実行に設定できません。",
  ],
  "基本分数值须为 1–999999。": [
    "The LP value must be from 1 to 999999.",
    "LP の数値は 1～999999 にしてください。",
  ],
  "指示物类型须为 1–65535。": [
    "The counter type must be from 1 to 65535.",
    "カウンターの種類は 1～65535 にしてください。",
  ],
  "指示物数量须为 1–65535。": [
    "The counter amount must be from 1 to 65535.",
    "カウンターの数は 1～65535 にしてください。",
  ],
  "连锁无效处理需要连锁响应入口。": [
    "Chain negation requires a chain-response trigger.",
    "チェーンを無効にする処理にはチェーン応答の入口が必要です。",
  ],
  "丢弃手牌的来源必须是手牌。": [
    "Discard operations must use the hand as their source.",
    "手札を捨てる処理の元の場所は手札にしてください。",
  ],
  "特殊召唤目前每步支持 1 只主卡组怪兽；额外或同时特召请用高级回调。": [
    "Each step currently supports Special Summoning one Main Deck monster. Use advanced callbacks for Extra Deck or simultaneous summons.",
    "特殊召喚は現在、各ステップにつきメインデッキのモンスター 1 体に対応します。EX デッキからの召喚や同時特殊召喚には高度なコールバックを使用してください。",
  ],
  "该处理需要场上的卡。": [
    "This operation requires cards on the field.",
    "この処理にはフィールド上のカードが必要です。",
  ],
  "装备自身需要选择另一只怪兽。": [
    "Equipping this card requires selecting another monster.",
    "自身を装備するには別のモンスターを選択してください。",
  ],
  "获得控制权每步支持 1 只怪兽。": [
    "Each control-change step supports one monster.",
    "コントロールを得る処理は各ステップにつきモンスター 1 体に対応します。",
  ],
  "叠放素材须选择此卡以外的卡。": [
    "Select cards other than this card to attach as material.",
    "素材として重ねるには、このカード以外のカードを選択してください。",
  ],
  "手牌丢弃请使用处理时选择，不能选择隐藏手牌为对象。": [
    "Select cards at resolution when discarding; hidden cards in the hand cannot be targeted.",
    "手札を捨てる場合は処理時に選択してください。非公開の手札を対象にはできません。",
  ],
  "表示形式无效。": ["Invalid battle position.", "表示形式が無効です。"],
  "返回卡组位置无效。": [
    "Invalid destination in the Deck.",
    "デッキに戻す位置が無効です。",
  ],
  "持续时间无效。": ["Invalid duration.", "持続期間が無効です。"],
  "攻守变化须为有效整数。": [
    "ATK/DEF changes must be valid integers.",
    "攻撃力・守備力の変化量は有効な整数にしてください。",
  ],
  "攻守变化不能均为 0。": [
    "ATK and DEF changes cannot both be 0.",
    "攻撃力と守備力の変化量を両方 0 にはできません。",
  ],
  "高级效果需要填写 Effect 类型和代码。": [
    "Advanced effects require an Effect type and code.",
    "高度な効果には Effect の種類とコードが必要です。",
  ],
  "高级效果 {0} 表达式语法无效。": [
    "Invalid expression syntax in advanced effect field {0}.",
    "高度な効果の {0} 式の構文が無効です。",
  ],
  "高级效果 {0} 回调 Lua 语法无效。": [
    "Invalid Lua syntax in advanced effect callback {0}.",
    "高度な効果の {0} コールバックの Lua 構文が無効です。",
  ],
  "高级效果目标范围须为有效位掩码。": [
    "Advanced effect target ranges must be valid bitmasks.",
    "高度な効果の対象範囲には有効なビットマスクを指定してください。",
  ],
  "{0} 是 KoishiPRO 专有能力，上游 YGOPRO 目标不支持。": [
    "{0} is exclusive to KoishiPRO and is unsupported by the upstream YGOPRO target.",
    "{0} は KoishiPRO 専用機能で、上流 YGOPRO では非対応です。",
  ],
  "此高级效果已标记为 KoishiPRO 专有，不能导出到上游 YGOPRO。": [
    "This advanced effect is marked as KoishiPRO-only and cannot be exported for upstream YGOPRO.",
    "この高度な効果は KoishiPRO 専用と指定されているため、上流 YGOPRO 向けには出力できません。",
  ],
  "一张卡只能配置一个卡的发动积木；同一次发动内请使用复合效果拼图。": [
    "A card can have only one card-activation block. Use a compound effect for multiple operations in the same activation.",
    "1 枚のカードに設定できるカード発動ブロックは 1 つです。同じ発動内の複数処理には複合効果を使用してください。",
  ],
  不会被战斗破坏: ["Cannot be destroyed by battle", "戦闘では破壊されない"],
  "此怪兽在怪兽区不会被战斗破坏。": [
    "This monster cannot be destroyed by battle while in the Monster Zone.",
    "このモンスターはモンスターゾーンに存在する限り、戦闘では破壊されません。",
  ],
  不会被效果破坏: ["Cannot be destroyed by effects", "効果では破壊されない"],
  "此怪兽在怪兽区不会被任何效果破坏。": [
    "This monster cannot be destroyed by any effect while in the Monster Zone.",
    "このモンスターはモンスターゾーンに存在する限り、効果では破壊されません。",
  ],
  不会成为对方效果对象: [
    "Cannot be targeted by opposing effects",
    "相手の効果の対象にならない",
  ],
  "此怪兽不成为对方效果的对象；仍可能受到不取对象的效果影响。": [
    "Your opponent cannot target this monster with effects. Effects that do not target may still affect it.",
    "このモンスターは相手の効果の対象になりません。対象を取らない効果の影響は受ける場合があります。",
  ],
  不会成为攻击对象: ["Cannot be targeted for attacks", "攻撃対象にならない"],
  "此怪兽在怪兽区不能被选为攻击对象。": [
    "This monster cannot be selected as an attack target while in the Monster Zone.",
    "このモンスターはモンスターゾーンに存在する限り、攻撃対象に選択できません。",
  ],
  不受对方效果影响: ["Unaffected by opposing effects", "相手の効果を受けない"],
  "通过效果持有者判断，不受对方效果影响。": [
    "Unaffected by your opponent’s effects, determined by the effect’s owner.",
    "効果の所有者を判定し、相手の効果を受けなくします。",
  ],
  可以直接攻击: ["Can attack directly", "直接攻撃できる"],
  "此怪兽可以直接攻击对方玩家。": [
    "This monster can attack your opponent directly.",
    "このモンスターは相手に直接攻撃できます。",
  ],
  贯穿战斗伤害: ["Piercing battle damage", "貫通戦闘ダメージ"],
  "攻击守备表示怪兽时给予贯穿战斗伤害。": [
    "Inflict piercing battle damage when attacking a Defense Position monster.",
    "守備表示モンスターを攻撃した場合に、貫通戦闘ダメージを与えます。",
  ],
  增加攻击次数: ["Additional attacks", "攻撃回数を増やす"],
  "默认额外攻击 1 次；固定数值可修改。": [
    "One additional attack by default; edit the value to change the number.",
    "初期設定では追加で 1 回攻撃できます。数値は変更可能です。",
  ],
  自身不能攻击: ["This monster cannot attack", "自身は攻撃できない"],
  "此怪兽在怪兽区不能攻击。": [
    "This monster cannot attack while in the Monster Zone.",
    "このモンスターはモンスターゾーンに存在する限り、攻撃できません。",
  ],
  自己怪兽攻击力光环: [
    "ATK boost for your monsters",
    "自分のモンスターの攻撃力を強化",
  ],
  "自己场上所有表侧怪兽攻击力上升 500；可编辑数值及筛选回调。": [
    "All face-up monsters you control gain 500 ATK. The value and target filter callback are editable.",
    "自分フィールドの全ての表側表示モンスターの攻撃力が 500 アップします。数値と絞り込み用コールバックは編集できます。",
  ],
  自己怪兽守备力光环: [
    "DEF boost for your monsters",
    "自分のモンスターの守備力を強化",
  ],
  "自己场上有守备力的表侧怪兽守备力上升 500。": [
    "All face-up monsters you control that have DEF gain 500 DEF.",
    "自分フィールドの守備力を持つ全ての表側表示モンスターの守備力が 500 アップします。",
  ],
  持续改变等级: ["Continuous Level change", "レベルを継続的に変更"],
  "此怪兽在怪兽区的等级变成 4；不适用于阶级或连接值。": [
    "This monster’s Level becomes 4 while in the Monster Zone. Does not change Rank or Link Rating.",
    "このモンスターはモンスターゾーンでレベルが 4 になります。ランクやリンク数には適用しません。",
  ],
  持续改变属性: ["Continuous Attribute change", "属性を継続的に変更"],
  "此怪兽在怪兽区的属性变成暗属性。": [
    "This monster becomes DARK while in the Monster Zone.",
    "このモンスターはモンスターゾーンで闇属性になります。",
  ],
  持续改变种族: ["Continuous Type change", "種族を継続的に変更"],
  "此怪兽在怪兽区的种族变成龙族。": [
    "This monster becomes Dragon while in the Monster Zone.",
    "このモンスターはモンスターゾーンでドラゴン族になります。",
  ],
  视为调整: ["Treat as a Tuner", "チューナーとして扱う"],
  "此怪兽在怪兽区同时视为调整怪兽。": [
    "This monster is also treated as a Tuner while in the Monster Zone.",
    "このモンスターはモンスターゾーンに存在する限り、チューナーとしても扱います。",
  ],
  自己不能特殊召唤: ["You cannot Special Summon", "自分は特殊召喚できない"],
  "此卡在怪兽区存在期间，自己不能特殊召唤；不是整回合誓约。": [
    "You cannot Special Summon while this card is in the Monster Zone. This is not a turn-long restriction.",
    "このカードがモンスターゾーンに存在する間、自分は特殊召喚できません。ターン全体の誓約ではありません。",
  ],
  对方不能发动魔法: [
    "Your opponent cannot activate Spells",
    "相手は魔法を発動できない",
  ],
  "此卡在怪兽区存在期间，对方不能发动魔法卡或魔法效果。": [
    "Your opponent cannot activate Spell Cards or Spell effects while this card is in the Monster Zone.",
    "このカードがモンスターゾーンに存在する間、相手は魔法カードおよび魔法の効果を発動できません。",
  ],
  改变自己手牌上限: ["Change your hand size limit", "自分の手札上限を変更"],
  "此卡在怪兽区存在期间，自己的手牌上限为 7。": [
    "Your hand size limit is 7 while this card is in the Monster Zone.",
    "このカードがモンスターゾーンに存在する間、自分の手札上限は 7 枚になります。",
  ],
  增加连接箭头: ["Add a Link Arrow", "リンクマーカーを追加"],
  移除连接箭头: ["Remove a Link Arrow", "リンクマーカーを除去"],
  变更连接箭头: ["Change Link Arrows", "リンクマーカーを変更"],
  "KoishiPRO：在怪兽区增加向上的连接箭头；数值为连接标记位。": [
    "KoishiPRO: add an upward Link Arrow while in the Monster Zone. The value is a Link Marker bitmask.",
    "KoishiPRO：モンスターゾーンで上向きのリンクマーカーを追加します。数値はリンクマーカーのビットマスクです。",
  ],
  "KoishiPRO：在怪兽区移除向上的连接箭头。": [
    "KoishiPRO: remove the upward Link Arrow while in the Monster Zone.",
    "KoishiPRO：モンスターゾーンで上向きのリンクマーカーを除去します。",
  ],
  "KoishiPRO：在怪兽区将连接箭头替换为向上。": [
    "KoishiPRO: replace the Link Arrows with an upward arrow while in the Monster Zone.",
    "KoishiPRO：モンスターゾーンでリンクマーカーを上向きに置き換えます。",
  ],
  "卡片字体加载失败，请检查部署资源：{0}": [
    "Card fonts could not be loaded. Check deployed assets: {0}",
    "カード用フォントを読み込めません。配信ファイルを確認してください：{0}",
  ],
  "请上传本地中间图；卡图渲染不读取外部图片地址。": [
    "Upload local artwork; the card renderer cannot read external image URLs.",
    "画像ファイルをアップロードしてください。カード描画では外部画像URLを読み込みません。",
  ],
  "中间图无法解码，请重新上传 PNG、JPEG、WebP 或 SVG 图片。": [
    "Artwork could not be decoded. Upload a PNG, JPEG, WebP or SVG image again.",
    "画像を読み込めません。PNG、JPEG、WebP、SVG画像を再アップロードしてください。",
  ],
  "Canvas 不可用。": ["Canvas is unavailable.", "Canvasを利用できません。"],
  "完整卡图渲染需要浏览器 Canvas。": [
    "Full card rendering requires a browser canvas.",
    "カード画像の描画にはブラウザーのCanvasが必要です。",
  ],
  "卡图导出失败：{0}": [
    "Card image export failed: {0}",
    "カード画像の書き出しに失敗しました：{0}",
  ],
  未得到图像: ["No image received", "画像が取得できませんでした"],
  "卡图导出未返回图像数据。": [
    "Card export returned no image data.",
    "カード画像のデータが返されませんでした。",
  ],
  "无法识别 Day Lilies 工程版本。": [
    "Unrecognized Day Lilies project version.",
    "Day Liliesプロジェクトのバージョンを認識できません。",
  ],
  "工程中的卡片缺少卡名或卡种。": [
    "A project card is missing its name or card type.",
    "プロジェクト内のカードにカード名または種類がありません。",
  ],
  "工程数据格式无效，请检查这些字段：{0}": [
    "Invalid project data. Check these fields: {0}",
    "プロジェクトの形式が不正です。次の項目を確認してください：{0}",
  ],
  "工程含有重复的卡片内部 ID。": [
    "The project contains duplicate internal card IDs.",
    "プロジェクトに重複するカード内部IDがあります。",
  ],
  "{0} 含有重复的效果内部 ID。": [
    "{0} contains duplicate internal effect IDs.",
    "{0}に重複する効果内部IDがあります。",
  ],
  "请求失败 ({0})": ["Request failed ({0})", "リクエスト失敗（{0}）"],
  "次数限制中的卡名「{0}」与当前卡名不同，请核对。": [
    "The name “{0}” in the usage limit differs from this card's name. Please check it.",
    "回数制限のカード名「{0}」がこのカード名と異なります。確認してください。",
  ],
  "「{0}」尚未关联系列代码，或可能是指定卡名；请手动确认。": [
    "“{0}” has no archetype code, or may refer to a specific card. Please check manually.",
    "「{0}」にカテゴリコードが未設定か、特定のカード名を示しています。手動で確認してください。",
  ],
  "仍有未匹配内容；请补齐积木或使用 BYOK／自定义 Lua，不能将当前草稿视为完整实现。":
    [
      "Some text remains unmatched. Add blocks or use BYOK / custom Lua; this draft is incomplete.",
      "未対応の文章があります。ブロックを追加するかBYOK／カスタムLuaで補ってください。この下書きは未完成です。",
    ],
  "匹配结果是待复核草稿。请核对对象、区域、费用、次数与召唤条件，再确认覆盖。":
    [
      "Matches are drafts for review. Check targets, locations, costs, limits and summon conditions before confirming coverage.",
      "解析結果は要確認の下書きです。対象・場所・コスト・回数・召喚条件を確認してから確定してください。",
    ],
  "{0}：未识别种族，请在资料中选择。": [
    "{0}: Unrecognized monster type; select it in Card details.",
    "{0}：種族を認識できません。カード情報で選択してください。",
  ],
  "{0}：反转／灵魂／同盟／二重等额外类型暂不自动映射，请核对资料和专用脚本。": [
    "{0}: Flip, Spirit, Union and Gemini types are not mapped automatically. Check card data and dedicated scripts.",
    "{0}：リバース・スピリット・ユニオン・デュアル等は自動設定されません。情報と専用スクリプトを確認してください。",
  ],
  "{0}：请设置{1}召唤手续，或通过 BYOK / 自定义 Lua 实现原素材限制。": [
    "{0}: Configure the {1} summon procedure, or implement material restrictions using BYOK / custom Lua.",
    "{0}：{1}の召喚手順を設定するか、BYOK／カスタムLuaで素材制限を実装してください。",
  ],
  "{0}：图片为外部地址或不支持的格式，请重新上传中间图。": [
    "{0}: Artwork is an external URL or an unsupported format. Upload the artwork again.",
    "{0}：画像が外部URLまたは非対応形式です。画像を再アップロードしてください。",
  ],
  "{0}：当前环境无法处理裁剪；保留原中间图。": [
    "{0}: Cropping is unavailable in this environment; original artwork was retained.",
    "{0}：この環境ではトリミングできません。元の画像を保持しました。",
  ],
  "{0}：裁剪未能应用，已保留原中间图。": [
    "{0}: Cropping failed; original artwork was retained.",
    "{0}：トリミングに失敗したため元の画像を保持しました。",
  ],
  "{0}：原卡图使用无限攻守，内核无此数值，已转为 ?，请核对实现。": [
    "{0}: Infinite ATK/DEF is unsupported by the engine and was converted to ?. Check the implementation.",
    "{0}：無限の攻撃力・守備力はコア非対応のため「?」に変換しました。実装を確認してください。",
  ],
  "仅支持 yugioh 游戏的 MSE 文件。": [
    "Only MSE files for the yugioh game are supported.",
    "yugioh用のMSEファイルのみ対応しています。",
  ],
  "MSE 正文作为效果依据，注释保留为中文参考；卡号请由作者分配。": [
    "MSE main text is used for effects; comments are retained as Chinese reference. Assign your own card IDs.",
    "MSE本文を効果の基準とし、注釈を中国語の参考として保持します。カード番号は作者が割り当ててください。",
  ],
  "此 MSE 模板不是 series10，已尽量提取共通字段，请核对资料。": [
    "This MSE template is not series10. Common fields were imported; please review them.",
    "このMSEテンプレートはseries10ではありません。共通項目を抽出したため、情報を確認してください。",
  ],
  "{0}：MSE 图片格式无法识别，请重新上传。": [
    "{0}: Unrecognized MSE image format. Upload the image again.",
    "{0}：MSE画像の形式を認識できません。再アップロードしてください。",
  ],
  "{0}：MSE 中缺少图片 {1}。": [
    "{0}: Image {1} is missing from the MSE file.",
    "{0}：MSE内に画像{1}がありません。",
  ],
  "{0}：纯 set 文本不含中间图，请上传完整 .mse-set。": [
    "{0}: Plain set text has no artwork. Upload the complete .mse-set file.",
    "{0}：setテキスト単体には画像が含まれません。完全な.mse-setをアップロードしてください。",
  ],
  "MSE 中未找到卡片。": [
    "No cards found in the MSE file.",
    "MSE内にカードがありません。",
  ],
  "文件超过 150 MB，请拆分后导入。": [
    "The file exceeds 150 MB. Split it before importing.",
    "ファイルが150 MBを超えています。分割してから読み込んでください。",
  ],
  "压缩包条目过多。": [
    "The archive contains too many entries.",
    "圧縮ファイル内の項目が多すぎます。",
  ],
  "此压缩包不是 MSE-SET：缺少 set 文件。": [
    "This archive is not an MSE-SET: the set file is missing.",
    "setファイルがないためMSE-SETとして読み込めません。",
  ],
  "文件不是有效的 JSON 或 MSE-SET。": [
    "The file is not valid JSON or MSE-SET.",
    "有効なJSONまたはMSE-SETではありません。",
  ],
  "制卡器的密码/署名不作为卡号；请在导出前填写作者分配的卡号。": [
    "Card-maker passwords/signatures are not used as card IDs. Assign card IDs before export.",
    "作成ツールのパスワード・署名はカード番号にしません。書き出し前に作者のカード番号を設定してください。",
  ],
  "无法识别 JSON：支持 YGO Carder、yugioh-card 和 Day Lilies 工程。": [
    "Unrecognized JSON. Supported formats: YGO Carder, yugioh-card and Day Lilies projects.",
    "JSONを認識できません。YGO Carder、yugioh-card、Day Lilies工程に対応しています。",
  ],
  "文件中没有卡片。": [
    "The file contains no cards.",
    "ファイル内にカードがありません。",
  ],
  "卡号必须是 128–268435455 之间的整数（较小编号保留给系统提示）。": [
    "Card IDs must be integers from 128 to 268435455; smaller IDs are reserved for system messages.",
    "カード番号は128～268435455の整数です。それ未満はシステムメッセージ用です。",
  ],
  "请填写卡名。": ["Enter a card name.", "カード名を入力してください。"],
  "魔法卡不能使用反击陷阱等不适用的副类型。": [
    "Spells cannot use incompatible subtypes such as Counter Trap.",
    "魔法カードにカウンター罠などの非対応サブタイプは使えません。",
  ],
  "陷阱卡只支持通常、永续或反击副类型。": [
    "Trap subtypes must be Normal, Continuous or Counter.",
    "罠のサブタイプは通常・永続・カウンターのみです。",
  ],
  "同名卡 alias 必须是有效卡号或 0。": [
    "The alias must be a valid card ID or 0.",
    "同名カードaliasには有効なカード番号または0を指定してください。",
  ],
  "最多填写 4 个 1–65535 的系列代码。": [
    "Enter up to four archetype codes from 1 to 65535.",
    "カテゴリコードは1～65535で最大4個です。",
  ],
  "等级／阶级／连接值须为 0–13 的整数。": [
    "Level / Rank / Link Rating must be an integer from 0 to 13.",
    "レベル・ランク・リンク値は0～13の整数です。",
  ],
  "攻守须为 -2–999999 的整数（-2 表示 ?）。": [
    "ATK/DEF must be integers from -2 to 999999 (-2 represents ?).",
    "攻守は-2～999999の整数です（-2は「?」）。",
  ],
  "灵摆刻度须为 0–13 的整数。": [
    "Pendulum Scales must be integers from 0 to 13.",
    "ペンデュラムスケールは0～13の整数です。",
  ],
  "当前卡种不支持 OCG 灵摆卡模；请使用通常／效果／仪式／融合／同调／超量怪兽。":
    [
      "This card type has no OCG Pendulum frame. Use a Normal, Effect, Ritual, Fusion, Synchro or Xyz monster.",
      "この種類はOCGペンデュラム枠に非対応です。通常・効果・儀式・融合・シンクロ・エクシーズモンスターを使用してください。",
    ],
  "怪兽需要有效的种族和属性。": [
    "Monsters require a valid type and attribute.",
    "モンスターには有効な種族と属性が必要です。",
  ],
  "连接怪兽需要与 LINK 值相同数量的有效连接箭头。": [
    "A Link monster needs valid Link Arrows equal to its Link Rating.",
    "リンクモンスターにはリンク値と同じ数の有効なリンクマーカーが必要です。",
  ],
  "未上传中间图，将输出带占位图的卡片图片。": [
    "No artwork uploaded; the card image will use a placeholder.",
    "画像が未設定のため仮画像でカードを書き出します。",
  ],
  "效果仍待作者复核；请检查未匹配卡文或 BYOK 草稿。": [
    "Effects still need author review. Check unmatched text or the BYOK draft.",
    "効果は作者による確認待ちです。未対応の文章やBYOK下書きを確認してください。",
  ],
  "主效果文本已修改，现有脚本／积木需要重新核对。": [
    "Effect text has changed. Review the existing script / blocks again.",
    "効果テキストが変更されました。スクリプト／ブロックを再確認してください。",
  ],
  "自定义 Lua 不能为空。": [
    "Custom Lua cannot be empty.",
    "カスタムLuaは空にできません。",
  ],
  "自定义 Lua 的次数代码由作者维护，请检查与其他卡和积木计数代码的冲突。": [
    "The author manages custom Lua count codes. Check for conflicts with other cards and block-generated counts.",
    "カスタムLuaの回数制限コードは作者が管理します。他のカードやブロックとの競合を確認してください。",
  ],
  "自定义脚本需要 s.initial_effect(c) 或 c卡号.initial_effect(c) 入口。": [
    "Custom scripts require s.initial_effect(c) or cCARD_ID.initial_effect(c).",
    "カスタムスクリプトにはs.initial_effect(c)またはcカード番号.initial_effect(c)が必要です。",
  ],
  "脚本入口 {0} 与当前卡号 {1} 不一致。": [
    "Script entry {0} does not match card ID {1}.",
    "スクリプト入口{0}が現在のカード番号{1}と一致しません。",
  ],
  "使用 s.initial_effect 的脚本需要通过 local s,id,o=GetID() 获取脚本表。": [
    "Scripts using s.initial_effect must obtain the script table with local s,id,o=GetID().",
    "s.initial_effectを使う場合はlocal s,id,o=GetID()でスクリプトテーブルを取得してください。",
  ],
  "Lua 语法错误：{0}": ["Lua syntax error: {0}", "Lua構文エラー：{0}"],
  "CDB 最多支持 16 条效果提示。": [
    "CDB supports at most 16 effect prompts.",
    "CDBの効果メッセージは最大16個です。",
  ],
  "尚未添加效果积木；可匹配卡文、手动添加或使用自定义 Lua。": [
    "No effect blocks yet. Match card text, add blocks or use custom Lua.",
    "効果ブロックがありません。文章を解析するか、手動追加またはカスタムLuaを使用してください。",
  ],
  "灵摆文本尚未对应任何灵摆效果积木。": [
    "Pendulum text has no corresponding Pendulum effect block.",
    "ペンデュラムテキストに対応する効果ブロックがありません。",
  ],
  "额外怪兽仅生成素材手续，卡文中的其他效果尚未实现。": [
    "Only the Extra Deck material procedure is generated; other effects in the text are not implemented.",
    "エクストラモンスターの素材手順のみ生成しました。他の記載効果は未実装です。",
  ],
  "已标记无效果，但存在怪兽效果积木。": [
    "The card is marked as non-effect but has monster effect blocks.",
    "効果なしの設定ですがモンスター効果ブロックが存在します。",
  ],
  "首版衍生物只支持无效果的基本数据。": [
    "Tokens currently support only basic non-effect data.",
    "トークンは現在、効果なしの基本情報のみ対応しています。",
  ],
  "通常怪兽不能有怪兽效果；请改为效果怪兽或将积木设为灵摆效果。": [
    "Normal monsters cannot have monster effects. Use an Effect monster or mark the block as a Pendulum effect.",
    "通常モンスターにモンスター効果は設定できません。効果モンスターに変更するかP効果に設定してください。",
  ],
  "首版每卡最多支持 16 个效果积木（对应 CDB 提示）。": [
    "Each card supports up to 16 effect blocks, matching CDB prompt slots.",
    "CDBのメッセージ数に合わせ、効果ブロックは1枚につき最大16個です。",
  ],
  "请配置{0}对应的额外召唤手续，或使用自定义 Lua。": [
    "Configure the {0} Extra Deck summon procedure or use custom Lua.",
    "{0}に対応するエクストラ召喚手順を設定するか、カスタムLuaを使用してください。",
  ],
  "当前卡种与额外召唤手续不一致。": [
    "The card type does not match its Extra Deck summon procedure.",
    "カード種類とエクストラ召喚手順が一致していません。",
  ],
  "素材数范围须为 1–8，最大数不能小于最小数。": [
    "Material counts must be 1–8, with maximum at least minimum.",
    "素材数は1～8で、最大値は最小値以上にしてください。",
  ],
  "同调手续需要 1 只调整及至少 1 只非调整。": [
    "The Synchro procedure requires one Tuner and at least one non-Tuner.",
    "シンクロ手順にはチューナー1体とチューナー以外1体以上が必要です。",
  ],
  "首版超量手续使用固定素材数和 1–13 的素材等级。": [
    "The Xyz procedure uses a fixed material count and material Level 1–13.",
    "エクシーズ手順は固定素材数と1～13の素材レベルを使用します。",
  ],
  "连接素材数量不能超过 LINK 值。": [
    "The number of Link Materials cannot exceed the Link Rating.",
    "リンク素材数はリンク値を超えられません。",
  ],
  "融合手续需要 2–4 个有效的指定素材卡号。": [
    "The Fusion procedure requires 2–4 valid named material card IDs.",
    "融合手順には2～4個の有効な指定素材カード番号が必要です。",
  ],
  "仪式怪兽生成苏生限制；仪式召唤魔法／效果请另外配置自定义 Lua。": [
    "Ritual monsters receive a revival restriction; configure the Ritual Summoning spell/effect separately in custom Lua.",
    "儀式モンスターには蘇生制限を生成します。儀式召喚の魔法・効果は別途カスタムLuaで設定してください。",
  ],
  "装备／仪式魔法需要专用处理，首版请使用自定义 Lua。": [
    "Equip / Ritual Spells need dedicated handling. Use custom Lua.",
    "装備・儀式魔法には専用処理が必要です。カスタムLuaを使用してください。",
  ],
  "一张卡只能配置一个卡的发动积木；同一次发动内的复合处理请使用自定义 Lua。": [
    "Only one card activation block is allowed. Use a sequence or custom Lua for compound resolution.",
    "カードの発動ブロックは1つのみです。複合処理には連続処理またはカスタムLuaを使用してください。",
  ],
  "一张卡有多个召唤／特召入口时，请使用卡名次数；内核的单卡共享次数仅有一个槽位。":
    [
      "With multiple Summon / Special Summon triggers, use name-based limits; the core has one shared per-card count slot.",
      "召喚・特殊召喚の入口が複数ある場合は同名制限を使用してください。コアのカード単位共通回数枠は1つです。",
    ],
  "未知效果模板或发动入口。": [
    "Unknown effect template or trigger.",
    "不明な効果テンプレートまたは発動条件です。",
  ],
  "未知次数限制类型。": ["Unknown count limit type.", "不明な回数制限です。"],
  "共享次数需要填写共享组名称。": [
    "Shared limits require a group name.",
    "共通回数制限にはグループ名が必要です。",
  ],
  "玩家或来源区域无效。": [
    "Invalid player or source location.",
    "プレイヤーまたは元の場所が不正です。",
  ],
  "未知条件预设。": ["Unknown condition preset.", "不明な条件プリセットです。"],
  "未知费用类型。": ["Unknown cost type.", "不明なコスト種類です。"],
  "未知效果区域。": ["Unknown effect scope.", "不明な効果区分です。"],
  "自身发动区域无效。": [
    "Invalid activation location.",
    "自身の発動場所が不正です。",
  ],
  "处理数量须为 1–40 的整数。": [
    "Resolution amount must be an integer from 1 to 40.",
    "処理枚数は1～40の整数です。",
  ],
  "该模板首版只支持 1 张；多对象或同时特召请使用自定义 Lua。": [
    "This template supports one card. Use a sequence or custom Lua for multiple targets / simultaneous summons.",
    "このテンプレートは1枚に対応します。複数対象や同時特殊召喚には連続処理またはカスタムLuaを使用してください。",
  ],
  "请填写有效的费用数量。": [
    "Enter a valid cost amount.",
    "有効なコスト量を入力してください。",
  ],
  "自身费用的数量必须为 1。": [
    "Costs involving this card must have amount 1.",
    "自身を使うコストの数量は1です。",
  ],
  "筛选的系列代码须为 1–65535。": [
    "The archetype filter code must be 1–65535.",
    "カテゴリ絞り込みコードは1～65535です。",
  ],
  "筛选种族无效。": [
    "Invalid monster type filter.",
    "種族の絞り込みが不正です。",
  ],
  "筛选属性无效。": ["Invalid attribute filter.", "属性の絞り込みが不正です。"],
  "筛选卡种无效。": [
    "Invalid card type filter.",
    "カード種類の絞り込みが不正です。",
  ],
  "等级筛选须为 1–13，且下限不大于上限。": [
    "Level filters must be 1–13, with minimum no greater than maximum.",
    "レベルは1～13で、下限を上限以下にしてください。",
  ],
  "攻守增减值须为有效整数。": [
    "ATK/DEF changes must be valid integers.",
    "攻守の増減値には有効な整数を指定してください。",
  ],
  "攻守变化至少一项不能为 0。": [
    "At least one ATK/DEF change must be nonzero.",
    "攻守の変化は少なくとも一方を0以外にしてください。",
  ],
  "灵摆效果需要将卡片设为灵摆怪兽。": [
    "Pendulum effects require a Pendulum monster.",
    "ペンデュラム効果にはペンデュラムモンスター設定が必要です。",
  ],
  "灵摆效果的自身发动区域必须为场上灵摆区。": [
    "Pendulum effects must activate in the Pendulum Zone.",
    "ペンデュラム効果の発動場所はPゾーンです。",
  ],
  "首版灵摆效果支持卡的发动、起动或快速入口。": [
    "Pendulum effects support card activation, Ignition or Quick triggers.",
    "ペンデュラム効果はカードの発動・起動・クイックに対応します。",
  ],
  "卡的发动入口仅用于魔法、陷阱或灵摆区效果。": [
    "Card activation is only for Spells, Traps or Pendulum Zone effects.",
    "カードの発動は魔法・罠・Pゾーン効果のみ使用できます。",
  ],
  "墓地／除外／手牌中的单独效果请使用起动或快速入口，不能当作魔陷卡的发动。": [
    "Separate effects in the GY, banishment or hand must use Ignition / Quick triggers, not Spell/Trap card activation.",
    "墓地・除外・手札の単独効果は魔法罠カードの発動ではなく、起動・クイックを選択してください。",
  ],
  "陷阱效果不能作为怪兽式起动效果；请改用快速入口，特殊阶段条件使用自定义 Lua。":
    [
      "Trap effects cannot use monster Ignition triggers. Use Quick effects; custom phase conditions need Lua.",
      "罠効果にモンスターの起動入口は使えません。クイックを使い、特殊なフェイズ条件はLuaで指定してください。",
    ],
  "登场入口用于该怪兽自身的召唤事件。": [
    "Summon triggers refer to this monster's own summon.",
    "登場時の入口はこのモンスター自身の召喚イベントに対応します。",
  ],
  "普通魔陷的场上非发动效果需要自定义 Lua；或改为永续／场地卡。": [
    "Non-activation field effects of Normal Spells/Traps need custom Lua, or use a Continuous / Field card.",
    "通常魔法罠の場での非発動効果にはカスタムLuaが必要です。または永続・フィールドカードに変更してください。",
  ],
  "反击陷阱需要连锁条件，首版请使用自定义 Lua。": [
    "Counter Traps need a chain condition; use custom Lua.",
    "カウンター罠にはチェーン条件が必要です。カスタムLuaを使用してください。",
  ],
  "简单手牌特召手续仅用于主卡组非仪式怪兽。": [
    "The simple hand summon procedure is only for non-Ritual Main Deck monsters.",
    "簡易手札特殊召喚手順はメインデッキの儀式以外のモンスター用です。",
  ],
  "简单手牌特召手续不支持费用；复杂手续请使用自定义 Lua。": [
    "The simple hand summon procedure does not support costs. Use custom Lua for complex procedures.",
    "簡易手札特殊召喚手順はコストに非対応です。複雑な手順にはカスタムLuaを使用してください。",
  ],
  "手牌特召手续需要选择明确的场上条件。": [
    "The hand summon procedure requires a specific field condition.",
    "手札特殊召喚手順には明確な場の条件が必要です。",
  ],
  "检索／选送墓地模板只支持自己的卡组。": [
    "Search / selected milling templates only support your own Deck.",
    "サーチ・選択墓地送りテンプレートは自分のデッキのみ対応します。",
  ],
  "回收模板的来源须为墓地。": [
    "The recovery template must use the GY as its source.",
    "回収テンプレートの元の場所は墓地です。",
  ],
  "苏生模板的来源须为墓地。": [
    "The revival template must use the GY as its source.",
    "蘇生テンプレートの元の場所は墓地です。",
  ],
  "该模板的对象必须来自场上。": [
    "This template must target cards on the field.",
    "このテンプレートの対象はフィールド上のカードです。",
  ],
  "除外模板支持场上或墓地的表侧除外。": [
    "The banish template supports face-up banishment from the field or GY.",
    "除外テンプレートはフィールド・墓地からの表側除外に対応します。",
  ],
  "处理时选择特召只支持自己的手牌／墓地。": [
    "Summon selection at resolution supports only your hand / GY.",
    "処理時選択の特殊召喚は自分の手札・墓地のみ対応します。",
  ],
  "该模板必须选择怪兽。": [
    "This template must select monsters.",
    "このテンプレートはモンスターを選択してください。",
  ],
  "登场的两个事件通过单卡共享计数关联；离场再登场将重置此限制。": [
    "Both summon events share the card's count; leaving and returning resets this limit.",
    "2つの登場イベントはカード単位の回数を共有します。フィールドを離れて戻るとリセットされます。",
  ],
  "卡号 {0} 重复；图片和脚本文件会互相覆盖。": [
    "Duplicate card ID {0}; image and script files would overwrite one another.",
    "カード番号{0}が重複し、画像やスクリプトが上書きされます。",
  ],
  "卡包中还没有卡片。": [
    "The card pack has no cards yet.",
    "カードパックにまだカードがありません。",
  ],
  "系列需要名称及 1–65535 的代码。": [
    "Archetypes need a name and a code from 1 to 65535.",
    "カテゴリには名前と1～65535のコードが必要です。",
  ],
  "系列「{0}」对应多个代码，无法可靠匹配。": [
    "Archetype “{0}” has multiple codes and cannot be matched reliably.",
    "カテゴリ「{0}」に複数のコードがあり、正確に解析できません。",
  ],
  "生成器语法检查失败：{0}": [
    "Generated Lua syntax check failed: {0}",
    "生成Luaの構文チェックに失敗しました：{0}",
  ],
  "卡包含有待核对项目，请先处理，或明确选择导出草稿包。": [
    "The pack has items awaiting review. Resolve them or explicitly export a draft.",
    "カードパックに要確認事項があります。解消するか、下書きとして書き出してください。",
  ],
};
