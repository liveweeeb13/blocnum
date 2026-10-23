import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import DatabaseStudio from './components/DatabaseStudio/DatabaseStudio';
import PagesBuilder from './components/PagesBuilder/PagesBuilder';
import ViewMode from './components/ViewMode/ViewMode';
import StandalonePage from './components/StandalonePage/StandalonePage';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return ['database', 'pages', 'view'].includes(tab) ? tab : 'database';
  }); // 'database' | 'pages' | 'view'
  const [targetSlug, setTargetSlug] = useState(() => new URLSearchParams(window.location.search).get('page') || '');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const handleActiveTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  // Listen to browser navigation / history changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin') setActiveTab('view');
  }, [user?.role]);

  useEffect(() => {
    const isPageRoute = currentPath === '/page' || currentPath.startsWith('/page/');
    if (user && user.role !== 'admin' && !isPageRoute) {
      window.history.replaceState({}, '', '/page');
      setCurrentPath('/page');
    }
  }, [user, currentPath]);

  // Wait for the stored login to load before deciding access to a route.
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs">Chargement du studio...</p>
      </div>
    );
  }

  // Published pages require a logged-in account so page permissions can be enforced.
  if (user && (currentPath === '/page' || currentPath.startsWith('/page/'))) {
    return <StandalonePage />;
  }

  // Standard users are limited to published pages under /page/.
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs">Redirection vers les pages...</p>
      </div>
    );
  }

  // 3. Admin Login required for the Studio
  if (!user) {
    return <Login />;
  }

  // 4. Admin Studio Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={handleActiveTabChange} />

      <div className="flex-1 flex flex-col">
        {user?.role === 'admin' && activeTab === 'database' && <DatabaseStudio />}
        {user?.role === 'admin' && activeTab === 'pages' && (
          <PagesBuilder
            initialPageSlug={targetSlug}
            onOpenViewPage={(slug) => {
              setTargetSlug(slug);
              handleActiveTabChange('view');
            }}
          />
        )}
        {(user?.role !== 'admin' || activeTab === 'view') && (
          <ViewMode 
            targetSlug={targetSlug} 
            onEditPage={user?.role === 'admin' ? (slug) => {
              setTargetSlug(slug);
              handleActiveTabChange('pages');
            } : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
