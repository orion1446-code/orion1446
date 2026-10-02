/* 앵커사업 운영매뉴얼 — 오프라인 실행·자동 갱신 서비스워커 */
const CACHE='anchor-manual-shell-v1';
const SHELL=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function sig(r){if(!r)return '';try{const b=await r.clone().arrayBuffer();const d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return [r.headers.get('etag'),r.headers.get('last-modified'),r.headers.get('content-length')].join('|')}}
async function notify(msg){const cs=await self.clients.matchAll({includeUncontrolled:true});cs.forEach(c=>c.postMessage(msg))}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;
  const isPage=/\/(index\.html)?$/.test(url.pathname);
  if(!isPage&&req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{const cl=r.clone();caches.open(CACHE).then(c=>c.put(req,cl));return r}).catch(()=>caches.match(req)));return}
  if(isPage){
    // 저장본으로 즉시 실행하고, 서버의 새 판을 받아 두었다가 알림(오프라인에서도 실행)
    e.respondWith((async()=>{const c=await caches.open(CACHE);const cached=await c.match('./index.html');
      const net=fetch('./index.html',{cache:'no-cache'}).then(async r=>{if(r&&r.ok){const [o,n]=await Promise.all([sig(cached),sig(r)]);if(o!==n){await c.put('./index.html',r.clone());if(cached){await c.put('./__updated',new Response('1'));notify({type:'updated'})}}}return r}).catch(()=>null);
      if(cached){e.waitUntil(net);return cached}const r=await net;return r||new Response('<h1>오프라인</h1><p>처음 한 번은 인터넷(교내망)에 연결된 상태에서 열어야 합니다.</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}})})());
    return}
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{if(r&&r.ok){const cl=r.clone();caches.open(CACHE).then(c=>c.put(req,cl))}return r})));
});
self.addEventListener('message',e=>{if(e.data==='hello'){e.waitUntil(caches.open(CACHE).then(async c=>{if(await c.match('./__updated')){await c.delete('./__updated');e.source&&e.source.postMessage({type:'updated'})}}));return}
  if(e.data==='check'){fetch('./index.html',{cache:'no-cache'}).then(async r=>{const c=await caches.open(CACHE);const cached=await c.match('./index.html');if(r.ok){const [o,n]=await Promise.all([sig(cached),sig(r)]);const changed=o!==n;if(changed)await c.put('./index.html',r.clone());notify({type:changed?'updated':'latest'})}}).catch(()=>notify({type:'offline'}))}});
