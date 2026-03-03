import { useState, useEffect, useMemo, useRef } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { mergePagesToSingle } from '../utils/helpers';

/**
 * 站点管理 Hook
 * 负责站点增删改、分组操作、拖拽排序、批量选择等
 */
export function useSiteManager({ pages, activePage, isAdmin, isLoading, savePagesToCloud, showToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', action: null });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [editingGroupInline, setEditingGroupInline] = useState(null);
  const [editingGroupInlineName, setEditingGroupInlineName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [activeDragId, setActiveDragId] = useState(null);

  // 用于防止竞态条件的 ref
  const mergeTimeoutRef = useRef(null);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 多页面合并为单页（添加 debounce 防止竞态条件）
  useEffect(() => {
    if (isLoading || !isAdmin || pages.length <= 1) return;

    // 清除之前的定时器，防止竞态
    if (mergeTimeoutRef.current) {
      clearTimeout(mergeTimeoutRef.current);
    }

    // 延迟执行，确保拿到最新的 activePage
    mergeTimeoutRef.current = setTimeout(() => {
      savePagesToCloud([activePage], { silent: true }).catch(() => {});
    }, 500);

    return () => {
      if (mergeTimeoutRef.current) {
        clearTimeout(mergeTimeoutRef.current);
      }
    };
  }, [isLoading, isAdmin, pages, savePagesToCloud]);

  // 清理无效的选中站点
  useEffect(() => {
    const siteIds = new Set((activePage.sites || []).map(s => s.id));
    setSelectedSiteIds(prev => prev.filter(id => siteIds.has(id)));
  }, [activePage]);

  // 退出批量模式时清空选择
  useEffect(() => {
    if (!isBatchMode) {
      setSelectedSiteIds([]);
    }
  }, [isBatchMode]);

  // 页面数据更新函数
  const updateCurrentPageData = (updater) => {
    const nextPage = updater(activePage);
    const normalizedPage = mergePagesToSingle([nextPage]);
    savePagesToCloud([normalizedPage]).catch(() => {});
  };

  // 站点操作
  const saveSite = (siteData) => {
    updateCurrentPageData(p => {
      let newSites;
      if (editingSite && editingSite.id) {
        newSites = p.sites.map(s => s.id === editingSite.id ? { ...siteData, id: editingSite.id } : s);
      } else {
        newSites = [...p.sites, { ...siteData, id: Date.now().toString() }];
      }
      return { ...p, sites: newSites };
    });
    setIsModalOpen(false);
    setEditingSite(null);
  };

  // 批量添加站点
  const saveSitesBatch = (sitesData) => {
    if (!sitesData || sitesData.length === 0) return;
    updateCurrentPageData(p => {
      const newSites = sitesData.map((site, index) => ({
        ...site,
        id: `${Date.now()}-${index}`,
      }));
      return { ...p, sites: [...p.sites, ...newSites] };
    });
    setIsModalOpen(false);
    setEditingSite(null);
    showToast(`成功添加 ${sitesData.length} 个站点`, 'success');
  };

  // 删除站点
  const requestDeleteSite = (id) => {
    setConfirmConfig({
      isOpen: true,
      message: '确定要删除这个站点吗？',
      action: () => {
        updateCurrentPageData(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) }));
        setConfirmConfig({ isOpen: false, message: '', action: null });
      }
    });
  };

  // 拖拽排序处理
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    updateCurrentPageData(p => {
      const oldIndex = p.sites.findIndex(s => s.id === active.id);
      const newIndex = p.sites.findIndex(s => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return p;

      const newSites = arrayMove(p.sites, oldIndex, newIndex);
      return { ...p, sites: newSites };
    });
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  // 分组操作
  const addGroup = (name) => {
    const nextName = String(name || '').trim();
    if (!nextName) return false;
    if (activePage.groups.includes(nextName)) {
      showToast('分组已存在，请换个名称', 'error');
      return false;
    }
    updateCurrentPageData(p => ({ ...p, groups: [...p.groups, nextName] }));
    return true;
  };

  const renameGroup = (oldName, newName) => {
    const oldKey = String(oldName || '').trim();
    const nextName = String(newName || '').trim();
    if (!oldKey || !nextName) {
      showToast('分组名称不能为空', 'error');
      return false;
    }
    if (oldKey === nextName) {
      return true;
    }
    if (activePage.groups.some(group => group === nextName && group !== oldKey)) {
      showToast('分组已存在，请换个名称', 'error');
      return false;
    }
    updateCurrentPageData((p) => ({
      ...p,
      groups: p.groups.map(group => (group === oldKey ? nextName : group)),
      sites: p.sites.map(site => (site.group === oldKey ? { ...site, group: nextName } : site)),
    }));
    return true;
  };

  const moveGroup = (groupName, direction) => {
    updateCurrentPageData((p) => {
      const currentIndex = p.groups.indexOf(groupName);
      if (currentIndex < 0) return p;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= p.groups.length) return p;
      const nextGroups = [...p.groups];
      [nextGroups[currentIndex], nextGroups[targetIndex]] = [nextGroups[targetIndex], nextGroups[currentIndex]];
      return { ...p, groups: nextGroups };
    });
  };

  const requestRemoveGroup = (name) => {
    setConfirmConfig({
      isOpen: true,
      message: `确定要删除分组"${name}"吗？`,
      action: () => {
        updateCurrentPageData(p => ({
          ...p,
          groups: p.groups.filter(g => g !== name),
          sites: p.sites.filter(s => s.group !== name),
        }));
        setConfirmConfig({ isOpen: false, message: '', action: null });
      }
    });
  };

  // 跨分组移动单个网站
  const moveSiteToGroup = (siteId, targetGroup) => {
    updateCurrentPageData(p => ({
      ...p,
      sites: p.sites.map(s =>
        s.id === siteId ? { ...s, group: targetGroup } : s
      )
    }));
  };

  // 跨分组批量移动网站
  const moveSitesToGroup = (siteIds, targetGroup) => {
    const idSet = new Set(siteIds);
    updateCurrentPageData(p => ({
      ...p,
      sites: p.sites.map(s =>
        idSet.has(s.id) ? { ...s, group: targetGroup } : s
      )
    }));
  };

  // 分组拖动排序
  const reorderGroups = (oldIndex, newIndex) => {
    updateCurrentPageData(p => ({
      ...p,
      groups: arrayMove(p.groups, oldIndex, newIndex)
    }));
  };

  // 批量删除网站
  const deleteSites = (siteIds) => {
    const idSet = new Set(siteIds);
    updateCurrentPageData(p => ({
      ...p,
      sites: p.sites.filter(s => !idSet.has(s.id))
    }));
  };

  // 批量选择
  const toggleSiteSelection = (siteId) => {
    setSelectedSiteIds((prev) => {
      if (prev.includes(siteId)) return prev.filter(id => id !== siteId);
      return [...prev, siteId];
    });
  };

  const toggleSelectAllSites = () => {
    const allSiteIds = (activePage.sites || []).map(s => s.id);
    if (allSiteIds.length === 0) return;
    setSelectedSiteIds((prev) => (prev.length === allSiteIds.length ? [] : allSiteIds));
  };

  const requestDeleteSelectedSites = () => {
    if (selectedSiteIds.length === 0) return;
    const selectedSet = new Set(selectedSiteIds);
    setConfirmConfig({
      isOpen: true,
      message: `确定要删除 ${selectedSiteIds.length} 个已选站点吗？`,
      action: () => {
        updateCurrentPageData(p => ({ ...p, sites: p.sites.filter(s => !selectedSet.has(s.id)) }));
        setSelectedSiteIds([]);
        setConfirmConfig({ isOpen: false, message: '', action: null });
      }
    });
  };

  // 计算属性
  const pinnedSites = useMemo(() => activePage.sites ? activePage.sites.filter(s => s.pinned) : [], [activePage]);
  const groupedSites = useMemo(() => {
    const map = {};
    if (!activePage.groups) return map;
    activePage.groups.forEach(g => map[g] = []);
    (activePage.sites || []).forEach(s => {
      if (!s.pinned) {
        if (activePage.groups.includes(s.group)) {
          map[s.group].push(s);
        } else {
          if (!map['Others']) map['Others'] = [];
          map['Others'].push(s);
        }
      }
    });
    return map;
  }, [activePage]);

  const activeDragSite = activeDragId ? (activePage.sites || []).find(s => s.id === activeDragId) : null;

  return {
    // 模态框状态
    isModalOpen,
    setIsModalOpen,
    editingSite,
    setEditingSite,
    isGroupModalOpen,
    setIsGroupModalOpen,
    confirmConfig,
    setConfirmConfig,
    // 批量模式
    isBatchMode,
    setIsBatchMode,
    selectedSiteIds,
    // 内联编辑
    editingGroupInline,
    setEditingGroupInline,
    editingGroupInlineName,
    setEditingGroupInlineName,
    // 分组折叠
    collapsedGroups,
    setCollapsedGroups,
    // 拖拽
    sensors,
    activeDragId,
    activeDragSite,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    // 站点操作
    saveSite,
    saveSitesBatch,
    requestDeleteSite,
    // 分组操作
    addGroup,
    renameGroup,
    moveGroup,
    requestRemoveGroup,
    reorderGroups,
    // 跨分组移动
    moveSiteToGroup,
    moveSitesToGroup,
    deleteSites,
    // 批量选择
    toggleSiteSelection,
    toggleSelectAllSites,
    requestDeleteSelectedSites,
    // 计算属性
    pinnedSites,
    groupedSites,
  };
}
