# 效果积木体系

day-lilies 以常用卡片效果模板为入口，以可组合的效果草稿表达规则，再映射到 workflow 所用内核和脚本辅助函数。下列体系是从现有代码提炼的应用设计；上游没有一套可以直接导入的可视化积木库。

源码来源与参考提交见[文档索引](README.md)。首批配方见[常用效果模板](common-effect-templates.md)，输入与编辑流程见[三种编写方式](authoring-flows.md)。

## 内核能力与目标范围

当前 workflow 使用 nanahira 的 YGOPro 客户端、purerosefallen 的 ocgcore 和 Smile-DK 的脚本库。core 的 effect.h 明确标注 KoishiPro effects，相关常量由 interpreter.cpp 注入 Lua，并有实际处理代码。因此可以确认参考内核包含 KoishiPro 扩展，但不据此把整个客户端等同于某个正式发布包。[扩展定义][koishi-def]、[Lua 暴露][koishi-lua]

应用支持官方 YGOPro 与 KoishiPro 两种目标。模板记录其所需常量、辅助函数和行为；选择官方目标时不自动使用 Koishi 扩展。未经目标核验的能力显示待确认，不仅凭函数名推断兼容。这里没有逐项比较官方上游，因此“本地标记的 Koishi 扩展”不等于“任何官方版本永远没有的能力”。

## 用户层分成三类

| 类别 | 用户理解的内容 | 底层形式及边界 |
| --- | --- | --- |
| 发动效果 | 魔陷发动、起动、诱发、快速、翻转效果 | 设置效果类型、区域、事件，再安排条件、代价、发动时选择和处理 |
| 持续修正与限制 | 攻守光环、抗性、禁止某些行为、处理后获得的临时状态 | 单体或场范围效果、筛选与值函数、有效期；其中也可能用到辅助事件监视 |
| 召唤与素材手续 | 不发动的特殊召唤、同调/超量/连接素材、融合素材、仪式或灵摆相关手续 | 专门的 procedure 与素材逻辑，不等同于一个普通特召动作 |

上述分类是界面组织方式，不与每个 EFFECT_TYPE 常量一一对应。持续效果的 target 可以表示影响范围；发动效果的 target 还承担可发动性和发动时决策，不总是取对象。[效果回调与设置][effect-api]、[类型定义][types]、[召唤手续][procedures]

例如“登场检索”是登场触发器与检索动作的预设组合，“系列专用增援”是魔法发动与系列检索的预设组合。模板便于使用，底层仍共享筛选、选择、动作与限制。

## 共用积木目录

| 层次 | 首批可表达的内容 | 源码映射与实现约束 |
| --- | --- | --- |
| 外壳与事件 | 魔陷发动、起动、自由连锁、召唤/特召/反转、送墓等事件 | SetType、SetRange、SetCode；事件与附加条件分开。延迟触发标志按具体效果配置，不为所有诱发效果统一开启 |
| 附加条件 | 自己无怪兽、对方存在怪兽、指定区域有系列卡、事件卡符合条件 | SetCondition、区域查询、事件组与 Card 判断；当前状态和“此前发生过”不能使用同一种判断 |
| 卡片筛选 | 卡号、系列、种类、种族、属性、等级、攻守、区域、控制者、表侧、排除项 | Card.IsSetCard、IsType、IsRace、IsAttribute 等；支持明确的且/或/非组合。系列不能仅靠卡名包含某字符串判断 |
| 代价 | 支付 LP、丢弃、手牌送墓、自身除外、解放、取除素材 | SetCost；配套能否支付检查与实际支付。费用所用的可行性判断不等同于普通效果处理 |
| 发动时选择 | 取对象、选分支、宣言、需要在发动时确定的玩家或数值 | SetTarget、SelectTarget、SelectOption；取对象另有 CARD_TARGET 标志、候选和 chkc 处理 |
| 处理时选择 | 根据处理时局面选卡、玩家、数量 | SelectMatchingCard 等；不自动设置取对象标志。场上非对象选择按参考脚本提供选择提示 |
| 处理动作 | 加入手牌、回卡组、送墓、破坏、除外、抽卡、特召、数值变化 | 采用对应动作，而不是仅按最终区域合并；破坏、丢弃和送墓各有规则含义 |
| 处理关系 | 顺序、成功门槛、同时处理、可选后续、分支 | 保留前序结果与时间关系；不能把几个 operation 片段简单拼接 |
| 状态修正 | 临时攻守、持续光环、抗性、召唤/攻击限制 | RegisterEffect、SetValue、影响范围与有效期；临时赋予与持续施加分开 |
| 次数 | 本卡次数、同名卡次数、不同编号分别或共享、使用或发动次数 | SetCountLimit 与对应计数语义；生成器管理内部共享组及代码，作者不直接填写 flag |
| 有效期 | 至回合结束、离场等状态变化后失效、指定阶段后处理 | SetReset、RESET 常量或事件监视；“回合结束失效”和“回合结束执行动作”不同 |
| 引擎提示 | 效果描述、选项、选择提示、类别与连锁信息 | SetDescription、SetCategory、SetOperationInfo、Duel.Hint 等；由模板生成，与 CDB 提示字段同步 |
| 召唤手续 | 简单手牌特召条件及后续标准素材公式 | EFFECT_SPSUMMON_PROC、procedure.lua 的辅助函数；区分手续和进入连锁的特召效果 |

