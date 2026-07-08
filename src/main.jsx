import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalConfig'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

// Create a React Query client with 5-minute default staleTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

// MSAL must be initialized before rendering, in every window that loads this
// bundle — including popup windows spawned by loginPopup(). Initialization is
// what lets MSAL recognize a popup carrying a login response and hand it back
// to the opener instead of just booting the app fresh inside the popup.
msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </MsalProvider>
    </StrictMode>,
  )
})
