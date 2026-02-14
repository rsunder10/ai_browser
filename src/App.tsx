import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import BrowserChrome from './components/BrowserChrome';
import AISidebar from './components/AISidebar';
import HomePage from './components/HomePage';
import SettingsPage from './components/SettingsPage';
import BookmarksPage from './components/BookmarksPage';
import DownloadsPage from './components/DownloadsPage';
import HistoryPage from './components/HistoryPage';
import FindInPage from './components/FindInPage';
import PermissionPrompt from './components/PermissionPrompt';
import Omnibar from './components/Omnibar';
import { SiteSettingsPage } from './components/SiteSettingsPage';

interface Tab {
  id: string;
  url: string;
  title: string;
  history: string[];
  history_index: number;
  groupId?: string;
  pinned?: boolean;
  muted?: boolean;
  suspended?: boolean;
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [showFindInPage, setShowFindInPage] = useState(false);
  const [showOmnibar, setShowOmnibar] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [pendingExplainText, setPendingExplainText] = useState<string | null>(null);
  const [translationNotice, setTranslationNotice] = useState<string | null>(null);
  const initialized = useRef(false);

  // Load tabs on mount
  useEffect(() => {
    // Check if electron API is available
    if (!window.electron) {
      console.error('Electron API not available');
      return;
    }

    // Prevent double initialization in React StrictMode
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    // Load tabs and create initial tab if none exist
    const initializeTabs = async () => {
      const incognito = await window.electron.invoke('is-incognito');
      setIsIncognito(incognito);

      await loadTabs();
      const result = await window.electron.invoke('get-tabs');
      if (result.length === 0) {
        handleNewTab();
      }
    };

    initializeTabs().catch((error) => {
      console.error('Failed to initialize tabs:', error);
    });
  }, []);

  // Omnibar helpers that toggle BrowserView visibility
  const openOmnibar = useCallback(() => {
    setShowOmnibar(true);
    window.electron?.invoke('overlay:set-active', true);
  }, []);

  const closeOmnibar = useCallback(() => {
    setShowOmnibar(false);
    window.electron?.invoke('overlay:set-active', false);
  }, []);

  const toggleOmnibar = useCallback(() => {
    setShowOmnibar(prev => {
      const next = !prev;
      window.electron?.invoke('overlay:set-active', next);
      return next;
    });
  }, []);

  // Shared shortcut handler used by both keydown and BrowserView forwarding
  const executeShortcut = useCallback((key: string) => {
    switch (key) {
      case 'k': toggleOmnibar(); break;
      case 'f': setShowFindInPage(true); break;
      case 't': handleNewTab(); break;
      case 'w': {
        // Close active tab — read latest activeTabId from DOM state
        window.electron?.invoke('get-active-tab').then((id: string | null) => {
          if (id) handleTabClose(id);
        });
        break;
      }
      case 'l': {
        // Focus address bar — dispatch a custom event the AddressBar can listen for
        const addressBar = document.querySelector('.address-input') as HTMLInputElement | null;
        addressBar?.focus();
        addressBar?.select();
        break;
      }
      case 'h': handleNavigate('neuralweb://history'); break;
      case 'j': handleNavigate('neuralweb://downloads'); break;
      case 'b': handleNavigate('neuralweb://bookmarks'); break;
      case 'p': window.electron?.invoke('print:page'); break;
      case '=':
      case '+':
        window.electron?.invoke('zoom:get').then((level: number) => {
          window.electron?.invoke('zoom:set', level + 0.5);
        });
        break;
      case '-':
        window.electron?.invoke('zoom:get').then((level: number) => {
          window.electron?.invoke('zoom:set', level - 0.5);
        });
        break;
      case '0': window.electron?.invoke('zoom:reset'); break;
      case 'escape':
        closeOmnibar();
        setShowFindInPage(false);
        break;
    }
  }, [toggleOmnibar, closeOmnibar]);

