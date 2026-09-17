import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#FAFAFA',
            border: '1px solid #292929',
            fontSize: '13px',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#22C55E',
              secondary: '#0F0F0F',
            },
          },
          error: {
            iconTheme: {
              primary: '#F43F5E',
              secondary: '#0F0F0F',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
};
