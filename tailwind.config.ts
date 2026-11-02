import type {Config} from 'tailwindcss';
export default {
  darkMode:['class'],
  content:['./index.html','./src/**/*.{ts,tsx}'],
  theme:{extend:{
    colors:{ink:'#140D0A',foreground:'#F5F1EB',primary:'#D28A4C',accent:'#E89B55',secondary:'#CFB28C',surface:'#241612',raised:'#2F1D15',border:'#3F2319',coral:'#F0805F'},
    fontFamily:{mono:['Roboto Mono','ui-monospace','SFMono-Regular','monospace']},
    keyframes:{shimmer:{'0%':{transform:'translateX(-100%)'},'100%':{transform:'translateX(100%)'}}},
    animation:{shimmer:'shimmer 1.45s infinite'}
  }},
  plugins:[]
} satisfies Config;
