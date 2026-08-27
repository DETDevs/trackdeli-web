import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F0F0F',
            color: '#FFFFFF',
            fontSize: '13px',
            borderRadius: '10px',
            padding: '10px 14px',
          },
          success: {
            iconTheme: {
              primary: '#22C55E',
              secondary: '#0F0F0F',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#0F0F0F',
            },
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
