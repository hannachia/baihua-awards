import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { LangProvider } from './i18n/LangContext.jsx';
import { ViewerProvider } from './ViewerContext.jsx';
import './styles/global.css';

// The single-file preview (npm run build:single) opens from disk, so it needs hash routing.
const Router = import.meta.env.MODE === 'single' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
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
