# 导航主页（Nav）

一个基于 **React + Vite + Firebase** 的个人导航页项目，支持管理员登录、站点管理、分组管理、云端同步和书签导入。

## 在线预览

- 预览地址（Vercel）：[https://webstart.chxpro.com](https://webstart.chxpro.com)

## 页面预览

<p align="center">
  <img src="https://pic.9989.us/20260130101605812.png" alt="PC 端界面" width="45%" />
  <img src="https://pic.9989.us/20260130101605814.png" alt="移动端适配" width="45%" />
  <img src="https://pic.9989.us/20260130101605815.png" alt="可视化编辑" width="45%" />
  <img src="https://pic.9989.us/20260130101605816.png" alt="管理员登录" width="45%" />
</p>

## 功能特性

- 云端同步：配置修改后自动保存到 Firebase。
- 管理员权限：仅管理员可进行增删改操作。
- 可视化管理：页面、分组、站点均可在 UI 中管理。
- 书签导入：支持导入浏览器书签 HTML，自动按文件夹生成页面和分组。
- 批量删除：支持单选、全选、批量删除站点。
- **GitHub Stars 管理**：获取 GitHub Stars，使用 AI 自动分组，独立页面展示。

## 部署说明（Vercel + Firebase）

### 1. 配置 Firebase

1. 进入 [Firebase 控制台](https://console.firebase.google.com/) 创建项目。
2. 开启 Firestore Database（测试阶段可先使用测试模式）。
3. 开启 Authentication，并启用 Google 登录。
4. 在项目设置中创建 Web 应用，获取 `firebaseConfig`。
5. 将 `src/App.jsx` 中的 Firebase 配置替换为你自己的配置。

示例：

```js
const firebaseConfig = {
  apiKey: "xxxx",
  authDomain: "xxxx",
  projectId: "xxxx",
  storageBucket: "xxxx",
  messagingSenderId: "xxxx",
  appId: "xxxx",
  measurementId: "xxxx"
};
```

### 2. 部署到 Vercel

1. 把项目推送到 GitHub。
2. 在 Vercel 导入该仓库并部署。
3. 部署完成后，在 Firebase Authentication 的“已获授权域名”中加入你的 Vercel 域名。

## Firestore 安全规则（推荐）

建议把写权限限制为你的管理员账号：

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == "你的管理员邮箱@gmail.com";
    }
  }
}
```

## 本地开发

```bash
npm install
npm run dev
```

## GitHub Stars 功能配置

### 方式一：Personal Access Token（推荐）

1. 访问 [GitHub Token 设置页](https://github.com/settings/tokens/new?scopes=read:user&description=My-Nav-Stars)
2. 创建一个具有 `read:user` 权限的 Token
3. 在导航页管理员模式下，点击 ⭐ 按钮打开 Stars 页面
4. 进入设置，选择 PAT 认证方式，粘贴 Token 并测试连接

### 方式二：OAuth 授权（可选）

需要创建 GitHub OAuth App 并配置环境变量：

1. 访问 [GitHub OAuth Apps](https://github.com/settings/developers) 创建新应用
2. 填写信息：
   - Application name: `My Nav Stars`
   - Homepage URL: 你的部署地址（如 `https://your-domain.com`）
   - Authorization callback URL: `https://your-domain.com/oauth-callback`
3. 创建后获取 Client ID 和 Client Secret
4. 在 Vercel 项目设置中添加环境变量：
   ```
   GITHUB_CLIENT_ID=你的Client ID
   GITHUB_CLIENT_SECRET=你的Client Secret
   ```

### AI 自动分组配置

Stars 功能支持使用 AI 自动对仓库进行分组，支持以下服务商：

- **OpenAI**：使用 GPT-4o-mini 模型
- **Anthropic**：使用 Claude-3.5-haiku 模型
- **Google**：使用 Gemini-2.0-flash 模型
- **自定义**：任何 OpenAI 兼容的 API 端点

在 Stars 设置中选择 AI 服务商并填入 API Key 即可使用。

## 许可证

MIT
