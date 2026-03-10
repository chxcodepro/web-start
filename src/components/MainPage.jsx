import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  LayoutGrid,
  Image as ImageIcon,
  Search,
  Settings,
  Lock,
  LogOut,
  User,
  Upload,
  Star,
  Home,
  Bot,
  Globe,
  Clock,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

import { SiteCard, SortableSiteCard } from './SiteCard';
import { SEARCH_ENGINES } from '../utils/constants';

/**
 * 主页面组件
 * 包含搜索框、站点列表、浮动操作按钮等
 */
export default function MainPage({
  // 基础数据
  isAdmin,
  hasLoginSession,
  activePage,
  // 搜索相关
  searchQuery,
  setSearchQuery,
  searchSuggestions,
  isSearchFocused,
  setIsSearchFocused,
  activeSuggestionIndex,
  setActiveSuggestionIndex,
  isEngineDropdownOpen,
  setIsEngineDropdownOpen,
  searchEngine,
  searchInputRef,
  handleSearch,
  handleSuggestionSelect,
  changeSearchEngine,
  handleSearchInputKeyDown,
  // 站点管理相关
  pinnedSites,
  groupedSites,
  sensors,
  activeDragSite,
  handleDragStart,
  handleDragEnd,
  handleDragCancel,
  isBatchMode,
  setIsBatchMode,
  selectedSiteIds,
  toggleSiteSelection,
  toggleSelectAllSites,
  requestDeleteSelectedSites,
  collapsedGroups,
  setCollapsedGroups,
  editingGroupInline,
  setEditingGroupInline,
  editingGroupInlineName,
  setEditingGroupInlineName,
  renameGroup,
  requestRemoveGroup,
  setEditingSite,
  setIsModalOpen,
  requestDeleteSite,
  // 模态框控制
  setIsLoginModalOpen,
  setIsGroupModalOpen,
  setIsBgModalOpen,
  setIsWebDavModalOpen,
  setShowStarsPage,
  showStarsPage,
  showAiPage,
  onOpenAiPage,
  importInputRef,
  handleShowAdmin,
  handleRequestAdminExit,
}) {
  return (
    <>
      {/* 左上角 Tab 导航 */}
      <PageTabs showStarsPage={showStarsPage} setShowStarsPage={setShowStarsPage} />
      <AiRope visible={!showStarsPage && !showAiPage} onClick={onOpenAiPage} />

      {/* 管理员模式提示 */}
      {isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
          <div className="px-3 py-0.5 text-xs font-medium backdrop-blur-md rounded-b-lg shadow-lg bg-green-600/90 text-white flex items-center gap-1">
            <User size={10} /> 管理员模式
          </div>
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 pr-16 md:pl-16 md:pr-24 py-8 max-w-[1600px] pb-40 transition-all duration-300">
        {/* 搜索框区域 */}
        <SearchBox
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchSuggestions={searchSuggestions}
          isSearchFocused={isSearchFocused}
          setIsSearchFocused={setIsSearchFocused}
          activeSuggestionIndex={activeSuggestionIndex}
          setActiveSuggestionIndex={setActiveSuggestionIndex}
          isEngineDropdownOpen={isEngineDropdownOpen}
          setIsEngineDropdownOpen={setIsEngineDropdownOpen}
          searchEngine={searchEngine}
          searchInputRef={searchInputRef}
          handleSearch={handleSearch}
          handleSuggestionSelect={handleSuggestionSelect}
          changeSearchEngine={changeSearchEngine}
          handleSearchInputKeyDown={handleSearchInputKeyDown}
        />

        {/* 搜索遮罩层 */}
        {(isSearchFocused || isEngineDropdownOpen) && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 animate-fade-in"
            onClick={() => {
              setIsSearchFocused(false);
              setIsEngineDropdownOpen(false);
            }}
          />
        )}

        {/* 置顶站点 */}
        {pinnedSites.length > 0 && (
          <div className="mb-6 animate-fade-in-up">
            <div className="flex flex-wrap justify-center gap-1.5">
              {pinnedSites.map(site => (
                <SiteCard
                  key={site.id}
                  site={site}
                  className="w-28 md:w-36 lg:w-40"
                  isAdmin={isAdmin}
                  onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                  onDelete={() => requestDeleteSite(site.id)}
                  isBatchMode={isBatchMode}
                  isSelected={selectedSiteIds.includes(site.id)}
                  onToggleSelect={toggleSiteSelection}
                />
              ))}
            </div>
          </div>
        )}

        {/* 分组站点列表 */}
        <SiteGroups
          activePage={activePage}
          groupedSites={groupedSites}
          isAdmin={isAdmin}
          isBatchMode={isBatchMode}
          selectedSiteIds={selectedSiteIds}
          toggleSiteSelection={toggleSiteSelection}
          collapsedGroups={collapsedGroups}
          setCollapsedGroups={setCollapsedGroups}
          editingGroupInline={editingGroupInline}
          setEditingGroupInline={setEditingGroupInline}
          editingGroupInlineName={editingGroupInlineName}
          setEditingGroupInlineName={setEditingGroupInlineName}
          renameGroup={renameGroup}
          requestRemoveGroup={requestRemoveGroup}
          setEditingSite={setEditingSite}
          setIsModalOpen={setIsModalOpen}
          requestDeleteSite={requestDeleteSite}
          sensors={sensors}
          activeDragSite={activeDragSite}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleDragCancel={handleDragCancel}
        />

        {/* 浮动操作按钮 */}
        <FloatingButtons
          isAdmin={isAdmin}
          hasLoginSession={hasLoginSession}
          isBatchMode={isBatchMode}
          setIsBatchMode={setIsBatchMode}
          selectedSiteIds={selectedSiteIds}
          activePage={activePage}
          toggleSelectAllSites={toggleSelectAllSites}
          requestDeleteSelectedSites={requestDeleteSelectedSites}
          setIsLoginModalOpen={setIsLoginModalOpen}
          setIsGroupModalOpen={setIsGroupModalOpen}
          setIsBgModalOpen={setIsBgModalOpen}
          setIsWebDavModalOpen={setIsWebDavModalOpen}
          importInputRef={importInputRef}
          setEditingSite={setEditingSite}
          setIsModalOpen={setIsModalOpen}
          handleShowAdmin={handleShowAdmin}
          handleRequestAdminExit={handleRequestAdminExit}
        />
      </div>
    </>
  );
}

