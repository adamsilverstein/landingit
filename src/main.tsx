import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import './styles/theme.css';
import './styles/Header.css';
import './styles/FilterBar.css';
import './styles/PRTable.css';
import './styles/Modal.css';
import './styles/DetailPanel.css';
import './styles/TokenSetup.css';
import './styles/StatusBar.css';
import './styles/ErrorBoundary.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
