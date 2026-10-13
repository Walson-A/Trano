import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';

const dir = mkdtempSync(join(tmpdir(), 'trano-home-context-'));
process.env.TRANO_DB_PATH = join(dir, 'test.db');
process.env.TRANO_HA_URL = 'https://ha.test';
process.env.TRANO_HA_TOKEN = 'fixture';
process.env.TRANO_OPENROUTER_KEY = 'fixture';
process.env.TRANO_MCP_TOKEN = 'fixture';
const { db } = await import('../src/db.ts');
const { assistantRoutes } = await import('../src/routes/assistant.ts');
const { mcpRoutes } = await import('../src/routes/mcp.ts');
const { runTool, OBY_TOOL_DEFS, toolInputSchema } = await import('../src/lib/tools.ts');
db.prepare('INSERT INTO home_devices(source_id, entity_id, home_id) VALUES(?,?,?)').run('main','light.appart','apartment');
const commands = [];
const realFetch = globalThis.fetch;
const lights = ['light.appart','light.parents'].map(entity_id => ({entity_id,nom:entity_id,etat:'on',piece:null,attributs:{supported_color_modes:['brightness'],brightness:128}}));
const tool = (id,name,args) => ({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  if (u.hostname === 'ha.test') {
    if(u.pathname === '/api/template') return new Response(JSON.stringify({appareils:lights,scenes:[]}));
    if(u.pathname === '/api/states') return Response.json([]);
    commands.push(JSON.parse(init.body));return Response.json([]);
  }
  assert.equal(u.hostname,'openrouter.ai');
  const {messages} = JSON.parse(init.body);
  const last = messages.at(-1);
  assert.match(messages[0].content,/home_id=apartment/);
  let message;
  if(last.role === 'user') message={role:'assistant',content:null,tool_calls:[tool('list','lister_appareils',{})]};
  else if(last.tool_call_id === 'list') {
    assert.match(last.content,/light.appart/);assert.doesNotMatch(last.content,/light.parents/);
    message={role:'assistant',content:null,tool_calls:[tool('off','controler_appareil',{entity_id:'light.appart',action:'turn_off'}),tool('escape','controler_appareil',{home_id:'main',entity_id:'light.parents',action:'turn_off'})]};
  } else {
    assert.match(last.content,/Refusé/);message={role:'assistant',content:'L’appartement est éteint.'};
  }
  return Response.json({choices:[{message}]});
};
const app=Fastify();assistantRoutes(app);mcpRoutes(app);await app.ready();
test('éteins tout reste dans le logement choisi même si le modèle omet ou change home_id',async()=>{
  const r=await app.inject({method:'POST',url:'/api/assistant/chat',payload:{home_id:'apartment',messages:[{role:'user',content:'Éteins tout'}]}});
  assert.equal(r.statusCode,200);assert.deepEqual(commands,[{entity_id:'light.appart'}]);
});
test('un écran ancien ou un MCP sans logement ne commande jamais main par défaut',async()=>{
  const before=commands.length;
  const r=await app.inject({method:'POST',url:'/api/assistant/chat',payload:{messages:[{role:'user',content:'Éteins tout'}]}});
  assert.equal(r.statusCode,400);
  assert.match(await runTool('controler_appareil',{entity_id:'light.parents',action:'turn_off'},{profile:null}),/Refusé/);
  const m=await app.inject({method:'POST',url:'/api/mcp',headers:{authorization:'Bearer fixture',accept:'application/json, text/event-stream'},payload:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'controler_appareil',arguments:{entity_id:'light.parents',action:'turn_off'}}}});
  assert.match(m.body,/Refusé/);assert.match(m.body,/"isError":true/);assert.equal(commands.length,before);
});
test('le logement est requis dans chaque schéma MCP et les lectures restent disponibles',async()=>{
  for(const t of OBY_TOOL_DEFS.filter(t=>t.name!=='lister_logements')) assert.ok(toolInputSchema(t).required.includes('home_id'));
  const [apt,main]=await Promise.all(['apartment','main'].map(home_id=>runTool('lister_appareils',{home_id},{profile:null})));
  assert.match(apt,/light.appart/);assert.doesNotMatch(apt,/light.parents/);
  assert.match(main,/light.parents/);assert.doesNotMatch(main,/light.appart/);
});
test.after(async()=>{await app.close();db.close();globalThis.fetch=realFetch;rmSync(dir,{recursive:true,force:true});});
