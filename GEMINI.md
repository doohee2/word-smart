# Word Smart (워드 스마트) - 개발 문서

## 1. 프로젝트 개요
**Word Smart**는 CSV 형태의 단어장 데이터를 불러와 오프라인 환경에서도 동작하는 PWA(Progressive Web App) 기반의 영단어 및 일본어 한자 학습 애플리케이션입니다.
사용자는 구글 드라이브나 로컬 디바이스에서 단어장 파일을 가져올 수 있으며, 학습(플래시카드), 테스트(객관식/주관식), 관리(단어장 통계), PDF 인쇄(학습지/시험지) 기능을 통해 체계적인 단어 학습을 진행할 수 있습니다.

## 2. 기술 프레임워크
* **Core:** Next.js 14+ (App Router), React, TypeScript
* **Styling:** Tailwind CSS v4, Lucide Icons, clsx, tailwind-merge
* **Database / Storage:** Dexie.js (IndexedDB wrapper for local offline storage)
* **Authentication & API:** NextAuth.js (Google OAuth), Google Drive API, Custom Next.js Route Handlers (DB Sync)
* **PWA:** `@serwist/next`, `@serwist/precaching` (오프라인 캐싱 및 Service Worker)
* **Animations:** Framer Motion (플래시카드 스와이프 및 뷰 전환 애니메이션)
* **Utilities:** PapaParse (CSV 양방향 파싱 및 생성), jsPDF & jspdf-autotable (PDF 생성)

## 3. 폴더 구조 및 소스 파일 설명

```text
word-smart/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth 로그인 및 세션 관리 라우트 (v4)
│   │   └── drive/                       # 구글 드라이브 API 연동 라우트
│   │       ├── download/route.ts        # 구글 드라이브 파일 다운로드
│   │       └── list/route.ts            # 폴더 내 CSV 파일 목록 조회
│   ├── pdf/page.tsx                     # (Phase 5) PDF 인쇄 및 미리보기 화면
│   ├── settings/page.tsx                # (Phase 2) 단어장 목록 조회 및 관리 화면
│   ├── study/page.tsx                   # (Phase 3) 플래시카드 기반 단어 학습 화면 (사전 설정 모달 포함)
│   ├── test/page.tsx                    # (Phase 4) 8지 선다 및 스펠링 퀴즈 화면 (사전 설정 모달 포함)
│   ├── globals.css                      # Tailwind v4 디자인 토큰 및 글로벌 스타일 (라이트/다크 CSS 변수)
│   ├── layout.tsx                       # 공통 레이아웃 (Navigation, Header 포함)
│   ├── page.tsx                         # 메인 대시보드 (학습/테스트 진입점)
│   └── sw.ts                            # PWA Service Worker 등록 스크립트
├── components/
│   ├── ConfirmModal.tsx                 # 공통 확인 모달 (학습/테스트 중단 방지 등)
│   ├── DBDownloadModal.tsx              # 서버 DB 동기화(다운로드) 전용 모달
│   ├── DrivePickerModal.tsx             # 구글 드라이브 파일 선택 UI 모달
│   ├── FileOpenButton.tsx               # 로컬/드라이브 파일 파싱 로직 (중복 체크 포함)
│   ├── Header.tsx                       # 상단 글로벌 앱 바 (테마 토글, 설정 등)
│   ├── InfoModal.tsx                    # 앱 정보 안내 모달
│   ├── LanguageToggle.tsx                 # 설정 창 전용 영어/일본어 모드 전환 라디오 뷰
│   ├── Logo.tsx                         # 반응형 앱 타이틀 및 다크모드 지원 로고 컴포넌트
│   ├── Navigation.tsx                   # MD3 스타일 네비게이션 (진행 중 이탈 방지 로직 적용, 음성 설정 모달 진입점 포함)
│   ├── Providers.tsx                    # NextAuth, Theme, StudySession, TTSSettings 프로바이더 래퍼
│   └── TTSSettingsModal.tsx             # (Phase 9) 전역 TTS 및 시스템 사운드 설정 모달
├── hooks/
│   └── useAppSound.ts                   # 시스템 사운드(효과음) 재생 및 음소거/볼륨 상태 연동 훅
├── lib/
│   └── db.ts                            # Dexie.js 데이터베이스 스키마 (`isActive`, `testCount` 등)
├── providers/
│   ├── LanguageModeProvider.tsx         # 전역 언어 모드(영어/일본어) 상태 관리 훅
│   ├── StudySessionProvider.tsx         # 전역 학습 진행 상태 관리 훅 (앱 이탈 방지용)
│   └── TTSSettingsProvider.tsx          # (Phase 9) TTS 속도/음높이/볼륨, 효과음 설정 전역 상태 관리 훅
├── public/
│   ├── icons/                           # PWA 아이콘 모음 (192x192, 512x512)
│   └── manifest.json                    # PWA 매니페스트 파일 (앱 이름: 워드 스마트)
├── tailwind.config.ts                   # Tailwind CSS 환경 설정 파일
└── next.config.ts                       # Next.js 및 Serwist(PWA) 빌드 설정 (외부 이미지 허용)
```

