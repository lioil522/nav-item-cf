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

## 🚀 快速部署（推荐：连接 Git 自动部署）

> **准备工作**：一个 [Cloudflare](https://dash.cloudflare.com/) 账号 + 一个 GitHub 账号。

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

## ⚙️ 绑定与变量一览

| 名称 | 类型 | 必需 | 说明 |
|------|------|:--:|------|
| `DB` | D1 | ✅ | 主数据库 |
| `BUCKET` | R2 | ✅ | 上传的图标 / 背景图 |
| `JWT_SECRET` | 机密/变量 | ✅ | JWT 签名密钥，**生产环境务必用强随机值** |

## ❗ 常见问题
- **`/api/*` 报 500 或数据为空**：确认已绑定 `DB` 且在 D1 Console 执行过 `schema.sql`，并在绑定后**重新部署**过。
- **登录后操作提示「无效 token」**：确认已设置 `JWT_SECRET`，且绑定后重新部署。
- **上传图片 404**：确认已绑定 `BUCKET`（R2 存储桶）。
- **改了代码但线上没变**：Git 连接方式下 `git push` 会自动触发部署；手动上传方式需重新 `npm run deploy`。

## 📄 许可证
MIT，详见 [LICENSE](LICENSE)。
