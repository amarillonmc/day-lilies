# 优先支持的常用效果模板

首批提供 12 类常用配方，覆盖系列检索、登场检索、回收、抽卡、送墓、对象除去、特召与临时数值变化。它们共享[效果积木体系](effect-block-system.md)中的筛选、时机、选择、次数和动作模块。

P0 表示首批建设，P1 表示后续常用扩展，P2 表示先保留 BYOK 或自定义 Lua 出口的专项能力。优先级按复用价值、组合复杂度与可检查性选择，不是全卡池频率统计。当前 P0 已实现为 11 种动作加触发入口（T02 复用 T01），但参数范围并不覆盖本表所有规划；当前限制与验证情况见[首版实现与验证](implementation-status.md)。P1/P2 仍属后续设计。

## P0 首批配方

| 编号与配方 | 用户主要填写的参数 | 已核对的脚本依据 | 第一版边界 |
| --- | --- | --- | --- |
| T01 系列或条件检索 | 系列、卡种、等级/种族等筛选、排除项、数量 | [E－エマージェンシーコール][emergency]、[増援][rota] | 从自己卡组处理时选择并加入手牌、公开；不取对象。不能将翻查卡组顶当作此模板 |
| T02 登场检索 | 召唤/特召/反转事件，任意或强制，检索条件和次数 | [召喚師アレイスター的检索][aleister-search]；[宵星の騎士ギルス的多事件包装][girsu-events] | 复用 T01 动作，单独配置触发器。Aleister 是召唤/反转，Girsu 的引用仅支撑召唤/特召包装；不默认所有登场都触发或都有 DELAY |
| T03 墓地对象回收 | 哪方墓地、系列/种族/卡种等筛选、固定数量 | [戦士の生還][return] | 发动时取对象，处理时检查关联；先支持单目标。墓地影响与回收可行性按目标模板处理，不套用卡组检索的公开规则 |
| T04 抽 N 张 | 玩家、张数、条件、可选费用 | [強欲な壺][greed] | 先支持固定张数；使用抽卡检查和抽卡类别。检索到手牌不等于抽卡 |
| T05 从卡组选送墓地 | 卡种/系列等筛选、数量 | [おろかな埋葬][burial] | 处理时选卡，以效果送墓；卡组顶送 N 张和作为代价送墓使用其他配方 |
| T06 取对象破坏 | 区域、控制者、卡种、数量或至多数量 | [サイクロン][mst]；[ツインツイスター的多对象处理][twisters-target] | 首批先单对象，再扩展有限多对象。保留对象关联与数量语义；不能把破坏当送墓，也不为所有候选机械添加可破坏筛选 |
| T07 取对象回手 | 区域、控制者、筛选、数量 | [強制脱出装置][compulsory] | 先支持场上单目标、按模板回持有者手牌；回卡组或额外卡组另有目的地规则 |
| T08 取对象除外 | 区域、控制者、筛选、数量、表示形式 | [D.D.クロウ][crow] | 先支持表侧除外单对象。参考卡的手牌快速入口和丢弃自身费用可以分别配置，不绑定为所有除外效果的固有行为 |
| T09 墓地对象苏生 | 墓地所属、召唤方、筛选、表示形式 | [死者蘇生][reborn] | 检查怪兽区和可特召性，处理时检查关联及墓地限制；不默认无视召唤条件或苏生限制 |
| T10 手牌或墓地处理时选择特召 | 来源区域、筛选、排除同名、召唤方、表示形式 | [レッドアイズ・ダークネスメタルドラゴン的起动效果][redmd] | 处理时选卡，与 T09 的对象苏生区分；处理时复查空位及可特召性，墓地候选受相应限制。卡组特召不自动作为来源扩展 |
| T11 简单手牌特殊召唤手续 | 自己/对方场上状态、空位等固定条件预设 | [サイバー・ドラゴン][cyber]、[ジャンク・フォアード][forward] | 不发动连锁的手续；不能生成成自由连锁效果。先支持明确条件预设，复杂解放/除外手续另设模板 |
| T12 指定对象临时攻守增减 | 对象筛选、固定增减值、至回合结束等已支持期限 | [召喚師アレイスター的数值变化][aleister-stats] | 先支持固定增减；变成某数值、原本数值、加倍、动态数量计算分开扩展。伤害步骤的可发动性属于入口配置 |

