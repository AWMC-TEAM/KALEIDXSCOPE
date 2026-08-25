# KALEIDXSCOPE

舞萌 DX KALEIDXSCOPE 活动解锁攻略工具。

## 功能

- **蓝门**：青春区域 29 首曲目进度追踪
- **白门**：天界区域 8，奏音/大国奏音曲目池随机推荐
- **紫门**：BLACK ROSE 区域，言ノ葉Project 曲目
- **黑门**：メトロポリス区域，KOP 钥匙曲目进度（11 首全部完成）
- **黄门**：七彩区域，钥匙采用「抽卡」方式从 12 首中随机推荐一首游玩
- **红门**：龙之区域 4，更新后完成 10 首钥匙曲的游玩记录

## 本地运行

直接打开 `index.html` 或使用任意静态服务器：

```bash
# 使用 Python
python3 -m http.server 8000

# 使用 Node.js
npx serve .
```

## 部署

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https://github.com/Michaelwucoc/KALEIDXSCOPE)

### 配置

1. 在 GitHub 仓库 **Settings** → **Secrets and variables** → **Actions** 中新建 Secret：
   - 名称：`EDGEONE_API_TOKEN`
   - 值：EdgeOne API Token（[获取方式](https://pages.edgeone.ai/document/api-token)）

2. 在 EdgeOne Pages 项目的**运行时环境变量/密钥**中配置成绩接口凭证：
   - `WMC_API_TOKEN`：成绩接口的 Bearer Token
   - `WMC_SESSION_COOKIE`：接口要求会话 Cookie 时再配置；没有则留空

   这两个变量只供 `functions/api/player/sync.js` 在服务端读取，**不要写入仓库、HTML、前端 JavaScript、GitHub Actions 日志或聊天机器人配置**。成绩同步接口会自动做请求体校验、超时、有限重试和单实例限流；部署后还应在 EdgeOne 的 WAF/访问控制中为 `/api/player/sync` 配置全局 QPS 限制，建议先用“全局 1 req/s、单 IP 1 req/10s”作为保守起点，再按上游配额调整。建议把已经暴露过的旧 Token 立即撤销并重新生成。

## 贡献

欢迎提交 [Issue](https://github.com/Michaelwucoc/KALEIDXSCOPE/issues) 或 Pull Request：

- **信息纠正**：曲目、难度、开放时间等错误
- **功能建议**：新功能或改进想法

## 社群

QQ 群：1072033605

## 许可

本项目仅供学习交流使用，本项目含有剧透内容，请仔细浏览。