依据入口：[Effect 设置][effect-api]、[Card 判断][card-api]、[Duel 操作][duel-api]、[常量][constants]。表格是模板建设范围，不代表全部组合已被实现或验证。

## 动作族与模板的关系

| 动作族 | 用户配方举例 | 首版安排 |
| --- | --- | --- |
| 手牌移动 | 系列检索、墓地回收、场上回手 | P0；共用底层移动动作，保留来源、选择时点、公开信息与类别差异 |
| 卡组移动与公开 | 回主卡组、洗回、放顶/底、翻查取一 | P1；明确目的地、排序和信息公开，不把翻查当全卡组检索 |
| 墓地移动 | 从卡组选送、手牌送墓、丢弃 | P0 先支持选送；卡组顶送墓等另设配方，不通过换参数偷换语义 |
| 破坏与除外 | 对象破坏、对象除外、表侧/里侧除外 | P0 先固定常见形式；非对象、全体、替代处理分别扩展 |
| 抽卡 | 指定玩家抽 N 张 | P0；区别于将指定卡加入手牌 |
| 特召 | 墓地对象苏生、手牌/墓地处理时选卡特召 | P0；位置、可召唤性、来源、表示形式和苏生限制都属于配方 |
| 数值与状态 | 临时攻守、持续增益、抗性、效果无效 | P0 固定临时攻守；动态值、光环、免疫与无效 P1 |
| 连锁处理 | 效果无效、发动无效、无效后破坏 | P1；这些能力不能合成一个不区分语义的“无效”开关 |
| 玩家与场面 | LP 伤害/回复、控制权、装备、表示形式、盖放 | P1 分别建设；每类配套自身的合法性、关联和附加限制 |
| 素材与计数资源 | 取除超量素材、附加素材、指示物 | 简单费用可作为共用模块；复杂资源替代与连动 P2 |
| 跨时点关联 | 延迟返回、替代破坏、复制效果、改变连锁对象 | P2，优先保留 BYOK 和自定义 Lua 出口 |

## 效果草稿的最小信息

这是一份产品字段说明，不是实现代码或最终数据库 schema。常用模板隐藏固定字段，只向作者展示需要决定的参数。

| 信息 | 内容 |
| --- | --- |
| 卡片上下文 | 作者卡号、卡种、系列名与 setcode、指定卡名与卡号、主文本语言、导出显示语言、目标内核 |
| 文本对应 | 效果编号、对应原句、当前主文本修订、来自匹配/手动/BYOK、已覆盖与剩余片段 |
| 效果形式 | 发动/持续/手续类别，模板，发动区域、事件、任意或强制 |
| 条件与费用 | 附加条件、费用项目、支付数量与可支付性 |
| 选择 | 玩家、区域、筛选、数量，发动时取对象或处理时选择，必要的分支决定 |
| 处理与关系 | 动作序列、引用的前一步结果、成功判断、先后/同时、可选步骤 |
| 约束 | 次数作用域、使用或发动计数、效果共享组、行为限制、限制起止与有效期 |
| 生成依赖 | 提示文字、选项、卡号/系列引用、需要的目标能力；模板提供类别与辅助实现 |
| 编辑状态 | 已组装/待补/待复核/自定义 Lua，当前代码是否由草稿生成，检查与实机验收状态 |