T02 是方便作者选择的组合配方，不是第二套检索动作。T03、T07、T01 虽都可能调用 SendtoHand，仍须保留来源、选择阶段、公开信息和连锁类别的差异。T09 与 T10 也不能合并成一个没有选择时点的特召模板。

## P0 共用模块

这些模块与配方一起开发，不另列为用户眼中的“第十三种动作”。默认值来自选定配方；作者可调整已开放的参数。

| 模块 | 首批内容 | 依据与约束 |
| --- | --- | --- |
| 发动入口 | 普通魔陷发动、起动、常见登场事件、明确范围的快速效果 | [增援][rota]、[Aleister][aleister-search]、[D.D.クロウ][crow]；事件、任意/强制、DELAY、伤害步骤条件分别保存 |
| 筛选与数量 | 作者 setcode、卡种/种族/属性/等级等，排除自身或指定卡号，固定数及有限至多数 | 由 T01 等模板配套实现；筛选不能仅由名称字符串代替系列代码；至多 N 也不一定允许选择 0 |
| 丢弃与手牌送墓费用 | 手牌选择费用、该卡自身费用 | [双龙卷费用][twisters-cost]、[Cynet Mining 费用][mining-cost]、[Aleister 自身送墓][aleister-cost]；REASON_DISCARD 与普通 REASON_COST 不能混同 |
| 自身墓地除外费用 | 该卡在墓地时支付自身除外 | [サイバー・ドラゴン・コア][core-cost]；支付发生在发动时，不在处理阶段 |
| 次数与共享 | 本卡一次、卡名某效果一次、各编号分别、多个效果共享、卡的发动次数 | [本卡次数][scrap-count]、[多个事件共享编号次数][girsu-events]、[多效果共享次数][core-count]、[发动次数][desires-count]；内部 count code 统一分配，不照抄相邻卡号偏移 |
| 处理结果与连接 | 前一步对象或处理结果引用、成功门槛、先后关系、可选后续 | [爆龙剑士的两次选择][ignister]、[Girsu 的送墓后续][girsu-operation]；首批仅开放模板已经明确支持的连接关系 |
| 临时状态与后续限制 | 固定期限的数值变化；明确“处理后余下回合”的特召限制预设 | [临时数值][aleister-stats]、[Fusion Destiny 的后续限制][destiny-lock]；参考卡限制的生效点与是否依赖主处理成功不能随意移动 |
| 描述与类别 | 效果和选项文字、选择提示、CATEGORY、OperationInfo | 自动分配并同步 CDB 提示；作者填写规则文案，不必配置底层消息 |

支付 LP、解放、取除超量素材等费用可以在对应模板需要时加入。首批不开放任意费用动作的自由嵌套。

整回合约束需要回看此前行为，优先在 P1 加入有限预设。界面从 P0 起就区分“整回合”和“后续”，避免以后把已有工程错误迁移为另一种规则。

## P1 常用扩展

