import './style.css';
import { startApp } from './engine/app';

startApp(document.getElementById('app')!).catch((err) => {
  console.error(err);
  const s = document.getElementById('loader-status');
  if (s) s.textContent = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
});
