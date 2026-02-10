import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Ensure a consistent default theme even on screens that don't render ThemeToggle (e.g. login).
{
  const saved = localStorage.getItem('theme');
  const theme = saved === 'dark' || saved === 'light' ? saved : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  if (!saved) localStorage.setItem('theme', theme);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
