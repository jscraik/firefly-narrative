import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@design-studio/tokens/foundations.css';
import '@design-studio/ui/styles.css';
import './styles.css';

// Agentation annotation toolbar (dev only)
import { Agentation } from 'agentation';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
    {process.env.NODE_ENV === 'development' && <Agentation />}
  </React.StrictMode>
);
