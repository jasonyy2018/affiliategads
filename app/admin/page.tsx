'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  DollarSign,
  Layers,
  Activity,
  Terminal,
  ChevronRight,
  Edit,
  Check,
  Eye,
  Key,
  Settings,
  Cpu,
  Lock,
  Zap,
  Globe,
  Server,
  Mail,
  Download,
  FileText,
  BarChart3,
  Database,
  Clock,
  ArrowUpRight,
  Share2,
} from 'lucide-react';
import { ADMIN_I18N, AdminLanguage } from '@/lib/adminI18n';

interface ProductItem {
  asin: string;
  title: string;
  brand: string;
  price: number;
  commission_rate: number;
  image_url: string;
  bullets: string[];
  review_summary: string;
  slug: string;
  hasContent?: boolean;
  commissionPerSale?: number;
  expectedRevenuePerClick?: number;
}

interface DiagnosticItem {
  id: string;
  category: string;
  name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details?: string;
}

interface DiagnosticsReport {
  healthScore: number;
  stats: { total: number; passed: number; warnings: number; errors: number };
  diagnostics: DiagnosticItem[];
}

interface SettingsData {
  anthropicKeyMasked: string;
  hasAnthropicKey: boolean;
  openaiKeyMasked: string;
  hasOpenaiKey: boolean;
  customBaseUrl: string;
  customApiKeyMasked: string;
  hasCustomApiKey: boolean;
  customModel: string;
  customProtocol: string;
  amazonTag: string;
  gaId: string;
  gaLabel: string;
  defaultModel: string;
  socialWebhookUrl?: string;
  hasSocialWebhook?: boolean;
  ayrshareApiKeyMasked?: string;
  hasAyrshareApiKey?: boolean;
  siteUrl?: string;
  bingApiKeyMasked?: string;
  hasBingApiKey?: boolean;
  adminSecretKeyMasked?: string;
  hasAdminSecretKey?: boolean;
}

