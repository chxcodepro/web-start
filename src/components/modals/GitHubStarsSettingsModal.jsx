// GitHub Stars 设置弹窗组件
import { useState, useEffect } from 'react';
import { X, Github, Sparkles, Key, ExternalLink, Check, Loader2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { AI_PROVIDERS, DEFAULT_STARS_CONFIG } from '../../utils/constants';

export default function GitHubStarsSettingsModal({
  isOpen,
  onClose,
  initialConfig,
  onSaveConfig,
  onTestGitHub,
  onStartOAuth,
  onResetGroups,
  reposCount = 0,
}) {
  const [activeTab, setActiveTab] = useState('github'); // 'github' | 'ai'
  const [formData, setFormData] = useState(DEFAULT_STARS_CONFIG);
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setFormData({
        github: { ...DEFAULT_STARS_CONFIG.github, ...initialConfig.github },
        aiConfig: { ...DEFAULT_STARS_CONFIG.aiConfig, ...initialConfig.aiConfig },
      });
    }
  }, [initialConfig]);

  // 测试 GitHub 连接
  const handleTestGitHub = async () => {
    if (!formData.github.accessToken) {
      setTestResult({ success: false, message: '请先输入 GitHub Token' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTestGitHub(formData.github.accessToken);
      setTestResult(result);
      if (result.success && result.user) {
        setFormData(prev => ({
          ...prev,
          github: {
            ...prev.github,
            username: result.user.login,
            avatarUrl: result.user.avatar_url,
          }
        }));
      }
    } catch (error) {
      setTestResult({ success: false, message: error?.message || '测试失败' });
    } finally {
      setTesting(false);
    }
  };

  // 保存配置
  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">GitHub Stars 设置</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'github'
                ? 'text-white border-b-2 border-cyan-500 bg-white/5'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Github size={16} />
            GitHub 认证
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ai'
                ? 'text-white border-b-2 border-purple-500 bg-white/5'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Sparkles size={16} />
            AI 配置
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'github' ? (
            <div className="space-y-4">
              {/* 认证方式选择 */}
              <div>
                <label className="block text-xs text-white/50 font-medium mb-2 ml-1">认证方式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, github: { ...prev.github, authType: 'pat' } }))}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.github.authType === 'pat'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Key size={14} />
                    Personal Access Token
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, github: { ...prev.github, authType: 'oauth' } }))}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.github.authType === 'oauth'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Github size={14} />
                    OAuth 授权
                  </button>
                </div>
              </div>

              {formData.github.authType === 'pat' ? (
                <>
                  {/* PAT 输入 */}
                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">
                      GitHub Personal Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={formData.github.accessToken}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          github: { ...prev.github, accessToken: e.target.value }
                        }))}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                      >
                        {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-white/40 mt-1.5 ml-1 flex items-center gap-1">
                      需要 read:user 权限
                      <a
                        href="https://github.com/settings/tokens/new?scopes=read:user&description=My-Nav-Stars"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5"
                      >
                        创建 Token <ExternalLink size={10} />
                      </a>
                    </p>
                  </div>

                  {/* 测试按钮 */}
                  <button
                    type="button"
                    onClick={handleTestGitHub}
                    disabled={testing || !formData.github.accessToken}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    {testing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        测试中...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        测试连接
                      </>
                    )}
                  </button>

                  {/* 测试结果 */}
                  {testResult && (
                    <div className={`p-3 rounded-xl text-sm ${
                      testResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}>
                      {testResult.success ? (
                        <div className="flex items-center gap-3">
                          {testResult.user?.avatar_url && (
                            <img
                              src={testResult.user.avatar_url}
                              alt={testResult.user.login}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium">{testResult.user?.login}</p>
                            <p className="text-xs text-emerald-400/70">连接成功</p>
                          </div>
                        </div>
                      ) : (
                        <p>{testResult.message}</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* OAuth 授权 */}
                  <div className="text-center py-6">
                    {formData.github.username ? (
                      <div className="flex flex-col items-center gap-3">
                        {formData.github.avatarUrl && (
                          <img
                            src={formData.github.avatarUrl}
                            alt={formData.github.username}
                            className="w-16 h-16 rounded-full border-2 border-emerald-500/50"
                          />
                        )}
                        <div>
                          <p className="text-white font-medium">{formData.github.username}</p>
                          <p className="text-xs text-emerald-400">已授权</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            github: { ...prev.github, accessToken: '', username: '', avatarUrl: '' }
                          }))}
                          className="text-xs text-white/50 hover:text-red-400 transition"
                        >
                          取消授权
                        </button>
                      </div>
                    ) : (
                      <>
                        <Github size={48} className="mx-auto mb-4 text-white/30" />
                        <p className="text-white/60 text-sm mb-4">使用 GitHub OAuth 授权访问你的 Stars</p>
                        <button
                          type="button"
                          onClick={onStartOAuth}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition"
                        >
                          <Github size={16} />
                          使用 GitHub 登录
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* 已连接用户信息 */}
              {formData.github.authType === 'pat' && formData.github.username && (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  {formData.github.avatarUrl && (
                    <img
                      src={formData.github.avatarUrl}
                      alt={formData.github.username}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-white font-medium text-sm">{formData.github.username}</p>
                    <p className="text-xs text-white/50">已连接</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI 服务商选择 */}
              <div>
                <label className="block text-xs text-white/50 font-medium mb-2 ml-1">AI 服务商</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        aiConfig: { ...prev.aiConfig, provider: key }
                      }))}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        formData.aiConfig.provider === key
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {provider.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key 输入 */}
              <div>
                <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">
                  {AI_PROVIDERS[formData.aiConfig.provider]?.name || 'AI'} API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.aiConfig.apiKey}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aiConfig: { ...prev.aiConfig, apiKey: e.target.value }
                    }))}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-white focus:border-purple-500 focus:bg-white/10 focus:outline-none text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* 自定义端点（仅 custom 模式） */}
              {formData.aiConfig.provider === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">
                      自定义 API 端点
                    </label>
                    <input
                      type="text"
                      value={formData.aiConfig.customEndpoint}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        aiConfig: { ...prev.aiConfig, customEndpoint: e.target.value }
                      }))}
                      placeholder="https://api.example.com/v1/chat/completions"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-purple-500 focus:bg-white/10 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={formData.aiConfig.customModel}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        aiConfig: { ...prev.aiConfig, customModel: e.target.value }
                      }))}
                      placeholder="gpt-4o-mini"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-purple-500 focus:bg-white/10 focus:outline-none text-sm"
                    />
                  </div>
                </>
              )}

              {/* 预设分组管理 */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-white/50 font-medium ml-1">预设分组</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-white/50">仅使用预设分组</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        aiConfig: { ...prev.aiConfig, usePresetOnly: !prev.aiConfig.usePresetOnly }
                      }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        formData.aiConfig.usePresetOnly ? 'bg-purple-600' : 'bg-white/20'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        formData.aiConfig.usePresetOnly ? 'translate-x-5' : ''
                      }`} />
                    </button>
                  </label>
                </div>

                {/* 添加新分组 */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newGroupName.trim()) {
                        e.preventDefault();
                        const trimmed = newGroupName.trim();
                        if (!formData.aiConfig.presetGroups?.includes(trimmed)) {
                          setFormData(prev => ({
                            ...prev,
                            aiConfig: {
                              ...prev.aiConfig,
                              presetGroups: [...(prev.aiConfig.presetGroups || []), trimmed]
                            }
                          }));
                        }
                        setNewGroupName('');
                      }
                    }}
                    placeholder="输入分组名称，回车添加"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:bg-white/10 focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newGroupName.trim();
                      if (trimmed && !formData.aiConfig.presetGroups?.includes(trimmed)) {
                        setFormData(prev => ({
                          ...prev,
                          aiConfig: {
                            ...prev.aiConfig,
                            presetGroups: [...(prev.aiConfig.presetGroups || []), trimmed]
                          }
                        }));
                        setNewGroupName('');
                      }
                    }}
                    disabled={!newGroupName.trim()}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* 分组列表 */}
                {formData.aiConfig.presetGroups?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.aiConfig.presetGroups.map((group, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-sm text-white/80"
                      >
                        <span>{group}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              aiConfig: {
                                ...prev.aiConfig,
                                presetGroups: prev.aiConfig.presetGroups.filter((_, i) => i !== index)
                              }
                            }));
                          }}
                          className="text-white/40 hover:text-red-400 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 text-center py-2">
                    暂无预设分组，AI 将自动创建分组
                  </p>
                )}

                {/* 提示说明 */}
                <p className="text-[11px] text-white/40 mt-3 ml-1">
                  {formData.aiConfig.usePresetOnly
                    ? '开启后，AI 只会使用预设分组，无法匹配的仓库将标记为"其他"'
                    : '关闭时，AI 会优先使用预设分组，必要时创建新分组'}
                </p>
              </div>

              {/* AI 配置说明 */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-xs text-purple-300/80">
                  AI 将根据仓库名称、描述和标签自动分析并建议分组。支持的服务商：
                </p>
                <ul className="text-xs text-purple-300/60 mt-2 space-y-1 ml-3">
                  <li>• OpenAI (GPT-4o-mini)</li>
                  <li>• Claude (Claude-3.5-haiku)</li>
                  <li>• Google (Gemini-2.0-flash)</li>
                  <li>• 自定义 OpenAI 兼容接口</li>
                </ul>
              </div>

              {/* 重置分组 */}
              {reposCount > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">重置所有分组</p>
                      <p className="text-xs text-white/40 mt-0.5">清空 {reposCount} 个仓库的分组，以便重新 AI 分析</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('确定要清空所有仓库的分组吗？此操作不可撤销。')) return;
                        setResetting(true);
                        try {
                          await onResetGroups?.();
                          onClose();
                        } finally {
                          setResetting(false);
                        }
                      }}
                      disabled={resetting}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {resetting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      重置分组
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-5 border-t border-white/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
