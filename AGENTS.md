# Repository Guidelines

## Project Structure & Module Organization
- `src/main.jsx` 是应用入口，`src/App.jsx` 是当前主要页面与业务逻辑。
- `src/index.css` 仅引入 Tailwind 三层指令（`base/components/utilities`）。
- 根目录关键配置：`vite.config.js`、`tailwind.config.js`、`postcss.config.js`、`index.html`。
- 当前仓库还没有独立 `tests/` 和 `assets/` 目录；新增静态资源建议放在 `src/assets/`。

## Build, Test, and Development Commands
- `npm install`：安装依赖。
- `npm run dev`：启动 Vite 本地开发服务（含热更新）。
- `npm run build`：构建生产包到 `dist/`。
- `npm run preview`：本地预览已构建产物。
- `npm run lint`：执行 ESLint（配置为 `--max-warnings 0`，警告也会导致失败）。

## Coding Style & Naming Conventions
- 使用 2 空格缩进；新增代码保持与所在文件一致的分号/格式风格。
- React 组件名用 PascalCase（如 `SiteCard`），函数和变量用 camelCase（如 `savePagesToCloud`）。
- 状态命名遵循 `isXxx` / `setXxx` 习惯，常量使用全大写（如 `DEFAULT_BG`）。
- 样式优先使用 Tailwind 工具类；仅在必须动态计算时使用内联样式。

## Testing Guidelines
- 目前未接入自动化测试框架，仓库内暂无 `*.test.*` 文件。
- 新增测试时建议使用 Vitest + React Testing Library。
- 测试文件命名建议：`ComponentName.test.jsx`，可与组件同目录或放在 `src/__tests__/`。
- 在 PR 中至少提供手动验证步骤；涉及 UI 改动时附前后截图。

## Commit & Pull Request Guidelines
- 现有提交历史采用简短祈使句英文风格（如 `Update Firebase configuration settings`）。
- 建议提交信息格式：`<Verb> <scope> <summary>`，例如 `Fix modal close behavior`。
- PR 必须包含：变更说明、关联任务/Issue、验证命令与结果、UI 改动截图（如有）。

## Security & Configuration Tips
- 前端仓库不要提交真实密钥或私有配置。
- Firebase 等配置建议迁移到 `.env`，通过 `import.meta.env` 读取。
- 确保 `.env*`、密钥文件和本地调试配置已加入 `.gitignore`。
