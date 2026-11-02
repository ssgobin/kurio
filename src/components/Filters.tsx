import {collectionCounts,networkCounts,type Collection,type Network} from '../mocks/data';

export type FilterState={collection:Collection|null;network:Network|null;minPrice:number;maxPrice:number};
export const defaultFilters:FilterState={collection:null,network:null,minPrice:0.02,maxPrice:12.3};

export function Filters({value=defaultFilters,onChange,onClose}:{value?:FilterState;onChange?:(value:FilterState)=>void;onClose?:()=>void}){
  const update=(patch:Partial<FilterState>)=>onChange?.({...value,...patch});
  return <aside className="filters">
    {onClose&&<button type="button" className="filters-close" onClick={onClose}>Fechar filtros</button>}
    <h3>Coleções</h3><div>{collectionCounts.map(([x,n])=><button type="button" className={value.collection===x?'active':''} onClick={()=>update({collection:value.collection===x?null:x})} key={x}>{x}<b>({n})</b></button>)}</div>
    <h3>Faixa de preço</h3><div className="price-ranges"><input aria-label="Preço mínimo" type="range" min="0.02" max="12.3" step="0.01" value={value.minPrice} onChange={e=>update({minPrice:Math.min(Number(e.target.value),value.maxPrice)})}/><input aria-label="Preço máximo" type="range" min="0.02" max="12.3" step="0.01" value={value.maxPrice} onChange={e=>update({maxPrice:Math.max(Number(e.target.value),value.minPrice)})}/></div><p>Preço: {value.minPrice.toFixed(2).replace('.',',')} - {value.maxPrice.toFixed(2).replace('.',',')} ETH</p>
    <button type="button" className="apply" onClick={()=>onChange?.({...value})}>Aplicar</button>
    <h3>Rede</h3>{networkCounts.map(([x,n])=><button type="button" className={value.network===x?'active':''} onClick={()=>update({network:value.network===x?null:x})} key={x}>{x}<b>({n})</b></button>)}
    {(value.collection||value.network||value.minPrice>0.02||value.maxPrice<12.3)&&<button type="button" className="clear-filters" onClick={()=>onChange?.(defaultFilters)}>Limpar filtros</button>}
  </aside>
}
