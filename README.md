# Nav-item · 导航站（Cloudflare 全家桶版）

## 👨‍💻 致谢
基于 **eooce** 的 [nav-item](https://github.com/eooce/nav-item) 改造为 Cloudflare Pages 部署版。
---

一个现代化的导航网站：**Vue 3** 前端 + **Cloudflare Pages Functions (Hono)** 后端，数据存 **Cloudflare D1**，图片存 **Cloudflare R2**。完全 Serverless，可跑在 Cloudflare 免费额度上，**Fork 一下、连接 Git 就能部署**。


## 📸 项目预览

| 首页导航 | 后台管理 |
|:---:|:---:|
| ![首页导航](assets/7.jpg) | ![后台管理](assets/1.jpg) |

## 🛠️ 技术栈
- 前端：Vue 3 + Vue Router + Vite（构建产物输出到 `web/dist`）
- 后端：Cloudflare Pages Functions + [Hono](https://hono.dev/)
- 数据库：Cloudflare D1（SQLite 兼容）
- 对象存储：Cloudflare R2（上传的图标 / 背景图）
- 认证：JWT（`hono/jwt`）+ bcryptjs

---

## ⚙️ 绑定与变量一览

| 名称 | 类型 | 必需 | 说明 |
|------|------|:--:|------|
| `DB` | D1 | ✅ | 主数据库 |
| `BUCKET` | R2 | ⬜ | 上传的图标 / 背景图（不绑定则改用外链，详见下方） |
| `JWT_SECRET` | 机密/变量 | ✅ | JWT 签名密钥，**生产环境务必用强随机值** |
| `TOKEN_TTL_HOURS` | 变量 | ⬜ | 登录 token 有效期（小时），默认 `168`（7 天） |

## 🚀 快速部署（推荐：连接 Git 自动部署）

> **准备工作**：一个 [Cloudflare](https://dash.cloudflare.com/) 账号 + 一个 [GitHub](https://github.com/) 账号。

### 步骤 1：Fork / 推送本仓库到 GitHub
把本项目推到你自己的 GitHub 仓库（或 Fork 原仓库）。

### 步骤 2：连接到 Cloudflare Pages

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/?to=/:account/pages/new/provider/github)

进入 Cloudflare 控制台 → **Workers 和 Pages** → **创建** → **Pages** → **连接到 Git**，授权并选择你的仓库。在**构建设置**里填：

| 设置项 | 值 |
|--------|-----|
| 框架预设 Framework preset | `None`（无） |
| 构建命令 Build command | `npm run build` |
| 构建输出目录 Build output directory | `web/dist` |

其余保持默认，点击 **保存并部署**。（首次部署因为还没绑定数据库，`/api/*` 会报错，属正常，绑定后重新部署即可。）

### 步骤 3：创建 D1 数据库
控制台 → **存储和数据库** → **D1 SQL 数据库** → **创建**，名称填 `nav-item-db`。

### 步骤 4：创建 R2 存储桶
控制台 → **R2 对象存储** → **创建存储桶**，名称填 `nav-item-uploads`。

## 🖼️ 不使用 R2（纯外链模式）
R2 只用来存"从后台上传的图片文件"，卡片图标、背景图、Favicon、广告图、友链 logo 这些字段本身在 D1 里就是普通的 URL 字符串，与 R2 无关。所以**可以完全不绑定 R2**，只用外链（图床 / 图片 API / 任意可访问的图片 URL）：

- 部署时**跳过**「步骤 4：创建 R2 存储桶」和「步骤 5」中 `BUCKET` 的绑定，`DB` 和 `JWT_SECRET` 照常配置。
- 后台的每个图片位置都提供两种模式：
  - **输入 URL** → 直接粘贴外链，走这条路径**不需要 R2**。
  - **上传图片 / 选择已上传** → 依赖 R2，未绑定时点击会报错，请忽略。
- 卡片图标既可以填外链，也可以留空由前端自动获取网站 favicon。

优点：零对象存储成本、图片自带 CDN。代价：图片依赖第三方服务的可用性；后台的"上传"与"图片库"功能不可用。

### 步骤 5：绑定服务
进入你的 Pages 项目 → **设置 → 绑定 → 添加绑定**，添加以下三项（**变量名必须完全一致**）：

| 类型 | 变量名 | 指向 |
|------|--------|------|
| D1 数据库 | `DB` | `nav-item-db` |
| R2 存储桶 | `BUCKET` | `nav-item-uploads` |

再到 **设置 → 变量和机密**，添加一个机密：

| 变量名 | 值 |
|--------|-----|
| `JWT_SECRET` | 一段强随机字符串（用于签名登录 token） |

### 步骤 6：重新部署
Pages 项目 → **部署** → 在最近一次部署右侧选择 **重新部署**。等待完成后即可访问：

- 首页：`https://<你的项目>.pages.dev`
- 后台：`https://<你的项目>.pages.dev/admin`（默认 `admin` / `123456`，登录后请到「用户管理」改密码）

> 绑定只对**下一次部署**生效，所以步骤 3~5 完成后必须执行步骤 6 的「重新部署」。

---

## 💾 数据备份 / 迁移

后台 → **数据备份** 支持导出与导入配置数据，用来备份或在不同部署间迁移：

- **导出**：一键下载 JSON 文件，包含菜单、子菜单、卡片、广告、友链、站点设置和用户账号（含密码 hash）。
- **导入**：上传备份文件，**清空**当前 D1 数据并按备份完全替换。导入完成后 2 秒自动登出，使用**备份时**的账号密码重新登录。
- **不包含**上传到 R2 的图片文件（背景图、自定义 Favicon 等）。迁移到新部署后请在主题管理中重新上传，或改用外链。

典型使用：换项目 / 换账号重部署前先导出，新实例首次登录后导入即可恢复。

---

## 💻 本地开发

```bash
# 1. 安装根依赖（hono / bcryptjs / wrangler）
npm install

# 2. 复制配置模板并填入你自己的 D1 database_id
cp wrangler.example.toml wrangler.toml
#   （wrangler.toml 已被 .gitignore 忽略，不会提交）

# 3. 初始化本地数据库
npm run db:init:local

# 4. 构建前端
npm run build

# 5. 启动本地开发服务器（自动加载 D1 / R2 / .dev.vars）
npm run dev
# 访问 http://localhost:8788 ，后台 http://localhost:8788/admin
```

如需用 CLI 直接部署（不走 Git）：
```bash
npx wrangler login
npx wrangler d1 create nav-item-db          # 把 database_id 填进 wrangler.toml
npx wrangler r2 bucket create nav-item-uploads
npm run db:init:remote                        # 初始化远程数据库
npm run deploy                                # 构建并上传部署
```

---

## 📁 项目结构

```
  nav-item-test/
  ├── package.json                       # 根依赖 + 构建脚本
  ├── package-lock.json                  # 根依赖锁定
  ├── schema.sql                         # D1 建表 + 默认数据
  ├── wrangler.example.toml              # 本地开发配置模板
  ├── .gitignore                         # Git 忽略规则
  ├── README.md                          # 部署说明
  ├── LICENSE                            # 许可证
  │
  ├── assets/                            # README 用截图
  │   ├── 1.jpg
  │   └── 7.jpg
  │
  ├── functions/                         # Pages 后端（自动编译为 Worker）
  │   ├── api/
  │   │   └── [[route]].js               # 全部 API
  │   └── uploads/
  │       └── [[key]].js                 # R2 图片配信
  │
  └── web/                               # 前端 Vue 源码（构建为 web/dist）
      ├── index.html
      ├── package.json
      ├── package-lock.json
      ├── vite.config.mjs
      ├── public/
      │   ├── background.webp
      │   ├── default-favicon.png
      │   └── robots.txt
      └── src/
          ├── main.js
          ├── router.js
          ├── api.js
          ├── App.vue
          ├── components/
          │   ├── MenuBar.vue
          │   └── CardGrid.vue
          └── views/
              ├── Home.vue
              ├── Admin.vue
              └── admin/
                  ├── MenuManage.vue
                  ├── CardManage.vue
                  ├── AdManage.vue
                  ├── FriendLinkManage.vue
                  ├── UserManage.vue
                  └── ThemeManage.vue
```

## 📄 许可证
MIT，详见 [LICENSE](LICENSE)。
