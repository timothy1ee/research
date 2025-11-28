import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Note: StrictMode disabled during development to prevent double WebSocket connections
// Re-enable for production by wrapping App in <StrictMode>
createRoot(document.getElementById('root')!).render(
  <App />,
)
