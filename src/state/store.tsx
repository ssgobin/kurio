import {createContext,useContext,type ReactNode} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {api} from '../lib/http';
import type {Nft} from '../mocks/data';
import type {CartResponse,SessionResponse} from '../types/api';

export type Store={
  cart:CartResponse['items'];count:number;cartLoading:boolean;promoCode:string|null;
  add:(nft:Nft,quantity?:number,edition?:string)=>Promise<void>;
  setQty:(cartItemId:string,quantity:number)=>Promise<void>;
  remove:(cartItemId:string)=>Promise<void>;
  user:SessionResponse['user']|null;sessionId:string|null;sessionLoading:boolean;
  refreshSession:()=>Promise<void>;logout:()=>Promise<void>;
  favorites:string[];favoritesLoading:boolean;isFavorite:(id:string)=>boolean;toggleFavorite:(nft:Nft)=>Promise<boolean>;
};
const StoreContext=createContext<Store|null>(null);

async function fetchSession(){try{return (await api.get<SessionResponse>('/session')).data}catch{return null}}

export function StoreProvider({children}:{children:ReactNode}){
  const queryClient=useQueryClient();
  const sessionQuery=useQuery({queryKey:['session'],queryFn:fetchSession,retry:false,staleTime:10_000});
  const cartQuery=useQuery({queryKey:['cart',sessionQuery.data?.user.id??'guest'],queryFn:async()=> (await api.get<CartResponse>('/cart')).data,staleTime:0});
  const favoritesQuery=useQuery({queryKey:['favorites',sessionQuery.data?.user.id],queryFn:async()=> (await api.get<Nft[]>('/favorites')).data,enabled:Boolean(sessionQuery.data?.user),retry:false});
  const user=sessionQuery.data?.user??null;
  const cart=cartQuery.data?.items??[];
  const favorites=(favoritesQuery.data??[]).map(n=>n.id);

  const invalidateCart=async()=>{await queryClient.invalidateQueries({queryKey:['cart']});await queryClient.invalidateQueries({queryKey:['quote']})};
  const refreshSession=async()=>{await queryClient.invalidateQueries({queryKey:['session']});await queryClient.refetchQueries({queryKey:['session']});await queryClient.invalidateQueries({queryKey:['cart']});await queryClient.invalidateQueries({queryKey:['favorites']})};

  const value:Store={
    cart,count:cart.reduce((sum,item)=>sum+item.quantity,0),cartLoading:cartQuery.isLoading,promoCode:cartQuery.data?.promoCode??null,
    add:async(nft,quantity=1,edition=nft.edition)=>{await api.post('/cart/items',{nftId:nft.id,edition,quantity});await invalidateCart()},
    setQty:async(cartItemId,quantity)=>{await api.put(`/cart/items/${cartItemId}`,{quantity});await invalidateCart()},
    remove:async(cartItemId)=>{await api.delete(`/cart/items/${cartItemId}`);await invalidateCart()},
    user,sessionId:sessionQuery.data?.sessionId??null,sessionLoading:sessionQuery.isLoading,refreshSession,
    logout:async()=>{await api.post('/auth/logout');queryClient.removeQueries({queryKey:['profile']});queryClient.removeQueries({queryKey:['wallets']});queryClient.removeQueries({queryKey:['favorites']});queryClient.removeQueries({queryKey:['orders']});queryClient.removeQueries({queryKey:['cart']});queryClient.removeQueries({queryKey:['quote']});await refreshSession()},
    favorites,favoritesLoading:favoritesQuery.isLoading,isFavorite:id=>favorites.includes(id),
    toggleFavorite:async nft=>{
      if(!user)throw new Error('Entre para usar favoritos.');
      const key=['favorites',user.id] as const;const previous=queryClient.getQueryData<Nft[]>(key)??[];const already=previous.some(item=>item.id===nft.id);const optimistic=already?previous.filter(item=>item.id!==nft.id):[...previous,nft];queryClient.setQueryData(key,optimistic);
      try{if(already)await api.delete(`/favorites/${nft.id}`);else await api.post(`/favorites/${nft.id}`);return !already}catch(error){queryClient.setQueryData(key,previous);throw error}
    }
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export const useStore=()=>{const value=useContext(StoreContext);if(!value)throw new Error('StoreProvider ausente');return value};
