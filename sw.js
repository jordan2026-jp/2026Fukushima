/* Relative paths: works at username.github.io/repository/ and custom domains.
   Change VERSION when publishing an updated itinerary or app. */
'use strict';
const VERSION = '2026-10-01-app-1';
const BASE = new URL('./', self.location.href);
const PREFIX = 'fukushima-' + BASE.pathname + '-';
const CACHE = PREFIX + VERSION;
const INDEX = new URL('index.html', BASE).href;
const ASSETS = ['index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'].map(p=>new URL(p,BASE).href);
self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window'});
    clients.forEach(client=>client.postMessage({type:'OFFLINE_READY'}));
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  // Never intercept external Google Maps or official-source requests.
  if(request.mode==='navigate'&&(url.pathname===BASE.pathname||url.pathname===new URL(INDEX).pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),3500);
      try{
        const fresh=await fetch(request,{signal:controller.signal});
        if(fresh.ok){await cache.put(INDEX,fresh.clone());return fresh;}
        return (await cache.match(INDEX))||fresh;
      }catch{
        return (await cache.match(INDEX))||new Response('尚未下載離線行程。請先連網開啟一次。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }finally{clearTimeout(timer);}
    })());return;
  }
  if(ASSETS.includes(url.href)){
    event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(request);if(hit)return hit;return fetch(request);})());
  }
});
