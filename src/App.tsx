import { useState, useEffect, useRef } from 'react';
import './App.css';
import BrowserChrome from './components/BrowserChrome';
import AISidebar from './components/AISidebar';
import HomePage from './components/HomePage';
import SettingsPage from './components/SettingsPage';
import BookmarksPage from './components/BookmarksPage';
import DownloadsPage from './components/DownloadsPage';
import HistoryPage from './components/HistoryPage';
import FindInPage from './components/FindInPage';
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
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [showFindInPage, setShowFindInPage] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
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

  // Listen for tab updates from Electron
  useEffect(() => {
    if (!window.electron) return;

    const handleTabUpdate = () => {
      loadTabs();
    };

    window.electron.on('tab-updated', handleTabUpdate);

    // Listen for find trigger from menu
    const handleTriggerFind = () => {
      setShowFindInPage(true);
    };
    window.electron.on('trigger-find', handleTriggerFind);

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        handleNewTab();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindInPage(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        handleNavigate('neuralweb://history');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        handleNavigate('neuralweb://downloads');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        handleNavigate('neuralweb://bookmarks');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        window.electron.invoke('print:page');
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        window.electron.invoke('zoom:get').then((level: number) => {
          window.electron.invoke('zoom:set', level + 0.5);
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        window.electron.invoke('zoom:get').then((level: number) => {
          window.electron.invoke('zoom:set', level - 0.5);
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        window.electron.invoke('zoom:reset');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (window.electron) {
        window.electron.removeListener('tab-updated', handleTabUpdate);
        window.electron.removeListener('trigger-find', handleTriggerFind);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      />
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
        onToggle={() => setAiSidebarOpen(!aiSidebarOpen)}
        currentUrl={currentUrl}
      />

      {showFindInPage && (
        <FindInPage onClose={() => setShowFindInPage(false)} />
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
