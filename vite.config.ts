import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function vendorChunk(id:string){
  if(!id.includes('node_modules'))return;
  if(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id))return 'vendor-react';
  if(id.includes('@tanstack'))return 'vendor-tanstack';
  if(id.includes('@radix-ui'))return 'vendor-radix';
  if(id.includes('socket.io')||id.includes('engine.io'))return 'vendor-realtime';
  if(id.includes('lucide-react'))return 'vendor-icons';
  if(id.includes('axios'))return 'vendor-http';
}

export default defineConfig({
  plugins:[react()],
  server:{port:5173,host:'0.0.0.0'},
  build:{rollupOptions:{output:{manualChunks:vendorChunk}}}
});
