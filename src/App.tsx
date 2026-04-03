import { useState, useEffect, useCallback } from 'react';
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
import PrivacyPage from './components/PrivacyPage';
import CookiesPage from './components/CookiesPage';
import ReadingListPage from './components/ReadingListPage';
import { useBrowserOrchestrator } from './hooks/useBrowserOrchestrator';

function App() {
  const {
    tabs,
    activeTabId,
    activeTab,
    isIncognito,
    handleNewTab,
    handleTabClick,
    handleTabClose,
    handleNavigate,
    handleBack,
    handleForward,
    handleRefresh,
  } = useBrowserOrchestrator();
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [showFindInPage, setShowFindInPage] = useState(false);
  const [showOmnibar, setShowOmnibar] = useState(false);
  const [pendingExplainText, setPendingExplainText] = useState<string | null>(null);
  const [translationNotice, setTranslationNotice] = useState<string | null>(null);

  // Apply theme settings
  useEffect(() => {
    const applyTheme = async () => {
      if (!window.electron) return;
      const settings = await window.electron.invoke('settings:get');
      if (!settings) return;

      const root = document.documentElement;
      root.style.setProperty('--accent-color', settings.accentColor || '#1a73e8');

      const presets: Record<string, { bg: string; surface: string; border: string }> = {
        default: { bg: '#202124', surface: '#292a2d', border: '#3c4043' },
        ocean: { bg: '#0f172a', surface: '#1e293b', border: '#334155' },
        forest: { bg: '#14210f', surface: '#1a2e14', border: '#2d4a22' },
        sunset: { bg: '#1c1413', surface: '#2a1f1b', border: '#3d2e27' },
        midnight: { bg: '#0a0a1a', surface: '#141428', border: '#252547' },
      };
      const preset = presets[settings.themePreset || 'default'] || presets.default;
      root.style.setProperty('--bg-primary', preset.bg);
      root.style.setProperty('--bg-surface', preset.surface);
      root.style.setProperty('--border-color', preset.border);
    };
    applyTheme();
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
  }, [closeOmnibar, handleNavigate, handleNewTab, handleTabClose, toggleOmnibar]);

  // Listen for app-level events from Electron
  useEffect(() => {
    if (!window.electron) return;

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
        window.electron.removeListener('trigger-find', handleTriggerFind);
        window.electron.removeListener('ai:open-sidebar', handleOpenSidebar);
        window.electron.removeListener('ai:translation-complete', handleTranslationComplete);
        window.electron.removeListener('ai:translation-error', handleTranslationError);
        window.electron.removeListener('shortcut:from-browserview', handleBrowserViewShortcut);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [executeShortcut]);

  const handleHome = useCallback(() => {
    handleNavigate('neuralweb://home');
  }, [handleNavigate]);

  const handleSidebarToggle = useCallback(() => {
    const nextState = !aiSidebarOpen;
    setAiSidebarOpen(nextState);
    window.electron?.invoke('ai:sidebar-toggle', nextState);
  }, [aiSidebarOpen]);

  const currentUrl = activeTab?.url || '';

  const renderContent = () => {
    switch (currentUrl) {
      case 'neuralweb://home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'neuralweb://settings':
        return <SettingsPage />;
      case 'neuralweb://downloads':
        return <DownloadsPage />;
      case 'neuralweb://bookmarks':
        return <BookmarksPage onNavigate={handleNavigate} />;
      case 'neuralweb://history':
        return <HistoryPage onNavigate={handleNavigate} />;
      case 'neuralweb://settings/site':
        return <SiteSettingsPage />;
      case 'neuralweb://privacy':
        return <PrivacyPage />;
      case 'neuralweb://cookies':
        return <CookiesPage />;
      case 'neuralweb://reading-list':
        return <ReadingListPage onNavigate={handleNavigate} />;
      default:
        return (
          <div className="web-content-placeholder">
            {/* BrowserView is overlaid here by Electron */}
          </div>
        );
    }
  };

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
        onAIToggle={handleSidebarToggle}
        aiSidebarOpen={aiSidebarOpen}
      />

      <PermissionPrompt />

      <div className="content-area">
        {renderContent()}
      </div>

      <AISidebar
        isOpen={aiSidebarOpen}
        onToggle={handleSidebarToggle}
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
            handleSidebarToggle();
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
