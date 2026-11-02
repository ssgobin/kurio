import axios from 'axios';
import type { ApiErrorBody } from '../types/api';

export class ApiClientError extends Error {
  status?: number;
  code?: ApiErrorBody['code'];
  fields?: Record<string,string>;
  constructor(message:string, options?:{status?:number;code?:ApiErrorBody['code'];fields?:Record<string,string>}){
    super(message);this.name='ApiClientError';this.status=options?.status;this.code=options?.code;this.fields=options?.fields;
  }
}

export const api=axios.create({baseURL:'/api',timeout:4500,headers:{'Content-Type':'application/json'}});
api.interceptors.response.use(
  response=>response,
  error=>{
    const body=error?.response?.data as Partial<ApiErrorBody>|undefined;
    const status=error?.response?.status as number|undefined;
    const requestUrl=String(error?.config?.url??'');
    if(status===401&&!requestUrl.includes('/session')&&!requestUrl.includes('/auth/login')&&!requestUrl.includes('/auth/register')&&typeof window!=='undefined'&&!location.pathname.startsWith('/login')){const returnTo=`${location.pathname}${location.search}`;sessionStorage.setItem('kurio-return-to',returnTo);window.setTimeout(()=>location.assign(`/login?redirect=${encodeURIComponent(returnTo)}`),0)}
    return Promise.reject(new ApiClientError(body?.message??(error?.code==='ECONNABORTED'?'Tempo limite excedido.':'Falha na comunicação com a API'),{status,code:body?.code,fields:body?.fields}));
  }
);