## 4. 주요 기능별 구현 소스 설명

### Phase 1: 레이아웃 및 테마 관리
* **반응형 네비게이션 (`components/Navigation.tsx`, `components/Header.tsx`):**
  Tailwind CSS의 `md:` 브레이크포인트를 활용하여 모바일에서는 하단 탭(Material Design 3 스타일 알약 하이라이트)으로, PC에서는 고정 사이드바로 레이아웃이 자연스럽게 변경됩니다.
* **로고 및 다크 모드 연동 (`components/Logo.tsx`, `components/Providers.tsx`, `app/globals.css`):**
  `next-themes`를 활용해 기기 테마 설정 및 수동 토글이 가능합니다. Tailwind v4의 `@custom-variant dark` 기능을 통해 순수 CSS 변수(Slate & Emerald 톤)가 다크/라이트 환경에 맞춰 유연하게 스위칭됩니다. 로고 컴포넌트 역시 현재 테마 상태에 맞는 아이콘 렌더링을 지원합니다.
* **단어장 파싱 및 구글 드라이브 연동 (`components/FileOpenButton.tsx`, `components/DrivePickerModal.tsx`):**
  비로그인 시 로컬 파일을 열고, 로그인 시 구글 드라이브 드롭다운 모달을 통해 CSV를 파싱해 IndexedDB에 넘깁니다. 핀 고정 기능(LocalStorage)을 통해 자주 사용하는 구글 드라이브 폴더의 경로를 기억할 수 있습니다.

### Phase 2: 로컬 DB 스키마 설계 및 관리
* **Dexie.js 오프라인 스토리지 (`lib/db.ts`):**
  브라우저 내장 IndexedDB를 쉽게 사용하기 위해 Dexie를 세팅했습니다. 여러 단어장을 동시에 활성화(`isActive`) 할 수 있으며, 단어별 학습 횟수(`testCount`, `correctCount`) 및 단어 난이도(`zipfScore`)를 스키마에 기록합니다.
* **설정 화면 (`app/settings/page.tsx`):**
  DB 데이터의 변화를 즉시 UI에 반영하며, 개별 단어장 끄기/켜기, 이름 변경, CSV 내보내기(Export) 기능을 지원합니다.
  로그인 상태일 경우 서버 DB와 직접 연동하는 **업로드/다운로드 (Cloud Sync)** 버튼이 표시됩니다.

### Phase 3: 학습 모드 (Study Mode)
* **단어장 통합 및 이탈 방지:**
  활성화(체크)된 모든 단어장의 데이터를 합쳐서 하나의 큰 단어장처럼 학습할 수 있습니다. N+1 쿼리 방지를 위해 렌더링 시 `Map` 객체를 활용해 단어장 제목을 매핑합니다. 학습 중 다른 메뉴로 이동하려 하면 `ConfirmModal`을 통해 중단 여부를 재확인합니다.
