// 主应用组件
import { useState, useMemo, useCallback } from 'react';
import { Check, AlertTriangle } from 'lucide-react';

// 组件
import { SiteCard } from './components/SiteCard';
import {
  LoginModal,
  SiteModal,
  BgModal,
  GroupModal,
  ImportModal,
  WebDavModal,
  GitHubStarsSettingsModal,
} from './components/modals';
import GitHubStarsPage from './components/stars/GitHubStarsPage';
import LoadingPage from './components/LoadingPage';
import MainPage from './components/MainPage';
import VersionTag from './components/VersionTag';

// Hooks
import { useFirebase } from './hooks/useFirebase';
import { useGitHubStars } from './hooks/useGitHubStars';
import { useSearch } from './hooks/useSearch';
import { useWebDav } from './hooks/useWebDav';
import { useSiteManager } from './hooks/useSiteManager';
import { useBookmarkImport } from './hooks/useBookmarkImport';

// 工具函数和常量
import { mergePagesToSingle } from './utils/helpers';

// 全局样式
import { globalStyles } from './styles/globalStyles';

export default function App() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Toast 提示函数（使用 useCallback 保持引用稳定，避免触发下游 Hook 重复执行）
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  // Firebase Hook
  const firebase = useFirebase({ showToast });
  const {
    pages,
    setPages,
    isLoading,
    user,
    isAdmin,
    bgImage,
    setBgImage,
    savePagesToCloud,
    saveBgToCloud,
    handleLogout,
    getApiAuthHeaders,
  } = firebase;

  // 合并页面数据
  const activePage = useMemo(() => {
    return mergePagesToSingle(pages);
  }, [pages]);

  // GitHub Stars Hook
  const stars = useGitHubStars({ user, getApiAuthHeaders, showToast });
  const {
    showStarsPage,
    setShowStarsPage,
    starsConfig,
    starsRepos,
    starsGroups,
    starsSyncing,
    starsAnalyzing,
    starsLastSyncAt,
    isStarsSettingsOpen,
    setIsStarsSettingsOpen,
    handleTestGitHubToken,
    handleStartOAuth,
    handleSaveStarsConfig,
    handleSyncStars,
    handleAIAnalyze,
    handleUpdateStarsRepo,
    handleRenameStarsGroup,
    handleResetGroups,
  } = stars;

  // Search Hook
  const search = useSearch();
  const {
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
  } = search;

  // Site Manager Hook
  const siteManager = useSiteManager({
    pages,
    activePage,
    isAdmin,
    isLoading,
    savePagesToCloud,
    showToast,
  });
  const {
    isModalOpen,
    setIsModalOpen,
    editingSite,
    setEditingSite,
    isGroupModalOpen,
    setIsGroupModalOpen,
    confirmConfig,
    setConfirmConfig,
    isBatchMode,
    setIsBatchMode,
    selectedSiteIds,
    editingGroupInline,
    setEditingGroupInline,
    editingGroupInlineName,
    setEditingGroupInlineName,
    collapsedGroups,
    setCollapsedGroups,
    sensors,
    activeDragSite,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    saveSite,
    saveSitesBatch,
    requestDeleteSite,
    addGroup,
    renameGroup,
    moveGroup,
    requestRemoveGroup,
    reorderGroups,
    moveSiteToGroup,
    moveSitesToGroup,
    deleteSites,
    toggleSiteSelection,
    toggleSelectAllSites,
    requestDeleteSelectedSites,
    pinnedSites,
    groupedSites,
  } = siteManager;

  // WebDAV Hook
  const webdav = useWebDav({
    isAdmin,
    activePage,
    bgImage,
    setPages,
    setBgImage,
    getApiAuthHeaders,
    showToast,
  });
  const {
    isWebDavModalOpen,
    setIsWebDavModalOpen,
    webdavConfig,
    persistWebDavConfig,
    handleWebDavBackup,
    handleWebDavRestore,
  } = webdav;

  // Bookmark Import Hook
  const bookmark = useBookmarkImport({
    activePage,
    savePagesToCloud,
    showToast,
  });
  const {
    importModalData,
    setImportModalData,
    importInputRef,
    handleImportBookmarks,
    confirmImportBookmarks,
  } = bookmark;

  // 加载状态
  if (isLoading) {
    return (
      <>
        <style>{globalStyles}</style>
        <LoadingPage bgImage={bgImage} />
      </>
    );
  }

  // Stars 页面（未登录也能访问，但功能受限）
  if (showStarsPage) {
    return (
      <div className="min-h-screen w-full text-white relative font-sans selection:bg-purple-500 selection:text-white">
        <style>{globalStyles}</style>
        <div className={`fixed inset-0 z-0 bg-cover bg-center transition-all duration-700 ${!bgImage ? 'bg-gray-900' : ''}`} style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}} />
        <div className="fixed inset-0 z-0 bg-gray-900/50" />
        <div className="relative z-10">
          <GitHubStarsPage
            repos={starsRepos}
            groups={starsGroups}
            config={starsConfig}
            user={user}
            onBack={() => setShowStarsPage(false)}
            onSync={handleSyncStars}
            onAIAnalyze={handleAIAnalyze}
            onOpenSettings={() => setIsStarsSettingsOpen(true)}
            onUpdateRepo={handleUpdateStarsRepo}
            onRenameGroup={handleRenameStarsGroup}
            syncing={starsSyncing}
            analyzing={starsAnalyzing}
            lastSyncAt={starsLastSyncAt}
          />
        </div>
        {/* Stars 设置弹窗 */}
        {isStarsSettingsOpen && (
          <GitHubStarsSettingsModal
            isOpen={isStarsSettingsOpen}
            onClose={() => setIsStarsSettingsOpen(false)}
            initialConfig={starsConfig}
            onSaveConfig={handleSaveStarsConfig}
            onTestGitHub={handleTestGitHubToken}
            onStartOAuth={handleStartOAuth}
            onResetGroups={handleResetGroups}
            reposCount={starsRepos.length}
          />
        )}
        {/* Toast 提示 */}
        <ToastMessage toast={toast} />
      </div>
    );
  }

  // 主页面
  return (
    <div className="min-h-screen w-full text-white relative font-sans selection:bg-purple-500 selection:text-white">
      <style>{globalStyles}</style>

      {/* 背景层 */}
      <div className={`fixed inset-0 z-0 bg-cover bg-center transition-all duration-700 ${!bgImage ? 'bg-gray-900' : ''}`} style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}} />
      <div className="fixed inset-0 z-0 bg-gray-900/50" />

      {/* 主内容 */}
      <MainPage
        bgImage={bgImage}
        isAdmin={isAdmin}
        activePage={activePage}
        // 搜索
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
        // 站点管理
        pinnedSites={pinnedSites}
        groupedSites={groupedSites}
        sensors={sensors}
        activeDragSite={activeDragSite}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        handleDragCancel={handleDragCancel}
        isBatchMode={isBatchMode}
        setIsBatchMode={setIsBatchMode}
        selectedSiteIds={selectedSiteIds}
        toggleSiteSelection={toggleSiteSelection}
        toggleSelectAllSites={toggleSelectAllSites}
        requestDeleteSelectedSites={requestDeleteSelectedSites}
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
        // 模态框
        setIsLoginModalOpen={setIsLoginModalOpen}
        setIsGroupModalOpen={setIsGroupModalOpen}
        setIsBgModalOpen={setIsBgModalOpen}
        setIsWebDavModalOpen={setIsWebDavModalOpen}
        setShowStarsPage={setShowStarsPage}
        showStarsPage={showStarsPage}
        importInputRef={importInputRef}
        handleLogout={handleLogout}
      />

      {/* 隐藏的文件上传 */}
      <input
        ref={importInputRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={handleImportBookmarks}
      />

      {/* 弹窗组件 */}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isModalOpen && <SiteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={saveSite} onBatchSubmit={saveSitesBatch} initialData={editingSite} groups={activePage.groups} />}
      {isBgModalOpen && <BgModal isOpen={isBgModalOpen} onClose={() => setIsBgModalOpen(false)} currentBg={bgImage} onSave={saveBgToCloud} />}
      {isGroupModalOpen && (
        <GroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          groups={activePage.groups}
          sites={activePage.sites}
          onAddGroup={addGroup}
          onRemoveGroup={(name) => {
            requestRemoveGroup(name);
          }}
          onRenameGroup={renameGroup}
          onReorderGroups={reorderGroups}
          onMoveSiteToGroup={moveSiteToGroup}
          onMoveSitesToGroup={moveSitesToGroup}
          onDeleteSites={deleteSites}
          onEditSite={(site) => {
            setEditingSite(site);
            setIsModalOpen(true);
          }}
          onAddSite={(group) => {
            setEditingSite({ group, pinned: false });
            setIsModalOpen(true);
          }}
          showToast={showToast}
        />
      )}
      {importModalData && (
        <ImportModal
          isOpen={!!importModalData}
          onClose={() => setImportModalData(null)}
          importData={importModalData}
          existingGroups={activePage.groups}
          onConfirm={confirmImportBookmarks}
        />
      )}
      {isWebDavModalOpen && (
        <WebDavModal
          isOpen={isWebDavModalOpen}
          onClose={() => setIsWebDavModalOpen(false)}
          initialConfig={webdavConfig}
          onSaveConfig={persistWebDavConfig}
          onBackup={handleWebDavBackup}
          onRestore={handleWebDavRestore}
        />
      )}
      {isStarsSettingsOpen && (
        <GitHubStarsSettingsModal
          isOpen={isStarsSettingsOpen}
          onClose={() => setIsStarsSettingsOpen(false)}
          initialConfig={starsConfig}
          onSaveConfig={handleSaveStarsConfig}
          onTestGitHub={handleTestGitHubToken}
          onStartOAuth={handleStartOAuth}
          onResetGroups={handleResetGroups}
          reposCount={starsRepos.length}
        />
      )}

      {/* 确认弹窗 */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} />
          <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-sm p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-fade-in-scale">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 animate-pulse"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-bold text-white">确认操作</h3>
              <p className="text-white/70 text-sm">{confirmConfig.message}</p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition font-medium btn-press">取消</button>
                <button onClick={confirmConfig.action} className="flex-1 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white transition font-medium shadow-lg shadow-red-900/30 btn-press">删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      <ToastMessage toast={toast} />

      {/* 版本标签 */}
      <VersionTag isAdmin={isAdmin} />
    </div>
  );
}

/**
 * Toast 消息组件
 */
function ToastMessage({ toast }) {
  if (!toast.show) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-[fadeInDown_0.3s_ease-out]">
      <div className={`px-5 py-3 rounded-2xl backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-3 ${
        toast.type === 'success'
          ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
          : 'bg-red-500/20 border-red-400/30 text-red-300'
      }`}>
        {toast.type === 'success' ? (
          <Check size={18} className="text-emerald-400" />
        ) : (
          <AlertTriangle size={18} className="text-red-400" />
        )}
        <span className="text-sm font-medium">{toast.message}</span>
      </div>
    </div>
  );
}
