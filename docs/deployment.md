# 运行、部署与参考资料管理

本项目采用 React / TypeScript / Vite 前端、Express / Node.js 服务端。卡图、CDB 和 ZIP 在浏览器中生成；服务器负责可选工程存储、参考卡查询及 BYOK 模型代理。默认监听本机，可直接自用，不需要外部数据库。

## 本地启动

需要 Node.js 22.12 或更新版本（推荐 Node.js 24 LTS）、npm。

```powershell
npm ci
npm run refs:sync
npm run dev
```

开发界面位于 `http://127.0.0.1:5173`，Vite 将 `/api` 请求转发给本机 `3001` 端口。`npm ci` 同时准备渲染用的卡模和字体资源；它们由项目的资源清单管理，不依赖开发者机器上的其他仓库。

正式运行：

```powershell
npm run build
npm start
```

此时 Express 同时提供 `dist` 静态界面及 API，浏览器打开 `http://127.0.0.1:3001`。复制 `.env.example` 为 `.env` 可配置端口、数据目录和允许访问的模型主机。服务启动时读取 `.env`。

未同步参考资料仍可手动组装效果、渲染和导出；参考卡检索需要完成同步。BYOK 在未同步时不能利用 OCG 脚本作为参考，建议先同步再使用。

## 参考项目的部署边界

运行时没有任何兄弟仓库路径，也不需要 MSE 程序、Git 或 workflow 仓库。依赖分成两类：

| 内容 | 本项目管理方式 | 更新方式 |
| --- | --- | --- |
| 渲染、SQLite、ZIP 等运行库 | `package.json` 和 `package-lock.json` | 常规 npm 依赖更新、构建检查 |
| 卡模与字体 | `public/card-assets` 及资源清单 | `npm run assets:sync`，详见清单与第三方说明 |
| OCG 卡片文本、脚本、内核 API 清单 | `.data/references`，不提交 Git | `npm run refs:sync` |
| 用户服务器存档 | `.data/projects`，不提交 Git | 应用保存或工程备份 |

参考同步默认读取三个上游**执行同步时的最新提交**：

- [Smile-DK/ygopro-scripts](https://github.com/Smile-DK/ygopro-scripts)：OCG Lua 和辅助函数。
- [purerosefallen/ygopro-core](https://github.com/purerosefallen/ygopro-core)：实际公开给 Lua 的接口名、Koishi 扩展标识。
- [mycard/ygopro-database](https://github.com/mycard/ygopro-database)：`zh-CN`、`en-US`、`ja-JP` 卡片资料。

同步先生成临时缓存，全部完成后替换当前缓存；失败会保留上一份缓存。数据库由 `sql.js` / `ygopro-cdb-encode` 在内存中读取，不会在源仓库写入 SQLite WAL/SHM。缓存包含语言索引、脚本、API 清单、上游许可证及 `manifest.json`；后者记录本次来源、提交和更新时间，供追查，不限制下一次升级。

升级参考资料后建议重启服务，并对常用模板重新运行测试及目标客户端试卡。API 名清单是 BYOK 的上下文辅助，不代表已通过内核行为测试。当前检索按卡号、卡名和文字关键词，支持大小写无关的多个关键词，不是向量检索。

已有本地参考仓库时，可在首次部署时只读导入：

```powershell
npm run refs:sync -- --from-workflow "D:/Github/ygopro-scripting-workflow" --database "D:/Github/ygopro-database"
```

这两个路径只在这次命令中使用，生成后的 `.data/references` 可以随部署迁移。默认远端同步不需要上述本地路径。GitHub API 遇限流时，可给同步命令提供 `GITHUB_TOKEN` 环境变量；令牌不进入缓存。同步脚本读取当前 shell 环境及 `.env`，也可显式通过 `--data-dir` 指定目录。

## BYOK 与本地模型

用户填写 OpenAI 兼容的 **Chat Completions** 基地址、模型和 API Key，例如 `https://provider.example/v1`。也可填写完整 `/chat/completions` URL。代理调用的是该端点，不会自动切换其他供应商。

点击生成时，当前卡片信息、卡包中的名称/卡号/系列/卡文、所选参考脚本，以及 API Key 会由浏览器发送给本项目服务器；服务器再将必要的生成上下文发送到所填模型提供方。图片不发送给模型，Key 不进入提示词，也不写入服务器存档或日志。卡包存储位置与模型执行位置是独立选择。

模型返回完整 Lua、最多 16 条 CDB 提示文字及说明。服务器检查 JSON 结构和 Lua 5.3 语法，失败会请求模型修正一次，第二次仍失败则报告错误。这里只做格式与语法检查，最终在官方 YGOPro / KoishiPro 中试卡；没有声称运行整个 workflow 或内核决斗测试。

远端端点默认仅允许 HTTPS，拒绝私有网络地址和重定向；网络请求使用已校验的 DNS 结果。需要 Ollama 或内网代理时，由部署者在 `.env` 中配置明确主机名：

```dotenv
BYOK_ALLOWED_HOSTS=localhost,127.0.0.1
```

随后可使用 `http://127.0.0.1:11434/v1`。容器内的 `localhost` 指容器自己；访问宿主机时应使用对应主机地址并加入名单。允许名单采用精确匹配，不接受通配符。无 Key 的本地模型可以留空 Key。

每次上游请求超时为 120 秒，同时最多处理两个 BYOK 任务。模型端点需要支持常规非流式 `messages` 请求；只有 Responses API 的端点不在本版本范围内。

## 存储与迁移

本地存储模式使用浏览器存储，属于当前浏览器站点；更换域名、清理站点数据或换浏览器前，应下载工程备份。服务器存储模式使用 `.data/projects/<项目ID>.json`，含卡文、图片、积木和自定义 Lua；不是多用户云账户系统。

服务端单次 JSON 请求上限 100 MB，每工程最多 1000 张卡。大量高分辨率图片会先遇到请求或浏览器存储限制，建议缩小中间图、拆分工程。导出的 YGOPro ZIP 是客户端使用包，编辑工程备份才包含继续编辑所需的信息。

迁移时备份 `.data/projects`；`.data/references` 可搬迁或重新同步。不要把 `.env`、用户工程或 Key 提交到 Git。

## Docker 与网络部署

```powershell
docker build -t day-lilies .
docker volume create day-lilies-data
docker run --rm -v day-lilies-data:/app/.data day-lilies npm run refs:sync
docker run --rm -p 127.0.0.1:3001:3001 -v day-lilies-data:/app/.data day-lilies
```

镜像包含前后端及渲染资源，参考缓存和服务器存档放入持久卷。默认示例仅暴露到宿主机本地，访问 `http://localhost:3001`。

公开或局域网部署需要显式设置 `HOST=0.0.0.0` 和 `PUBLIC_ORIGIN=https://实际域名`，并通过受认证的反向代理提供访问；代理应保留外部 `Host` 请求头。当前服务端存档是单工作室共享空间，没有账户隔离，不应直接作为无认证公共云服务。API 有同源和 Host 检查，这不替代用户认证。

## 检查

```powershell
npm test
npm run build
```

服务器测试使用临时数据目录和模拟模型，验证项目往返、来源限制、参考检索、BYOK 上下文及错误处理；不会消耗用户 Key。真实端点的兼容性由部署者填写自己的端点后验证。
