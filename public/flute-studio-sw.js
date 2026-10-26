/*
 * Cookie Flute Studio offline worker (registered by app/flute-studio/OfflineWorker.tsx, scope /flute-studio).
 *
 * The worker only serves; app/flute-studio/lib/offlineMusic.ts decides what is kept and writes the caches itself.
 *
 * - Studio pages: from the network, with the copy refreshed in the cache; from the cache when the network fails or
 *   takes longer than NAV_TIMEOUT. A page never visited or kept gets a short "not saved on this device" page.
 * - App code (/_next/static, content-hashed): cache first, filled as it loads.
 * - Instrument samples (/audio): cache first, filled as they load, so Listen and the drone work offline once heard.
 * - Scores (/music, /private-music): from the network when online; the kept copy is refreshed on the way through
 *   and used when the network fails. Only files someone chose to keep are ever stored.
 * - Client-side navigation requests (RSC) are left alone: when they fail, the app falls back to a full page load,
 *   which this worker can answer.
 */
const SHELL = "cookie-offline-shell-v1";
const MUSIC = "cookie-offline-music-v1";
const NAV_TIMEOUT = 6000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith("cookie-offline-") && name !== SHELL && name !== MUSIC) await caches.delete(name);
    await self.clients.claim();
  })());
});

const isRsc = (request, url) => url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isRsc(request, url)) return;
  const path = url.pathname;
  if (request.mode === "navigate") {
    if (path === "/flute-studio" || path.startsWith("/flute-studio/")) event.respondWith(page(request, url));
    return;
  }
  if (path.startsWith("/_next/static/") || path.startsWith("/audio/")) event.respondWith(cacheFirst(request));
  else if (path.startsWith("/music/") || path.startsWith("/private-music/")) event.respondWith(score(request));
});

async function cached(request, options) {
  return (await caches.open(MUSIC)).match(request, options).then(hit => hit || caches.open(SHELL).then(cache => cache.match(request, options)));
}

async function page(request, url) {
  const key = url.origin + url.pathname;
  const network = fetch(request).then(async response => {
    if (response.ok && (response.headers.get("content-type") || "").includes("text/html")) {
      const copy = response.clone();
      // A kept page stays in the music cache; any other visited page goes to the shell cache.
      const music = await caches.open(MUSIC);
      if (await music.match(key)) await music.put(key, copy);
      else await (await caches.open(SHELL)).put(key, copy);
    }
    return response;
  });
  network.catch(() => {});
  const timeout = new Promise(resolve => setTimeout(resolve, NAV_TIMEOUT, null));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
    const fallback = await cached(key);
    return fallback || await network;
  } catch {
    return (await cached(key)) || notSaved();
  }
}

async function cacheFirst(request) {
  const hit = await cached(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.status === 200) (await caches.open(SHELL)).put(request, response.clone());
  return response;
}

async function score(request) {
  const music = await caches.open(MUSIC);
  const key = request.url;
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200 && await music.match(key)) await music.put(key, response.clone());
    return response;
  } catch (error) {
    const hit = await music.match(key);
    if (hit) return hit;
    throw error;
  }
}

function notSaved() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Cookie Flute Studio</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#292a33;font:16px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;text-align:center}main{max-width:420px;padding:24px}h1{font-size:24px;margin:0 0 8px;letter-spacing:-.02em}p{margin:0 0 6px;color:#71747e}a{color:#46633d;font-weight:600;text-decoration:none}</style></head>
<body><main><h1>You're offline</h1><p>This page isn't saved on this device yet. Pieces you keep offline open without Wi-Fi.</p><p lang="zh">你现在没有联网。这个页面还没有保存在这台设备上。</p><p><a href="/flute-studio/music">Library · 曲库</a></p></main></body></html>`;
  return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}
