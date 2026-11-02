import { useQuery } from '@tanstack/react-query';
import { Filter, Search, Home as HomeIcon, Heart, ShoppingCart, User, ArrowRight, X } from 'lucide-react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../lib/http';
import type { Nft } from '../mocks/data';
import { Header } from '../components/Header';
import { Filters, type FilterState } from '../components/Filters';
import { ProductCard } from '../components/ProductCard';
import { Artwork } from '../components/Artwork';
import { useStore } from '../state/store';
import { useIsMobile } from '../lib/media';
import type { MarketSearch } from '../router';
import type { NftListResponse } from '../types/api';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';
type Tab = 'all' | 'new' | 'trending';
type Sort = 'recent' | 'price-asc' | 'price-desc';
export function Home() { return <MarketplacePage showHero/>; }
export function MarketplacePage({ showHero = false }: {
    showHero?: boolean;
}) {
    const isMobile = useIsMobile();
    const searchState = useSearch({ strict: false }) as MarketSearch;
    const navigate = useNavigate();
    const [mobileFilters, setMobileFilters] = useState(false);
    const state = { search: searchState.search ?? '', tab: (searchState.tab ?? 'all') as Tab, sort: (searchState.sort ?? 'recent') as Sort, page: searchState.page ?? 1, filters: { collection: searchState.collection ?? null, network: searchState.network ?? null, minPrice: Number(searchState.minPrice ?? 0.02), maxPrice: Number(searchState.maxPrice ?? 12.3) } as FilterState };
    const update = (patch: Partial<MarketSearch>, resetPage = true) => void navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...patch, page: resetPage ? 1 : (patch.page ?? state.page) }) } as never);
    const params = { search: state.search || undefined, collection: state.filters.collection || undefined, network: state.filters.network || undefined, minPrice: state.filters.minPrice > 0.02 ? String(state.filters.minPrice) : undefined, maxPrice: state.filters.maxPrice < 12.3 ? String(state.filters.maxPrice) : undefined, tab: state.tab, sort: state.sort, page: state.page, pageSize: isMobile ? 8 : 9 };
    const query = useQuery({ queryKey: ['nfts', params], queryFn: async ({ signal }) => (await api.get<NftListResponse>('/nfts', { params, signal })).data });
    const data = query.data?.items ?? [];
    const setFilters = (filters: FilterState) => update({ collection: filters.collection ?? undefined, network: filters.network ?? undefined, minPrice: filters.minPrice > 0.02 ? String(filters.minPrice) : undefined, maxPrice: filters.maxPrice < 12.3 ? String(filters.maxPrice) : undefined });
    const content = isMobile ? <MobileMarket data={data} loading={query.isLoading} search={state.search} setSearch={value => update({ search: value || undefined })} tab={state.tab} setTab={tab => update({ tab })} showHero={showHero} sort={state.sort} setSort={sort => update({ sort })} filters={state.filters} setFilters={setFilters} drawer={mobileFilters} setDrawer={setMobileFilters} error={query.isError} retry={() => void query.refetch()} page={query.data?.page ?? state.page} totalPages={query.data?.totalPages ?? 1} setPage={page => update({ page }, false)}/> : <><Header /><main className="desktop-home">{showHero && <Hero />}<div className={`market-layout ${showHero ? '' : 'market-only-layout'}`}><Filters value={state.filters} onChange={setFilters}/><section className="listing"><div className="market-search"><Search /><input aria-label="Buscar NFTs" placeholder="Buscar por nome, coleção ou rede" value={state.search} onChange={e => update({ search: e.target.value || undefined })}/>{state.search && <button type="button" aria-label="Limpar busca" onClick={() => update({ search: undefined })}><X /></button>}</div><SortTabs tab={state.tab} setTab={tab => update({ tab })} sort={state.sort} setSort={sort => update({ sort })}/>{query.isError ? <ErrorState retry={() => void query.refetch()}/> : query.isLoading ? <CatalogSkeleton /> : <><div className="grid">{data.map(n => <ProductCard key={n.id} nft={n}/>)}</div>{!data.length && <EmptyState />}<Pagination page={query.data?.page ?? state.page} totalPages={query.data?.totalPages ?? 1} setPage={page => update({ page }, false)}/></>}</section></div></main></>;
    return <div className="home-page">{content}</div>;
}
function Hero() { return <section className="hero"><div><small>Bem-vindo à Kurio</small><h1>SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</h1><p>Descubra NFTs selecionados de criadores do mundo todo e colecione arte digital verificada.</p><Link to="/market">EXPLORAR</Link></div><Artwork art={1}/><i>•••</i></section>; }
function SortTabs({ tab, setTab, sort, setSort }: {
    tab: Tab;
    setTab: (v: Tab) => void;
    sort: Sort;
    setSort: (v: Sort) => void;
}) { return <div className="sort"><div><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>Todos os NFTs</button><button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>Novos lançamentos</button><button className={tab === 'trending' ? 'active' : ''} onClick={() => setTab('trending')}>Em alta</button></div><label>Ordenar por: <select aria-label="Ordenar NFTs" value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="recent">Listados recentemente</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label></div>; }
function ErrorState({ retry }: {
    retry: () => void;
}) { return <div className="state-card error-state" role="alert"><b>Não foi possível carregar o mercado.</b><span>O mock retornou uma falha controlada.</span><button onClick={retry}>Tentar novamente</button></div>; }
function EmptyState() { return <div className="state-card"><b>Nenhum NFT encontrado</b><span>Ajuste sua busca ou limpe os filtros.</span></div>; }
function CatalogSkeleton() { return <div className="grid" aria-label="Carregando catálogo">{Array.from({ length: 9 }).map((_, index) => <div key={index} className="space-y-2"><Skeleton className="h-[300px] w-[258px] rounded-2xl"/><Skeleton className="h-4 w-40"/><Skeleton className="h-4 w-24"/></div>)}</div>; }
function Pagination({ page, totalPages, setPage }: {
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
}) { if (totalPages <= 1)
    return null; return <nav className="pagination" aria-label="Paginação do catálogo"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</button></nav>; }
