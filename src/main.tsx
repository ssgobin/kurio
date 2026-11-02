import React from 'react';
import ReactDOM from 'react-dom/client';
import {RouterProvider} from '@tanstack/react-router';
import {QueryClientProvider} from '@tanstack/react-query';
import {router} from './router';
import {queryClient} from './lib/query';
import {StoreProvider} from './state/store';
import {RealtimeSync} from './components/RealtimeSync';
import './styles/tailwind.css';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';

async function bootstrap(){
  if(import.meta.env.VITE_ENABLE_MSW!=='false'){
    const {worker}=await import('./mocks/browser');
    await worker.start({onUnhandledRequest:'bypass',serviceWorker:{url:'/mockServiceWorker.js'}});
    document.documentElement.dataset.kurioMocks='ready';
  }else{
    document.documentElement.dataset.kurioMocks='disabled';
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <StoreProvider><RealtimeSync/><RouterProvider router={router}/></StoreProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
  document.documentElement.dataset.kurioApp='ready';
}

void bootstrap();
