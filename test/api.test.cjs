const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
process.env.DATA_DIR=':memory:';
const {createApp}=require('../dist/app');
let app,url,id;
const request=async(path,method='GET',data)=>{
  const r=await fetch(url+path,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  return {status:r.status,body:await r.json()};
};
before(async()=>{app=await createApp(false);await app.listen(0,'127.0.0.1');url=await app.getUrl();});
after(async()=>{await app?.close();});
test('health checks the database',async()=>{assert.equal((await request('/api/v1/health')).body.status,'ok');});
test('rejects short and whitespace-only input',async()=>{for(const title of ['x','   '])assert.equal((await request('/api/v1/issues','POST',{title,description:'A valid issue description'})).status,400);});
test('rejects extra fields',async()=>{assert.equal((await request('/api/v1/issues','POST',{title:'Valid title',description:'A valid issue description',status:'resolved'})).status,400);});
test('creates an issue and persists an SQL-like title literally',async()=>{
 const title="Timeout fix'); DROP TABLE issues; --";
 const r=await request('/api/v1/issues','POST',{title,description:'Handle upstream timeouts with fallback data.'});
 assert.equal(r.status,201);assert.equal(r.body.status,'open');assert.equal(r.body.title,title);id=r.body.id;
 assert.equal((await request('/api/v1/issues/'+id)).body.title,title);
});
test('lists and paginates issues',async()=>{const r=await request('/api/v1/issues?page=1&limit=1');assert.equal(r.body.items.length,1);assert.equal(r.body.total,1);assert.equal(r.body.limit,1);});
test('rejects invalid pagination and filter values',async()=>{for(const q of ['limit=51','page=0','page=wat','status=unknown'])assert.equal((await request('/api/v1/issues?'+q)).status,400);});
test('updates status and filters results',async()=>{assert.equal((await request('/api/v1/issues/'+id+'/status','PATCH',{status:'resolved'})).body.status,'resolved');assert.equal((await request('/api/v1/issues?status=open')).body.total,0);assert.equal((await request('/api/v1/issues?status=resolved')).body.total,1);});
test('rejects unsupported status',async()=>{assert.equal((await request('/api/v1/issues/'+id+'/status','PATCH',{status:'deleted'})).status,400);});
test('returns 404 for missing issue and update',async()=>{const missing=randomUUID();assert.equal((await request('/api/v1/issues/'+missing)).status,404);assert.equal((await request('/api/v1/issues/'+missing+'/status','PATCH',{status:'open'})).status,404);});
test('rejects malformed IDs',async()=>{assert.equal((await request('/api/v1/issues/not-an-id')).status,400);});
test('returns an empty page without losing the total',async()=>{const r=await request('/api/v1/issues?page=2&limit=1');assert.equal(r.body.items.length,0);assert.equal(r.body.total,1);});
test('publishes useful OpenAPI schemas',async()=>{const r=await request('/docs-json');assert.equal(r.status,200);assert.ok(r.body.paths['/api/v1/issues']);assert.ok(r.body.components.schemas.CreateIssue);assert.ok(r.body.components.schemas.IssueList);});
