import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isProductionConfigured } from "./lib/env-validation";

// Validate environment variables

// In production, ensure all required configs are set
if (import.meta.env.PROD) {
  if (!isProductionConfigured()) {
    console.error('❌ Production environment is not properly configured. Please check your .env.production file.');
  }
  
  // Disable React DevTools in production
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.clear();
  }
  
  // Remove console methods in production (Vite build will handle this)
  // This is a backup in case terser doesn't catch everything
}

// Error boundary for root level errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // You can send to error tracking service here (e.g., Sentry)
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // You can send to error tracking service here
});

// Render app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);
