import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";

setGlobalOptions({ maxInstances: 10 });

const DEFAULT_FILE_PATH = "/my-nav-backup.json";

const normalizeConfig = (config = {}) => {
  const url = (config.url || "").trim().replace(/\/+$/, "");
  const username = (config.username || "").trim();
  const password = config.password || "";
  const filePathRaw = (config.filePath || DEFAULT_FILE_PATH).trim();
  const filePath = filePathRaw.startsWith("/") ? filePathRaw : `/${filePathRaw}`;

  return { url, username, password, filePath };
};

const buildTargetUrl = (config) => `${config.url}${config.filePath}`;

const getBasicAuthHeader = (username, password) => {
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
};

const toErrorText = (text) => {
  if (!text) return "";
  const compact = String(text).replace(/\s+/g, " ").trim();
  return compact.slice(0, 200);
};

const ensureAuth = (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "请先登录管理员账号。");
  }
};

const ensureConfig = (config) => {
  if (!config.url || !config.username || !config.password) {
    throw new HttpsError("invalid-argument", "缺少 WebDAV 地址、用户名或密码。");
  }
  if (!/^https:\/\//i.test(config.url)) {
    throw new HttpsError("invalid-argument", "WebDAV 地址必须是 https。");
  }
  if (!config.filePath) {
    throw new HttpsError("invalid-argument", "缺少 WebDAV 备份文件路径。");
  }
};

export const webdavBackup = onCall(async (request) => {
  ensureAuth(request);

  const config = normalizeConfig(request.data?.config);
  const backupData = request.data?.backupData;
  ensureConfig(config);

  if (!backupData || !Array.isArray(backupData.pages) || backupData.pages.length === 0) {
    throw new HttpsError("invalid-argument", "备份数据无效，缺少 pages。");
  }

  const targetUrl = buildTargetUrl(config);
  const response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: getBasicAuthHeader(config.username, config.password),
    },
    body: JSON.stringify(backupData, null, 2),
  });

  if (!response.ok) {
    const text = toErrorText(await response.text());
    throw new HttpsError(
      "failed-precondition",
      `WebDAV 上传失败（HTTP ${response.status}）。${text}`
    );
  }

  return { ok: true };
});

export const webdavRestore = onCall(async (request) => {
  ensureAuth(request);

  const config = normalizeConfig(request.data?.config);
  ensureConfig(config);

  const targetUrl = buildTargetUrl(config);
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Authorization: getBasicAuthHeader(config.username, config.password),
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    const text = toErrorText(await response.text());
    throw new HttpsError(
      "failed-precondition",
      `WebDAV 下载失败（HTTP ${response.status}）。${text}`
    );
  }

  const rawText = await response.text();
  let backupData = null;
  try {
    backupData = JSON.parse(rawText);
  } catch (error) {
    throw new HttpsError("data-loss", "WebDAV 文件不是合法 JSON。");
  }

  if (!Array.isArray(backupData?.pages) || backupData.pages.length === 0) {
    throw new HttpsError("data-loss", "备份文件缺少 pages 数据。");
  }

  return { backupData };
});