* **학습 설정 모달 & TTS 엔진 연동:**
  선택된 수량이 단어장 크기를 초과하면 중복 없는 1사이클 이후 랜덤으로 부족분을 채워 학습 효율을 극대화합니다. Web Speech API를 호출해 영어 예문 발음(TTS) 듣기가 가능합니다.
  사전 설정 모달에서 Zipf 스코어 기준 난이도 필터링을 지원하며, 플래시카드 우측 상단에 단어의 Zipf 뱃지가 노출됩니다.

### Phase 4: 테스트 모드 (Test Mode)
* **퀴즈 게임 로직 (`app/test/page.tsx`):**
  * Study Mode와 동일하게 `Map` 최적화 및 Zipf 스코어 기반 난이도 필터링을 지원합니다.
  * **객관식 (MCQ):** 정답을 제외한 7개의 오답 뜻을 랜덤 추출하여 보기 8개를 셔플링해 제공합니다.
  * **주관식 (Spelling):** 단어 길이의 절반(50%)까지만 점진적으로 글자를 공개하는 힌트 알고리즘이 적용되어 난이도를 조절합니다.

### Phase 5: PDF 인쇄 (Export Mode)
* **사전 설정 모달 및 다중 목록 출력:**
  선택된 여러 개의 단어장 데이터를 혼합해 원하는 단어 개수만큼 PDF로 자동 분량(페이지) 계산하여 출력합니다. 빈칸 유형(영어/한글/무작위)을 직접 고를 수 있습니다.
* **jsPDF + AutoTable 디자인:**
  구글 폰트 CDN에서 나눔고딕을 다운받아 주입하며, Zebra striping(교차 배경색)이 적용된 깔끔한 표(Table)를 실시간 렌더링합니다.

### Phase 6: 오프라인 우선(Offline-First) PWA 전환
* **Serwist 기반 캐싱 전략 커스텀 (`app/sw.ts`):**
  * HTML 문서 진입(`request.mode === 'navigate'`) 및 Next.js 클라이언트 라우팅 데이터(`_rsc`)를 `StaleWhileRevalidate` 전략으로 캐싱하여 네트워크 단절 시에도 0.1초 만에 캐시된 화면을 즉시 렌더링합니다.
  * 아이폰(iOS) 등 다양한 환경에서 독립적인 앱으로 동작하도록 `layout.tsx`에 `appleWebApp` 메타데이터(Standalone 모드)를 추가했습니다.
* **백그라운드 동기화 훅 (`hooks/useDataSync.ts`, `hooks/useNetworkStatus.ts`):**
  * 앱 마운트 시 무조건 로컬 Dexie.js 데이터를 우선 표시하고, 네트워크가 연결된(online) 상태일 경우 백그라운드에서 `/api/history` 등을 Fetch하여 로컬 DB를 업데이트합니다.
  * 오프라인 시 `Header.tsx`에 시각적 뱃지(빗금친 구름 아이콘)를 표시하며, `InfoModal`을 통해 사용자가 캐시를 초기화하고 최신 앱 버전을 강제로 불러오는 수동 업데이트 버튼을 지원합니다.
