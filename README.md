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

## 许可证

MIT
