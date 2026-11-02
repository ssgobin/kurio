import {defineConfig,devices} from '@playwright/test';

const port=4173;
const baseURL=`http://127.0.0.1:${port}`;

export default defineConfig({
  testDir:'./tests',
  testIgnore:['**/visual.spec.ts'],
  fullyParallel:false,
  workers:1,
  timeout:30_000,
  expect:{timeout:8_000},
  reporter:[['html',{outputFolder:'playwright-report',open:'never'}],['list']],
  webServer:{
    command:`npm run dev -- --host 127.0.0.1 --port ${port}`,
    url:baseURL,
    reuseExistingServer:false,
    timeout:120_000
  },
  use:{
    baseURL,
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  projects:[
    {
      name:'desktop',
      use:{
        ...devices['Desktop Chrome'],
        browserName:'chromium',
        viewport:{width:1440,height:1000}
      }
    },
    {
      name:'mobile',
      use:{
        ...devices['Pixel 7'],
        browserName:'chromium',
        viewport:{width:414,height:896},
        screen:{width:414,height:896},
        isMobile:true,
        hasTouch:true
      }
    }
  ]
});