* **iOS Safari 오프라인 진입 최적화 (렌더링 블로킹 방지):**
  * **SessionProvider 의존성 제거**: 앱 초기화 시 NextAuth의 `SessionProvider`가 네트워크에 의존하여 렌더링을 막는 현상을 방지하기 위해 `refetchInterval={0}`, `refetchOnWindowFocus={false}` 속성을 적용했습니다.
  * **네트워크 Timeout 및 방어 로직**: iOS Safari는 오프라인 상태에서도 간헐적으로 `navigator.onLine`이 `true`를 반환합니다. 이를 막기 위해 `useDataSync` 내 모든 API Fetch 요청에 `AbortSignal.timeout(5000)`을 적용하고, 실패 시 조용히 무시(silent fail)하도록 예외 처리를 강화했습니다.
  * **Serwist defaultCache 함정 극복**: 기본 제공되는 `...defaultCache` 내부의 캐치올(catch-all) 규칙이 `NetworkOnly`로 설정되어 있어, 오프라인 시 미매칭된 모든 요청(Next.js 내부 청크, 구글 폰트 등)을 강제 실패시키는 치명적 버그가 있었습니다. 이를 제거하고 **`/.*/i`에 대한 `StaleWhileRevalidate` 커스텀 캐치올** 규칙과 **구글 폰트 전용 `CacheFirst`** 규칙을 명시적으로 추가하여 완전한 오프라인 독립성을 확보했습니다.
  * **오프라인 폴백 페이지 캐싱**: `next.config.ts`의 `additionalPrecacheEntries`에 `url: '/~offline'`을 명시적으로 추가하여, 오프라인 시 대체 페이지가 확실하게 동작하도록 보장했습니다.
  * **네비게이션 프리로드 해제**: Safari의 Service Worker와 충돌하는 `navigationPreload` 속성을 `false`로 비활성화하여 오프라인 앱 진입 안정성을 극대화했습니다.
* **학습 이력 동기화 및 관리 (`app/history/page.tsx`, `app/api/history/route.ts`):**
  * **1:1 완벽 매핑 (Server ID)**: 기존 `createdAt` 시간 기반 매핑의 한계를 극복하기 위해, 서버 통신 시 응답받은 고유 UUID를 로컬 DB에 `serverId`로 저장하여 기기간 완벽한 1:1 매핑 동기화를 구현했습니다.
  * **오프라인 일괄 업로드(Batch Sync)**: 네트워크가 없는 상태에서 여러 번 학습한 기록(`isSynced=false`, `serverId=undefined`)을 모아 두었다가, 온라인 전환 시 `/api/history`에 일괄 전송하고 각각의 `serverId`를 매핑받아오는 지연 동기화를 지원합니다.
  * **논리적 삭제(Soft Delete) 양방향 동기화**: 사용자가 화면에서 삭제 버튼을 누르면 로컬 DB에서 즉시 숨겨지고(`isDeleted = true`), 해당 데이터의 `serverId`를 기준으로 서버에 즉각적인 삭제 상태(DELETE API)를 Push합니다. 반대로 다른 기기에서 지운 데이터도 서버 Fetch 시 로컬에 실시간 반영되어 가려집니다.
  * **영구 삭제(Hard Delete) 자동화**: 서버 용량 최적화를 위해 앱 구동 후 첫 서버 동기화 시점에, 지워진 지 30일이 넘은 휴지통 데이터(`deleted_at < now() - 30 days`)는 `DELETE` 쿼리를 통해 자동으로 완전히 소멸됩니다.

### Phase 7: 서버리스 & PWA 아키텍처 보안 하드닝 (Security Hardening)
* **엔드포인트 인가(Authorization) 및 Zod 스키마 검증 (`app/api/**`):**
  * **철저한 소유권(Ownership) 검증**: 모든 DB 및 구글 드라이브 API 연동 라우트에서 클라이언트의 이메일이나 파라미터를 절대 무조건 신뢰하지 않고, 반드시 서버 사이드 `getServerSession`을 통한 인증된 사용자 식별자를 기준으로 데이터베이스 쿼리 및 CRUD 권한을 통제합니다.
  * **Zod 입력 검증 도입**: `zod` 패키지를 적용하여 모든 API의 Body, Query Params 파라미터를 스키마로 엄격히 검증(`safeParse`)하며, 비정상 요청 발생 시 즉시 HTTP 400 오류를 리턴하도록 강제했습니다.
  * **에러 위생화(Error Sanitization)**: DB 쿼리문이나 런타임 스택 트레이스 등의 민감 에러 내역은 오직 서버 콘솔(`console.error`)에만 남기고, 브라우저 클라이언트 응답에는 *"요청을 처리할 수 없습니다."*와 같은 위생화된 일반적인 메시지만 반환되도록 통일했습니다.