不需要脚本的非灵摆通常怪兽可以只走数据和图片导出，不强行建立效果草稿。素材公式、灵摆效果与怪兽效果要分别保存，不能因为它们都画在同一张卡上就混成一段普通效果。

## 组合时必须保留的规则

### 选择发生在何时

“增援”的候选存在性在发动时检查，卡组内实际选卡留在处理阶段。“死者苏生”则在发动时取对象，处理时再次检查该对象与效果的关系。二者不能共用一个未标明时点的“选择卡片”节点。[增援][rota]、[死者苏生][reborn]

“爆龙剑士”的效果先取对象，再在破坏成功后选择另一张卡回卡组，后一张不取对象。草稿必须保留两个选择及成功门槛。[复合处理例][ignister]

### 选择组不等于实际处理结果

每个有后续引用的动作应能提供需要的结果，例如选中的卡、实际处理的卡、处理数量、实际到达区域与玩家。“以此法送去墓地的卡”不能只引用最初选中组，也不能只看返回数量就断言最终区域。Girsu 的后续处理同时检查送墓结果及卡的当前区域，适合作为这一约束的例证。[Girsu][girsu]

临时引用只在当前处理流程内使用；跨回合跟踪还需要标记、事件监视与有效期，应采用专门模板。

### 连接词包含时间和依赖

先支持明确的顺序、前步成功条件、同时且相互依赖关系，以及可选后续。英文 then 与 and if you do 都可能要求先前动作成功，但时间关系不同；also 与 and 也不能自动当作相同处理。匹配器识别连接词后，仍由模板解释具体动作和成功条件，不能给所有连接处机械插入 BreakEffect。[官方连接词说明][conjunctions]

“成金哥布林”的脚本把抽卡成功、BreakEffect 和回复连在一起；它只支撑该卡的处理模式，不能代表所有复合效果都应这样生成。[成金哥布林][upstart]

### 代价和效果移动分别建模

“从手牌送去墓地”与“丢弃”即使都发生在 cost，也可能使用不同 reason。双龙卷的丢弃费用带 REASON_DISCARD；Cynet Mining 的手牌送墓费用仅使用 REASON_COST，虽然调用的函数名也包含 DiscardHand。模板必须依据卡文与实际脚本，不能从 API 名称倒推规则。[双龙卷][twisters]、[Cynet Mining][mining]

### 次数限制明确作用域

至少区分本卡效果每回合一次、同名卡某效果每回合一次、不同编号各一次、多个效果共享一次，以及卡的发动次数。召唤和特召两个事件对应同一编号效果时，clone 应共享该编号的次数。

“使用”与“发动”在发动被无效时的计数处理不同；对应语义由模板和内核实现。常量中的 EFFECT_COUNT_CODE_OATH 明确记录发动次数限制。[次数常量][count]

内部次数代码由生成器按效果共享组分配，检查与当前工程其他卡片和组的冲突。不要照搬历史脚本中 id+1 等偏移来处理作者连续分配的卡号，也不能假定 id+100 在任何工程中都必然安全。作者继续管理自己的卡号，不必手填内部计数编码。

### 自肃需要起点和历史

至少区分三个预设：整回合约束并检查此前行为、发动后余下回合约束、主处理成功后才生效的约束。它们是否属于费用/誓约、是否依赖处理成功、是否需要活动计数，各自采用明确范例。

强欲而谦虚之壶检查此前特殊召唤并注册誓约限制；烙印融合用自定义活动计数限制此前的额外召唤；Fusion Destiny 的限制在 operation 末注册，并不置于融合成功分支内。这些不能压成同一个“直到回合结束”勾选框。[强欲而谦虚之壶][duality]、[烙印融合][branded]、[Fusion Destiny][destiny]

### 召唤手续与特召动作分别生成

电子龙式手牌特殊召唤是 EFFECT_SPSUMMON_PROC，不是自由连锁效果。标准额外怪兽的素材手续从 procedure.lua 提炼；融合怪兽的素材定义与融合魔法如何提供素材和完成召唤也应分开。不要只注册一个普通 SpecialSummon 就宣称实现了完整召唤方式。[电子龙][cyber]、[召唤辅助库][procedures]

## 本地内核明确标记的 Koishi 扩展

这些能力放在 P2 或专家模式，需对应目标内核。常量由 C++ 注入 Lua，因此只扫描 constant.lua 会漏掉它们。后续模板需要同时确认定义、Lua 暴露和实际处理，不能只根据常量名称生成效果。

