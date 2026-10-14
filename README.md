# 萱草 · Day Lilies

面向游戏王 DIYer 的制卡工作台：管理一套卡片，上传中间图，匹配或手工组装常见效果，生成 Lua，并下载包含 CDB、完整卡图和脚本的 YGOPro 扩展包。

## 启动

需要 Node.js 22.12+ 和 npm。在本项目目录执行：

```powershell
npm ci
npm run dev
```

打开终端显示的本地地址（通常是 `http://127.0.0.1:5173`）。首次进入附有三张可导出的「昼庭」示例卡。点击左上角卡包名可以创建空白卡包。

启用官方卡片检索及 BYOK 参考上下文：

```powershell
npm run refs:sync
```

本次工作区已经准备了独立参考缓存。新机器需自行同步；手动积木、卡图和导出无需同步即可使用。正式部署使用 `npm run build` 和 `npm start`，详见[运行与部署](docs/deployment.md)。

## 使用流程

1. 新建卡片，或导入 MSE-SET、YGO Carder JSON、yugioh-card 作者制卡器 JSON。两种 JSON 使用独立适配器。MSE 的英文正文和中文注释分别保留。
2. 在「设置」里填写自己的卡号起点、系列名称与系列代码，给未编号卡片分配卡号。第三方制卡器中的密码字段不自动当作作者分配的卡号。
3. 填写卡面信息和中间图，在「效果积木」匹配卡文并核对；也可直接添加模板。整套卡可以批量匹配尚未配置的卡片。
4. 复杂效果可在「BYOK 助手」选择 OCG 参考卡，调用自己的 OpenAI 兼容模型；检查结果后应用为完整 Lua，也可手动编辑脚本和 CDB 提示。
5. 查看导出检查并下载 ZIP。将 `expansions` 的内容合并到本地 YGOPro / KoishiPro，在客户端试卡。

```text
expansions/
  卡包名称.cdb
  pics/卡号.png
  script/c卡号.lua
  strings.conf
export-report.json
README.txt
```

默认自动保存到浏览器 IndexedDB，可切换到本应用服务端。工程 JSON 备份包含继续编辑所需的内容；游玩用 ZIP 不替代工程备份。API Key 只保留在当前页面内存，不进入工程或导出包。

## 当前能力与边界

- 11 种常用动作，组合召唤/特召等触发入口、条件、费用、筛选和次数；支持墓地等自身发动区域及基础融合/同调/超量/连接手续。
- 中英文封闭句式及少量日文匹配。未匹配内容明确显示，匹配结果必须复核。
- 整卡 Lua 编辑和 BYOK 生成，具有语法及入口检查。BYOK 是参考资料辅助生成，不是完整远程执行 scripting-workflow。
- 完整卡图含中英日字体、双灵摆刻度和连接箭头。依赖与必要资源都由本项目管理，运行时不访问其他工作区仓库。
- 复杂连锁、无效、替代费用、任意多步骤处理、专用装备/仪式效果等需要 BYOK 或自定义 Lua。官方 YGOPro 目标避免主动使用 Koishi 专属接口；实机测试目前覆盖 Koishi 内核，不代表所有客户端版本都已测试。

细节见[首版实现与验证](docs/implementation-status.md)、[设计文档索引](docs/README.md)和[第三方来源说明](THIRD_PARTY_NOTICES.md)。

## 开发检查

```powershell
npm test
npm run build
```

已同步 `.data/references` 时，测试还会在 `koishipro-core.js` 内核中验证脚本加载和若干实际结算；缺少参考缓存时相关测试明确跳过。真实上传样例不加入仓库，可设置 `DAY_LILIES_IMPORT_FIXTURES` 指向样例目录后运行导入回归测试。
