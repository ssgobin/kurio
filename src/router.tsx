import {createRootRoute,createRoute,createRouter,Outlet,redirect,type SearchSchemaInput} from '@tanstack/react-router';
import {lazy,Suspense} from 'react';import {api} from './lib/http';import type {Collection,Network} from './mocks/data';

const Home=lazy(()=>import('./pages/Home').then(module=>({default:module.Home})));
const Market=lazy(()=>import('./pages/Market').then(module=>({default:module.Market})));
const NftDetail=lazy(()=>import('./pages/NftDetail').then(module=>({default:module.NftDetail})));
const Cart=lazy(()=>import('./pages/Cart').then(module=>({default:module.Cart})));
const Checkout=lazy(()=>import('./pages/Checkout').then(module=>({default:module.Checkout})));
const Login=lazy(()=>import('./pages/Auth').then(module=>({default:module.Login})));
const Register=lazy(()=>import('./pages/Auth').then(module=>({default:module.Register})));
const Profile=lazy(()=>import('./pages/Profile').then(module=>({default:module.Profile})));
const Wallets=lazy(()=>import('./pages/Wallets').then(module=>({default:module.Wallets})));
const Favorites=lazy(()=>import('./pages/Favorites').then(module=>({default:module.Favorites})));
const OrderConfirmation=lazy(()=>import('./pages/OrderConfirmation').then(module=>({default:module.OrderConfirmation})));

export type MarketSearch={search?:string;collection?:Collection;network?:Network;minPrice?:string;maxPrice?:string;tab?:'all'|'new'|'trending';sort?:'recent'|'price-asc'|'price-desc';page:number};
type MarketSearchInput={search?:string;collection?:Collection;network?:Network;minPrice?:string;maxPrice?:string;tab?:'all'|'new'|'trending';sort?:'recent'|'price-asc'|'price-desc';page?:number|string};
type AuthSearch={redirect?:string};
const collections:Collection[]=['Arte digital','Fotografia','Música','Arte 3D','Colecionáveis','Generativa','Jogos','Assinaturas','Utilidade'];const networks:Network[]=['Ethereum','Polygon','Solana'];
const parsePositive=(value:unknown,fallback=1)=>{const number=Number(value);return Number.isInteger(number)&&number>0?number:fallback};
export function normalizeMarketSearch(raw:MarketSearchInput & SearchSchemaInput):MarketSearch{return {search:typeof raw.search==='string'&&raw.search.trim()?raw.search.trim():undefined,collection:collections.includes(raw.collection as Collection)?raw.collection as Collection:undefined,network:networks.includes(raw.network as Network)?raw.network as Network:undefined,minPrice:typeof raw.minPrice==='string'&&/^\d+(\.\d+)?$/.test(raw.minPrice)?raw.minPrice:undefined,maxPrice:typeof raw.maxPrice==='string'&&/^\d+(\.\d+)?$/.test(raw.maxPrice)?raw.maxPrice:undefined,tab:['all','new','trending'].includes(String(raw.tab))?raw.tab as MarketSearch['tab']:undefined,sort:['recent','price-asc','price-desc'].includes(String(raw.sort))?raw.sort as MarketSearch['sort']:undefined,page:parsePositive(raw.page,1)}}
const authSearch=(raw:AuthSearch & SearchSchemaInput):AuthSearch=>({redirect:typeof raw.redirect==='string'&&raw.redirect.startsWith('/')?raw.redirect:undefined});
async function requireAuth({location}:{location:{pathname:string;searchStr:string}}){try{await api.get('/session')}catch{throw redirect({to:'/login',search:{redirect:`${location.pathname}${location.searchStr}`}})}}
function NotFound(){return <main className="min-h-screen bg-ink px-6 py-20 text-center text-foreground"><h1 className="text-3xl font-bold">Página não encontrada</h1><a className="mt-6 inline-block text-accent underline" href="/">Voltar ao início</a></main>}
const root=createRootRoute({component:()=> <div className="app"><Suspense fallback={<main className="min-h-screen bg-ink" aria-label="Carregando página"/>}><Outlet/></Suspense></div>,notFoundComponent:NotFound});
const home=createRoute({getParentRoute:()=>root,path:'/',validateSearch:normalizeMarketSearch,component:Home});
const market=createRoute({getParentRoute:()=>root,path:'/market',validateSearch:normalizeMarketSearch,component:Market});
const detail=createRoute({getParentRoute:()=>root,path:'/nft/$id',component:NftDetail});
const cart=createRoute({getParentRoute:()=>root,path:'/cart',component:Cart});
const login=createRoute({getParentRoute:()=>root,path:'/login',validateSearch:authSearch,component:Login});
const register=createRoute({getParentRoute:()=>root,path:'/register',validateSearch:authSearch,component:Register});
const checkout=createRoute({getParentRoute:()=>root,path:'/checkout',beforeLoad:requireAuth,component:Checkout});
const profile=createRoute({getParentRoute:()=>root,path:'/profile',beforeLoad:requireAuth,component:Profile});
const wallets=createRoute({getParentRoute:()=>root,path:'/wallets',beforeLoad:requireAuth,component:Wallets});
const favorites=createRoute({getParentRoute:()=>root,path:'/favorites',beforeLoad:requireAuth,component:Favorites});
const order=createRoute({getParentRoute:()=>root,path:'/orders/$id',beforeLoad:requireAuth,component:OrderConfirmation});
export const router=createRouter({routeTree:root.addChildren([home,market,detail,cart,checkout,login,register,profile,wallets,favorites,order]),defaultPreload:'intent'});
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