export default function AdminDashboardPage() {
  // 多语言切换状态 (中英双语，默认中文)
  const [lang, setLang] = useState<AdminLanguage>('zh');
  const t = ADMIN_I18N[lang];

  const toggleLang = () => {
    const nextLang: AdminLanguage = lang === 'zh' ? 'en' : 'zh';
    setLang(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_lang', nextLang);
    }
  };

  // 统一携带鉴权 token 的请求头
  const adminHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 安全访问鉴权状态
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [passInput, setPassInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // 顶层选项卡导航: 'products' | 'automation' | 'reports' | 'leads'
  const [activeTab, setActiveTab] = useState<'products' | 'automation' | 'reports' | 'leads'>('automation');
  const [reportsData, setReportsData] = useState<any>(null);
  const [selectedReportKey, setSelectedReportKey] = useState<string>('dailyReport');

  // AI 密钥与全系统配置状态
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsCategory, setActiveSettingsCategory] = useState<'commercial' | 'ai' | 'seo' | 'ads' | 'social' | 'security'>('commercial');
  const [settingsForm, setSettingsForm] = useState({
    anthropicKey: '',
    openaiKey: '',
    customBaseUrl: '',
    customApiKey: '',
    customModel: 'deepseek-chat',
    customProtocol: 'openai',
    amazonTag: '',
    gaId: '',
    gaLabel: '',
    defaultModel: 'auto',
    socialWebhookUrl: '',
    ayrshareApiKey: '',
    siteUrl: '',
    bingApiKey: '',
    adminSecretKey: '',
  });
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; msg: string } | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);

  // 命令行执行日志
  const [terminalLogs, setTerminalLogs] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [execStatus, setExecStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  // 商品编辑/新建 Modal 状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductItem>>({
    asin: '',
    title: '',
    brand: '',
    price: 99.99,
    commission_rate: 0.04,
    image_url: '',
    bullets: ['Feature 1', 'Feature 2'],
    review_summary: '',
    slug: '',
  });

  // 获取设置
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSettingsForm((prev) => ({
          ...prev,
          customBaseUrl: data.settings.customBaseUrl || '',
          customModel: data.settings.customModel || 'deepseek-chat',
          customProtocol: data.settings.customProtocol || 'openai',
          amazonTag: data.settings.amazonTag || '',
          gaId: data.settings.gaId || '',
          gaLabel: data.settings.gaLabel || '',
          defaultModel: data.settings.defaultModel || 'auto',
          socialWebhookUrl: data.settings.socialWebhookUrl || '',
          siteUrl: data.settings.siteUrl || '',
        }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // 获取商品数据
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/products', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // 运行系统与合规诊断
  const runDiagnostics = async () => {
    try {
      setAuditLoading(true);
      const res = await fetch('/api/admin/diagnostics', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        setReport(data);
      }
    } catch (err) {
      console.error('Diagnostics error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const verifyPassword = async (pwd: string) => {
    try {
      setAuthLoading(true);
      setAuthError('');
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        const text = await res.text().catch(() => '');
        console.warn('Non-JSON response from /api/admin/auth:', res.status, text);
      }

      if (res.ok && data?.success) {
        sessionStorage.setItem('admin_token', data.token);
        setIsAuthorized(true);
        fetchProducts();
        runDiagnostics();
        fetchSettings();
        fetchReports();
      } else if (res.status === 429) {
        setAuthError(data?.error || (lang === 'zh' ? '尝试过于频繁，请 5 分钟后再试 (429 Too Many Requests)' : 'Too many attempts. Try again later (429).'));
      } else if (res.status === 401) {
        setAuthError(data?.error || (lang === 'zh' ? '管理访问密钥不正确，请重新输入。' : 'Incorrect admin access key.'));
      } else if (res.status === 502 || res.status === 504) {
        setAuthError(lang === 'zh'
          ? `网关连接异常 (HTTP ${res.status}): 后端服务尚未就绪或正在重启，请稍候 10 秒后刷新重试。`
          : `Gateway Error (HTTP ${res.status}): Backend service is starting or restarting. Please retry in a few seconds.`);
      } else if (!res.ok) {
        setAuthError(data?.error || (lang === 'zh'
          ? `服务器响应异常 (HTTP ${res.status} ${res.statusText || ''})`
          : `Server error (HTTP ${res.status} ${res.statusText || ''})`));
      } else {
        setAuthError(data?.error || (lang === 'zh' ? '登录鉴权未通过，请重试。' : 'Authentication failed.'));
      }
    } catch (err: any) {
      console.error('Login connection error:', err);
      setAuthError(lang === 'zh'
        ? `网络连接失败 (${err?.message || 'Connection failed'}): 无法连接至服务器，请检查网络或后端容器运行状态。`
        : `Connection failed (${err?.message || 'Network error'}). Please verify server status.`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passInput) return;
    verifyPassword(passInput);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthorized(false);
    setPassInput('');
  };

  // 获取经营报告与买家留资数据
  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        setReportsData(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  // 统一调度执行后台自动化任务（原生 TS 引擎）
  const runPyTask = async (taskKey: string, label: string, opts: Record<string, unknown> = {}) => {
    setIsExecuting(true);
    setExecStatus('running');
    setTerminalLogs((prev) => prev + `\n[${new Date().toLocaleTimeString()}] 🚀 启动任务: ${label}...\n`);

    try {
      const res = await fetch('/api/admin/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ task: taskKey, ...opts }),
      });
      const data = await res.json();

      if (data.success) {
        setTerminalLogs(
          (prev) =>
            prev +
            (data.summary || data.stdout || '') +
            `\n[OK] ${label} 执行成功! (耗时: ${(data.durationMs / 1000).toFixed(2)}s)\n`
        );
        setExecStatus('success');
        fetchReports();
        fetchProducts();
      } else {
        setTerminalLogs(
          (prev) =>
            prev +
            (data.stdout || '') +
            (data.stderr || '') +
            (data.error || '') +
            `\n[ERROR] ${label} 执行异常 (Exit Code: ${data.exitCode})\n`
        );
        setExecStatus('error');
      }
    } catch (err: any) {
      setTerminalLogs((prev) => prev + `\n[FATAL] 网络连接失败: ${err.message}\n`);
      setExecStatus('error');
    } finally {
      setIsExecuting(false);
    }
  };

  // 导出买家留资 CSV
  const exportLeadsCsv = () => {
    if (!reportsData?.leads?.list || reportsData.leads.list.length === 0) {
      alert('当前暂无留资记录可导出。');
      return;
    }
    const headers = ['ID', 'Email', 'Category', 'UseCase', 'CreatedAt', 'Source'];
    const rows = reportsData.leads.list.map((l: any) => [
      `"${l.id}"`,
      `"${l.email}"`,
      `"${l.category || ''}"`,
      `"${l.useCase || ''}"`,
      `"${l.createdAt || ''}"`,
      `"${l.source || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('admin_lang') as AdminLanguage;
      if (savedLang === 'zh' || savedLang === 'en') {
        setLang(savedLang);
      }
    }

    const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;

    if (token) {
      setIsAuthorized(true);
      setAuthLoading(false);
      fetchProducts();
      runDiagnostics();
      fetchSettings();
      fetchReports();
    } else {
      setAuthLoading(false);
    }
  }, []);

  // 触发 AI 内容生成流水线
  const handleRunGenerator = async (slug?: string) => {
    setIsExecuting(true);
    setExecStatus('running');
    const targetLabel = slug ? `Product [${slug}]` : 'ALL Products';
    const chosenModel = settings?.defaultModel || 'auto';
    setTerminalLogs((prev) => prev + `\n[${new Date().toLocaleTimeString()}] Starting AI Pipeline (${chosenModel}) for: ${targetLabel}...\n`);

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ slug, all: !slug, useAi: false }),
      });
      const data = await res.json();

      if (data.success) {
        setTerminalLogs((prev) => prev + (data.stdout || '') + `\n[OK] Pipeline completed successfully! (Exit Code: ${data.exitCode})\n`);
        setExecStatus('success');
      } else {
        setTerminalLogs((prev) => prev + (data.stdout || '') + (data.stderr || '') + (data.error || '') + `\n[ERROR] Pipeline finished with errors.\n`);
        setExecStatus('error');
      }
    } catch (err: any) {
      setTerminalLogs((prev) => prev + `\n[FATAL] Network error: ${err.message}\n`);
      setExecStatus('error');
    } finally {
      setIsExecuting(false);
      fetchProducts();
      runDiagnostics();
    }
  };

  // 测试 API Key 与外部集成连通性
  const handleTestKey = async (provider: 'anthropic' | 'openai' | 'custom' | 'bing' | 'webhook') => {
    let keyToTest = '';
    let targetBaseUrl = settingsForm.customBaseUrl;

    if (provider === 'anthropic') keyToTest = settingsForm.anthropicKey;
    else if (provider === 'openai') keyToTest = settingsForm.openaiKey;
    else if (provider === 'custom') keyToTest = settingsForm.customApiKey;
    else if (provider === 'bing') {
      keyToTest = settingsForm.bingApiKey || (settings?.hasBingApiKey ? 'current_configured_key' : '');
      targetBaseUrl = settingsForm.siteUrl;
    } else if (provider === 'webhook') {
      keyToTest = settingsForm.socialWebhookUrl;
      targetBaseUrl = settingsForm.socialWebhookUrl;
    }

    if (!keyToTest) {
      alert(lang === 'zh' ? '请先输入对应的 API 密钥或 URL 进行测试。' : 'Please enter an API Key or URL to test connection.');
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({
          provider,
          apiKey: keyToTest,
          baseUrl: targetBaseUrl,
          model: settingsForm.customModel,
          protocol: settingsForm.customProtocol,
        }),
      });
      const data = await res.json();
      setTestResult({
        provider,
        success: data.success,
        msg: data.success ? data.message : data.error,
      });
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        msg: `Connection failed: ${err.message}`,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // 快捷预设填充
  const applyPreset = (name: 'deepseek' | 'openrouter' | 'siliconflow' | 'moonshot') => {
    if (name === 'deepseek') {
      setSettingsForm((prev) => ({
        ...prev,
        customBaseUrl: 'https://api.deepseek.com/v1',
        customModel: 'deepseek-chat',
        customProtocol: 'openai',
        defaultModel: 'custom',
      }));
    } else if (name === 'openrouter') {
      setSettingsForm((prev) => ({
        ...prev,
        customBaseUrl: 'https://openrouter.ai/api/v1',
        customModel: 'anthropic/claude-3.5-sonnet',
        customProtocol: 'openai',
        defaultModel: 'custom',
      }));
    } else if (name === 'siliconflow') {
      setSettingsForm((prev) => ({
        ...prev,
        customBaseUrl: 'https://api.siliconflow.cn/v1',
        customModel: 'deepseek-ai/DeepSeek-V3',
        customProtocol: 'openai',
        defaultModel: 'custom',
      }));
    } else if (name === 'moonshot') {
      setSettingsForm((prev) => ({
        ...prev,
        customBaseUrl: 'https://api.moonshot.cn/v1',
        customModel: 'moonshot-v1-8k',
        customProtocol: 'openai',
        defaultModel: 'custom',
      }));
    }
  };

  // 保存系统与 AI 配置
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSaveMsg(lang === 'zh' ? '全系统配置已成功保存并实时写入 .env.local！' : 'All configurations saved successfully to .env.local!');
        setTimeout(() => setSettingsSaveMsg(null), 3500);
        fetchSettings();
        runDiagnostics();
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (err) {
      alert('Error saving settings');
    }
  };

  // 保存商品
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchProducts();
        runDiagnostics();
      } else {
        alert(data.error || 'Failed to save product');
      }
    } catch (err) {
      alert('Error saving product');
    }
  };

  // 删除商品
  const handleDeleteProduct = async (slug: string) => {
    if (!confirm(`Are you sure you want to delete product "${slug}" and its generated review content?`)) return;
    try {
      const res = await fetch(`/api/admin/products?slug=${slug}`, { method: 'DELETE', headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        runDiagnostics();
      }
    } catch (err) {
      alert('Error deleting product');
    }
  };

  // 统计计算
  const totalProducts = products.length;
  const generatedCount = products.filter((p) => p.hasContent).length;
  const avgPrice = totalProducts > 0 ? products.reduce((acc, p) => acc + p.price, 0) / totalProducts : 0;
  const healthScore = report?.healthScore ?? 100;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>{t.gateVerifying}</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 transition"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.langToggle}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-black tracking-tight text-white">{t.gateTitle}</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.gateDesc}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-center font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                {t.gateInputLabel}
              </label>
              <input
                type="password"
                required
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder={t.gatePlaceholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 active:scale-98 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>{t.gateUnlockBtn}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[11px] text-slate-400">
              {t.gateHint}
            </p>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              {t.copyright || '网站版本归 WSAI & WCKJ 所有'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 顶部控制台导航栏 */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">{t.title}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {t.versionBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 中英双语切换按钮 */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition shadow-xs"
              title="Switch Language / 切换中英双语"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.langToggle}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 shadow-sm transition"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{t.aiKeysBtn}</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 transition"
              title={t.lockBtn}
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.lockBtn}</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t.previewSite}</span>
            </Link>
            
            <button
              onClick={() => {
                setEditingProduct({
                  asin: '',
                  title: '',
                  brand: '',
                  price: 199.99,
                  commission_rate: 0.04,
                  image_url: '',
                  bullets: ['High Performance', 'Energy Efficient'],
                  review_summary: 'Top rated premium product in its category.',
                  slug: '',
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addProductBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 核心控制台主体 */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 flex-1">
        
        {/* 顶部指标卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>{t.metricProductsTitle}</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalProducts}</span>
              <span className="text-xs text-slate-400 font-medium">{t.metricProductsSub}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.metricProductsDesc}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>{t.metricPagesTitle}</span>
              <FileCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">{reportsData?.pageCount || 94}</span>
              <span className="text-xs text-slate-400 font-medium">{t.metricPagesSub}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.metricPagesDesc}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>{t.metricLeadsTitle}</span>
              <Mail className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400">{reportsData?.leads?.total || 0}</span>
              <span className="text-xs text-slate-400 font-medium">{t.metricLeadsSub}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.metricLeadsDesc}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>{t.metricSyndicateTitle}</span>
              <Globe className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-400">{reportsData?.syndicateStats?.total || 60}</span>
              <span className="text-xs text-slate-400 font-medium">{t.metricSyndicateSub}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{t.metricSyndicateDesc}</p>
          </div>
        </div>

        {/* 控制台顶级工作区选项卡 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              activeTab === 'automation'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.tabAutomation}</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              activeTab === 'reports'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.tabReports}</span>
            {reportsData?.reports?.dailyReport && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              activeTab === 'leads'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>{t.tabLeads}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-amber-300 border border-slate-700 font-mono">
              {reportsData?.leads?.total || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              activeTab === 'products'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.tabProducts}</span>
            <span className="text-xs opacity-75 font-mono">({products.length})</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: 自动化运维工具箱 (Automation Suite) */}
        {/* ==================================================== */}
        {activeTab === 'automation' && (
          <div className="space-y-6">
            {/* 顶栏核心大按钮：每日 7 步全自动化流水线 */}
            <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider rounded-full border border-amber-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.pipelineBadge}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {t.pipelineTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {t.pipelineDesc}
                  </p>
                </div>

                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('cron_pipeline', t.pipelineTitle)}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-sm sm:text-base shadow-2xl disabled:opacity-50 transition flex items-center justify-center gap-3 flex-shrink-0"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{t.pipelineRunning}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-slate-950" />
                      <span>{t.pipelineRunBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 6 个专属自动化工具网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 工具 1: 跨平台证据链 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: trustSyndicate</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.toolSyndicateTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{t.toolSyndicateDesc}</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('trust_syndicate', t.toolSyndicateTitle)}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{t.toolSyndicateBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 2: Gemini 审计 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: geminiAudit</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.toolGeminiTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{t.toolGeminiDesc}</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('gemini_audit', t.toolGeminiTitle)}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{t.toolGeminiBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 3: 真实 EPC 商业对账 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: epcTracker</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.toolEpcTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{t.toolEpcDesc}</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('epc_tracker', t.toolEpcTitle)}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{t.toolEpcBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 4: Bing 批量提交 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: bingSubmit</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.toolBingTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{t.toolBingDesc}</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('bing_submit', t.toolBingTitle)}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{t.toolBingBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 5: 普林斯顿 GEO 扫描 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: geoOptimizer</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.toolGeoTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{t.toolGeoDesc}</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('geo_optimizer', t.toolGeoTitle)}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{t.toolGeoBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 6: pSEO 50页矩阵生成 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: pseoGenerator</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.toolPseoTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{t.toolPseoDesc}</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('pseo_generate', t.toolPseoTitle, { limit: 50, apply: true, useAi: false })}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{t.toolPseoBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 7: 全网社媒一键广播 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-amber-500/40 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: socialDispatch</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.toolSocialTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">{t.toolSocialDesc}</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('social_dispatch', t.toolSocialTitle)}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <span>{t.toolSocialBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 8: 价格追踪 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-rose-500/40 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: priceTracker</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {lang === 'zh' ? '价格快照与降价检测' : 'Price Snapshots & Drop Detection'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'zh'
                      ? 'PA-API 采集实时价 → 建立价格历史 → 自动触发降价徽标与邮件提醒。'
                      : 'PA-API live prices → price history → drop badges & email alerts.'}
                  </p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('price_tracker', lang === 'zh' ? '价格追踪' : 'Price Tracking')}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{lang === 'zh' ? '采集价格快照' : 'Run Price Snapshot'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 9: 商品官方图同步 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-sky-500/40 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: imageSync</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {lang === 'zh' ? 'Amazon 官方商品图同步' : 'Amazon Product Image Sync'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'zh'
                      ? 'PA-API 拉取官方商品图替换 Unsplash 占位图（联盟协议合规方式）。'
                      : 'Fetch official Amazon product images via PA-API, replacing stock photos.'}
                  </p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('image_sync', lang === 'zh' ? '图片同步' : 'Image Sync')}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{lang === 'zh' ? '同步官方图' : 'Sync Images'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 10: 上线预检 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-emerald-500/40 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: preLaunchAudit</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {lang === 'zh' ? '上线预检 (10 项)' : 'Pre-Launch Audit (10 checks)'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'zh'
                      ? '域名/密钥/内容/收录/合规/邮件 — 部署前一键核对。'
                      : 'Domain/keys/content/indexing/compliance/email — verify before deploy.'}
                  </p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('prelaunch_audit', lang === 'zh' ? '上线预检' : 'Pre-Launch Audit')}
                  className="w-full py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{lang === 'zh' ? '运行预检' : 'Run Audit'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 工具 11: 矩阵扩产机会分析 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-violet-500/40 transition">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">engine: matrixOpportunities</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {lang === 'zh' ? 'pSEO 扩产机会分析' : 'pSEO Expansion Opportunities'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'zh'
                      ? '扫描商品密度足够但未生成的组合 → 数据驱动扩产清单。'
                      : 'Find READY combos (≥3 products, page missing) — data-driven expansion.'}
                  </p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => runPyTask('matrix_opportunities', lang === 'zh' ? '扩产分析' : 'Opportunities')}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{lang === 'zh' ? '扫描机会' : 'Scan Opportunities'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 实时终端日志输出窗口 */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col shadow-2xl font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-slate-200">{t.consoleTitle}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-2 h-2 rounded-full ${execStatus === 'running' ? 'bg-amber-400 animate-ping' : execStatus === 'success' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className="capitalize font-medium">{execStatus}</span>
                  </span>
                  <button
                    onClick={() => setTerminalLogs('')}
                    className="text-slate-500 hover:text-slate-300 text-[11px] underline"
                  >
                    {t.consoleClear}
                  </button>
                </div>
              </div>

              <pre className="bg-slate-900/90 p-4 rounded-2xl text-slate-300 overflow-y-auto max-h-72 leading-relaxed whitespace-pre-wrap selection:bg-amber-500/30">
                {terminalLogs || t.consoleReady}
              </pre>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: 经营与 GEO 报告中心 (Reports & Audits) */}
        {/* ==================================================== */}
        {activeTab === 'reports' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>{t.reportsTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.reportsDesc}
                </p>
              </div>

              <button
                onClick={fetchReports}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 transition self-start"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.reportsRefresh}</span>
              </button>
            </div>

            {/* 报告切换子标签 */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'dailyReport', label: t.reportTabDaily },
                { key: 'socialReport', label: t.reportTabSocial },
                { key: 'bingReport', label: t.reportTabBing },
                { key: 'geminiAudit', label: t.reportTabGemini },
                { key: 'geoAudit', label: t.reportTabGeo },
                { key: 'epcReport', label: t.reportTabEpc },
                { key: 'rankReport', label: t.reportTabRank },
                { key: 'pruneReport', label: t.reportTabPrune },
                { key: 'matrixReport', label: lang === 'zh' ? '🧩 扩产机会' : '🧩 Opportunities' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedReportKey(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    selectedReportKey === tab.key
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 报告文本查看器 */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-hidden">
              <pre className="text-xs font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[550px]">
                {reportsData?.reports?.[selectedReportKey] || t.reportEmpty}
              </pre>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: 买家留资 CRM (Buyer Leads CRM) */}
        {/* ==================================================== */}
        {activeTab === 'leads' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-400" />
                  <span>{t.leadsTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.leadsDesc}
                </p>
              </div>

              <button
                onClick={exportLeadsCsv}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition self-start"
              >
                <Download className="w-4 h-4" />
                <span>{t.leadsExportBtn} ({reportsData?.leads?.total || 0})</span>
              </button>
            </div>

            {/* 留资表格 */}
            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3.5 px-4">{t.leadsColEmail}</th>
                    <th className="py-3.5 px-4">{t.leadsColCategory}</th>
                    <th className="py-3.5 px-4">{t.leadsColUseCase}</th>
                    <th className="py-3.5 px-4">{t.leadsColSource}</th>
                    <th className="py-3.5 px-4 text-right">{t.leadsColTime}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reportsData?.leads?.list && reportsData.leads.list.length > 0 ? (
                    reportsData.leads.list.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lead.email}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[11px] font-medium border border-slate-700">
                            {lead.category || 'all'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{lead.useCase || 'General Buying'}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{lead.source}</td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        {t.leadsEmpty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: 商品库与落地页管理 (Products Catalog) */}
        {/* ==================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* 合规体检卡片 */}
            {report && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{t.diagnosticsTitle}</span>
                  </h3>
                  <button
                    onClick={runDiagnostics}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${auditLoading ? 'animate-spin' : ''}`} />
                    <span>{t.diagnosticsReAudit}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.diagnostics.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3 text-xs"
                    >
                      <div className="mt-0.5">
                        {item.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        {item.status === 'failed' && <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{item.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{item.category}</span>
                        </div>
                        <p className="text-slate-400">{item.message}</p>
                        {item.details && <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-1.5 rounded mt-1">{item.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 商品表格 */}

        {/* 商品库与落地页管理表格 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">{t.productsTableTitle}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.productsTableDesc}</p>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {t.productsCountPrefix} {products.length} {t.productsCountSuffix}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3.5 px-4">{t.thProduct}</th>
                  <th className="py-3.5 px-4">{t.thPrice}</th>
                  <th className="py-3.5 px-4">{t.thCommission}</th>
                  <th className="py-3.5 px-4">{t.thMargin}</th>
                  <th className="py-3.5 px-4">{t.thLandingPage}</th>
                  <th className="py-3.5 px-4 text-right">{t.thActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => (
                  <tr key={p.slug} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg p-1 flex-shrink-0 flex items-center justify-center border border-slate-700">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.title} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">NO IMG</span>
                          )}
                        </div>
                        <div className="max-w-xs sm:max-w-sm">
                          <div className="font-bold text-slate-200 line-clamp-1">{p.title}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-[11px]">
                            <span className="text-amber-400 font-semibold">{p.brand}</span>
                            <span>•</span>
                            <span className="font-mono">{p.asin}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-bold text-white">
                      ${p.price.toFixed(2)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-emerald-400">
                        ${p.commissionPerSale?.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">{(p.commission_rate * 100).toFixed(1)}% rate</div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-mono text-amber-300 font-semibold">
                        +${p.expectedRevenuePerClick?.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-slate-500">@ 2% CR assumption</div>
                    </td>

                    <td className="py-4 px-4">
                      {p.hasContent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          {t.statusReady} (/review/{p.slug})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-bold border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          {t.statusNeedsGen}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          disabled={isExecuting}
                          onClick={() => handleRunGenerator(p.slug)}
                          title={t.btnGenReview}
                          className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-slate-300 transition"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        {p.hasContent && (
                          <Link
                            href={`/review/${p.slug}`}
                            target="_blank"
                            title={t.btnPreviewReview}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setIsModalOpen(true);
                          }}
                          title={t.btnEdit}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(p.slug)}
                          title={t.btnDelete}
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/80 hover:text-rose-200 rounded-lg text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </main>

      {/* 底部版权声明 */}
      <footer className="py-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <p>{t.copyright || '网站版本归 WSAI & WCKJ 所有'} • OPC Command Center</p>
      </footer>

      {/* 全系统总控配置 Modal 弹窗 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal 顶栏 */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t.settingsTitle}</h3>
                  <p className="text-[11px] text-slate-400">{t.settingsSubtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* 保存成功提示 */}
            {settingsSaveMsg && (
              <div className="mx-6 mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{settingsSaveMsg}</span>
              </div>
            )}

            {/* 配置分类 Tab 切换器 */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
                {[
                  { id: 'commercial', label: t.cfgCategoryCommercial, badge: settings?.amazonTag ? 'Active' : null },
                  { id: 'ai', label: t.cfgCategoryAi, badge: settings?.hasCustomApiKey || settings?.hasAnthropicKey || settings?.hasOpenaiKey ? 'Connected' : null },
                  { id: 'seo', label: t.cfgCategorySeo, badge: settings?.hasBingApiKey ? 'Ready' : null },
                  { id: 'ads', label: t.cfgCategoryAds, badge: settings?.gaId ? 'Active' : null },
                  { id: 'social', label: t.cfgCategorySocial, badge: settings?.hasSocialWebhook ? 'Webhook' : 'Sandbox' },
                  { id: 'security', label: t.cfgCategorySecurity, badge: 'Protected' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveSettingsCategory(cat.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      activeSettingsCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {cat.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        activeSettingsCategory === cat.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {cat.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 表单内容主区域 */}
            <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
              
              {/* Tab 1: 站点与商业联盟 */}
              {activeSettingsCategory === 'commercial' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                        <Globe className="w-4 h-4 text-amber-400" />
                        <span>{t.cfgSiteUrlLabel}</span>
                      </label>
                      {settings?.siteUrl && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                          Live: {settings.siteUrl}
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      value={settingsForm.siteUrl}
                      onChange={(e) => setSettingsForm({ ...settingsForm, siteUrl: e.target.value })}
                      placeholder={t.cfgSiteUrlPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.cfgSiteUrlDesc}</p>
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>{t.cfgAmazonTagLabel}</span>
                      </label>
                      {settings?.amazonTag && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                          Active: {settings.amazonTag}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={settingsForm.amazonTag}
                      onChange={(e) => setSettingsForm({ ...settingsForm, amazonTag: e.target.value })}
                      placeholder={t.cfgAmazonTagPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.cfgAmazonTagDesc}</p>
                  </div>
                </div>
              )}

              {/* Tab 2: AI 大模型与第三方 API */}
              {activeSettingsCategory === 'ai' && (
                <div className="space-y-4">
                  {/* 默认模式下拉 */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                    <label className="block text-slate-300 font-bold mb-1">{t.cfgAiModeLabel}</label>
                    <select
                      value={settingsForm.defaultModel}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultModel: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none text-xs"
                    >
                      <option value="auto">Auto Detect (Custom API &gt; Claude &gt; OpenAI &gt; Mock Fallback)</option>
                      <option value="custom">Custom Third-Party API (DeepSeek / OpenRouter / OneAPI / SiliconFlow)</option>
                      <option value="claude">Official Claude 3.5 Sonnet</option>
                      <option value="openai">Official OpenAI GPT-4o</option>
                      <option value="mock">Offline Expert Mock (No API Cost)</option>
                    </select>
                    <p className="text-[11px] text-slate-500">{t.cfgAiModeDesc}</p>
                  </div>

                  {/* 第三方自定义 API */}
                  <div className="p-4 bg-slate-950/90 border border-blue-900/50 rounded-2xl space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-blue-300 flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span>Third-Party Custom API (DeepSeek / OpenRouter / OneAPI)</span>
                      </label>
                      {settings?.hasCustomApiKey && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                          Configured: {settings.customApiKeyMasked}
                        </span>
                      )}
                    </div>

                    {/* 快捷一键预设 */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 font-semibold">{t.cfgQuickPresets}</span>
                      <button
                        type="button"
                        onClick={() => applyPreset('deepseek')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition"
                      >
                        DeepSeek V3
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('openrouter')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition"
                      >
                        OpenRouter AI
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('siliconflow')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition"
                      >
                        SiliconFlow (硅基流动)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('moonshot')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition"
                      >
                        Moonshot Kimi
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">{t.cfgCustomBaseUrlLabel}</label>
                        <input
                          type="text"
                          value={settingsForm.customBaseUrl}
                          onChange={(e) => setSettingsForm({ ...settingsForm, customBaseUrl: e.target.value })}
                          placeholder={t.cfgCustomBaseUrlPlaceholder}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">{t.cfgCustomModelLabel}</label>
                        <input
                          type="text"
                          value={settingsForm.customModel}
                          onChange={(e) => setSettingsForm({ ...settingsForm, customModel: e.target.value })}
                          placeholder={t.cfgCustomModelPlaceholder}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">{t.cfgCustomApiKeyLabel}</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={settingsForm.customApiKey}
                          onChange={(e) => setSettingsForm({ ...settingsForm, customApiKey: e.target.value })}
                          placeholder={settings?.hasCustomApiKey ? `Configured (${settings.customApiKeyMasked})` : t.cfgCustomApiKeyPlaceholder}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-blue-500 outline-none font-mono"
                        />
                        <button
                          type="button"
                          disabled={isTestingKey || (!settingsForm.customApiKey && !settings?.hasCustomApiKey)}
                          onClick={() => handleTestKey('custom')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition"
                        >
                          {isTestingKey ? 'Testing...' : t.cfgTestConnection}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 官方 Claude Key 配置 */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>{t.cfgClaudeKeyLabel}</span>
                      </label>
                      {settings?.hasAnthropicKey && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                          Active: {settings.anthropicKeyMasked}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={settingsForm.anthropicKey}
                        onChange={(e) => setSettingsForm({ ...settingsForm, anthropicKey: e.target.value })}
                        placeholder={settings?.hasAnthropicKey ? `Active (${settings.anthropicKeyMasked})` : t.cfgClaudeKeyPlaceholder}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-amber-500 outline-none font-mono"
                      />
                      <button
                        type="button"
                        disabled={isTestingKey || (!settingsForm.anthropicKey && !settings?.hasAnthropicKey)}
                        onClick={() => handleTestKey('anthropic')}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-xs transition"
                      >
                        {t.cfgTestConnection}
                      </button>
                    </div>
                  </div>

                  {/* 官方 OpenAI Key 配置 */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-400" />
                        <span>{t.cfgOpenaiKeyLabel}</span>
                      </label>
                      {settings?.hasOpenaiKey && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                          Active: {settings.openaiKeyMasked}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={settingsForm.openaiKey}
                        onChange={(e) => setSettingsForm({ ...settingsForm, openaiKey: e.target.value })}
                        placeholder={settings?.hasOpenaiKey ? `Active (${settings.openaiKeyMasked})` : t.cfgOpenaiKeyPlaceholder}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 outline-none font-mono"
                      />
                      <button
                        type="button"
                        disabled={isTestingKey || (!settingsForm.openaiKey && !settings?.hasOpenaiKey)}
                        onClick={() => handleTestKey('openai')}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-xs transition"
                      >
                        {t.cfgTestConnection}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: 搜索引擎与极速收录 */}
              {activeSettingsCategory === 'seo' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>{t.cfgBingKeyLabel}</span>
                      </label>
                      {settings?.hasBingApiKey ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                          Configured: {settings.bingApiKeyMasked}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                          Unconfigured (Batch Push Uses Dry-Run)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={settingsForm.bingApiKey}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bingApiKey: e.target.value })}
                        placeholder={settings?.hasBingApiKey ? `Configured (${settings.bingApiKeyMasked})` : t.cfgBingKeyPlaceholder}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none font-mono"
                      />
                      <button
                        type="button"
                        disabled={isTestingKey || (!settingsForm.bingApiKey && !settings?.hasBingApiKey)}
                        onClick={() => handleTestKey('bing')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition"
                      >
                        {isTestingKey ? 'Pinging...' : t.cfgBingTestBtn}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.cfgBingKeyDesc}</p>
                  </div>

                  {/* Google Search Console 状态 */}
                  <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span>Google Search Console & XML Sitemap Engine</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {lang === 'zh'
                        ? '全站动态 Sitemap 已自动集成于 /sitemap.xml 与 /robots.txt。Search Console 展现监控与 90 天零展现自动剪枝引擎 (gsc_monitor.py) 会在自动化调度时自动读取性能数据，剔除拖累全站权重的死页。'
                        : 'Dynamic XML Sitemap is live at /sitemap.xml and /robots.txt. The GSC monitor and 90-day zero-impression pruner (gsc_monitor.py) automatically processes performance CSVs or API dumps to prune deadweight URLs.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 4: Google Ads 转化追踪 */}
              {activeSettingsCategory === 'ads' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <span>{t.cfgGaIdLabel}</span>
                      </label>
                      {settings?.gaId && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                          {settings.gaId}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={settingsForm.gaId}
                      onChange={(e) => setSettingsForm({ ...settingsForm, gaId: e.target.value })}
                      placeholder={t.cfgGaIdPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.cfgGaIdDesc}</p>
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>{t.cfgGaLabelLabel}</span>
                      </label>
                      {settings?.gaLabel && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                          {settings.gaLabel}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={settingsForm.gaLabel}
                      onChange={(e) => setSettingsForm({ ...settingsForm, gaLabel: e.target.value })}
                      placeholder={t.cfgGaLabelPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.cfgGaLabelDesc}</p>
                  </div>
                </div>
              )}

              {/* Tab 5: 全域社媒 Webhook */}
              {activeSettingsCategory === 'social' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-amber-300 flex items-center gap-2 text-xs">
                        <Share2 className="w-4 h-4 text-amber-400" />
                        <span>{t.settingsSocialWebhookLabel}</span>
                      </label>
                      {settings?.hasSocialWebhook ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          Webhook Connected
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Safe Sandbox Mode
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={settingsForm.socialWebhookUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, socialWebhookUrl: e.target.value })}
                        placeholder={t.settingsSocialWebhookPlaceholder}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none font-mono"
                      />
                      <button
                        type="button"
                        disabled={isTestingKey || !settingsForm.socialWebhookUrl}
                        onClick={() => handleTestKey('webhook')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition"
                      >
                        {isTestingKey ? 'Sending...' : t.cfgSocialTestBtn}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.settingsSocialWebhookDesc}</p>
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span>{t.settingsAyrshareKeyLabel}</span>
                      </label>
                      {settings?.hasAyrshareApiKey && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                          Active: {settings.ayrshareApiKeyMasked}
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={settingsForm.ayrshareApiKey}
                      onChange={(e) => setSettingsForm({ ...settingsForm, ayrshareApiKey: e.target.value })}
                      placeholder={settings?.hasAyrshareApiKey ? `Active (${settings.ayrshareApiKeyMasked})` : t.settingsAyrshareKeyPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-amber-400 outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.settingsAyrshareKeyDesc}</p>
                  </div>
                </div>
              )}

              {/* Tab 6: 控制台门禁密码 */}
              {activeSettingsCategory === 'security' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/80 border border-rose-900/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-rose-300 flex items-center gap-2 text-xs">
                        <Lock className="w-4 h-4 text-rose-400" />
                        <span>{t.cfgAdminSecretLabel}</span>
                      </label>
                      <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                        Protected: {settings?.adminSecretKeyMasked || 'opc2026'}
                      </span>
                    </div>
                    <input
                      type="password"
                      value={settingsForm.adminSecretKey}
                      onChange={(e) => setSettingsForm({ ...settingsForm, adminSecretKey: e.target.value })}
                      placeholder={t.cfgAdminSecretPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-rose-400 outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">{t.cfgAdminSecretDesc}</p>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                      {lang === 'zh'
                        ? '⚠️ 提示：在此处输入新密码并保存后，.env.local 中的 ADMIN_SECRET_KEY 将立刻同步更新。下一次访问或锁定后需使用新密码解锁。'
                        : '⚠️ Notice: Saving a new key here immediately updates ADMIN_SECRET_KEY in .env.local. You will need to enter this new password on subsequent logins.'}
                    </div>
                  </div>
                </div>
              )}

              {/* 连通性测试结果提示 */}
              {testResult && (
                <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 transition ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  <span className="font-medium leading-relaxed">{testResult.msg}</span>
                </div>
              )}

              {/* 底部保存与关闭操作栏 */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                  <span>Persistence:</span>
                  <span className="text-emerald-400 font-semibold">data/settings.json</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">.env.local</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
                  >
                    {t.settingsCloseBtn}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
                  >
                    {t.settingsSaveBtn}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增 / 编辑商品 Modal 弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingProduct.asin ? 'Edit Product ASIN' : 'Add New Candidate ASIN'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ASIN</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.asin || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, asin: e.target.value.trim() })}
                    placeholder="e.g. B09XS7JWHH"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.slug || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value.trim() })}
                    placeholder="e.g. sony-wh-1000xm5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Title</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Brand</label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    placeholder="e.g. Sony"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Commission Rate</label>
                  <input
                    type="number"
                    step="0.005"
                    value={editingProduct.commission_rate || 0.04}
                    onChange={(e) => setEditingProduct({ ...editingProduct, commission_rate: parseFloat(e.target.value) })}
                    placeholder="0.04"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Amazon Image URL</label>
                <input
                  type="url"
                  value={editingProduct.image_url || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                  placeholder="https://m.media-amazon.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Review Summary / Verdict Hook</label>
                <textarea
                  rows={2}
                  value={editingProduct.review_summary || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, review_summary: e.target.value })}
                  placeholder="Brief summary of why this product is worth buying..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
