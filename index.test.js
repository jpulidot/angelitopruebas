const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createServer}=require('./index');
test('signed webhook only replies in test inbox; rejects forged and duplicate events', async () => {
 const env={CHATWOOT_URL:'https://support.indiefy.net',CHATWOOT_ACCOUNT_ID:'1',BOT_ACCESS_TOKEN:'test-token',CHATWOOT_WEBHOOK_SECRET:'test-secret',CHATWOOT_TEST_INBOX_ID:'99'};
 const sent=[];
 const server=createServer(env,async (url,options)=>{sent.push({url:String(url),options});return {ok:true};});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const p={event:'message_created',id:7,message_type:'incoming',private:false,account:{id:1},inbox:{id:99},conversation:{id:22,status:'pending'}};
 async function post(payload,valid=true){
  const body=JSON.stringify(payload);const ts=String(Math.floor(Date.now()/1000));
  const sig='sha256='+crypto.createHmac('sha256',env.CHATWOOT_WEBHOOK_SECRET).update(ts+'.'+body).digest('hex');
  return fetch(url+'/webhook',{method:'POST',headers:{'x-chatwoot-timestamp':ts,'x-chatwoot-signature':valid?sig:'invalid'},body});
 }
 try {
  assert.equal((await fetch(url+'/health')).status,200);
  assert.equal((await post(p,false)).status,401);
  assert.equal((await (await post({...p,inbox:{id:2}})).json()).status,'ignored');
  assert.equal((await (await post({...p,message_type:'outgoing'})).json()).status,'ignored');
  assert.equal((await (await post({...p,private:true})).json()).status,'ignored');
  assert.equal((await (await post({...p,conversation:{id:22,status:'open'}})).json()).status,'ignored');
  assert.equal((await (await post(p)).json()).status,'replied');
  assert.equal((await (await post(p)).json()).status,'duplicate');
  assert.equal(sent.length,1);
  assert.equal(sent[0].url,'https://support.indiefy.net/api/v1/accounts/1/conversations/22/messages');
  assert.equal(JSON.parse(sent[0].options.body).private,false);
 } finally {await new Promise(r=>server.close(r));}
});