function MobileMarket({ data, loading, search, setSearch, tab, setTab, sort, setSort, showHero, filters, setFilters, drawer, setDrawer, error, retry, page, totalPages, setPage }: {
    data: Nft[];
    loading: boolean;
    search: string;
    setSearch: (s: string) => void;
    tab: Tab;
    setTab: (t: Tab) => void;
    sort: Sort;
    setSort: (s: Sort) => void;
    showHero: boolean;
    filters: FilterState;
    setFilters: (f: FilterState) => void;
    drawer: boolean;
    setDrawer: (v: boolean) => void;
    error: boolean;
    retry: () => void;
    page: number;
    totalPages: number;
    setPage: (p: number) => void;
}) { const { isFavorite, toggleFavorite, user } = useStore(); return <main className="m-home"><div className="m-search"><div><Search size={22}/><input aria-label="Explorar coleções" placeholder="Explorar coleções" value={search} onChange={e => setSearch(e.target.value)}/></div><button aria-label="Abrir filtros" onClick={() => setDrawer(true)}><Filter size={22}/></button></div>{showHero && <section className="m-hero"><div><small>Bem-vindo à Kurio</small><h1>SEJA DONO DA<br />CULTURA DIGITAL</h1><p>Descubra NFTs selecionados de criadores do mundo todo.</p><Link to="/market">EXPLORAR <ArrowRight size={16}/></Link></div><div className="m-hero-art"><Artwork art={1}/><Artwork art={2}/></div><i>•••</i></section>}<div className="m-tabs"><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>Todos os NFTs</button><button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>Novos lançamentos</button><button className={tab === 'trending' ? 'active' : ''} onClick={() => setTab('trending')}>Em alta</button></div><label className="m-sort"><span>Ordenar</span><select aria-label="Ordenar NFTs" value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="recent">Recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label>{error ? <ErrorState retry={retry}/> : loading ? <div className="m-grid" aria-label="Carregando catálogo">{Array.from({ length: 4 }).map((_, i) => <Skeleton className="h-[235px] w-[175px] rounded-[20px]" key={i}/>)}</div> : <><div className="m-grid">{data.map((n, i) => <div className={`m-card c${i}`} key={n.id}><Link to="/nft/$id" params={{ id: n.id }}><div><Artwork art={n.art}/>{n.rare && <span>RARO</span>}</div><p>{n.name}</p><b>{n.price} ETH</b></Link><button className={`m-favorite ${isFavorite(n.id) ? 'active' : ''}`} aria-label={isFavorite(n.id) ? 'Remover dos favoritos' : 'Favoritar'} onClick={async () => { if (!user) {
    location.assign(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return;
} await toggleFavorite(n); }}><Heart size={17} fill={isFavorite(n.id) ? 'currentColor' : 'none'}/></button></div>)}</div>{!data.length && <EmptyState />}<Pagination page={page} totalPages={totalPages} setPage={setPage}/></>}<nav className="m-tabbar" aria-label="Navegação mobile"><Link to="/" aria-label="Início"><HomeIcon /></Link><Link to="/favorites" aria-label="Favoritos"><Heart /></Link><Link to="/market" aria-label="Ir para o mercado">▢</Link><Link to="/cart" aria-label="Carrinho"><ShoppingCart /></Link><Link to="/profile" aria-label="Perfil"><User /></Link></nav><Dialog open={drawer} onOpenChange={setDrawer}><DialogContent className="max-w-[390px]"><DialogTitle>Filtros</DialogTitle><DialogDescription className="sr-only">Filtre o catálogo por coleção, preço e rede.</DialogDescription><Filters value={filters} onChange={setFilters} onClose={() => setDrawer(false)}/></DialogContent></Dialog></main>; }