| 能力 | 已查明的源码依据 | 设计处理 |
| --- | --- | --- |
| 增加 删除或变更连接箭头 | effect.h 的三个 LINK_MARKER_KOISHI 常量，interpreter.cpp 暴露，card.cpp 计算箭头 | 独立扩展积木，记录标记位、作用对象及有效期；不与 CDB 静态箭头混淆 |
| 放宽额外卡组特殊召唤的可用区域 | EFFECT_EXTRA_TOMAIN_KOISHI，field.cpp 的额外召唤区域判断 | 属于召唤区域规则；不是把额外卡组卡片回主卡组 |
| 调整取除超量素材的最小数量 | EFFECT_OVERLAY_REMOVE_COST_CHANGE_KOISHI，field.cpp 的可支付性与 operations.cpp 的实际处理 | 修改最小取除数量，保留原最大数量；替代支付另按独立模板处理，不能只改画面上的素材数量 |
| 改变召唤类型或召唤来源区域信息 | ADD/REMOVE/CHANGE_SUMMON_TYPE_KOISHI、CHANGE_SUMMON_LOCATION_KOISHI，card.cpp | 影响召唤信息，不等于直接移动卡片到该区域 |
| 连接魔法相关箭头与连接区域 | EFFECT_LINK_SPELL_KOISHI，card.cpp 中箭头和连接区域处理 | 需完整验证相关卡片交互后再做用户配方 |

定位：[定义][koishi-def]、[注入 Lua][koishi-lua]、[连接箭头处理][koishi-markers]、[连接区域处理][koishi-linked-zones]、[额外召唤区域][koishi-zones]、[素材费用检查][koishi-overlay]、[素材费用处理][koishi-overlay-op]、[召唤信息][koishi-summon]。

EFFECT_CANNOT_LOSE_KOISHI 也有定义与 Lua 暴露，但本次只定位到部分失败检查，不把它归纳成已确认覆盖全部胜负情形的“不败积木”。

## 输出及持续维护

模板同时生成效果注册、辅助逻辑、类别与提示。aux.Stringid 使用的索引与 CDB texts.str1 至 str16 保持一致；提示不足时明确调整方案，不静默复用错误文本。卡名和主效果文本按作者选择进入 CDB，草稿与匹配状态仅用于继续编辑。

新脚本按 workflow 约定采用 local s,id,o=GetID() 的组织方式。旧脚本中的 c卡号函数命名只作为参考行为，不直接视为新生成器的代码风格。

上游更新时复核受影响的 API、常量、辅助函数与模板。一次任务保持参考资料一致；记录版本依据用于排查，不构成长期锁定。每个模板维护代表性检查，生成的 DIY 卡仍由作者在实际客户端完成验收。

[effect-api]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/libeffect.cpp#L136-L374
[card-api]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/libcard.cpp
[duel-api]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/libduel.cpp
[constants]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/constant.lua
[types]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/constant.lua#L293-L307
[procedures]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/procedure.lua
[rota]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c32807846.lua#L14-L26
[reborn]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c83764718.lua#L16-L29
[ignister]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c18239909.lua#L32-L52
[girsu]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c69811710.lua#L38-L55
[conjunctions]: https://www.yugioh-card.com/eu/play/understanding-card-text/part-7-conjunction-functions/
[upstart]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c70368879.lua#L19-L25
[twisters]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c43898403.lua#L15
[mining]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c57160136.lua#L14
[count]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/constant.lua#L879-L882
[duality]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c98645731.lua#L15-L25
[branded]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c44362883.lua#L14-L31
[destiny]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c52947044.lua#L98-L118
[cyber]: https://github.com/Smile-DK/ygopro-scripts/blob/59ffe3c3aeeb86a0f6d8bf027516131826fbb230/c70095154.lua#L4-L17
[koishi-def]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/effect.h#L132-L144
[koishi-lua]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/interpreter.cpp#L101-L127
[koishi-markers]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/card.cpp#L1340-L1382
[koishi-linked-zones]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/card.cpp#L1387-L1453
[koishi-zones]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/field.cpp#L848-L855
[koishi-overlay]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/field.cpp#L3380-L3400
[koishi-overlay-op]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/operations.cpp#L785
[koishi-summon]: https://github.com/purerosefallen/ygopro-core/blob/ed031ac3e8882edea59defa71d11935e0a1b83dd/card.cpp#L47-L73
