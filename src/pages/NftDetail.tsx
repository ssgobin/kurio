import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Heart, Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { api } from '../lib/http';
import type { Nft } from '../mocks/data';
import { Header } from '../components/Header';
import { Artwork } from '../components/Artwork';
import { useStore } from '../state/store';
import { useState } from 'react';
import { useIsMobile } from '../lib/media';
import { multiplyEth, formatEthUnits } from '../lib/eth';
import { Skeleton } from '../components/ui/skeleton';
export function NftDetail() { const isMobile = useIsMobile(); const { id } = useParams({ from: '/nft/$id' }); const q = useQuery({ queryKey: ['nft', id], queryFn: async ({ signal }) => (await api.get<Nft>(`/nfts/${id}`, { signal })).data }); if (q.isLoading)
    return <DetailSkeleton mobile={isMobile}/>; if (q.isError || !q.data)
    return <div className="detail-error"><Link to="/market">← Voltar</Link><h1>NFT não encontrado</h1><p>Este item não existe ou não está mais disponível.</p></div>; return isMobile ? <MobileDetail nft={q.data}/> : <DesktopDetail nft={q.data}/>; }
function useDetailActions(nft: Nft) { const [qty, setQty] = useState(1); const [selectedEdition, setSelectedEdition] = useState(nft.edition); const { add, toggleFavorite, isFavorite, user } = useStore(); const nav = useNavigate(); const [error, setError] = useState(''); const fav = isFavorite(nft.id); const changeQty = (next: number) => setQty(Math.max(1, Math.min(nft.available, next))); const favorite = async () => { if (!user) {
    await nav({ to: '/login', search: { redirect: `/nft/${nft.id}` } });
    return;
} try {
    await toggleFavorite(nft);
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Falha ao atualizar favorito');
} }; const buy = async (target: 'checkout' | 'cart') => { if (qty > nft.available) {
    setError('Quantidade indisponível.');
    return;
} try {
    await add(nft, qty, selectedEdition);
    await nav({ to: target === 'checkout' ? '/checkout' : '/cart' });
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Não foi possível adicionar o item');
} }; return { qty, changeQty, selectedEdition, setSelectedEdition, fav, favorite, buy, error }; }
function DesktopDetail({ nft }: {
    nft: Nft;
}) { const a = useDetailActions(nft); return <div className="detail-desktop"><Header divider={false}/><main><div className="big-art"><Artwork art={nft.art} alt={nft.name}/></div><section><Link to="/market" className="back">← Voltar ao mercado</Link><div className="detail-title-actions"><h1>{nft.name}</h1><button className={a.fav ? 'favorite-active' : ''} onClick={a.favorite} aria-label="Favoritar NFT"><Heart fill={a.fav ? 'currentColor' : 'none'}/></button></div><div className="rating"><Star size={16} fill="currentColor"/> {nft.rating.toFixed(1)} <span>({nft.reviews})</span></div><p>{nft.description}</p><p className="stock-note" aria-live="polite">{nft.available > 0 ? `${nft.available} disponíveis` : 'Edição esgotada'} • versão {nft.version}</p><h2>Edição:</h2><div className="editions">{['1/10', '1/1', nft.edition, 'ABERTA'].filter((x, i, list) => list.indexOf(x) === i).map(edition => <button key={edition} onClick={() => a.setSelectedEdition(edition)} className={a.selectedEdition === edition ? 'active' : ''}>{edition}</button>)}</div><div className="token-info"><span>ID do token: {nft.tokenId}</span><span>Coleção: {nft.collection}</span><span>Atributos: {nft.attributes.join(', ')}</span><span>Rede: {nft.network}</span></div><div className="buy-row"><div className="qty"><span>Qtd.</span><button aria-label="Diminuir quantidade" onClick={() => a.changeQty(a.qty - 1)}><Minus /></button><b>{a.qty}</b><button aria-label="Aumentar quantidade" disabled={a.qty >= nft.available} onClick={() => a.changeQty(a.qty + 1)}><Plus /></button></div><strong>{formatEthUnits(multiplyEth(nft.price, a.qty), 2)} ETH</strong></div>{a.error && <p role="alert" className="form-error">{a.error}</p>}<div className="buy-actions"><button disabled={!nft.available} onClick={() => a.buy('checkout')}>Comprar NFT</button><button disabled={!nft.available} className="round-cart" onClick={() => a.buy('cart')} aria-label="Adicionar e abrir carrinho"><ShoppingCart /></button></div></section></main></div>; }
function MobileDetail({ nft }: {
    nft: Nft;
}) { const a = useDetailActions(nft); return <main className="m-detail"><section className="m-detail-hero"><div className="m-detail-actions"><Link to="/market" aria-label="Voltar ao mercado"><ArrowLeft /></Link><button className={a.fav ? 'favorite-active' : ''} onClick={a.favorite} aria-label="Favoritar NFT"><Heart fill={a.fav ? 'currentColor' : 'none'}/></button></div><Artwork art={nft.art} alt={nft.name}/><i>••••</i></section><section className="m-detail-sheet"><div className="title-row"><h1>{nft.name}</h1><span><Star size={14} fill="currentColor"/>{nft.rating.toFixed(1)} <em>({nft.reviews})</em></span></div><p>{nft.description}</p><p className="stock-note" aria-live="polite">{nft.available > 0 ? `${nft.available} disponíveis` : 'Edição esgotada'}</p><h2>Edição:</h2><div className="editions">{['1/10', '1/1', nft.edition, 'ABERTA'].filter((x, i, list) => list.indexOf(x) === i).map(edition => <button key={edition} onClick={() => a.setSelectedEdition(edition)} className={a.selectedEdition === edition ? 'active' : ''}>{edition}</button>)}</div><div className="token-info"><span>ID do token: {nft.tokenId}</span><span>Coleção: {nft.collection}</span><span>Atributos: {nft.attributes.join(', ')}</span></div>{a.error && <p role="alert" className="form-error">{a.error}</p>}</section><footer className="m-buy"><div><span>Qtd.</span><button aria-label="Diminuir quantidade" onClick={() => a.changeQty(a.qty - 1)}><Minus /></button><b>{a.qty}</b><button aria-label="Aumentar quantidade" disabled={a.qty >= nft.available} onClick={() => a.changeQty(a.qty + 1)}><Plus /></button><strong>{formatEthUnits(multiplyEth(nft.price, a.qty), 2)} ETH</strong></div><div><button disabled={!nft.available} onClick={() => a.buy('checkout')}>Comprar NFT</button><button disabled={!nft.available} onClick={() => a.buy('cart')} aria-label="Adicionar e abrir carrinho"><ShoppingCart /></button></div></footer></main>; }
function DetailSkeleton({ mobile }: {
    mobile: boolean;
}) { if (mobile)
    return <main className="m-detail" aria-label="Carregando detalhe"><Skeleton className="h-[506px] w-full rounded-none"/><section className="m-detail-sheet space-y-4"><Skeleton className="h-6 w-2/3"/><Skeleton className="h-20 w-full"/><Skeleton className="h-8 w-56"/></section></main>; return <div className="detail-desktop"><Header divider={false}/><main aria-label="Carregando detalhe"><Skeleton className="h-[600px] w-[600px] rounded-2xl"/><section className="space-y-5"><Skeleton className="h-8 w-64"/><Skeleton className="h-24 w-full"/><Skeleton className="h-12 w-72"/></section></main></div>; }
