import '../../../packages/ui/src/lib/gardeHote'; // jamais web.app : redirige avant tout le reste
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tailwind.css';

const root = document.getElementById('root');
if (!root) throw new Error('Could not find #root');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
