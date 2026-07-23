# Word Smart (워드 스마트) - 개발 문서

## 1. 프로젝트 개요
**Word Smart**는 CSV 형태의 단어장 데이터를 불러와 오프라인 환경에서도 동작하는 PWA(Progressive Web App) 기반의 영단어 학습 애플리케이션입니다.
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
│   ├── Logo.tsx                         # 반응형 앱 타이틀 및 다크모드 지원 로고 컴포넌트
│   ├── Navigation.tsx                   # MD3 스타일 네비게이션 (진행 중 이탈 방지 로직 적용)
│   └── Providers.tsx                    # NextAuth, Theme, StudySession 프로바이더 래퍼
├── lib/
│   └── db.ts                            # Dexie.js 데이터베이스 스키마 (`isActive`, `testCount` 등)
├── providers/
│   └── StudySessionProvider.tsx         # 전역 학습 진행 상태 관리 훅 (앱 이탈 방지용)
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
* **학습 이력 중복 렌더링 방지 (`app/history/page.tsx`, `app/api/history/route.ts`):**
  * 로컬 시간(`createdAt`)을 기준으로 서버(Supabase)에 데이터를 Insert하여 로컬-서버 간 타임스탬프 불일치를 없애고, UI 단에서 `useMemo`를 통해 1분 이내 동일 유형의 데이터가 중복 렌더링되지 않도록 방어 로직을 구축했습니다.

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
> 5. 앱 정보 모달에 `navigator.serviceWorker.getRegistrations`와 `caches.keys()`를 활용하여 서비스 워커 캐시를 지우고 강제로 최신 버전을 리로드(새로고침)하는 수동 업데이트 버튼을 만들어 줘."