function AiRope({ visible, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`fixed right-5 top-5 z-50 hidden items-center md:flex ${visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-opacity duration-300`}
      title="进入 AI 助手"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.12] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(4,10,25,0.28)] backdrop-blur-2xl transition hover:bg-white/[0.18] hover:text-white hover:scale-110">
        <Bot size={16} />
      </div>
    </button>
  );
}

/**
 * 搜索框组件
 */
function SearchBox({
  searchQuery,
  setSearchQuery,
  searchSuggestions,
  isSearchFocused,
  setIsSearchFocused,
  activeSuggestionIndex,
  setActiveSuggestionIndex,
  isEngineDropdownOpen,
  setIsEngineDropdownOpen,
  searchEngine,
  searchInputRef,
  handleSearch,
  handleSuggestionSelect,
  changeSearchEngine,
  handleSearchInputKeyDown,
}) {
  return (
    <div className={`flex flex-col items-center justify-center mb-8 pt-10 md:pt-14 relative ${isSearchFocused || isEngineDropdownOpen ? 'z-40' : 'z-20'}`}>
      <div className="w-full max-w-2xl relative group animate-fade-in-up">
        <div className="relative backdrop-blur-xl bg-white/10 rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.3)] hover:border-white/30 transition-all duration-300 hover:scale-[1.01]">
          <form onSubmit={handleSearch} className="relative w-full flex items-center">
            {/* 搜索引擎选择器 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEngineDropdownOpen(!isEngineDropdownOpen)}
                onBlur={() => setTimeout(() => setIsEngineDropdownOpen(false), 150)}
                className="h-12 md:h-14 pl-4 md:pl-5 pr-6 md:pr-8 bg-transparent border-r border-white/10 text-white/90 focus:outline-none cursor-pointer text-sm font-medium hover:text-white transition-colors flex items-center gap-2"
              >
                {SEARCH_ENGINES[searchEngine]?.name || 'Google'}
              </button>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className={`transition-transform ${isEngineDropdownOpen ? 'rotate-180' : ''}`}>
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              {isEngineDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 z-[70] backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden min-w-[120px] animate-slide-down">
                  {Object.entries(SEARCH_ENGINES).map(([key, engine]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        changeSearchEngine(key);
                        setIsEngineDropdownOpen(false);
                        setTimeout(() => searchInputRef.current?.focus(), 0);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-all flex items-center gap-2 ${
                        searchEngine === key
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {searchEngine === key && <Check size={14} className="text-cyan-400" />}
                      <span className={searchEngine === key ? '' : 'pl-5'}>{engine.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* 搜索输入框 */}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onClick={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => { setIsSearchFocused(false); setActiveSuggestionIndex(-1); }, 120)}
              onKeyDown={handleSearchInputKeyDown}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveSuggestionIndex(-1);
                if (!isSearchFocused) setIsSearchFocused(true);
              }}
              placeholder="搜索..."
              className="flex-1 h-12 md:h-14 px-3 md:px-4 bg-transparent text-white placeholder-white/40 text-base md:text-lg focus:outline-none"
            />
            <button type="submit" className="pr-4 md:pr-5 pl-2 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer">
              <Search className="w-5 h-5 md:w-[22px] md:h-[22px]" />
            </button>
          </form>
        </div>
        {/* 搜索建议下拉 */}
        {isSearchFocused && searchQuery.trim().length >= 1 && searchSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-3 z-[70] backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden animate-slide-down">
            {searchSuggestions.map((suggestion, index) => {
              const isSite = suggestion?.type === 'site';
              const isHistory = suggestion?.type === 'history';
              const displayText = isSite ? suggestion.name : (suggestion?.text || suggestion);
              return (
                <button
                  key={isSite ? `site-${suggestion.url}` : `text-${index}-${displayText}`}
                  type="button"
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSuggestionSelect(suggestion);
                  }}
                  className={`w-full text-left px-5 py-3 text-sm transition-all duration-150 flex items-center gap-3 ${
                    activeSuggestionIndex === index
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isSite ? (
                    <>
                      {suggestion.logo ? (
                        <img src={suggestion.logo} alt="" className="w-5 h-5 rounded object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <Globe size={14} className="text-cyan-400" />
                      )}
                      <span className="flex-1">{displayText}</span>
                      <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded">{suggestion.group}</span>
                      <span className="text-xs text-cyan-400/70">Tab 补全</span>
                    </>
                  ) : isHistory ? (
                    <>
                      <Clock size={14} className="text-white/40" />
                      <span>{displayText}</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} className="text-white/40" />
                      <span>{displayText}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 站点分组列表组件
 */
function SiteGroups({
  activePage,
  groupedSites,
  isAdmin,
  isBatchMode,
  selectedSiteIds,
  toggleSiteSelection,
  collapsedGroups,
  setCollapsedGroups,
  editingGroupInline,
  setEditingGroupInline,
  editingGroupInlineName,
  setEditingGroupInlineName,
  renameGroup,
  requestRemoveGroup,
  setEditingSite,
  setIsModalOpen,
  requestDeleteSite,
  sensors,
  activeDragSite,
  handleDragStart,
  handleDragEnd,
  handleDragCancel,
}) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        {activePage.groups.map((group, groupIndex) => {
          const groupItems = groupedSites[group] || [];
          if (!isAdmin && groupItems.length === 0) return null;
          const isCollapsed = collapsedGroups[group];
          return (
            <div key={group} className="animate-fade-in-up" style={{ animationDelay: `${groupIndex * 0.1}s` }}>
              <div className="flex items-center justify-between mb-2 pb-0.5 border-b border-white/5">
                {editingGroupInline === group ? (
                  <div className="flex items-center gap-2 animate-fade-in-scale">
                    <input
                      type="text"
                      value={editingGroupInlineName}
                      onChange={(e) => setEditingGroupInlineName(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-lg font-bold focus:border-blue-500 focus:outline-none transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const ok = renameGroup(group, editingGroupInlineName);
                          if (ok) { setEditingGroupInline(null); setEditingGroupInlineName(''); }
                        }
                        if (e.key === 'Escape') { setEditingGroupInline(null); setEditingGroupInlineName(''); }
                      }}
                    />
                    <button onClick={() => { const ok = renameGroup(group, editingGroupInlineName); if (ok) { setEditingGroupInline(null); setEditingGroupInlineName(''); } }} className="p-1 hover:bg-white/10 rounded-md text-green-400 transition btn-press" title="保存"><Check size={16} /></button>
                    <button onClick={() => { setEditingGroupInline(null); setEditingGroupInlineName(''); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition btn-press" title="取消"><X size={16} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                    className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2 hover:text-white transition-colors btn-press"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                      className={`icon-rotate text-white/40 ${isCollapsed ? '' : 'rotated'}`}
                    >
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    </svg>
                    {group}
                    <span className="text-xs text-white/30 font-normal">({groupItems.length})</span>
                  </button>
                )}
                {isAdmin && editingGroupInline !== group && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingGroupInline(group); setEditingGroupInlineName(group); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-blue-400 transition btn-press" title="编辑分组名称"><Edit2 size={16} /></button>
                    <button onClick={() => { setEditingSite({ group, pinned: false }); setIsModalOpen(true); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-green-400 transition btn-press" title="添加站点"><Plus size={16} /></button>
                    <button onClick={() => requestRemoveGroup(group)} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-red-400 transition btn-press" title="删除分组"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className={`group-content ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                <SortableContext items={groupItems.map(s => s.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-1.5">
                    {groupItems.map((site) => (
                      isAdmin && !isBatchMode ? (
                        <SortableSiteCard
                          key={site.id}
                          site={site}
                          isAdmin={isAdmin}
                          onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                          onDelete={() => requestDeleteSite(site.id)}
                          isBatchMode={isBatchMode}
                          isSelected={selectedSiteIds.includes(site.id)}
                          onToggleSelect={toggleSiteSelection}
                        />
                      ) : (
                        <SiteCard
                          key={site.id}
                          site={site}
                          isAdmin={isAdmin}
                          onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                          onDelete={() => requestDeleteSite(site.id)}
                          isBatchMode={isBatchMode}
                          isSelected={selectedSiteIds.includes(site.id)}
                          onToggleSelect={toggleSiteSelection}
                        />
                      )
                    ))}
                    {isAdmin && groupItems.length === 0 && (
                      <button onClick={() => { setEditingSite({ group, pinned: false }); setIsModalOpen(true); }} className="h-20 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/20 hover:border-white/20 hover:text-white/50 transition-all hover:bg-white/5">
                        <Plus size={20} />
                        <span className="text-xs mt-1 font-medium">添加</span>
                      </button>
                    )}
                  </div>
                </SortableContext>
              </div>
            </div>
          );
        })}

        {/* 未分类站点 */}
        {groupedSites['Others']?.length > 0 && (
          <div className="animate-fade-in opacity-80">
            <div className="flex items-center justify-between mb-2 pb-0.5 border-b border-white/5"><h3 className="text-lg font-bold text-white/90">未分类</h3></div>
            <SortableContext items={groupedSites['Others'].map(s => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                {groupedSites['Others'].map(site => (
                  isAdmin && !isBatchMode ? (
                    <SortableSiteCard
                      key={site.id}
                      site={site}
                      isAdmin={isAdmin}
                      onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                      onDelete={() => requestDeleteSite(site.id)}
                      isBatchMode={isBatchMode}
                      isSelected={selectedSiteIds.includes(site.id)}
                      onToggleSelect={toggleSiteSelection}
                    />
                  ) : (
                    <SiteCard
                      key={site.id}
                      site={site}
                      isAdmin={isAdmin}
                      onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                      onDelete={() => requestDeleteSite(site.id)}
                      isBatchMode={isBatchMode}
                      isSelected={selectedSiteIds.includes(site.id)}
                      onToggleSelect={toggleSiteSelection}
                    />
                  )
                ))}
              </div>
            </SortableContext>
          </div>
        )}
      </div>
      {/* 拖拽预览 */}
      <DragOverlay>
        {activeDragSite ? (
          <div className="opacity-90">
            <SiteCard
              site={activeDragSite}
              isAdmin={false}
              onEdit={() => {}}
              onDelete={() => {}}
              isBatchMode={false}
              isSelected={false}
              onToggleSelect={() => {}}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * 浮动操作按钮组件
 */
function FloatingButtons({
  isAdmin,
  hasLoginSession,
  isBatchMode,
  setIsBatchMode,
  selectedSiteIds,
  activePage,
  toggleSelectAllSites,
  requestDeleteSelectedSites,
  setIsLoginModalOpen,
  setIsGroupModalOpen,
  setIsBgModalOpen,
  setIsWebDavModalOpen,
  importInputRef,
  setEditingSite,
  setIsModalOpen,
  handleShowAdmin,
  handleRequestAdminExit,
}) {
  return (
    <div className="fixed bottom-6 right-4 md:bottom-8 md:right-8 flex flex-col gap-2 md:gap-3 z-40 animate-slide-in-right">
      {!isAdmin ? (
        hasLoginSession ? (
          <button onClick={handleShowAdmin} className="w-11 h-11 md:w-12 md:h-12 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press animate-float" title="显示管理员">
            <User size={18} className="md:w-5 md:h-5" />
          </button>
        ) : (
          <button onClick={() => setIsLoginModalOpen(true)} className="w-11 h-11 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full shadow-lg backdrop-blur-sm flex items-center justify-center transition-all border border-white/10 btn-press animate-float" title="管理员登录">
            <Lock size={18} className="md:w-5 md:h-5" />
          </button>
        )
      ) : (
        <>
          <button onClick={() => setIsGroupModalOpen(true)} className="w-11 h-11 md:w-12 md:h-12 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="管理分组"><LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" /></button>
          <button onClick={() => setIsBgModalOpen(true)} className="w-11 h-11 md:w-12 md:h-12 bg-gray-700/90 hover:bg-gray-600 text-white rounded-full shadow-lg shadow-black/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="设置背景"><ImageIcon size={16} className="md:w-[18px] md:h-[18px]" /></button>
          <button onClick={() => setIsWebDavModalOpen(true)} className="w-11 h-11 md:w-12 md:h-12 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-full shadow-lg shadow-cyan-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="WebDAV"><Settings size={16} className="md:w-[18px] md:h-[18px]" /></button>
          <button onClick={() => importInputRef.current?.click()} className="w-11 h-11 md:w-12 md:h-12 bg-violet-600/90 hover:bg-violet-500 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="导入书签"><Upload size={16} className="md:w-[18px] md:h-[18px]" /></button>
          <button onClick={() => setIsBatchMode(v => !v)} className={`w-11 h-11 md:w-12 md:h-12 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press ${isBatchMode ? 'bg-amber-600/90 hover:bg-amber-500 shadow-amber-900/40' : 'bg-white/20 hover:bg-white/30 shadow-black/40'}`} title={isBatchMode ? '退出批量' : '批量删除'}><Trash2 size={16} className="md:w-[18px] md:h-[18px]" /></button>
          {isBatchMode && (
            <>
              <button onClick={toggleSelectAllSites} className="w-11 h-11 md:w-12 md:h-12 bg-white/20 hover:bg-white/30 text-white rounded-full shadow-lg shadow-black/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press animate-bounce-in" title={selectedSiteIds.length === (activePage.sites || []).length && (activePage.sites || []).length > 0 ? '取消全选' : '全选'}><Check size={16} className="md:w-[18px] md:h-[18px]" /></button>
              <button onClick={requestDeleteSelectedSites} disabled={selectedSiteIds.length === 0} className="w-11 h-11 md:w-12 md:h-12 bg-red-600/90 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press animate-bounce-in" title={`删除选中 (${selectedSiteIds.length})`}><Trash2 size={16} className="md:w-[18px] md:h-[18px]" /></button>
            </>
          )}
          <button onClick={() => { setEditingSite(null); setIsModalOpen(true); }} className="w-11 h-11 md:w-12 md:h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press animate-pulse-glow" title="添加站点"><Plus size={18} className="md:w-5 md:h-5" /></button>
          <button onClick={handleRequestAdminExit} className="w-11 h-11 md:w-12 md:h-12 bg-red-600/80 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-900/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="隐藏或退出"><LogOut size={16} className="md:w-[18px] md:h-[18px]" /></button>
        </>
      )}
    </div>
  );
}

/**
 * 页面 Tab 导航组件
 */
function PageTabs({ showStarsPage, setShowStarsPage }) {
  return (
    <div className="fixed top-4 left-4 md:left-8 z-50">
      <div className="flex bg-white/10 backdrop-blur-xl rounded-xl p-1 border border-white/10 shadow-lg">
        <button
          onClick={() => setShowStarsPage(false)}
          className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 transition-all ${
            !showStarsPage
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Home size={14} className="md:w-4 md:h-4" />
          <span className="hidden xs:inline">导航</span>
        </button>
        <button
          onClick={() => setShowStarsPage(true)}
          className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 transition-all ${
            showStarsPage
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Star size={14} className="md:w-4 md:h-4" />
          Stars
        </button>
      </div>
    </div>
  );
}
