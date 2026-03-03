# Web Start - 个人导航主页

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5.1-646CFF?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-10.12-FFCA28?style=flat-square&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat-square&logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  一个现代化的个人导航页，基于 <strong>React + Vite + Firebase + TailwindCSS</strong> 构建。<br />
  支持云端同步、GitHub Stars 管理、AI 智能分组、WebDAV 备份等功能。
</p>

## 在线预览

🌐 **演示地址**：[https://webstart.chxpro.com](https://webstart.chxpro.com)

## 页面预览

<p align="center">
  <img src="https://pic.9989.us/20260130101605812.png" alt="PC 端界面" width="45%" />
  <img src="https://pic.9989.us/20260130101605814.png" alt="移动端适配" width="45%" />
  <img src="https://pic.9989.us/20260130101605815.png" alt="可视化编辑" width="45%" />
  <img src="https://pic.9989.us/20260130101605816.png" alt="管理员登录" width="45%" />
</p>

## 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| ☁️ **云端同步** | 数据自动保存到 Firebase，多设备实时同步 |
| 🔐 **权限管理** | 支持管理员登录，区分访客/管理员权限 |
| 📁 **分组管理** | 站点按分组展示，支持折叠、拖拽排序、重命名 |
| 🔍 **智能搜索** | 内置 Google/Bing/DuckDuckGo 搜索，带历史记录和联想建议 |
| 📱 **响应式设计** | 完美适配桌面端和移动端 |

### 站点管理

| 功能 | 描述 |
|------|------|
| ➕ **添加站点** | 支持外网地址 + 内网地址双链接 |
| 📌 **置顶站点** | 重要站点可置顶显示 |
| 🖼️ **自动图标** | 智能获取网站 Favicon，多源备用 |
| 📑 **书签导入** | 支持导入浏览器书签 HTML，自动解析文件夹结构 |
| ✅ **批量操作** | 支持多选、全选、批量删除、批量移动分组 |
| 🎨 **拖拽排序** | 站点和分组均支持拖拽排序 |

### GitHub Stars 管理

| 功能 | 描述 |
|------|------|
| ⭐ **同步 Stars** | 一键获取 GitHub 收藏的仓库 |
| 🤖 **AI 分组** | 使用 AI 自动对仓库进行智能分类 |
| 📝 **仓库备注** | 为仓库添加个人备注 |
| 📌 **仓库置顶** | 重要仓库可置顶 |
| 🔖 **预设分组** | 可配置预设分组，AI 优先使用 |
| 🔄 **重置分组** | 支持清空分组重新 AI 分析 |

### 数据备份

| 功能 | 描述 |
|------|------|
| 💾 **WebDAV 备份** | 支持坚果云等 WebDAV 服务备份/恢复 |
| 📤 **导出数据** | 支持导出完整配置 |

---

## 快速部署

最简单的方式是 Fork 本项目后部署到 Vercel：

### 1. Fork 项目

点击本仓库右上角的 **Fork** 按钮，将项目复制到你的 GitHub 账号下。

### 2. 配置 Firebase

1. 访问 [Firebase 控制台](https://console.firebase.google.com/) 创建项目

2. **开启 Firestore Database**
   - 进入 Build → Firestore Database
   - 创建数据库，选择区域
   - 测试阶段可使用测试模式

3. **开启 Authentication**
   - 进入 Build → Authentication
   - 启用 Google 登录方式

4. **获取配置信息**
   - 进入项目设置 → 常规 → 您的应用
   - 点击 Web 图标创建 Web 应用
   - 复制 `firebaseConfig` 配置

5. **修改配置文件**

   在你 Fork 的仓库中，修改 `src/firebase.js` 文件中的配置：

   ```js
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id",
     measurementId: "G-XXXXXXXX"
   };
   ```

### 3. 部署到 Vercel

1. 访问 [Vercel](https://vercel.com/)，使用 GitHub 账号登录

2. 点击 **New Project**，导入你 Fork 的仓库

3. 直接点击 **Deploy** 开始部署

4. **重要**：部署完成后，在 Firebase Authentication 的「已获授权域名」中添加你的 Vercel 域名

### 4. 配置 Firestore 安全规则

建议将写权限限制为管理员账号：

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == "your-admin@gmail.com";
    }
  }
}
```

---

## 本地开发

如果你想在本地进行开发或自定义修改：

### 环境要求

- Node.js >= 16
- npm 或 yarn

### 开发步骤

```bash
# 克隆项目（或你 Fork 的仓库）
git clone https://github.com/chxcodepro/web-start.git
cd web-start

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

## GitHub Stars 功能配置

### 方式一：Personal Access Token（推荐）

