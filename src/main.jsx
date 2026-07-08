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

const renderApp = () => {
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
}

// MSAL must be initialized before rendering, so it can process a pending
// redirect response before the router makes any navigation decisions. If
// initialization itself fails (e.g. corrupted MSAL cache state), the app
// must still render — mock login and the rest of CAMS don't depend on MSAL,
// and Microsoft sign-in simply won't be available until the underlying
// issue is fixed, rather than the whole app going blank.
msalInstance.initialize()
  .catch((error) => {
    console.error('MSAL initialization failed — Microsoft sign-in will be unavailable:', error);
  })
  .finally(renderApp)
