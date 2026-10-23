import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './styles/theme.css'
import App from './App'

// Wake up backend immediately on app load to reduce cold start delay
fetch(`${import.meta.env.VITE_API_URL}/health`).catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,           // 30s — data stays fresh
      gcTime: 1000 * 60 * 10,         // 10 min — keep in cache
      retry: 1,
      refetchOnWindowFocus: true,     // refetch when user switches back to tab
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