* **환경 변수 및 비밀키 백엔드 격리 (Zero-Leak) (`lib/supabase.ts`, `.env.local`):**
  * DB 자격 증명(Supabase URL, ANON KEY)이 클라이언트 브라우저 JS 번들에 노출되지 않도록 `NEXT_PUBLIC_` 접두사를 제거하고, 순수 백엔드 서버 핸들러(`app/api/**`)에서만 사용되는 서버 전용 환경 변수(`SUPABASE_URL`, `SUPABASE_ANON_KEY`)로 명칭 및 아키텍처 격리를 마쳤습니다. (Vercel 대시보드 환경변수 수정 필요).
* **로그아웃 시 PWA 오프라인 캐시 스토리지 즉시 비우기 (Cache Purge) (`components/Header.tsx`):**
  * 민감 정보인 OAuth Access Token과 NextAuth JWT는 쿠키(`HttpOnly`, `Secure`)를 통해서만 안전하게 보관됩니다.
  * 공용 기기나 재배포 환경에서 잔여 캐시 접근 차단을 위해, 사용자가 상단 로그아웃 버튼을 클릭하면 `window.caches.delete`를 순회 호출하여 로컬 PWA 오프라인 서비스 워커 캐시 스토리지를 즉시 완벽히 비우고 클리어한 후 `signOut()`하는 래퍼 방어벽을 구축했습니다.
* **Vercel 배포 전용 6대 강력 HTTP 보안 헤더 장착 (`next.config.ts`):**
  * **Content-Security-Policy (CSP)**: Serwist 서비스 워커 구동(`worker-src 'self' blob:;`), 구글 프로필 및 OAuth(`img-src`), Supabase DB 통신 및 jsPDF 폰트 로드(`raw.githubusercontent.com`), 실시간 개발 환경이 원활히 동작하도록 최적화된 맞춤 화이트리스트 설정을 추가했습니다.
  * **HSTS (`Strict-Transport-Security`)**: 무조건적인 HTTPS 접속 강제를 위해 `max-age=63072000; includeSubDomains; preload` 부여.
  * **X-Frame-Options (`DENY`) & X-Content-Type-Options (`nosniff`) & Referrer-Policy (`strict-origin-when-cross-origin`) & Permissions-Policy (`camera=(), microphone=(), geolocation=()`)**을 통해 클릭재킹, MIME 스푸핑 및 불필요한 스마트폰 장치 권한 호출을 100% 차단합니다.

### Phase 8: 일본어 한자 단어장 확장 (Japanese Kanji Extension)
* **단일 테이블 기반 언어 식별 및 하위 호환성 (`lib/db.ts`, `providers/LanguageModeProvider.tsx`):**
  * **Dexie 스키마 및 DB 마이그레이션**: 로컬 IndexedDB 스키마(v5) 및 Supabase 서버 DB의 `word_lists` 테이블에 `lang?: 'en' | 'ja'` 속성을 부여했습니다.
  * **하위 호환성 100% 보장**: 기존에 저장된 단어장이나 값이 없는 데이터는 `(!l.lang || l.lang === 'en')` 조건문을 통해 무조건 기본 영어 단어장(`'en'`)으로 간주하도록 설계하여, 기존 사용자의 DB 충돌이나 데이터 누락을 차단합니다.
  * **설정창 중심 모던 라디오 버튼 전환 (`components/LanguageToggle.tsx`, `app/settings/page.tsx`)**: 화면마다 토글이 보이는 헷갈림을 없애기 위해 **오직 단어장 관리(설정) 화면**에서만 심플한 라디오 버튼으로 영어 모드와 일본어 모드를 전환하도록 변경했으며, 학습/테스트/인쇄 진입부는 선택된 언어 세트에 맞춰 반응합니다.
