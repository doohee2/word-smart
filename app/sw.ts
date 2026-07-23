import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

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
  navigationPreload: true,
  runtimeCaching: [
    {
      // HTML 문서 캐싱 (새 탭/창 진입 시 0.1초 컷을 위해 SWR 전략 사용)
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
      // 정적 에셋 (JS, CSS, 이미지 등)
      matcher: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/i,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
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
    ...defaultCache,
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
