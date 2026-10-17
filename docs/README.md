# day lilies 效果设计参考

本目录整理 day-lilies 的效果积木体系、首批模板与编写流程，供后续实现和维护参考。设计以 workflow 自带的 YGOPro 内核、脚本库与辅助工具为依据，采用常用模板和可组合效果配置，支持文本匹配、手动组装和 BYOK 三种入口。

归档日期：2026-10-14；扩展更新：2026-10-17。已完成工作台、模板编译器、保守匹配、BYOK 辅助、导入和整包导出，并加入多语言与复合效果。以下设计文档仍包含后续规划，当前实际覆盖范围以[多语言与效果拼图扩展](effect-coverage.md)为准；首版验收记录见[首版实现与验证](implementation-status.md)，部署方法见[运行与部署](deployment.md)。

## 阅读顺序

| 文档 | 主要内容 |
| --- | --- |
| [多语言与效果拼图扩展](effect-coverage.md) | 三语界面、复合处理、高级预设、内核常量目录、KoishiPRO 边界 |
| [首版实现与验证](implementation-status.md) | 当前可用能力、明确限制、测试范围与代码入口 |
| [运行与部署](deployment.md) | 本地运行、Docker、参考资料更新、BYOK 与存储 |
| [效果积木体系](effect-block-system.md) | 实际内核来源、效果分层、底层能力映射、组合关系、KoishiPro 扩展 |
| [常用效果模板](common-effect-templates.md) | P0 首批模板、P1 扩展和 P2 专项能力，每类的参数、脚本依据及适用边界 |
| [三种编写方式](authoring-flows.md) | 文本匹配、手动组装、BYOK 如何共用草稿，以及编辑、生成、导出和实机验收 |

## 已确定的产品边界

- 面向有基本游戏王规则知识的 DIYer。作者填写并管理自己的卡号区间；工具辅助批量填写与当前卡包重号检查。
- 目标为官方 YGOPro 与 KoishiPro，不扩展到 EDOPro 等其他分支。应用支持两种目标，单张卡实际使用的能力应与所选目标相符。
- 无 LLM 时，支持已覆盖句式的匹配及用户自行组合积木；BYOK 可以解释文本、补齐配置，也可以处理模板之外的 Lua。
- 生成器提供基础检查，workflow 提供辅助检查和测试；最终效果由作者在本地客户端验收。完整自动行为测试不是每张卡导出的前提。
- 跟随上游更新。同一次生成任务使用一致的资料与内核，并记录内部来源信息；不要求永久锁定版本或维持所有旧版兼容。
- 导入 YGO Carder JSON、yugioh-card 作者制卡器 JSON，以及 MSE 仓库中的已知游戏王模板。提取所需内容，无须保留原工具的无关元数据或支持原格式无损往返。
- ANSD 一类 MSE 集默认以英文正文作为规则依据，中文注释作为翻译参考。其他卡片可以选择中文、英文或日文作为主文本；参考翻译不自动覆盖主文本。
- 卡片数据以 CDB 所需字段为主，卡图与 Lua 配套导出。应用只额外保存继续编辑所需的中间图、当前样式和效果草稿。下载目录使用 pics，不是 pic。

## 源码来源与本次参考位置

workflow 的 ygopro 目录是一组来源明确的仓库组合。内核具有明确标注的 KoishiPro 扩展，不能仅凭客户端 README 的 YGOPro 标题判定它是未经扩展的官方内核。

| 部件 | 来源与本次参考提交 |
| --- | --- |
| workflow | [nanahira/ygopro-scripting-workflow](https://code.moenext.com/nanahira/ygopro-scripting-workflow)，master，0caaf3d7059afb7fe232c64945502da1d215470b |
| ygopro 客户端 | [nanahira/ygopro](https://code.moenext.com/nanahira/ygopro)，master，a9811708058286fc2bdf79218d6544ffe573d5b9 |
| ocgcore | [purerosefallen/ygopro-core](https://github.com/purerosefallen/ygopro-core/tree/ed031ac3e8882edea59defa71d11935e0a1b83dd)，master，ed031ac3e8882edea59defa71d11935e0a1b83dd |
| script | [Smile-DK/ygopro-scripts](https://github.com/Smile-DK/ygopro-scripts/tree/59ffe3c3aeeb86a0f6d8bf027516131826fbb230)，master，59ffe3c3aeeb86a0f6d8bf027516131826fbb230 |

这些提交用于定位本次设计依据，不是部署版本约束。正文的源码链接指向这些位置；上游变化后，复核受影响的模板并更新参考即可。

维护时主要沿着以下路径查证：

- ocgcore/effect.h、libeffect.cpp：效果对象及回调职责。
- ocgcore/libduel.cpp、libcard.cpp、libgroup.cpp：决斗动作、卡片判断与组操作。
- script/constant.lua、utility.lua、procedure.lua：常量、辅助逻辑与召唤手续。
- script/c卡号.lua：实际卡片行为的组合范例。
- workflow/src/check-redtext.ts、create-test.ts：辅助验证入口。
- workflow/ref/ygopro-cdb-encode：CDB 字段、效果提示与导出。

模板优先级是面向本项目的开发取舍，不是对官方脚本使用频率的统计。参考卡只证明注明的实现模式；不能把一张参考卡的全部规则自动继承给新模板。
