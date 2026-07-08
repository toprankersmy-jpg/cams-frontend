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

// MsalProvider handles calling msalInstance.initialize() (and
// handleRedirectPromise()) internally on mount — that's the actual
// prerequisite for loginPopup()/loginRedirect() to work, not something
// application code needs to call manually.
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
