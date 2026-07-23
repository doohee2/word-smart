import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkFirst, ExpirationPlugin } from "serwist";

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
      // SessionProvider 타임아웃 문제 해결로 오프라인 진입 속도 확보됨
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
    {
      // Google 폰트 캐싱
      matcher: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
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
