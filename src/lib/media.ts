import {useSyncExternalStore} from 'react';

const MOBILE_QUERY='(max-width: 900px)';

function subscribe(callback:()=>void){
  if(typeof window==='undefined')return ()=>undefined;
  const media=window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change',callback);
  return ()=>media.removeEventListener('change',callback);
}

function getSnapshot(){
  return typeof window!=='undefined'&&window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(){
  return useSyncExternalStore(subscribe,getSnapshot,()=>false);
}
