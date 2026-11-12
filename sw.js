/* OralWatch offline support: page and icons cached; cards.json always fetched fresh, cached copy used offline. */
const V='oralwatch-v25', CORE=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','cards.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url);
  const same=u.origin===location.origin;
  const isData=u.pathname.endsWith('cards.json');
  const isPage=r.mode==='navigate'||(same&&u.pathname.endsWith('index.html'));
  if(isData||isPage){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(isData?'cards.json':'index.html',cp));}return res;}).catch(()=>caches.match(isData?'cards.json':'index.html')));
    return;
  }
  if(same||u.hostname.endsWith('gstatic.com')||u.hostname.endsWith('googleapis.com')){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})));
  }
});
