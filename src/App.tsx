import { useState, useEffect, useRef } from 'react';
import './App.css';
import BrowserChrome from './components/BrowserChrome';
import AISidebar from './components/AISidebar';
import HomePage from './components/HomePage';

interface Tab {
  id: string;
  url: string;
  title: string;
  history: string[];
  history_index: number;
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
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

    return () => {
      if (window.electron) {
        window.electron.removeListener('tab-updated', handleTabUpdate);
      }
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

  const handleNavigate = async (url: string) => {
    if (!activeTabId) {
      console.error('No active tab ID!');
      return;
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
  const isHomePage = currentUrl === 'neuralweb://home';

  return (
    <div className="app-container">
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

      {isHomePage ? (
        <HomePage onNavigate={handleNavigate} />
      ) : (
        <div className="content-placeholder">
          <p className="info-text">
            🌐 Tab content renders below this chrome
          </p>
          <p className="info-text-small">
            Using Electron BrowserView for native Chromium rendering
          </p>
        </div>
      )}

      <AISidebar
        isOpen={aiSidebarOpen}
        onToggle={() => setAiSidebarOpen(!aiSidebarOpen)}
        currentUrl={currentUrl}
      />

      <div className="status-bar">
        <span className="status-text">
          {tabs.length} tab{tabs.length !== 1 ? 's' : ''} open
        </span>
      </div>
    </div>
  );
}

export default App;
