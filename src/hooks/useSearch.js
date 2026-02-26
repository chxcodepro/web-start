import { useState, useEffect, useRef } from 'react';
import { SEARCH_HISTORY_STORAGE_KEY, SEARCH_ENGINE_STORAGE_KEY, SEARCH_ENGINES } from '../utils/constants';

/**
 * 搜索功能 Hook
 * 负责搜索引擎切换、搜索历史、搜索建议等
 */
export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const [searchEngine, setSearchEngine] = useState(() => {
    try {
      const saved = localStorage.getItem(SEARCH_ENGINE_STORAGE_KEY);
      return saved && SEARCH_ENGINES[saved] ? saved : 'google';
    } catch (e) {
      return 'google';
    }
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
    } catch (e) {
      return [];
    }
  });

  const searchInputRef = useRef(null);

  // 搜索建议 effect
  useEffect(() => {
    const keyword = searchQuery.trim();
    if (keyword.length < 1) {
      setSearchSuggestions([]);
      return;
    }

    const localMatches = searchHistory
      .filter(item => item.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 4);

    setSearchSuggestions(localMatches);

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(keyword)}&engine=${searchEngine}`);
        if (!response.ok) throw new Error('请求失败');
        const data = await response.json();
        const onlineSuggestions = data.suggestions || [];

        const merged = [...localMatches, ...onlineSuggestions];
        const seen = new Set();
        const unique = merged.filter(item => {
          const key = String(item).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (!cancelled) setSearchSuggestions(unique.slice(0, 8));
      } catch (error) {
        console.log('在线建议获取失败，使用本地历史');
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchHistory, searchEngine]);

  useEffect(() => {
    if (!isSearchFocused || searchSuggestions.length === 0) {
      setActiveSuggestionIndex(-1);
      return;
    }
    setActiveSuggestionIndex((prev) => (prev >= searchSuggestions.length ? 0 : prev));
  }, [isSearchFocused, searchSuggestions]);

  // 执行搜索
  const handleSearch = (e) => {
    e.preventDefault();
    const keyword = searchQuery.trim();
    if (!keyword) return;
    const nextHistory = [keyword, ...searchHistory.filter(item => item !== keyword)].slice(0, 30);
    setSearchHistory(nextHistory);
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    setSearchSuggestions([]);
    setActiveSuggestionIndex(-1);
    const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.google;
    const url = `${engine.searchUrl}${encodeURIComponent(keyword)}`;
    window.open(url, '_blank');
  };

  // 选择建议
  const handleSuggestionSelect = (keyword) => {
    setSearchQuery(keyword);
    setIsSearchFocused(false);
    setSearchSuggestions([]);
    setActiveSuggestionIndex(-1);
    const nextHistory = [keyword, ...searchHistory.filter(item => item !== keyword)].slice(0, 30);
    setSearchHistory(nextHistory);
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.google;
    const url = `${engine.searchUrl}${encodeURIComponent(keyword)}`;
    window.open(url, '_blank');
  };

  // 切换搜索引擎
  const changeSearchEngine = (engineKey) => {
    setSearchEngine(engineKey);
    localStorage.setItem(SEARCH_ENGINE_STORAGE_KEY, engineKey);
  };

  // 键盘事件处理
  const handleSearchInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setActiveSuggestionIndex(-1);
      e.currentTarget.blur();
      return;
    }
    if (!isSearchFocused || searchSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < searchSuggestions.length - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : searchSuggestions.length - 1));
      return;
    }
    if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(searchSuggestions[activeSuggestionIndex]);
    }
  };

  return {
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
  };
}
