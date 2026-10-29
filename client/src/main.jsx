import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { LangProvider } from './i18n/LangContext.jsx';
import { ViewerProvider } from './ViewerContext.jsx';
import './styles/global.css';

// The single-file preview (npm run build:single) opens from disk, so it needs hash routing.
const Router = import.meta.env.MODE === 'single' ? HashRouter : BrowserRouter;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LangProvider>
      <ViewerProvider>
        <Router>
          <App />
        </Router>
      </ViewerProvider>
    </LangProvider>
  </React.StrictMode>
);

// The loading screen in index.html stays up until the app has started (at least half a second, so it never just flashes)
clearTimeout(window.__splashTimer);
const splash = document.getElementById('splash');
if (splash) {
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 600);
  }, Math.max(0, 500 - performance.now()));
}