* **CSV 스마트 파싱 및 Supabase Cloud 동기화 (`components/FileOpenButton.tsx`, `components/DBDownloadModal.tsx`, `app/api/db/**`):**
  * **자동 감지 로직**: CSV 파일 오픈 시 헤더 컬럼명(`일본어한자`, `일본어발음` 등) 또는 첫 단어의 유니코드 문자 코드(한자/히라가на)를 자동 판독하여 일본어 단어장(`'ja'`)으로 분류하며 추가 즉시 해당 언어 뷰로 토글됩니다.
  * **서버리스 Fallback 및 언어 뱃지 UI**: Supabase 업로드/조회 API에 `lang` 파라미터 검증을 보증했으며, 아직 서버 DB 컬럼 마이그레이션을 안 한 환경에서도 오류 없이 구버전 쿼리로 Fallback 동작하도록 구축했습니다. 다운로드 모달에서는 목록별 `ENG` 또는 `日/한자` 뱃지로 즉시 파악이 가능합니다.
* **일본어 특화 학습 및 테스트 UX (`app/study/page.tsx`, `app/test/page.tsx`, `lib/textUtils.ts`):**
  * **플래시카드 & 문제 화면 가독성 50% 향상**: 일본어 한자 암기의 편의를 위해 학습 카드 및 테스트 문제 카드 상단에 **히라гана 일본어 발음(`partOfSpeech`)**을 명시적인 알약 뱃지로 표시합니다. 또한 카드 중앙의 한글 뜻과 괄호 안 한자별 독음(`(先: 먼저 선, 生: 날 생)`) 글자 크기를 50% 확대하고, 8지선다 보기 버튼의 독음 글자는 시각 정합성을 위해 1~2포인트 작게 축소(`text-[10px] sm:text-[11px]`)하여 완벽한 UI 밸런스를 구현했습니다.
  * **100% 객관식 출제 & TTS 로케일 연동**: 한자 스펠링 주관식 입력을 원천 방지하여 일본어 테스트 시에는 무조건 8지선다 객관식(MCQ)으로 출제되며, Web Speech API 발음 재생 시 `ja-JP` 로케일을 통해 히라가на 발음과 일본어 예문을 낭독합니다.
  * **한자 어간 스마트 하이라이팅**: 일본어 예문 내에서 동사/형용사 활용형이 등장해도(`行く` ➡️ `行きます`), 핵심 한자 어간 부분(`行`)을 정확히 분리해 굵은 폰트(Bold)로 강조하는 하이라이팅 알고리즘을 추가했습니다.
  * **PDF 인쇄 모드 분리 (`app/pdf/page.tsx`)**: 한글/영문 CDN 폰트 기반인 jsPDF 라이브러리의 한자·히라гана 렌더링 미지원 특성을 명쾌히 안내하고, 일본어 모드로 PDF 진입 시 사용을 제한하며 설정 메뉴에서 영어 모드로 전환할 것을 시각적으로 유도합니다.

### Phase 9: TTS 및 시스템 사운드 전역 관리 (Audio Control)
* **전역 설정 모달 및 상태 연동 (`components/TTSSettingsModal.tsx`, `providers/TTSSettingsProvider.tsx`):**
  * **TTS 상세 제어**: 발화 속도(0.5~2.0), 음높이(0.0~2.0), TTS 볼륨(0~100%) 및 브라우저에서 제공하는 영어 화자 억양(Voice URI)을 선택할 수 있는 슬라이더와 드롭다운을 제공합니다.
  * **효과음 통합 제어**: 단어 학습 및 테스트 중 재생되는 시스템 효과음(`useAppSound.ts`)의 음소거 여부와 볼륨 크기(0~100%)를 모달에서 한 번에 설정할 수 있습니다.
  * **로컬 스토리지 동기화**: 모든 설정값은 `word_smart_tts_settings`라는 키로 `localStorage`에 자동 저장되며, `TTSSettingsProvider`를 통해 앱 전역에서 렌더링을 차단하지 않고 상태를 실시간으로 공유합니다.
