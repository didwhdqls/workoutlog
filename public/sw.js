// 아주 단순한 오프라인 지원: 네트워크 우선, 실패하면 캐시.
// 설치할 때 index.html이 가리키는 JS/CSS까지 미리 받아 두므로, 한 번만 열어 봐도 오프라인에서 열립니다.
const CACHE = 'machinelog-v3'; // 이름은 예전 그대로 둠 (저장 키). 버전만 올려 새 이름의 화면을 받게 함
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await c.addAll(SHELL).catch(() => {});
      try {
        const html = await (await fetch('./index.html', { cache: 'no-store' })).text();
        const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
        await c.addAll(assets);
      } catch {
        /* 오프라인 설치 등: 다음에 온라인으로 열 때 채워짐 */
      }
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))),
  );
});
