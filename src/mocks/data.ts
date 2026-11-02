export type Network = 'Ethereum' | 'Polygon' | 'Solana';
export type Collection = 'Arte digital' | 'Fotografia' | 'Música' | 'Arte 3D' | 'Colecionáveis' | 'Generativa' | 'Jogos' | 'Assinaturas' | 'Utilidade';

export type Nft = {
  id: string;
  name: string;
  price: string;
  edition: string;
  network: Network;
  collection: Collection;
  rare?: boolean;
  art: number;
  tokenId: string;
  description: string;
  attributes: string[];
  rating: number;
  reviews: number;
  createdAt: string;
  popularity: number;
  available: number;
  version: number;
};

const description = 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado em blockchain.';
const nft = (value: Omit<Nft, 'description' | 'version'>): Nft => ({ ...value, description, version: 1 });

export const nfts: Nft[] = [
  nft({id:'emerald-ape-042',name:'Emerald Ape #042',price:'1.19',edition:'1/50',network:'Ethereum',collection:'Arte digital',art:1,tokenId:'#0042',attributes:['Óculos','Esmeralda','Raro'],rating:4.8,reviews:19,createdAt:'2026-10-30T18:00:00Z',popularity:98,available:12}),
  nft({id:'sage-nomad-009',name:'Sage Nomad #009',price:'1.69',edition:'1/10',network:'Polygon',collection:'Arte digital',art:2,tokenId:'#0009',attributes:['Chapéu','Sálvia','Nômade'],rating:4.7,reviews:31,createdAt:'2026-10-29T15:00:00Z',popularity:91,available:6}),
  nft({id:'neon-vessel-552',name:'Neon Vessel #552',price:'1.99',edition:'ABERTA',network:'Ethereum',collection:'Arte 3D',rare:true,art:1,tokenId:'#0552',attributes:['Neon','Vessel','Raro'],rating:4.9,reviews:44,createdAt:'2026-10-31T13:00:00Z',popularity:100,available:25}),
  nft({id:'cosmic-bloom-118',name:'Cosmic Bloom #118',price:'1.29',edition:'1/10',network:'Solana',collection:'Generativa',art:3,tokenId:'#0118',attributes:['Cosmos','Bloom','Generativa'],rating:4.5,reviews:14,createdAt:'2026-10-24T11:00:00Z',popularity:76,available:4}),
  nft({id:'violet-nomad-314',name:'Violet Nomad #314',price:'1.39',edition:'1/1',network:'Ethereum',collection:'Fotografia',art:4,tokenId:'#0314',attributes:['Violeta','Retrato','Único'],rating:4.6,reviews:22,createdAt:'2026-10-27T09:00:00Z',popularity:88,available:1}),
  nft({id:'ivory-baron-088',name:'Ivory Baron #088',price:'1.79',edition:'1/10',network:'Polygon',collection:'Colecionáveis',art:3,tokenId:'#0088',attributes:['Ivory','Baron','Colecionável'],rating:4.4,reviews:17,createdAt:'2026-10-23T20:00:00Z',popularity:79,available:5}),
  nft({id:'golden-beat-207',name:'Golden Beat #207',price:'0.99',edition:'1/50',network:'Ethereum',collection:'Música',art:1,tokenId:'#0207',attributes:['Golden','Beat','Audio'],rating:4.3,reviews:11,createdAt:'2026-10-22T14:00:00Z',popularity:73,available:18}),
  nft({id:'golden-frequency-071',name:'Golden Frequency #071',price:'0.59',edition:'1/50',network:'Solana',collection:'Música',art:2,tokenId:'#0071',attributes:['Frequency','Golden','Audio'],rating:4.2,reviews:9,createdAt:'2026-10-20T19:00:00Z',popularity:69,available:21}),
  nft({id:'golden-signal-160',name:'Golden Signal #160',price:'0.39',edition:'1/50',network:'Ethereum',collection:'Utilidade',art:4,tokenId:'#0160',attributes:['Signal','Golden','Utility'],rating:4.1,reviews:8,createdAt:'2026-10-19T16:00:00Z',popularity:64,available:30}),
  nft({id:'amber-orbit-221',name:'Amber Orbit #221',price:'0.74',edition:'1/25',network:'Polygon',collection:'Arte 3D',art:2,tokenId:'#0221',attributes:['Amber','Orbit','3D'],rating:4.4,reviews:12,createdAt:'2026-10-18T10:00:00Z',popularity:67,available:9}),
  nft({id:'quiet-frame-064',name:'Quiet Frame #064',price:'0.88',edition:'1/15',network:'Solana',collection:'Fotografia',art:3,tokenId:'#0064',attributes:['Quiet','Frame','Photo'],rating:4.2,reviews:10,createdAt:'2026-10-17T10:00:00Z',popularity:61,available:8}),
  nft({id:'pixel-relic-401',name:'Pixel Relic #401',price:'1.08',edition:'1/20',network:'Ethereum',collection:'Colecionáveis',art:4,tokenId:'#0401',attributes:['Pixel','Relic','Retro'],rating:4.5,reviews:18,createdAt:'2026-10-16T10:00:00Z',popularity:72,available:11}),
  nft({id:'solstice-code-311',name:'Solstice Code #311',price:'0.66',edition:'ABERTA',network:'Polygon',collection:'Generativa',art:1,tokenId:'#0311',attributes:['Code','Solstice','Generative'],rating:4.0,reviews:7,createdAt:'2026-10-15T10:00:00Z',popularity:58,available:40}),
  nft({id:'arcade-ghost-777',name:'Arcade Ghost #777',price:'1.44',edition:'1/10',network:'Solana',collection:'Jogos',art:2,tokenId:'#0777',attributes:['Arcade','Ghost','Game'],rating:4.7,reviews:26,createdAt:'2026-10-14T10:00:00Z',popularity:86,available:7}),
  nft({id:'member-pass-010',name:'Member Pass #010',price:'0.49',edition:'ABERTA',network:'Ethereum',collection:'Assinaturas',art:3,tokenId:'#0010',attributes:['Pass','Member','Access'],rating:4.1,reviews:16,createdAt:'2026-10-13T10:00:00Z',popularity:60,available:50}),
  nft({id:'coral-dream-102',name:'Coral Dream #102',price:'1.12',edition:'1/25',network:'Polygon',collection:'Arte digital',art:4,tokenId:'#0102',attributes:['Coral','Dream','Digital'],rating:4.6,reviews:20,createdAt:'2026-10-12T10:00:00Z',popularity:75,available:10}),
  nft({id:'midnight-lens-055',name:'Midnight Lens #055',price:'0.93',edition:'1/15',network:'Ethereum',collection:'Fotografia',art:1,tokenId:'#0055',attributes:['Midnight','Lens','Photo'],rating:4.3,reviews:13,createdAt:'2026-10-11T10:00:00Z',popularity:63,available:8}),
  nft({id:'pulse-wave-303',name:'Pulse Wave #303',price:'0.81',edition:'1/50',network:'Solana',collection:'Música',art:2,tokenId:'#0303',attributes:['Pulse','Wave','Audio'],rating:4.5,reviews:21,createdAt:'2026-10-10T10:00:00Z',popularity:70,available:19}),
];

export const collectionCounts: Array<[Collection, number]> = [
  ['Arte digital',33],['Fotografia',12],['Música',65],['Arte 3D',39],['Colecionáveis',23],['Generativa',17],['Jogos',19],['Assinaturas',13],['Utilidade',18]
];

export const networkCounts: Array<[Network, number]> = [['Ethereum',119],['Polygon',78],['Solana',86]];