* **학습 UX 고도화 (Auto TTS):**
  * **자동 재생 모드**: '자동 TTS 모드' 체크 시, 학습 모드(`app/study/page.tsx`)에서 플래시카드를 좌우로 스와이프하여 넘길 때마다 화면 터치 없이 즉각적으로 단어 발음이 자동 재생되는 편의 기능을 도입했습니다.
  * **터치 영역 확장**: 예문 발음 듣기 아이콘(`Volume2`)의 터치 인식 범위(Hit Area)를 좌측 여백 전체로 대폭 확장하여, 모바일 환경에서 오타(번역 토글 오작동)를 방지하고 쾌적한 학습이 가능하도록 Flex 레이아웃을 리팩토링했습니다.

### Phase 10: 한자 공부 모드 확장 (Hanja Study Extension)
* **다국어(언어 모드) 확장 구조 적용 (`providers/LanguageModeProvider.tsx`, `lib/db.ts`):**
  * 기존 영어(`'en'`), 일본어(`'ja'`)에 더하여 세 번째 언어 코드인 **한자(`'zh'`)** 모드를 추가했습니다.
  * `zipfScore` (급수 난이도) 컬럼을 `number`에서 `string | number`로 마이그레이션(`ALTER TABLE words ALTER COLUMN zipf_score TYPE VARCHAR(255) USING zipf_score::VARCHAR;`)하여, "1급", "4급" 등 문자열 형태의 한자 급수 데이터를 원본 그대로 저장하고 관리할 수 있도록 개선했습니다.
* **Hanja 맞춤형 UI 및 로직 최적화 (`app/study/page.tsx`, `app/test/page.tsx`):**
  * **CSV 컬럼 스마트 매핑**: 한자 단어장의 특수한 구조를 수용하기 위해, 파일 오픈 시 `row["한자"]`를 통해 한자 모드를 자동 감지하고, **'훈음'**은 `meaningKo`, **'부수와 형성원리'**는 `partOfSpeech`로 내부 매핑하여 관리합니다.
  * **플래시카드 렌더링 및 TTS**: 플래시카드 상단에는 부수와 형성원리가 표시되고, 카드 중앙에는 한자, 하단에는 크게 훈음이 표시됩니다. TTS(`ko-KR`)는 훈음(예: 하늘 천)과 한자 단어 독음(예: 천지)을 정확하게 한국어로 낭독합니다.
  * **한자 전용 테스트(MCQ)**: 한자 테스트는 스펠링 주관식 없이 무조건 8지선다형(MCQ)으로만 출제되며, 사용자는 정답으로 '훈음'을 고르게 됩니다.
  * **ZipfBadge 뱃지 커스텀**: "1급"(★4개), "2급"(★3개), "3급"(★2개), "4급/5급"(★1개) 등 한자 급수 체계에 맞춘 전용 별점 렌더링 로직을 `ZipfBadge` 컴포넌트에 구현했습니다.
  * **스와이프 언어 전환**: 학습/테스트 사전 진입 모달에서 좌우 스와이프를 통해 `영어 ➡️ 일본어 ➡️ 한자` 3개 모드가 원형으로 자연스럽게 전환되도록 개선했습니다.
  * **설정 동적 제어**: 한자와 일본어 모드 진입 시, 단어 난이도 필터(zipfFilter)가 자동으로 "모든 단어 (난이도 무관)"로 고정되어 문자열 급수 필터링 간섭을 방지합니다.

## 5. 개선 필요사항 및 퓨처 워크 (Future Work)

1. **상태 동기화 자동화 (Auto Cloud Sync):**
   현재 수동 버튼 클릭을 통한 클라우드 DB 업로드/다운로드 기능은 완성되었으나, 추후 Google Drive API 등을 활용해 백그라운드 자동 양방향 동기화(Sync) 로직을 도입할 수 있습니다.
2. **학습 알고리즘 고도화 (Spaced Repetition):**
   에빙하우스 망각 곡선이나 라이트너 시스템(Leitner System)에 기반한 복습 주기 알고리즘을 도입하면, `words.correctCount` 등의 DB 데이터를 활용해 개인화된 맞춤 학습 큐레이션이 가능해집니다.
