const CACHE_NAME='bv-lanches-pwa-v6';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  if(/\.(?:js|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname)){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>caches.match(req))
    );
  }
});