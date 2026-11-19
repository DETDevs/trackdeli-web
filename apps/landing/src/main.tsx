import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ManualPage } from './manual/ManualPage';
import './index.css';

const isManualRoute = (pathname: string) => {
  return pathname === '/manual' || pathname === '/manual/';
};

const Root: React.FC = () => {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    const nextUrl = new URL(to, window.location.origin);
    window.history.pushState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    setPathname(nextUrl.pathname);
    if (!nextUrl.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  return isManualRoute(pathname) ? (
    <ManualPage onNavigate={navigate} />
  ) : (
    <App onNavigate={navigate} />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
