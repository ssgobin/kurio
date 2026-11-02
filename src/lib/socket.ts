import type {Socket} from 'socket.io-client';
let socket:Socket|undefined;
let pendingSocket:Promise<Socket>|undefined;
export async function getMarketSocket(){
  if(socket)return socket;
  pendingSocket??=import('socket.io-client').then(({io})=>{
    socket=io('http://kurio.local',{transports:['websocket'],autoConnect:false,reconnection:true,reconnectionAttempts:5,reconnectionDelay:250});
    return socket;
  }).finally(()=>{pendingSocket=undefined});
  return pendingSocket;
}
export function disposeMarketSocket(){if(socket){socket.removeAllListeners();socket.disconnect();socket=undefined}pendingSocket=undefined}
