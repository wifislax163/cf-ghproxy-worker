# 自动部署配置指南 | Auto-Deployment Configuration Guide

[中文](#中文) | [English](#english)

---

## 中文

### 📋 目录

- [简介](#简介)
- [为什么需要自动部署](#为什么需要自动部署)
- [配置步骤](#配置步骤)
  - [1. 获取 Cloudflare API Token](#1-获取-cloudflare-api-token)
  - [2. 获取 Cloudflare Account ID](#2-获取-cloudflare-account-id)
  - [3. 配置 GitHub Secrets](#3-配置-github-secrets)
  - [4. 验证配置](#4-验证配置)
- [触发自动部署](#触发自动部署)
- [查看部署状态](#查看部署状态)
- [Workflow 配置说明](#workflow-配置说明)
- [手动部署（替代方案）](#手动部署替代方案)
- [常见问题](#常见问题)
- [故障排查](#故障排查)

---

### 简介

本项目已配置 **GitHub Actions** 自动部署工作流，可在代码推送到 `main` 分支后自动部署到 Cloudflare Workers，保持您的 Worker 代码与 GitHub 仓库同步。

### 为什么需要自动部署？

#### 一键部署 vs 自动部署

| 特性 | 一键部署 | 自动部署（GitHub Actions） |
|------|---------|---------------------------|
| **初次部署** | ✅ 快速便捷 | ⚙️ 需要配置 |
| **代码同步** | ❌ 需手动重新部署 | ✅ 自动同步 |
| **持续维护** | ❌ 不适合 | ✅ 推荐 |
| **适用场景** | 快速体验 | 长期使用 |

**核心区别：**
- **一键部署**：只在首次点击按钮时部署，之后 GitHub 代码更新**不会**自动同步到 Worker
- **自动部署**：每次 push 代码后**自动部署**，保持 Worker 与 GitHub 仓库同步

### 配置步骤

#### 1. 获取 Cloudflare API Token

1. **访问 Cloudflare API Tokens 页面**
   ```
   https://dash.cloudflare.com/profile/api-tokens
   ```

2. **创建新 Token**
   - 点击右上角 **Create Token** 按钮
   - 选择 **Edit Cloudflare Workers** 模板
   
   ![Create Token](https://developers.cloudflare.com/assets/api-tokens-create-custom-token-3f36e8bb25e8f4a4e949cb06f4a6d2fa.png)

3. **配置 Token 权限**
   
   在模板页面中，确保以下权限已配置：
   
   | 设置项 | 配置值 |
   |--------|--------|
   | **Permissions** | Account → Workers Scripts → Edit |
   | **Account Resources** | Include → 选择你的账户 |
   | **Zone Resources** | All zones (或根据需要选择) |
   | **TTL** | 建议留空（永久有效） |

4. **生成并保存 Token**
   - 点击 **Continue to summary**
   - 检查配置无误后，点击 **Create Token**
   - **⚠️ 重要**：复制生成的 Token（只显示一次，请妥善保存）
   
   ```
   示例：wL4R8xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

#### 2. 获取 Cloudflare Account ID

1. **访问 Cloudflare Dashboard**
   ```
   https://dash.cloudflare.com/
   ```

2. **获取 Account ID**
   - 点击左侧菜单 **Workers & Pages**
   - 在右侧栏会显示 **Account ID**
   - 点击复制图标复制 Account ID
   
   ![Account ID Location](https://developers.cloudflare.com/assets/account-id-workers-f75dc95a1c54a09bce94a53c3f6e1a44.png)
   
   ```
   示例：a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

#### 3. 配置 GitHub Secrets

1. **打开仓库 Settings**
   ```
   https://github.com/你的用户名/cf-ghproxy-worker/settings/secrets/actions
   ```
   
   或者在仓库页面：
   - 点击 **Settings** 标签
   - 左侧菜单选择 **Secrets and variables** → **Actions**

2. **添加 CLOUDFLARE_API_TOKEN**
   - 点击 **New repository secret**
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Secret**: 粘贴步骤 1 中获取的 API Token
   - 点击 **Add secret**

3. **添加 CLOUDFLARE_ACCOUNT_ID**
   - 再次点击 **New repository secret**
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
   - **Secret**: 粘贴步骤 2 中获取的 Account ID
   - 点击 **Add secret**

4. **验证配置**
   
   配置完成后，你应该在 Secrets 列表中看到：
   
   | Name | Updated |
   |------|---------|
   | CLOUDFLARE_API_TOKEN | now |
   | CLOUDFLARE_ACCOUNT_ID | now |

#### 4. 验证配置

**重要**：确保 `wrangler.toml` 中的 Worker 名称与 Cloudflare 上已部署的 Worker 名称一致。

1. **查看 `wrangler.toml` 配置**
   ```toml
   name = "github-proxy"  # 这是你的 Worker 名称
   ```

2. **检查 Cloudflare 上的 Worker 名称**
   - 访问 https://dash.cloudflare.com/
   - 进入 **Workers & Pages**
   - 查看已部署的 Worker 名称

3. **如果名称不一致**
   
   **方法 A**：修改 `wrangler.toml`（推荐）
   ```toml
   name = "你在Cloudflare上的Worker名称"
   ```
   
   **方法 B**：在 Cloudflare Dashboard 中重命名 Worker
   - 点击 Worker 名称
   - Settings → Rename
   - 改为 `github-proxy`

### 触发自动部署

配置完成后，以下操作会自动触发部署：

#### ✅ 自动触发（推荐）

修改以下文件并 push 到 `main` 分支：
- `worker.js`
- `wrangler.toml`
- `.github/workflows/deploy.yml`

```bash
# 修改代码后
git add worker.js
git commit -m "feat: update worker code"
git push origin main

# GitHub Actions 会自动开始部署
```

#### 🔘 手动触发

1. 打开仓库的 **Actions** 标签
2. 选择左侧 **Deploy to Cloudflare Workers** workflow
3. 点击右侧 **Run workflow** 下拉菜单
4. 选择 `main` 分支
5. 点击 **Run workflow** 按钮

### 查看部署状态

1. **进入 Actions 页面**
   ```
   https://github.com/你的用户名/cf-ghproxy-worker/actions
   ```

2. **查看 Workflow 运行**
   - 绿色 ✅：部署成功
   - 黄色 🟡：正在运行
   - 红色 ❌：部署失败

3. **查看详细日志**
   - 点击任意 workflow 运行
   - 点击 **Deploy** job
   - 展开各个步骤查看详细日志

4. **部署成功示例**
   ```
   ✅ Checkout repository
   ✅ Deploy to Cloudflare Workers
      Published github-proxy (1.23s)
      https://github-proxy.your-subdomain.workers.dev
   ```

### Workflow 配置说明

Workflow 文件位于：`.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main           # 监听 main 分支的 push
    paths:
      - 'worker.js'    # 只在这些文件改变时触发
      - 'wrangler.toml'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:   # 允许手动触发
```

#### 自定义触发条件

**监听更多文件：**
```yaml
paths:
  - 'worker.js'
  - 'wrangler.toml'
  - 'package.json'    # 添加更多文件
  - 'src/**'          # 监听整个目录
```

**监听多个分支：**
```yaml
branches:
  - main
  - develop
  - production
```

**排除文件：**
```yaml
paths-ignore:
  - '**.md'           # 忽略所有 Markdown 文件
  - 'docs/**'         # 忽略文档目录
```

### 手动部署（替代方案）

如果不想使用 GitHub Actions，也可以使用 Wrangler CLI 手动部署。

#### 安装 Wrangler

```bash
# 使用 npm
npm install -g wrangler

# 使用 yarn
yarn global add wrangler

# 使用 pnpm
pnpm add -g wrangler
```

#### 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器窗口，按提示完成授权。

#### 部署到 Cloudflare

```bash
# 在项目目录下
wrangler deploy

# 输出示例：
# Total Upload: 12.34 KiB / gzip: 5.67 KiB
# Uploaded github-proxy (1.23 sec)
# Published github-proxy (2.34 sec)
#   https://github-proxy.your-subdomain.workers.dev
```

#### 常用 Wrangler 命令

```bash
# 查看日志
wrangler tail

# 本地开发
wrangler dev

# 查看部署列表
wrangler deployments list

# 回滚到上一个版本
wrangler rollback

# 查看 Worker 详情
wrangler whoami
```

### 常见问题

#### Q1: 一键部署后，为什么 push 代码不会自动更新 Worker？

**A:** 一键部署只是初始化部署，并不会在后续保持同步。要实现自动同步，必须按照本文档配置 GitHub Actions。

#### Q2: 为什么我推送代码后 Worker 没更新？

**A:** 可能的原因：

1. **未配置 GitHub Secrets**
   - 检查是否添加了 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`
   - 在仓库 Settings → Secrets and variables → Actions 中验证

2. **Workflow 未触发**
   - 检查修改的文件是否在 `paths` 监听列表中
   - 查看 Actions 标签页，确认是否有 workflow 运行

3. **Workflow 运行失败**
   - 进入 Actions 标签页查看详细错误日志
   - 常见错误：API Token 权限不足、Account ID 错误、Worker 名称不匹配

4. **Worker 名称不匹配**
   - 检查 `wrangler.toml` 中的 `name` 是否与 Cloudflare 上的 Worker 名称一致

#### Q3: 如何验证自动部署是否生效？

**A:** 按照以下步骤验证：

```bash
# 1. 修改 worker.js，添加一行注释
echo "// Test auto-deployment" >> worker.js

# 2. 提交并推送
git add worker.js
git commit -m "test: verify auto-deployment"
git push origin main

# 3. 立即查看 Actions 页面
# 应该看到一个新的 workflow 运行

# 4. 等待部署完成（约 1-2 分钟）
# 5. 访问你的 Worker URL，检查是否更新
```

#### Q4: 可以只在特定文件修改时部署吗？

**A:** 可以！编辑 `.github/workflows/deploy.yml`：

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'worker.js'        # 只监听这些文件
      - 'wrangler.toml'
      # 添加或删除文件路径
```

#### Q5: 如何禁用自动部署？

**A:** 三种方法：

1. **删除 workflow 文件**
   ```bash
   git rm .github/workflows/deploy.yml
   git commit -m "ci: disable auto-deployment"
   git push
   ```

2. **禁用 workflow**（保留文件）
   - 进入仓库 Actions 标签页
   - 选择 "Deploy to Cloudflare Workers"
   - 点击右侧 `...` → Disable workflow

3. **修改触发条件**
   ```yaml
   on:
     workflow_dispatch:  # 只保留手动触发
   ```

#### Q6: GitHub Actions 有使用限制吗？

**A:** 是的，但对于大多数项目足够：

| 账户类型 | 免费额度 |
|---------|---------|
| **公开仓库** | 无限制 |
| **私有仓库（免费账户）** | 2,000 分钟/月 |
| **私有仓库（Pro账户）** | 3,000 分钟/月 |

每次部署约消耗 **0.5-1 分钟**。

### 故障排查

#### 错误：Authentication error (10000)

```
Error: Authentication error (10000)
```

**原因**：API Token 无效或权限不足

**解决方案**：
1. 重新生成 API Token（确保选择 "Edit Cloudflare Workers" 模板）
2. 更新 GitHub Secret `CLOUDFLARE_API_TOKEN`
3. 确认 Token 包含 `Account → Workers Scripts → Edit` 权限

#### 错误：Account ID is required

```
Error: Account ID is required
```

**原因**：未配置 `CLOUDFLARE_ACCOUNT_ID` 或 Account ID 错误

**解决方案**：
1. 在 Cloudflare Dashboard 的 Workers & Pages 页面复制正确的 Account ID
2. 检查 GitHub Secret `CLOUDFLARE_ACCOUNT_ID` 是否正确
3. 确保没有多余的空格或换行符

#### 错误：Worker not found

```
Error: Worker "github-proxy" not found
```

**原因**：`wrangler.toml` 中的 Worker 名称与 Cloudflare 上的不一致

**解决方案**：
1. 检查 `wrangler.toml` 中的 `name` 字段
2. 在 Cloudflare Dashboard 中确认实际的 Worker 名称
3. 修改其中一个使其一致

#### 错误：Script size exceeds limit

```
Error: Script size exceeds the limit
```

**原因**：Worker 代码文件大小超过限制（免费版 1MB，付费版 10MB）

**解决方案**：
1. 优化代码，移除不必要的注释和空格
2. 使用模块化拆分代码
3. 考虑升级到 Workers Paid 计划

#### Workflow 一直显示黄色（运行中）

**原因**：Workflow 卡住或超时

**解决方案**：
1. 进入 Actions 页面，点击运行中的 workflow
2. 点击右上角 "Cancel workflow" 取消
3. 检查 workflow 日志，查找错误
4. 修复问题后重新触发

#### 部署成功但代码未更新

**原因**：可能是缓存问题

**解决方案**：
```bash
# 1. 清除浏览器缓存或使用无痕模式访问

# 2. 在 Cloudflare Dashboard 清除缓存
# Caching → Configuration → Purge Cache

# 3. 验证 Worker 代码
# 在 Cloudflare Dashboard → Workers & Pages → 点击 Worker 名称
# → Quick Edit 查看实际代码
```

### 📚 相关资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Cloudflare Wrangler Action](https://github.com/cloudflare/wrangler-action)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)

---

## English

### 📋 Table of Contents

- [Introduction](#introduction)
- [Why Auto-Deployment](#why-auto-deployment)
- [Configuration Steps](#configuration-steps)
  - [1. Get Cloudflare API Token](#1-get-cloudflare-api-token)
  - [2. Get Cloudflare Account ID](#2-get-cloudflare-account-id)
  - [3. Configure GitHub Secrets](#3-configure-github-secrets)
  - [4. Verify Configuration](#4-verify-configuration)
- [Trigger Auto-Deployment](#trigger-auto-deployment)
- [View Deployment Status](#view-deployment-status)
- [Workflow Configuration](#workflow-configuration)
- [Manual Deployment (Alternative)](#manual-deployment-alternative)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)

---

### Introduction

This project has a **GitHub Actions** auto-deployment workflow configured to automatically deploy to Cloudflare Workers when code is pushed to the `main` branch, keeping your Worker code synced with the GitHub repository.

### Why Auto-Deployment?

#### One-Click Deploy vs Auto-Deployment

| Feature | One-Click Deploy | Auto-Deployment (GitHub Actions) |
|---------|------------------|----------------------------------|
| **Initial Deployment** | ✅ Quick & Easy | ⚙️ Requires Setup |
| **Code Sync** | ❌ Manual Re-deploy Needed | ✅ Automatic Sync |
| **Ongoing Maintenance** | ❌ Not Suitable | ✅ Recommended |
| **Use Case** | Quick Trial | Long-term Use |

**Key Difference:**
- **One-Click Deploy**: Only deploys when button is clicked, GitHub code updates **will NOT** sync automatically
- **Auto-Deployment**: Deploys **automatically** on every push, keeping Worker synced with GitHub repository

### Configuration Steps

#### 1. Get Cloudflare API Token

1. **Visit Cloudflare API Tokens Page**
   ```
   https://dash.cloudflare.com/profile/api-tokens
   ```

2. **Create New Token**
   - Click **Create Token** button in the top right
   - Select **Edit Cloudflare Workers** template
   
   ![Create Token](https://developers.cloudflare.com/assets/api-tokens-create-custom-token-3f36e8bb25e8f4a4e949cb06f4a6d2fa.png)

3. **Configure Token Permissions**
   
   In the template page, ensure the following permissions are configured:
   
   | Setting | Configuration |
   |---------|---------------|
   | **Permissions** | Account → Workers Scripts → Edit |
   | **Account Resources** | Include → Select your account |
   | **Zone Resources** | All zones (or select as needed) |
   | **TTL** | Recommended to leave empty (permanent) |

4. **Generate and Save Token**
   - Click **Continue to summary**
   - Verify configuration, then click **Create Token**
   - **⚠️ Important**: Copy the generated token (shown only once, save it securely)
   
   ```
   Example: wL4R8xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

#### 2. Get Cloudflare Account ID

1. **Visit Cloudflare Dashboard**
   ```
   https://dash.cloudflare.com/
   ```

2. **Get Account ID**
   - Click **Workers & Pages** in the left menu
   - **Account ID** will be displayed on the right sidebar
   - Click the copy icon to copy the Account ID
   
   ![Account ID Location](https://developers.cloudflare.com/assets/account-id-workers-f75dc95a1c54a09bce94a53c3f6e1a44.png)
   
   ```
   Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

#### 3. Configure GitHub Secrets

1. **Open Repository Settings**
   ```
   https://github.com/your-username/cf-ghproxy-worker/settings/secrets/actions
   ```
   
   Or in the repository page:
   - Click **Settings** tab
   - Select **Secrets and variables** → **Actions** in the left menu

2. **Add CLOUDFLARE_API_TOKEN**
   - Click **New repository secret**
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Secret**: Paste the API Token from Step 1
   - Click **Add secret**

3. **Add CLOUDFLARE_ACCOUNT_ID**
   - Click **New repository secret** again
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
   - **Secret**: Paste the Account ID from Step 2
   - Click **Add secret**

4. **Verify Configuration**
   
   After configuration, you should see in the Secrets list:
   
   | Name | Updated |
   |------|---------|
   | CLOUDFLARE_API_TOKEN | now |
   | CLOUDFLARE_ACCOUNT_ID | now |

#### 4. Verify Configuration

**Important**: Ensure the Worker name in `wrangler.toml` matches the Worker name deployed on Cloudflare.

1. **Check `wrangler.toml` Configuration**
   ```toml
   name = "github-proxy"  # This is your Worker name
   ```

2. **Check Worker Name on Cloudflare**
   - Visit https://dash.cloudflare.com/
   - Go to **Workers & Pages**
   - Check the deployed Worker name

3. **If Names Don't Match**
   
   **Method A**: Modify `wrangler.toml` (Recommended)
   ```toml
   name = "your-actual-worker-name-on-cloudflare"
   ```
   
   **Method B**: Rename Worker in Cloudflare Dashboard
   - Click Worker name
   - Settings → Rename
   - Change to `github-proxy`

### Trigger Auto-Deployment

After configuration, the following actions will automatically trigger deployment:

#### ✅ Auto Trigger (Recommended)

Modify the following files and push to `main` branch:
- `worker.js`
- `wrangler.toml`
- `.github/workflows/deploy.yml`

```bash
# After modifying code
git add worker.js
git commit -m "feat: update worker code"
git push origin main

# GitHub Actions will automatically start deployment
```

#### 🔘 Manual Trigger

1. Open repository **Actions** tab
2. Select **Deploy to Cloudflare Workers** workflow on the left
3. Click **Run workflow** dropdown on the right
4. Select `main` branch
5. Click **Run workflow** button

### View Deployment Status

1. **Go to Actions Page**
   ```
   https://github.com/your-username/cf-ghproxy-worker/actions
   ```

2. **View Workflow Runs**
   - Green ✅: Deployment successful
   - Yellow 🟡: Running
   - Red ❌: Deployment failed

3. **View Detailed Logs**
   - Click any workflow run
   - Click **Deploy** job
   - Expand each step to view detailed logs

4. **Successful Deployment Example**
   ```
   ✅ Checkout repository
   ✅ Deploy to Cloudflare Workers
      Published github-proxy (1.23s)
      https://github-proxy.your-subdomain.workers.dev
   ```

### Workflow Configuration

Workflow file is located at: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main           # Listen to push on main branch
    paths:
      - 'worker.js'    # Trigger only when these files change
      - 'wrangler.toml'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:   # Allow manual trigger
```

#### Customize Trigger Conditions

**Monitor More Files:**
```yaml
paths:
  - 'worker.js'
  - 'wrangler.toml'
  - 'package.json'    # Add more files
  - 'src/**'          # Monitor entire directory
```

**Monitor Multiple Branches:**
```yaml
branches:
  - main
  - develop
  - production
```

**Exclude Files:**
```yaml
paths-ignore:
  - '**.md'           # Ignore all Markdown files
  - 'docs/**'         # Ignore docs directory
```

### Manual Deployment (Alternative)

If you don't want to use GitHub Actions, you can manually deploy using Wrangler CLI.

#### Install Wrangler

```bash
# Using npm
npm install -g wrangler

# Using yarn
yarn global add wrangler

# Using pnpm
pnpm add -g wrangler
```

#### Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for authorization.

#### Deploy to Cloudflare

```bash
# In project directory
wrangler deploy

# Example output:
# Total Upload: 12.34 KiB / gzip: 5.67 KiB
# Uploaded github-proxy (1.23 sec)
# Published github-proxy (2.34 sec)
#   https://github-proxy.your-subdomain.workers.dev
```

#### Common Wrangler Commands

```bash
# View logs
wrangler tail

# Local development
wrangler dev

# View deployment list
wrangler deployments list

# Rollback to previous version
wrangler rollback

# View Worker details
wrangler whoami
```

### FAQ

#### Q1: Why doesn't pushing code update my Worker after one-click deploy?

**A:** One-click deploy is only for initial deployment and doesn't maintain sync afterwards. To enable auto-sync, you must configure GitHub Actions as described in this guide.

#### Q2: Why doesn't my Worker update after pushing code?

**A:** Possible reasons:

1. **GitHub Secrets Not Configured**
   - Check if `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are added
   - Verify in Repository Settings → Secrets and variables → Actions

2. **Workflow Not Triggered**
   - Check if modified files are in the `paths` watch list
   - Check Actions tab to confirm workflow run

3. **Workflow Run Failed**
   - Go to Actions tab to view detailed error logs
   - Common errors: insufficient API Token permissions, incorrect Account ID, Worker name mismatch

4. **Worker Name Mismatch**
   - Check if `name` in `wrangler.toml` matches Worker name on Cloudflare

#### Q3: How to verify auto-deployment is working?

**A:** Follow these steps:

```bash
# 1. Modify worker.js, add a comment
echo "// Test auto-deployment" >> worker.js

# 2. Commit and push
git add worker.js
git commit -m "test: verify auto-deployment"
git push origin main

# 3. Immediately check Actions page
# Should see a new workflow run

# 4. Wait for deployment to complete (about 1-2 minutes)
# 5. Visit your Worker URL to check if updated
```

#### Q4: Can I deploy only when specific files are modified?

**A:** Yes! Edit `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'worker.js'        # Monitor only these files
      - 'wrangler.toml'
      # Add or remove file paths
```

#### Q5: How to disable auto-deployment?

**A:** Three methods:

1. **Delete Workflow File**
   ```bash
   git rm .github/workflows/deploy.yml
   git commit -m "ci: disable auto-deployment"
   git push
   ```

2. **Disable Workflow** (keep file)
   - Go to repository Actions tab
   - Select "Deploy to Cloudflare Workers"
   - Click `...` on the right → Disable workflow

3. **Modify Trigger Conditions**
   ```yaml
   on:
     workflow_dispatch:  # Keep only manual trigger
   ```

#### Q6: Are there usage limits for GitHub Actions?

**A:** Yes, but sufficient for most projects:

| Account Type | Free Quota |
|--------------|------------|
| **Public Repos** | Unlimited |
| **Private Repos (Free)** | 2,000 minutes/month |
| **Private Repos (Pro)** | 3,000 minutes/month |

Each deployment costs about **0.5-1 minute**.

### Troubleshooting

#### Error: Authentication error (10000)

```
Error: Authentication error (10000)
```

**Cause**: Invalid API Token or insufficient permissions

**Solution**:
1. Regenerate API Token (ensure "Edit Cloudflare Workers" template is selected)
2. Update GitHub Secret `CLOUDFLARE_API_TOKEN`
3. Verify Token contains `Account → Workers Scripts → Edit` permission

#### Error: Account ID is required

```
Error: Account ID is required
```

**Cause**: `CLOUDFLARE_ACCOUNT_ID` not configured or incorrect

**Solution**:
1. Copy correct Account ID from Cloudflare Dashboard's Workers & Pages page
2. Verify GitHub Secret `CLOUDFLARE_ACCOUNT_ID` is correct
3. Ensure no extra spaces or line breaks

#### Error: Worker not found

```
Error: Worker "github-proxy" not found
```

**Cause**: Worker name in `wrangler.toml` doesn't match Cloudflare

**Solution**:
1. Check `name` field in `wrangler.toml`
2. Verify actual Worker name in Cloudflare Dashboard
3. Modify one to match the other

#### Error: Script size exceeds limit

```
Error: Script size exceeds the limit
```

**Cause**: Worker code size exceeds limit (Free: 1MB, Paid: 10MB)

**Solution**:
1. Optimize code, remove unnecessary comments and whitespace
2. Use modular code splitting
3. Consider upgrading to Workers Paid plan

#### Workflow Stuck in Yellow (Running)

**Cause**: Workflow stuck or timed out

**Solution**:
1. Go to Actions page, click running workflow
2. Click "Cancel workflow" in top right
3. Check workflow logs for errors
4. Fix issues and re-trigger

#### Deployment Successful But Code Not Updated

**Cause**: Likely cache issue

**Solution**:
```bash
# 1. Clear browser cache or use incognito mode

# 2. Purge cache in Cloudflare Dashboard
# Caching → Configuration → Purge Cache

# 3. Verify Worker code
# In Cloudflare Dashboard → Workers & Pages → Click Worker name
# → Quick Edit to view actual code
```

### 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Wrangler Action](https://github.com/cloudflare/wrangler-action)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)

