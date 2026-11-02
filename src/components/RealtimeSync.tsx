import {useEffect,useRef} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {getMarketSocket} from '../lib/socket';
import {useStore} from '../state/store';
import type {Nft} from '../mocks/data';
import type {CartResponse,NftListResponse,NftUpdatedPayload,OrderResponse,OrderUpdatedPayload,RealtimeEvent} from '../types/api';

export function RealtimeSync(){
  const queryClient=useQueryClient();
  const{user,sessionId}=useStore();const userId=user?.id??null;
  const activeSession=useRef({userId,sessionId});
  useEffect(()=>{activeSession.current={userId,sessionId}},[userId,sessionId]);
  const versions=useRef(new Map<string,number>());
  useEffect(()=>{
    const currentVersions=versions.current;
    let disposed=false;let release=()=>{};
    const accept=(key:string,version:number)=>{const current=currentVersions.get(key)??0;if(version<=current)return false;currentVersions.set(key,version);return true};
    void getMarketSocket().then(s=>{
      if(disposed)return;
      const onNft=(event:RealtimeEvent<NftUpdatedPayload>)=>{
        if(!accept(`nft:${event.resourceId}`,event.version))return;
        const patch=(nft:Nft):Nft=>nft.id===event.resourceId&&event.version>nft.version?{...nft,price:event.payload.price,available:event.payload.available,version:event.version}:nft;
        queryClient.setQueriesData<NftListResponse>({queryKey:['nfts']},old=>old?{...old,items:old.items.map(patch)}:old);
        queryClient.setQueryData<Nft>(['nft',event.resourceId],old=>old?patch(old):old);
        const cart=queryClient.getQueriesData<CartResponse>({queryKey:['cart']});
        if(cart.some(([,data])=>data?.items.some(item=>item.nftId===event.resourceId))){void queryClient.invalidateQueries({queryKey:['cart']});void queryClient.invalidateQueries({queryKey:['quote']})}
      };
      const onOrder=(event:RealtimeEvent<OrderUpdatedPayload>)=>{
        const current=activeSession.current;
        if(!current.userId||event.userId!==current.userId||event.sessionId!==current.sessionId)return;if(!accept(`order:${event.resourceId}`,event.version))return;
        queryClient.setQueryData<OrderResponse>(['order',current.userId,event.resourceId],old=>old&&event.version>old.version?{...old,status:event.payload.status,tx:event.payload.tx,rejectionReason:event.payload.rejectionReason,version:event.version,updatedAt:event.occurredAt}:old);
        void queryClient.invalidateQueries({queryKey:['orders',current.userId]});if(event.payload.status==='confirmed')void queryClient.invalidateQueries({queryKey:['cart']});
      };
      const reconcile=()=>{const current=activeSession.current;document.documentElement.dataset.kurioSocket='connected';void queryClient.invalidateQueries({queryKey:['nfts']});void queryClient.invalidateQueries({queryKey:['cart']});if(current.userId)void queryClient.invalidateQueries({queryKey:['orders',current.userId]})};
      const disconnected=()=>{document.documentElement.dataset.kurioSocket='disconnected'};s.on('nft.updated',onNft);s.on('order.updated',onOrder);s.on('connect',reconcile);s.on('disconnect',disconnected);if(s.connected)reconcile();else s.connect();
      release=()=>{s.off('nft.updated',onNft);s.off('order.updated',onOrder);s.off('connect',reconcile);s.off('disconnect',disconnected);s.disconnect()};
    });
    return()=>{disposed=true;release();currentVersions.clear()};
  },[queryClient]);
  return null;
}
