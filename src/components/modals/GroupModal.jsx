// 综合管理面板组件
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Edit2, Trash2, LayoutGrid, Plus, Search, GripVertical } from 'lucide-react';
import {
  FAVICON_SERVICES,
  getDomainFromUrl,
  getCachedFavicon,
  setFaviconCache,
} from '../../utils/favicon';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  DragOverlay,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function GroupModal({
  isOpen,
  onClose,
  groups,
  sites,
  onAddGroup,
  onRemoveGroup,
  onRenameGroup,
  onReorderGroups,
  onMoveSiteToGroup,
  onMoveSitesToGroup,
  onDeleteSites,
  onEditSite,
  onAddSite,
  showToast
}) {
  const [selectedGroup, setSelectedGroup] = useState(groups[0] || '');
  const [newGroup, setNewGroup] = useState('');
  const [editingGroup, setEditingGroup] = useState('');
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [dragType, setDragType] = useState(null); // 'group' | 'site'

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 自定义碰撞检测：拖动网站时优先检测分组放置区域
  const customCollisionDetection = useCallback((args) => {
    // 如果正在拖动网站，优先检测分组放置区域
    if (dragType === 'site') {
      const pointerCollisions = pointerWithin(args);
      // 优先返回分组放置目标
      const groupDropTarget = pointerCollisions.find(c => c.data?.droppableContainer?.data?.current?.type === 'group-drop');
      if (groupDropTarget) {
        return [groupDropTarget];
      }
    }
    // 默认使用 closestCenter
    return closestCenter(args);
  }, [dragType]);

  // 当前分组的网站列表
  const currentGroupSites = useMemo(() => {
    if (!selectedGroup) return [];
    return (sites || []).filter(s => s.group === selectedGroup && !s.pinned);
  }, [sites, selectedGroup]);

  // 搜索过滤后的网站
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return currentGroupSites;
    const q = searchQuery.toLowerCase();
    return currentGroupSites.filter(s =>
      s.name?.toLowerCase().includes(q) || s.url?.toLowerCase().includes(q)
    );
  }, [currentGroupSites, searchQuery]);

  // 分组名称编辑
  const startEditGroup = (name) => {
    setEditingGroup(name);
    setEditingName(name);
  };

  const handleSaveGroupName = () => {
    if (!editingName.trim()) {
      showToast('分组名称不能为空', 'error');
      return;
    }
    const ok = onRenameGroup(editingGroup, editingName);
    if (!ok) return;
    if (selectedGroup === editingGroup) {
      setSelectedGroup(editingName);
    }
    showToast('分组名称已保存', 'success');
    setEditingGroup('');
    setEditingName('');
  };

  // 网站多选
  const toggleSiteSelection = (siteId) => {
    setSelectedSiteIds(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSiteIds.length === filteredSites.length && filteredSites.length > 0) {
      setSelectedSiteIds([]);
    } else {
      setSelectedSiteIds(filteredSites.map(s => s.id));
    }
  };

  // 删除选中的网站
  const handleDeleteSelected = () => {
    if (selectedSiteIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedSiteIds.length} 个站点吗？`)) return;
    onDeleteSites(selectedSiteIds);
    setSelectedSiteIds([]);
    showToast(`已删除 ${selectedSiteIds.length} 个站点`, 'success');
  };

  // 拖拽处理
  const handleDragStart = (event) => {
    const { active } = event;
    const type = active.data.current?.type;
    setDragType(type);

    if (type === 'group') {
      setActiveDragItem({ type: 'group', name: active.id });
    } else if (type === 'site') {
      const site = sites.find(s => s.id === active.id);
      // 如果拖拽的网站在选中列表中，记录批量拖拽
      const isBatchDrag = selectedSiteIds.includes(active.id) && selectedSiteIds.length > 1;
      setActiveDragItem({
        type: 'site',
        site,
        isBatch: isBatchDrag,
        batchCount: isBatchDrag ? selectedSiteIds.length : 1,
      });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragItem(null);
    setDragType(null);

    if (!over) return;

    // 分组拖动排序
    if (active.data.current?.type === 'group' && over.data.current?.type === 'group') {
      if (active.id !== over.id) {
        const oldIndex = groups.indexOf(active.id);
        const newIndex = groups.indexOf(over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          onReorderGroups(oldIndex, newIndex);
        }
      }
      return;
    }

    // 网站拖到分组上（跨分组移动）
    if (active.data.current?.type === 'site' && over.data.current?.type === 'group-drop') {
      const targetGroup = over.data.current.groupName;
      if (targetGroup !== selectedGroup) {
        // 如果拖拽的网站在选中列表中，批量移动所有选中的
        if (selectedSiteIds.includes(active.id) && selectedSiteIds.length > 1) {
          onMoveSitesToGroup(selectedSiteIds, targetGroup);
          showToast(`已将 ${selectedSiteIds.length} 个网站移动到「${targetGroup}」`, 'success');
          setSelectedSiteIds([]);
        } else {
          onMoveSiteToGroup(active.id, targetGroup);
          showToast(`已移动到「${targetGroup}」`, 'success');
        }
      }
      return;
    }

    // 同分组内网站排序（暂不支持，保持简单）
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
    setDragType(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={onClose} />
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-5xl max-h-[90vh] md:max-h-[80vh] shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-fade-in-scale flex flex-col">
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-4 md:p-6 pb-3 md:pb-4 border-b border-white/10">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <LayoutGrid size={18} className="text-indigo-400 md:w-5 md:h-5" />
            综合管理
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X size={18} className="text-white/70 hover:text-white" />
          </button>
        </div>

        {/* 主体内容 */}
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* 左侧：分组列表 */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 flex flex-col max-h-[35vh] md:max-h-none">
              {/* 新建分组 */}
              <div className="p-3 md:p-4 border-b border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGroup}
                    onChange={e => setNewGroup(e.target.value)}
                    placeholder="新分组..."
                    className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 focus:border-indigo-500/50 focus:outline-none transition-all"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newGroup.trim()) {
                        const ok = onAddGroup(newGroup);
                        if (ok) {
                          setSelectedGroup(newGroup);
                          setNewGroup('');
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const ok = onAddGroup(newGroup);
                      if (ok) {
                        setSelectedGroup(newGroup);
                        setNewGroup('');
                      }
                    }}
                    disabled={!newGroup.trim()}
                    className="px-3 py-2 bg-green-500/80 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* 分组列表 */}
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                <SortableContext items={groups} strategy={verticalListSortingStrategy}>
                  {groups.map((g) => (
                    <SortableGroupItem
                      key={g}
                      group={g}
                      isSelected={selectedGroup === g}
                      isEditing={editingGroup === g}
                      editingName={editingName}
                      setEditingName={setEditingName}
                      onSelect={() => {
                        setSelectedGroup(g);
                        setSelectedSiteIds([]);
                        setSearchQuery('');
                      }}
                      onStartEdit={() => startEditGroup(g)}
                      onSaveEdit={handleSaveGroupName}
                      onCancelEdit={() => { setEditingGroup(''); setEditingName(''); }}
                      onRemove={() => {
                        if (window.confirm(`确定要删除分组「${g}」及其所有站点吗？`)) {
                          onRemoveGroup(g);
                          if (selectedGroup === g) {
                            setSelectedGroup(groups.filter(x => x !== g)[0] || '');
                          }
                        }
                      }}
                      siteCount={(sites || []).filter(s => s.group === g && !s.pinned).length}
                      isDraggingSite={dragType === 'site'}
                    />
                  ))}
                </SortableContext>
                {groups.length === 0 && (
                  <div className="text-center py-8 text-white/40 text-sm">
                    暂无分组
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：网站列表 */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* 搜索和操作栏 */}
              <div className="p-3 md:p-4 border-b border-white/10 flex items-center gap-2 md:gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索网站..."
                    className="w-full bg-white/10 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-white/40 focus:border-indigo-500/50 focus:outline-none transition-all"
                  />
                </div>
                {selectedGroup && (
                  <button
                    onClick={() => onAddSite(selectedGroup)}
                    className="px-3 py-2 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                  >
                    <Plus size={14} />
                    添加
                  </button>
                )}
              </div>

              {/* 网站网格 */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
                {!selectedGroup ? (
                  <div className="flex items-center justify-center h-full text-white/40">
                    请选择一个分组
                  </div>
                ) : filteredSites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/40">
                    <p>{searchQuery ? '没有找到匹配的网站' : '该分组暂无网站'}</p>
                    {!searchQuery && (
                      <button
                        onClick={() => onAddSite(selectedGroup)}
                        className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all"
                      >
                        添加第一个网站
                      </button>
                    )}
                  </div>
                ) : (
                  <SortableContext items={filteredSites.map(s => s.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {filteredSites.map(site => (
                        <DraggableSiteCard
                          key={site.id}
                          site={site}
                          isSelected={selectedSiteIds.includes(site.id)}
                          onToggleSelect={() => toggleSiteSelection(site.id)}
                          onEdit={() => onEditSite(site)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>

              {/* 底部操作栏 */}
              <div className="p-3 md:p-4 border-t border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    disabled={filteredSites.length === 0}
                    className="text-sm text-white/60 hover:text-white transition flex items-center gap-2 disabled:opacity-40"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      selectedSiteIds.length === filteredSites.length && filteredSites.length > 0
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-white/30'
                    }`}>
                      {selectedSiteIds.length === filteredSites.length && filteredSites.length > 0 && (
                        <Check size={10} className="text-white" />
                      )}
                    </div>
                    {selectedSiteIds.length === filteredSites.length && filteredSites.length > 0 ? '取消全选' : '全选'}
                  </button>
                  {selectedSiteIds.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="text-sm text-red-400 hover:text-red-300 transition flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg"
                    >
                      <Trash2 size={14} />
                      删除选中 ({selectedSiteIds.length})
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm font-medium transition-all"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>

          {/* 拖拽预览 */}
          {typeof document !== 'undefined' && document.body && createPortal(
            <DragOverlay dropAnimation={null} zIndex={9999}>
              {activeDragItem?.type === 'group' && (
                <div className="px-3 py-2 bg-indigo-500/80 text-white rounded-lg shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-white/60" />
                    {activeDragItem.name}
                  </div>
                </div>
              )}
              {activeDragItem?.type === 'site' && activeDragItem.site && (
                <DragOverlaySiteCard
                  site={activeDragItem.site}
                  isBatch={activeDragItem.isBatch}
                  batchCount={activeDragItem.batchCount}
                />
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>
    </div>
  );
}

/**
 * 拖动预览的网站卡片（带图标）
 */
function DragOverlaySiteCard({ site, isBatch, batchCount }) {
  const [faviconIndex, setFaviconIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef(null);

  const domain = getDomainFromUrl(site.url || site.innerUrl || '');
  const faviconUrl = domain && faviconIndex < FAVICON_SERVICES.length
    ? FAVICON_SERVICES[faviconIndex](domain)
    : '';

  const handleImgError = () => {
    if (faviconIndex < FAVICON_SERVICES.length - 1) {
      setFaviconIndex(prev => prev + 1);
    } else {
      setImgError(true);
    }
  };

  return (
    <div className="relative">
      {/* 批量拖拽时显示数量徽章 */}
      {isBatch && batchCount > 1 && (
        <div className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-xs font-bold text-white">{batchCount}</span>
        </div>
      )}
      <div className="w-32 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 shadow-lg flex flex-col items-center justify-center p-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-1">
          {!imgError && faviconUrl ? (
            <img
              ref={imgRef}
              src={faviconUrl}
              alt=""
              className="w-5 h-5 object-contain"
              onError={handleImgError}
            />
          ) : (
            <span className="text-xs font-bold text-white/60">
              {site.name?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>
        <span className="text-xs text-white truncate max-w-full">
          {isBatch ? `${batchCount} 个网站` : site.name}
        </span>
      </div>
    </div>
  );
}

/**
 * 可拖动排序的分组项
 */
function SortableGroupItem({
  group,
  isSelected,
  isEditing,
  editingName,
  setEditingName,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRemove,
  siteCount,
  isDraggingSite,
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group,
    data: { type: 'group' },
  });

  // 当拖动网站时，分组项作为放置目标
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `group-drop-${group}`,
    data: { type: 'group-drop', groupName: group },
    disabled: !isDraggingSite,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 合并两个 ref
  const setRefs = (node) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  if (isEditing) {
    return (
      <div className="p-2 mb-1 bg-white/10 rounded-lg">
        <input
          type="text"
          value={editingName}
          onChange={e => setEditingName(e.target.value)}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm focus:border-indigo-500 focus:outline-none mb-2"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
        />
        <div className="flex gap-1">
          <button onClick={onSaveEdit} className="flex-1 px-2 py-1 bg-indigo-500 hover:bg-indigo-400 text-white rounded text-xs transition">
            保存
          </button>
          <button onClick={onCancelEdit} className="flex-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded text-xs transition">
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-2 p-2 mb-1 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
        isSelected
          ? 'bg-indigo-500/30 border border-indigo-500/50'
          : isOver
          ? 'bg-green-500/30 border border-green-500/50'
          : 'hover:bg-white/10 border border-transparent'
      }`}
      onClick={onSelect}
    >
      <div className="p-1 text-white/30 group-hover:text-white/60 transition">
        <GripVertical size={14} />
      </div>
      <span className="flex-1 text-sm text-white font-medium truncate">{group}</span>
      <span className="text-xs text-white/40">({siteCount})</span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onStartEdit(); }}
          className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-blue-400 transition cursor-pointer"
          title="重命名"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-red-400 transition cursor-pointer"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/**
 * 可拖动的网站卡片
 */
function DraggableSiteCard({ site, isSelected, onToggleSelect, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: site.id,
    data: { type: 'site', site },
  });

  // favicon 相关状态
  const [faviconIndex, setFaviconIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [cachedUrl, setCachedUrl] = useState(null);
  const imgRef = useRef(null);

  const domain = getDomainFromUrl(site.url || site.innerUrl || '');

  // 初始化时检查缓存
  useEffect(() => {
    setImgError(false);
    setFaviconIndex(0);
    setCachedUrl(null);
    if (domain) {
      const cached = getCachedFavicon(domain);
      if (cached) {
        setCachedUrl(cached);
      }
    }
  }, [domain]);

  // 优先用缓存，否则按服务列表获取
  const faviconUrl = cachedUrl || (domain && faviconIndex < FAVICON_SERVICES.length
    ? FAVICON_SERVICES[faviconIndex](domain)
    : '');

  // 图片加载成功时校验是否为有效图标
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;

    const { naturalWidth, naturalHeight } = img;
    const isGoogleApi = faviconUrl.includes('google.com/s2/favicons');
    const minValidSize = isGoogleApi ? 24 : 10;

    if (naturalWidth < minValidSize || naturalHeight < minValidSize) {
      handleImgError();
      return;
    }

    // 图标有效，缓存 URL
    if (!cachedUrl && domain && faviconUrl) {
      setFaviconCache(domain, faviconUrl);
      setCachedUrl(faviconUrl);
    }
  };

  // 图片加载失败时尝试下一个服务
  const handleImgError = () => {
    if (faviconIndex < FAVICON_SERVICES.length - 1) {
      setFaviconIndex(prev => prev + 1);
    } else {
      setImgError(true);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 安全获取域名显示
  let hostname = '';
  try {
    hostname = new URL(site.url).hostname.replace('www.', '');
  } catch {
    hostname = site.url || '';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative backdrop-blur-sm rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'bg-indigo-500/20 border-indigo-500/50'
          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      {/* 选择复选框 */}
      <div
        className="absolute top-2 left-2 z-10 cursor-pointer"
        onClick={e => { e.stopPropagation(); onToggleSelect(); }}
      >
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30'
            : 'border-white/30 hover:border-white/50 bg-black/20'
        }`}>
          {isSelected && <Check size={12} className="text-white" />}
        </div>
      </div>

      {/* 编辑按钮 */}
      <div
        className="absolute top-2 right-2 z-10 p-1 rounded bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        onClick={e => { e.stopPropagation(); onEdit(); }}
      >
        <Edit2 size={12} className="text-white/60" />
      </div>

      {/* 卡片内容 */}
      <div className="p-3 pt-8 flex flex-col items-center">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-2">
          {!imgError && faviconUrl ? (
            <img
              ref={imgRef}
              src={faviconUrl}
              alt=""
              className="w-6 h-6 object-contain"
              onLoad={handleImgLoad}
              onError={handleImgError}
            />
          ) : (
            <span className="text-sm font-bold text-white/60">
              {site.name?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>
        <span className="text-xs text-white font-medium text-center truncate w-full">{site.name}</span>
        <span className="text-[10px] text-white/40 truncate w-full text-center mt-0.5">
          {hostname}
        </span>
      </div>
    </div>
  );
}