1. 访问 [GitHub Token 设置页](https://github.com/settings/tokens/new?scopes=read:user&description=Web-Start-Stars)

2. 创建一个具有 `read:user` 权限的 Token

3. 在导航页登录管理员账号

4. 点击右上角 ⭐ 按钮进入 Stars 页面

5. 点击设置按钮，选择 **PAT 认证**，粘贴 Token 并测试连接

### 方式二：OAuth 授权（可选）

需要创建 GitHub OAuth App 并配置环境变量：

1. 访问 [GitHub OAuth Apps](https://github.com/settings/developers) 创建新应用

2. 填写信息：
   | 字段 | 值 |
   |------|-----|
   | Application name | `Web Start Stars` |
   | Homepage URL | `https://your-domain.com` |
   | Authorization callback URL | `https://your-domain.com/oauth-callback` |

3. 创建后获取 Client ID 和 Client Secret

4. 在 Vercel 项目设置 → Environment Variables 添加：

   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

---

## AI 分组配置

Stars 功能支持使用 AI 自动对仓库进行智能分组，支持以下服务商：

| 服务商 | 模型 | 说明 |
|--------|------|------|
| **OpenAI** | GPT-4o-mini | 推荐，性价比高 |
| **Anthropic** | Claude-3.5-haiku | 质量高 |
| **Google** | Gemini-2.0-flash | 免费额度多 |
| **自定义** | 任意模型 | 兼容 OpenAI API 格式的端点 |

### 配置步骤

1. 在 Stars 设置中选择 AI 服务商

2. 填入对应的 API Key

3. （可选）配置预设分组，AI 会优先使用这些分组名

4. 点击「AI 分组」按钮开始分析

---

## WebDAV 备份配置

支持将站点数据备份到 WebDAV 服务（如坚果云）：

### 坚果云配置

1. 登录 [坚果云](https://www.jianguoyun.com/)

2. 进入账户信息 → 安全选项 → 第三方应用管理

3. 添加应用，获取应用密码

4. 在导航页设置中填入：
   | 字段 | 值 |
   |------|-----|
   | WebDAV 地址 | `https://dav.jianguoyun.com/dav/` |
   | 用户名 | 你的坚果云账号 |
   | 密码 | 生成的应用密码 |
   | 文件路径 | `/my-nav-backup.json` |

---

## 项目结构

```
web-start/
├── api/                      # Vercel Serverless Functions
│   ├── ai-analyze-repos.js   # AI 分组接口
│   ├── github-stars.js       # GitHub Stars 同步接口
│   ├── github-oauth-*.js     # GitHub OAuth 相关接口
│   ├── suggest.js            # 搜索建议接口
│   └── webdav-*.js           # WebDAV 备份/恢复接口
├── src/
│   ├── components/           # React 组件
│   │   ├── modals/           # 弹窗组件
│   │   ├── stars/            # GitHub Stars 相关组件
│   │   ├── MainPage.jsx      # 主页面
│   │   ├── SiteCard.jsx      # 站点卡片
│   │   └── ...
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useFirebase.js    # Firebase 认证和数据
│   │   ├── useGitHubStars.js # GitHub Stars 管理
│   │   ├── useSearch.js      # 搜索功能
│   │   ├── useSiteManager.js # 站点管理
│   │   └── useWebDav.js      # WebDAV 备份
│   ├── styles/               # 样式文件
│   ├── utils/                # 工具函数
│   ├── App.jsx               # 应用入口
│   ├── firebase.js           # Firebase 配置
│   └── main.jsx              # 渲染入口
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 技术栈

| 技术 | 用途 |
|------|------|
| [React 18](https://react.dev/) | UI 框架 |
| [Vite 5](https://vitejs.dev/) | 构建工具 |
| [TailwindCSS 3](https://tailwindcss.com/) | CSS 框架 |
| [Firebase](https://firebase.google.com/) | 后端服务（认证 + 数据库） |
| [dnd-kit](https://dndkit.com/) | 拖拽排序 |
| [Lucide React](https://lucide.dev/) | 图标库 |
| [Vercel](https://vercel.com/) | 部署平台 + Serverless Functions |

---

## 常见问题

### Q: 未登录用户能看到什么？

未登录用户可以：
- 查看所有站点和分组
- 使用搜索功能
- 查看 GitHub Stars（只读）

未登录用户不能：
- 添加/编辑/删除站点
- 管理分组
- 同步 Stars 或使用 AI 分组

### Q: 如何成为管理员？

在 Firestore 安全规则中配置你的 Google 账号邮箱即可。

### Q: 图标加载失败怎么办？

项目会按顺序尝试多个 Favicon 源，如果全部失败会显示站点名首字母。你也可以在编辑站点时手动指定图标 URL。

### Q: AI 分组不准确？

1. 尝试配置预设分组，引导 AI 使用特定分类
2. 使用「重置分组」功能清空后重新分析
3. 手动调整个别仓库的分组

---

## 更新日志

查看 [CHANGELOG](./CHANGELOG.md) 了解版本更新历史。

---

## 许可证

[MIT License](./LICENSE)

---

## 致谢

- [Unsplash](https://unsplash.com/) - 默认背景图片
- [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) - 默认站点图标
- [Shields.io](https://shields.io/) - README 徽章
