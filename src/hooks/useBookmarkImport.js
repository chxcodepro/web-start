import { useState, useRef } from 'react';
import { SINGLE_PAGE_ID, SINGLE_PAGE_NAME, BOOKMARK_UNGROUPED_GROUP } from '../utils/constants';
import { mergePagesToSingle } from '../utils/helpers';
import { getFaviconUrl } from '../utils/favicon';

/**
 * 书签导入 Hook
 * 负责书签 HTML 文件解析和导入
 */
export function useBookmarkImport({ activePage, savePagesToCloud, showToast }) {
  const [importModalData, setImportModalData] = useState(null);
  const importInputRef = useRef(null);

  // 解析书签 DL 节点
  const parseBookmarkDl = (dlNode) => {
    if (!dlNode) return [];
    const items = [];
    const children = Array.from(dlNode.children || []);

    children.forEach((node) => {
      if (node.tagName !== 'DT') return;

      const folderTitle = node.querySelector(':scope > H3');
      const linkNode = node.querySelector(':scope > A');
      if (folderTitle) {
        let next = node.nextElementSibling;
        while (next && next.tagName === 'P') next = next.nextElementSibling;
        const childDl = (next && next.tagName === 'DL') ? next : node.querySelector(':scope > DL');
        items.push({
          type: 'folder',
          name: folderTitle.textContent?.trim() || '未命名文件夹',
          children: parseBookmarkDl(childDl),
        });
        return;
      }

      if (linkNode) {
        items.push({
          type: 'link',
          name: linkNode.textContent?.trim() || '',
          href: linkNode.getAttribute('HREF') || linkNode.getAttribute('href') || '',
        });
      }
    });

    return items;
  };

  // 构建导入数据
  const buildBookmarkImportData = (htmlText) => {
    const parser = new DOMParser();
    const docObj = parser.parseFromString(htmlText, 'text/html');
    const rootDl = docObj.querySelector('DL');
    if (!rootDl) return { groups: [], sites: [] };

    const rootItems = parseBookmarkDl(rootDl);
    const groups = [];
    const groupSet = new Set();
    const sites = [];
    const importSeed = Date.now();

    const ensureGroup = (groupName) => {
      const normalized = (groupName || '').trim() || BOOKMARK_UNGROUPED_GROUP;
      if (!groupSet.has(normalized)) {
        groupSet.add(normalized);
        groups.push(normalized);
      }
      return normalized;
    };

    const pushSite = (item, groupName) => {
      const href = (item.href || '').trim();
      if (!/^https?:\/\//i.test(href)) return;
      let safeName = (item.name || '').trim();
      if (!safeName) {
        try { safeName = new URL(href).hostname; } catch (e) { safeName = href; }
      }
      const finalGroup = ensureGroup(groupName);
      sites.push({
        id: `import-${importSeed}-${sites.length}`,
        name: safeName,
        url: href,
        innerUrl: '',
        logo: getFaviconUrl(href),
        group: finalGroup,
        pinned: false,
        useFavicon: true,
      });
    };

    const walkItems = (items, currentGroup = BOOKMARK_UNGROUPED_GROUP) => {
      items.forEach((item) => {
        if (item.type === 'folder') {
          const nextGroup = ensureGroup(item.name);
          walkItems(item.children || [], nextGroup);
          return;
        }
        if (item.type === 'link') {
          pushSite(item, currentGroup);
        }
      });
    };

    walkItems(rootItems, BOOKMARK_UNGROUPED_GROUP);
    return { groups, sites };
  };

  // 处理导入书签
  const handleImportBookmarks = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const htmlText = await file.text();
      const importedData = buildBookmarkImportData(htmlText);
      if (importedData.sites.length === 0) {
        showToast('没有解析到可导入的书签内容', 'error');
        return;
      }
      setImportModalData(importedData);
    } catch (error) {
      console.error('导入书签失败:', error);
      const detail = error?.message || '请确认书签 HTML 文件格式正确。';
      showToast(`导入失败：${detail}`, 'error');
    }
  };

  // 确认导入
  const confirmImportBookmarks = async (targetGroup, createNewGroup) => {
    if (!importModalData) return;
    try {
      let finalGroup = targetGroup;
      if (createNewGroup && targetGroup) {
        finalGroup = targetGroup.trim();
        if (!finalGroup) {
          showToast('请输入新分组名称', 'error');
          return;
        }
      }
      const sitesWithGroup = importModalData.sites.map(site => ({
        ...site,
        group: finalGroup,
      }));
      const importedPage = {
        id: SINGLE_PAGE_ID,
        name: SINGLE_PAGE_NAME,
        groups: [finalGroup],
        sites: sitesWithGroup,
      };
      const mergedPage = mergePagesToSingle([activePage, importedPage]);
      await savePagesToCloud([mergedPage], { silent: true });
      showToast(`导入成功：新增 ${sitesWithGroup.length} 个站点，归入分组「${finalGroup}」`, 'success');
      setImportModalData(null);
    } catch (error) {
      console.error('导入书签失败:', error);
      showToast(`导入失败：${error?.message || '未知错误'}`, 'error');
    }
  };

  return {
    importModalData,
    setImportModalData,
    importInputRef,
    handleImportBookmarks,
    confirmImportBookmarks,
  };
}
