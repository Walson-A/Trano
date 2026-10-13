import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'file:///C:/Users/Walson/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({channel:'msedge',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:960}});
const output=resolve('docs/reviews/home-context');mkdirSync(output,{recursive:true});
const profile={id:'fixture',name:'Walson',avatar:'W',color:'#f59e0b',kind:'person',favorites:[],favoriteRooms:[],dashboardLayout:[]};
const requests=[];let disconnected=false;
const devices=home=>[{entity_id:home==='main'?'light.parents':'light.lumiere',nom:home==='main'?'Salon':'Lumière',etat:'on',piece:null,lumiere:null}];
await page.addInitScript(()=>{
 localStorage.setItem('trano-device-id','fixture');
 localStorage.setItem('trano-active-profile',JSON.stringify({state:{activeProfileId:'fixture'},version:0}));
});
await page.route('**/api/**',async route=>{
 const r=route.request(),u=new URL(r.url()),home=u.searchParams.get('home_id')??'main';
 let result={};
 if(u.pathname==='/api/config')result={haUrl:null,haToken:null};
 if(u.pathname==='/api/profiles')result=[profile];
 if(u.pathname==='/api/homes')result=[{id:'main',name:'Maison familiale',provider:'ha',configured:true},{id:'apartment',name:'Appartement',provider:'ha',sharedHA:true,configured:true,entityIds:['light.lumiere']}];
 if(u.pathname==='/api/house'){
  if(disconnected)return route.fulfill({status:502,json:{error:'HA injoignable'}});
  result={home_id:home,appareils:devices(home),favorite_ids:[],meteo:home==='main'?{etat:'partlycloudy',temperature:19}:null,refresh_seconds:10};
 }
 if(u.pathname==='/api/assistant/status')result={configured:true,haReady:true,model:'fixture'};
 if(u.pathname==='/api/assistant/chat'){
  const body=r.postDataJSON();requests.push(body);result={reply:`Commande reçue pour ${body.home_id}.`};
 }
 if(['/api/rooms','/api/presence','/api/user-devices','/api/shopping'].includes(u.pathname))result=[];
 await route.fulfill({json:result});
});
try{
 await page.goto('http://127.0.0.1:3142/?home=main');
 await page.getByRole('status',{name:'Connecté via Trano'}).waitFor();
 assert.equal(await page.getByText('HA déconnecté',{exact:true}).count(),0);
 await page.getByText('19°C',{exact:true}).waitFor();
 await page.screenshot({path:resolve(output,'main-connected.png'),fullPage:true});
 await page.getByRole('combobox',{name:'Logement contrôlé'}).selectOption('apartment');
 await page.getByRole('heading',{name:'Lumière',exact:true}).waitFor();
 await page.getByRole('button',{name:"Ouvrir l'assistant",exact:true}).click();
 const input=page.getByPlaceholder('Demandez quelque chose · Appartement…');
 await input.fill('Éteins tout');await page.getByRole('button',{name:'Envoyer',exact:true}).click();
 await page.getByText('Commande reçue pour apartment.',{exact:true}).waitFor();
 await page.waitForFunction(() => [...document.querySelectorAll('div')].filter(d => d.textContent === 'Commande reçue pour apartment.').every(d => Number(getComputedStyle(d).opacity) > 0.99));
 assert.equal(requests.at(-1).home_id,'apartment');
 await page.screenshot({path:resolve(output,'apartment-chat.png'),fullPage:true});
 await page.getByRole('button',{name:"Fermer l'assistant"}).click();
 await page.getByRole('combobox',{name:'Logement contrôlé'}).selectOption('main');
 await page.getByRole('button',{name:"Ouvrir l'assistant",exact:true}).click();
 assert.equal(await page.getByText('Commande reçue pour apartment.',{exact:true}).count(),0);
 await page.getByPlaceholder('Demandez quelque chose · Maison familiale…').fill('Quels appareils sont allumés ?');
 await page.getByRole('button',{name:'Envoyer',exact:true}).click();
 await page.getByText('Commande reçue pour main.',{exact:true}).waitFor();
 assert.equal(requests.at(-1).home_id,'main');assert.equal(requests.at(-1).messages.length,1);
 await page.getByRole('button',{name:"Fermer l'assistant"}).click();
 disconnected=true;await page.reload();
 await page.getByRole('status',{name:'Connexion indisponible'}).waitFor();
 await page.getByText('Météo indisponible',{exact:true}).waitFor();
 await page.screenshot({path:resolve(output,'main-disconnected.png'),fullPage:true});
 console.log('Browser: server status, weather, explicit chat target, isolated histories and failure state passed.');
}finally{await browser.close();}
