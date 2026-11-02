import {QueryClient} from '@tanstack/react-query';
export const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:15_000,retry:(count,error)=>count<1&&!String((error as Error)?.message??'').toLowerCase().includes('sessão'),refetchOnWindowFocus:false,refetchOnReconnect:true},mutations:{retry:0}}});