| 配方或模块 | 已核对依据 | 需要补充的表达能力 |
| --- | --- | --- |
| 免疫 抗性与持续增益 | [禁じられた聖槍][lance]、[ハーピィの狩場的光环][hunting-aura] | 影响来源、排除关系、持续光环与临时赋予、动态值及有效期 |
| 场上效果无效 | [無限泡影的对象无效][impermanence-disable] | 相关连锁与持续无效状态的组合；同纵列追加效果不包含在基础模板中 |
| 连锁效果无效或发动无效 | [灰流うらら][ash]、[真六武衆－シエン][shien-negate] | 区分 NegateEffect 与 NegateActivation，类别检测、无效成功后是否破坏 |
| 全体处理或场上非对象选择 | [聖なるバリア][mirror]、[E・HERO エアーマン][stratos] | 处理时构建候选组、数量变化、选择提示；不能复用发动时对象组 |
| 多选项与分支 | [E・HERO エアーマン][stratos] | 选项在何时决定、类别随分支变化、各分支所需的候选和数量 |
| 控制权取得 | [精神操作][mind] | 控制改变合法性、区域、期限及不能攻击/解放等附加限制 |
| 卡组顶翻查和剩余卡处理 | [強欲で謙虚な壺][duality-excavate] | 展示范围、可加入手牌判断、顶端顺序、选取后剩余卡的去向 |
| 装备与装备值 | [巨大化][megapower] | 装备关联、合法对象、EQUIP_LIMIT、随 LP 等状态变化的值 |
| LP 伤害与回复 | [成金ゴブリン][upstart]、[E・HERO シャイニング・フレア・ウィングマン][flame-damage] | 玩家、数值来源、何时记录或重算、战斗对象引用 |
| 标准额外召唤素材手续 | [スクラップ・ドラゴン][scrap-procedure]、[暗遷士 カンゴルゴーム][cairn-procedure]、[E・HERO シャイニング・フレア・ウィングマン][flame-procedure]及 procedure.lua | 标准素材筛选与数量；融合素材定义与发动融合魔法分开；连接等从相应辅助函数另建配方 |
| 整回合活动限制 | [強欲で謙虚な壺的费用][duality-lock]、[烙印融合的限制][branded-lock] | 先前活动统计、自定义活动计数、誓约与限制范围，不只是结算末尾加限制 |

## P2 专项能力

| 类别 | 参考依据或边界 | 初期处理 |
| --- | --- | --- |
| 延迟多个阶段及跨时点追踪 | [封印の黄金櫃][sarcophagus]使用字段标识、阶段计数和对象跟踪 | 专门模板或 BYOK，不当作简单延时参数 |
| 效果替代与改变连锁对象 | [シエン的破坏替代][shien-replace]、[カンゴルゴーム的目标改变][cairn-target] | 明确替代时点、对象与连锁关联后再加入 |
| 复杂融合发动效果 | [烙印融合][branded-fusion]、[Fusion Destiny][destiny-fusion] | 材料候选、附加合法性、Chain Material 和正规手续分别处理；不与基础素材定义混淆 |
| 多玩家同时特召及衍生物 | [Girsu 的双方衍生物处理][girsu-token] | 双方区域、召唤可行性、分步与完成时点需配套 |
| 发动次数自肃和全局监视 | [トラップトリック][traptrick] | 连锁发动/发动无效监视与剩余许可，需要专门状态逻辑 |
| 同纵列 复制 自定义事件及特殊规则 | [無限泡影的纵列部分][impermanence-column]等专项脚本 | 保留自定义 Lua；逐项形成有明确边界的配方 |
| Koishi 内核扩展 | 连接箭头修改、额外召唤区域、素材费用修改等，见[积木体系](effect-block-system.md) | 标记目标能力，专家模式先行，不混入两目标默认共用模板 |

实际用户卡包若集中使用某一类能力，可以提前建设对应专项模板；P2 表示当前不适合做通用首批积木，不代表不可实现。

## 每个模板应交付什么

一个可用模板需要同时具备：

1. 作者能理解的名称、适用卡种、参数及明确不覆盖的变体。
2. 对应草稿字段和允许的连接方式；包括引用、数量、选择时点、次数和有效期。
3. Lua 生成规则、类别、提示文字及 CDB 提示索引。
4. 中文/英文/日文逐步添加的匹配句式；模板本身可以先通过手动入口使用，不必等三语匹配同时完成。
5. 参考卡与实际 API 依据；标明引用的是整段行为还是某个局部结构。
6. 代表性维护检查，以及面向作者的实机测试建议。

旧脚本可能使用 c卡号函数风格。生成器遵循 workflow 当前约定，采用 local s,id,o=GetID() 的组织方式，复用的是规则行为与经过核对的调用方式。

## 建设顺序与代表性检查

第一步做完整的 T01：手动填写系列检索，生成对应 Lua 与 CDB 提示，打包后实机检查。随后让英文文本匹配和 BYOK 填入同一配置。这一步确认三个入口的共同基础，无须先建立完整三语解析器。