  // Listen for tab updates from Electron
  useEffect(() => {
    if (!window.electron) return;

    // Incremental tab update: patch single tab in state
    const handleTabUpdate = (data: any) => {
      if (data && data.id) {
        setTabs(prev => prev.map(t =>
          t.id === data.id
            ? { ...t, url: data.url, title: data.title, history: data.history, history_index: data.historyIndex, groupId: data.groupId, pinned: data.pinned, muted: data.muted, suspended: data.suspended }
            : t
        ));
      } else {
        // Fallback: full reload if no data payload
        loadTabs();
      }
    };

    // Structural change: full reload
    const handleTabsListChanged = () => {
      loadTabs();
    };

    window.electron.on('tab-updated', handleTabUpdate);
    window.electron.on('tabs:list-changed', handleTabsListChanged);

    // Listen for find trigger from menu
    const handleTriggerFind = () => {
      setShowFindInPage(true);
    };
    window.electron.on('trigger-find', handleTriggerFind);

    // Listen for AI sidebar open from context menu
    const handleOpenSidebar = (data: { text: string; action: string }) => {
      setAiSidebarOpen(true);
      setPendingExplainText(data.text);
      window.electron?.invoke('ai:sidebar-toggle', true);
    };
    window.electron.on('ai:open-sidebar', handleOpenSidebar);

    // Listen for translation events
    const handleTranslationComplete = (data: { lang: string }) => {
      setTranslationNotice(`Page translated to ${data.lang}`);
      setTimeout(() => setTranslationNotice(null), 3000);
    };
    const handleTranslationError = (data: { error: string }) => {
      setTranslationNotice(`Translation failed: ${data.error}`);
      setTimeout(() => setTranslationNotice(null), 4000);
    };
    window.electron.on('ai:translation-complete', handleTranslationComplete);
    window.electron.on('ai:translation-error', handleTranslationError);

    // Listen for forwarded shortcuts from BrowserView
    const handleBrowserViewShortcut = (data: { key: string }) => {
      executeShortcut(data.key);
    };
    window.electron.on('shortcut:from-browserview', handleBrowserViewShortcut);

    // Keyboard shortcuts (fires when renderer has focus)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (['k', 'f', 'l', 't', 'w', 'h', 'j', 'b', 'p', '=', '+', '-', '0'].includes(key)) {
          e.preventDefault();
          executeShortcut(key);
        }
      }
      if (e.key === 'Escape') {
        executeShortcut('escape');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (window.electron) {
        window.electron.removeListener('tab-updated', handleTabUpdate);
        window.electron.removeListener('tabs:list-changed', handleTabsListChanged);
        window.electron.removeListener('trigger-find', handleTriggerFind);
        window.electron.removeListener('ai:open-sidebar', handleOpenSidebar);
        window.electron.removeListener('ai:translation-complete', handleTranslationComplete);
        window.electron.removeListener('ai:translation-error', handleTranslationError);
        window.electron.removeListener('shortcut:from-browserview', handleBrowserViewShortcut);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [executeShortcut]);

  const loadTabs = async () => {
    try {
      const result = await window.electron.invoke('get-tabs') as Tab[];
      setTabs(result);

      const activeId = await window.electron.invoke('get-active-tab') as string | null;
      setActiveTabId(activeId);
    } catch (error) {
      console.error('Failed to load tabs:', error);
    }
  };

  const handleNewTab = async () => {
    try {
      await window.electron.invoke('create-tab', 'neuralweb://home') as string;
      await loadTabs();
    } catch (error) {
      console.error('Failed to create tab:', error);
    }
  };

  const handleTabClick = async (tabId: string) => {
    try {
      await window.electron.invoke('switch-tab', tabId);
      setActiveTabId(tabId);
    } catch (error) {
      console.error('Failed to switch tab:', error);
    }
  };

  const handleTabClose = async (tabId: string) => {
    try {
      await window.electron.invoke('close-tab', tabId);
      await loadTabs();
    } catch (error) {
      console.error('Failed to close tab:', error);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const getSearchUrl = async (query: string) => {
    try {
      const settings = await window.electron.invoke('settings:get');
      const engine = settings?.searchEngine || 'google';

      switch (engine) {
        case 'bing':
          return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
        case 'duckduckgo':
          return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        case 'google':
        default:
          return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    } catch (error) {
      console.error('Failed to get settings:', error);
      return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  };

  const handleNavigate = async (input: string) => {
    if (!activeTabId) {
      console.error('No active tab ID!');
      return;
    }

    let url = input;
    // Handle internal pages
    if (input.startsWith('neuralweb://')) {
      url = input;
    }
    // Handle valid URLs (including localhost)
    else if (isValidUrl(input)) {
      url = input;
    }
    // Handle incomplete URLs (e.g. google.com)
    else if (input.includes('.') && !input.includes(' ')) {
      url = `https://${input}`;
    }
    // Handle search queries
    else {
      url = await getSearchUrl(input);
    }

    try {
      await window.electron.invoke('navigate-tab', activeTabId, url);
      await loadTabs();
    } catch (error) {
      console.error('Failed to navigate:', error);
    }
  };

  const handleBack = async () => {
    if (!activeTabId) return;

    try {
      await window.electron.invoke('go-back', activeTabId);
      await loadTabs();
    } catch (error) {
      console.error('Failed to go back:', error);
    }
  };

  const handleForward = async () => {
    if (!activeTabId) return;

    try {
      await window.electron.invoke('go-forward', activeTabId);
      await loadTabs();
    } catch (error) {
      console.error('Failed to go forward:', error);
    }
  };

  const handleRefresh = async () => {
    if (!activeTabId) return;

    try {
      await window.electron.invoke('refresh-tab', activeTabId);
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  const handleHome = () => {
    handleNavigate('neuralweb://home');
  };

  const activeTab = tabs.find(t => t.id === activeTabId);
  const currentUrl = activeTab?.url || '';

  // ...

  const isHomePage = currentUrl === 'neuralweb://home';
  const isSettingsPage = currentUrl === 'neuralweb://settings';
  const isDownloadsPage = currentUrl === 'neuralweb://downloads';
  const isBookmarksPage = currentUrl === 'neuralweb://bookmarks';
  const isHistoryPage = currentUrl === 'neuralweb://history';
  const isSiteSettingsPage = currentUrl === 'neuralweb://settings/site';

  console.log('App Render:', { currentUrl, isHomePage, isSettingsPage, isDownloadsPage, isBookmarksPage, isHistoryPage });

  return (
    <div className={`app ${isIncognito ? 'incognito' : ''}`}>
      <BrowserChrome
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
        onNavigate={handleNavigate}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
        onHome={handleHome}
        onAIToggle={() => {
          const newState = !aiSidebarOpen;
          setAiSidebarOpen(newState);
          window.electron?.invoke('ai:sidebar-toggle', newState);
        }}
        aiSidebarOpen={aiSidebarOpen}
      />

      <PermissionPrompt />

      <div className="content-area">
        {isHomePage && <HomePage onNavigate={handleNavigate} />}
        {isSettingsPage && <SettingsPage />}
        {isDownloadsPage && <DownloadsPage />}
        {isBookmarksPage && <BookmarksPage onNavigate={handleNavigate} />}
        {isHistoryPage && <HistoryPage onNavigate={handleNavigate} />}
        {isSiteSettingsPage && <SiteSettingsPage />}
        {!isHomePage && !isSettingsPage && !isDownloadsPage && !isBookmarksPage && !isHistoryPage && !isSiteSettingsPage && (
          <div className="web-content-placeholder">
            {/* BrowserView is overlaid here by Electron */}
          </div>
        )}
      </div>

      <AISidebar
        isOpen={aiSidebarOpen}
        onToggle={() => {
          const newState = !aiSidebarOpen;
          setAiSidebarOpen(newState);
          window.electron?.invoke('ai:sidebar-toggle', newState);
        }}
        currentUrl={currentUrl}
        pendingExplainText={pendingExplainText}
        onExplainConsumed={() => setPendingExplainText(null)}
        tabs={tabs}
      />

      {showFindInPage && (
        <FindInPage onClose={() => setShowFindInPage(false)} />
      )}

      {showOmnibar && (
        <Omnibar
          tabs={tabs}
          onTabClick={(tabId) => { closeOmnibar(); handleTabClick(tabId); }}
          onNavigate={(url) => { closeOmnibar(); handleNavigate(url); }}
          onNewTab={() => { closeOmnibar(); handleNewTab(); }}
          onToggleAI={() => {
            closeOmnibar();
            const newState = !aiSidebarOpen;
            setAiSidebarOpen(newState);
            window.electron?.invoke('ai:sidebar-toggle', newState);
          }}
          onClose={closeOmnibar}
        />
      )}

      {translationNotice && (
        <div className="translation-notice">{translationNotice}</div>
      )}

      <div className="status-bar">
        <span className="status-text">
          {tabs.length} tab{tabs.length !== 1 ? 's' : ''} open
        </span>
      </div>
    </div>
  );
}

export default App;
