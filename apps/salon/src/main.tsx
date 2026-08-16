import './firebase'; // initialize default Firebase app before App renders
import { installerRapportErreurs } from './errorReporter';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

installerRapportErreurs();

const root = document.getElementById('root');
if (!root) throw new Error('Could not find #root');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