第二步复用该基础完成抽卡、送墓、回收和对象除去，并加入次数、常见费用、未匹配片段提示。第三步加入登场包装、苏生、处理时特召、简单召唤手续和临时数值。P1 的多分支、无效和复杂限制在此后逐项扩展。

| 模板族 | 维护时优先检查的场景 |
| --- | --- |
| 检索 回收 抽卡 | 候选包含与排除、没有候选、数量不足、正确玩家和来源、该有的展示及提示 |
| 对象除去 | 候选范围、对象离开或改变状态、处理时关联检查、多对象仅部分仍有效 |
| 特召 | 没有空位、目标无法特召、对象失去关联、墓地限制、召唤条件/苏生限制 |
| 次数与费用 | 费用无法支付、同名第二张卡、多个编号共用或分别计数、发动被无效的区别 |
| 自肃与组合 | 此前行为是否影响发动、主处理失败后限制是否适用、后续步骤是否正确引用实际结果 |
| 临时状态与手续 | 到期复原、卡离场后的状态、是否错误进入连锁、素材与召唤条件 |

这些是模板维护者的检查重点，不是要求每位作者为每张卡写完整测试。作者的最终本地验收仍是产品流程的一部分；工具如实区分“已生成”“可加载”和“已实机验收”。

[emergency]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c213326.lua#L5-L26
[rota]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c32807846.lua#L5-L26
[aleister-search]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c86120751.lua#L18-L31
[girsu-events]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c69811710.lua#L4-L26
[return]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c95281259.lua#L13-L28
[greed]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c55144522.lua#L5-L22
[burial]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c81439173.lua#L12-L24
[mst]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c5318639.lua#L5-L29
[twisters-target]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c43898403.lua#L22-L32
[compulsory]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c94192409.lua#L14-L26
[crow]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c24508238.lua#L5-L34
[reborn]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c83764718.lua#L13-L29
[redmd]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c88264978.lua#L47-L62
[cyber]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c70095154.lua#L4-L17
[forward]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c56410040.lua#L4-L17
[aleister-stats]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c86120751.lua#L39-L59
[aleister-cost]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c86120751.lua#L32-L38
[twisters-cost]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c43898403.lua#L15-L21
[mining-cost]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c57160136.lua#L14-L18
[core-cost]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c23893227.lua#L18-L23
[core-count]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c23893227.lua#L4-L23
[scrap-count]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c76774528.lua#L9-L15
[desires-count]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c35261759.lua#L9
[ignister]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c18239909.lua#L32-L52
[girsu-operation]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c69811710.lua#L38-L55
[destiny-lock]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c52947044.lua#L98-L118
[lance]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c27243130.lua#L21-L43
[hunting-aura]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c75782277.lua#L20-L31
[impermanence-disable]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c10045474.lua#L21-L42
[ash]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c14558127.lua#L16-L36
[shien-negate]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c29981921.lua#L29-L43
[mirror]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c44095762.lua#L19-L29
[stratos]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c40044918.lua#L25-L74
[mind]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c37520316.lua#L13-L42
[duality-excavate]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c98645731.lua#L26-L51
[megapower]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c22046459.lua#L4-L50
[upstart]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c70368879.lua#L19-L25
[flame-damage]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c25366484.lua#L34-L54
[scrap-procedure]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c76774528.lua#L3-L8
[cairn-procedure]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c21501505.lua#L3-L7
[flame-procedure]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c25366484.lua#L3-L7
[duality-lock]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c98645731.lua#L15-L25
[branded-lock]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c44362883.lua#L14-L31
[sarcophagus]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c75500286.lua#L16-L51
[shien-replace]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c29981921.lua#L45-L64
[cairn-target]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c21501505.lua#L19-L55
[branded-fusion]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c44362883.lua#L39-L105
[destiny-fusion]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c52947044.lua#L20-L97
[girsu-token]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c69811710.lua#L59-L80
[traptrick]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c80101899.lua#L43-L79
[impermanence-column]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c10045474.lua#L43-L82
