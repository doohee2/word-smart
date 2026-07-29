import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // HTML 문서 캐싱 (iOS Safari 오프라인 진입 버그 해결을 위해 StaleWhileRevalidate 유지)
      matcher({ request }) {
        return request.mode === "navigate";
      },
      handler: new StaleWhileRevalidate({
        cacheName: "pages-cache",
        plugins: [
          new ExpirationPlugin({ maxEntries: 50 }),
        ],
      }),
    },
    {
      // Next.js App Router RSC 및 클라이언트 내비게이션 데이터 요청 캐싱
      matcher({ url, request }) {
        return (
          request.destination !== "document" &&
          (url.pathname.startsWith("/_next/data/") || url.searchParams.has("_rsc"))
        );
      },
      handler: new StaleWhileRevalidate({
        cacheName: "next-data-cache",
        plugins: [
          new ExpirationPlugin({ maxEntries: 100 }),
        ],
      }),
    },
    {
      // Google 폰트 및 Material Symbols 아이콘 외부 리소스 캐싱 (상위 우선순위 SWR & Opaque 0번 응답 방어)
      matcher: /^https:\/\/(?:fonts\.(?:googleapis|gstatic)\.com|.*\.gstatic\.com)\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "google-fonts-and-icons",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    {
      // 외부 프로필 아바타 및 교차 도메인 CDN 이미지 캐싱 (상위 우선순위 SWR & Opaque 0번 응답 방어)
      matcher: /^https:\/\/(?:.*\.googleusercontent\.com|.*\.ggpht\.com|.*\.googleapis\.com)\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "external-images-cdn",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    {
      // 프로젝트 내부 static 고정 자산 (/_next/static/* 및 내부 에셋에만 1년짜리 CacheFirst 적용)
      matcher({ url, request }) {
        return (
          url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/icons/") ||
          (url.origin === self.location.origin && /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/i.test(url.pathname))
        );
      },
      handler: new CacheFirst({
        cacheName: "internal-static-assets",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
    {
      // API 및 외부 DB
      matcher: /\/api\/.*|^https:\/\/.*\.supabase\.co\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "api-and-db-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
          }),
        ],
      }),
    },
    {
      // 그 외 모든 요청에 대한 안전한 캐치올 (NetworkOnly 대신 SWR 사용)
      matcher: /.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "catchall-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
