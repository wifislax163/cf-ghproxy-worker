# 自动部署配置指南

## 🚀 GitHub Actions 自动部署

本项目配置了 GitHub Actions，可以在代码推送到 `main` 分支后自动部署到 Cloudflare Workers。

## 📋 配置步骤

### 1. 获取 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击右上角头像 → **My Profile**
3. 选择左侧 **API Tokens**
4. 点击 **Create Token**
5. 选择 **Edit Cloudflare Workers** 模板（或自定义）
6. 配置权限：
   - **Account** → **Workers Scripts** → **Edit**
7. 点击 **Continue to summary** → **Create Token**
8. **复制生成的 Token**（只显示一次，请妥善保存）

### 2. 获取 Cloudflare Account ID

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 首页
2. 选择 **Workers & Pages**
3. 右侧会显示 **Account ID**，复制它

### 3. 配置 GitHub Secrets

1. 打开你的 GitHub 仓库
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下两个密钥：

   | Name | Value | 说明 |
   |------|-------|------|
   | `CLOUDFLARE_API_TOKEN` | 你的 API Token | 步骤 1 中获取的 Token |
   | `CLOUDFLARE_ACCOUNT_ID` | 你的 Account ID | 步骤 2 中获取的 Account ID |

### 4. 触发自动部署

配置完成后，每次以下情况会自动部署：

- ✅ 推送代码到 `main` 分支（修改 `worker.js` 或 `wrangler.toml`）
- ✅ 手动触发（进入 **Actions** → **Deploy to Cloudflare Workers** → **Run workflow**）

## 🔍 查看部署状态

1. 进入 GitHub 仓库的 **Actions** 标签
2. 查看最新的 workflow 运行状态
3. 绿色 ✅ 表示部署成功
4. 红色 ❌ 表示部署失败，点击查看详细日志

## ⚙️ Workflow 配置说明

```yaml
on:
  push:
    branches:
      - main           # 监听 main 分支
    paths:
      - 'worker.js'    # 只在这些文件改变时触发
      - 'wrangler.toml'
  workflow_dispatch:   # 允许手动触发
```

## 🛠️ 手动部署（替代方案）

如果不想使用自动部署，也可以使用 Wrangler CLI 手动部署：

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署
wrangler deploy
```

## 💡 FAQ

### Q: 一键部署和自动部署有什么区别？

**一键部署**：
- 只在首次点击按钮时部署
- GitHub 代码更新后不会自动同步
- 适合快速体验

**自动部署（GitHub Actions）**：
- 每次 push 代码后自动部署
- 保持 Worker 代码与 GitHub 同步
- 适合持续维护

### Q: 为什么我推送代码后 Worker 没更新？

可能原因：
1. 没有配置 GitHub Secrets（API Token 和 Account ID）
2. Workflow 触发条件不满足（修改的文件不在监听列表中）
3. Workflow 运行失败（查看 Actions 标签页的日志）

### Q: 可以只在特定文件修改时部署吗？

可以！编辑 `.github/workflows/deploy.yml` 中的 `paths` 部分：

```yaml
paths:
  - 'worker.js'        # 只监听这些文件
  - 'wrangler.toml'
  - 'package.json'     # 可以添加更多
```

## 📚 相关资源

- [Cloudflare Wrangler Action](https://github.com/cloudflare/wrangler-action)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