3. **오디오 (TTS) 오프라인 성능 보완:**
   현재 브라우저 내장 Web Speech API를 활용하므로 OS 및 기기별 발음 품질 편차가 존재합니다. 고품질 발음 파일을 사전에 생성해 캐싱하거나 Google Cloud TTS의 연동을 고려해 볼 수 있습니다.

## 6. 개발 프롬프트 레퍼런스 (Development Prompt Reference)
향후 다른 앱 개발 시 "오프라인 최우선(Offline-First) PWA" 환경을 구축할 때 아래 프롬프트를 참고할 수 있습니다:

> "Next.js App Router와 Serwist(Workbox)를 활용해 0.1초 컷으로 화면이 뜨는 오프라인 우선(Offline-First) PWA를 구축해 줘.
> 1. `sw.ts`에 정적 자산(JS/CSS)은 `CacheFirst`를 적용하되, HTML 문서(`request.mode === 'navigate'`)와 Next.js 데이터(`_rsc`)는 `StaleWhileRevalidate` 전략을 적용해 네트워크 없이도 멈춤 현상 없이 화면 전환이 가능하게 해줘.
> 2. `layout.tsx`에 `appleWebApp` 메타데이터를 추가해 아이폰(iOS) Safari에서도 Standalone 앱처럼 동작하게 만들어줘.
> 3. IndexedDB(Dexie.js)를 Local Source of Truth로 사용하여, 앱이 켜질 땐 로컬 DB로 화면을 즉시 그리고, 백그라운드에서 `useDataSync` 훅을 통해 서버 DB를 Fetch한 뒤 로컬 DB를 갱신하는 SWR(Stale-While-Revalidate) 방식의 데이터 동기화를 구현해 줘.
> 4. `window.addEventListener`를 활용해 online/offline 상태를 감지하는 `useNetworkStatus` 커스텀 훅을 만들고, 오프라인 시 UI 상단에 시각적 뱃지를 표시해 줘.
> 5. 앱 정보 모달에 `navigator.serviceWorker.getRegistrations`와 `caches.keys()`를 활용하여 서비스 워커 캐시를 지우고 강제로 최신 버전을 리로드(새로고침)하는 수동 업데이트 버튼을 만들어 줘.
> 6. iOS Safari PWA 오프라인 렌더링 블로킹 방지를 위해 `SessionProvider`에 `refetchInterval={0}`, `refetchOnWindowFocus={false}`를 부여하고, 동기화 Fetch 요청에는 `AbortSignal.timeout(5000)` 및 `!navigator.onLine` 이중 체크 방어 로직을 적용해 줘. `sw.ts` 에서는 `navigationPreload: false`로 설정해 줘.
> 7. 가장 중요하게, Serwist의 `...defaultCache`는 내부에 모든 요청(`/.*/i`)을 `NetworkOnly`로 강제하는 치명적 규칙을 포함하고 있으므로 **절대 사용하지 말고**, 그 대신 `/.*/i`에 대해 `StaleWhileRevalidate`를 적용하는 커스텀 캐치올(catch-all) 규칙과 `https://fonts.googleapis.com` 등을 위한 캐시 규칙을 직접 작성해서 오프라인 시 Next.js 에셋과 폰트 로딩이 실패하지 않도록 보장해 줘.
> 8. **Next.js 16+ Turbopack 호환성 문제**: `@serwist/next` 플러그인은 Webpack 기반이므로 Next.js의 기본 설정인 Turbopack 환경에서는 `public/sw.js` 파일을 아예 생성하지 못하는 버그가 있어 오프라인 캐싱이 원천 차단됩니다. 반드시 `package.json`의 build 스크립트를 `"build": "next build --webpack"`으로 수정하여 프로덕션 빌드 시 Webpack을 강제 사용하도록 설정해 줘."
