# Word Smart (워드 스마트) - 개발 문서

## 1. 프로젝트 개요
**Word Smart**는 CSV 형태의 단어장 데이터를 불러와 오프라인 환경에서도 완전하게 동작하는 PWA(Progressive Web App) 기반의 다국어(영단어, 일본어 한자, 한자 급수) 학습 애플리케이션입니다.
사용자는 로컬 디바이스나 구글 드라이브(Google Drive)에서 단어장 파일을 불러오거나 클라우드 DB(Supabase)와 동기화할 수 있으며, 플래시카드 학습, 퀴즈 테스트(8지 선다 및 스펠링 힌트 퀴즈), 단어장 관리 및 학습 통계, 인쇄용 PDF 생성(학습지/시험지), 반투명 필기 연습장(Drawing Pad) 등 체계적이고 몰입감 있는 학습 환경을 제공합니다.

## 2. 기술 프레임워크 및 라이브러리
* **Core Framework:** Next.js 16+ (App Router, Webpack Mode), React 19, TypeScript 5
* **Styling & Icons:** Tailwind CSS v4, Lucide Icons, clsx, tailwind-merge
* **Local Offline Storage:** Dexie.js 4.x & dexie-react-hooks (브라우저 IndexedDB 래퍼)
* **Server Database & Sync:** Supabase Database (PostgreSQL, Row Level Security), Next.js Route Handlers
* **Authentication:** NextAuth.js v4 (Google OAuth 2.0, Offline Access Token Persistence, 180-Day Session)
* **PWA Engine:** `@serwist/next`, `serwist`, `@serwist/precaching` (Service Worker 커스텀 캐싱 전략)
* **Animation & Motion:** Framer Motion (플래시카드 제스처 스와이프 및 뷰 전환 모션)
* **Utilities & Audio:** 
  * PapaParse (CSV 양방향 파싱 및 내보내기)
  * jsPDF & jspdf-autotable (PDF 시험지/학습지 동적 렌더링)
  * Web Speech API (다국어 TTS: 영어, 일본어, 한국어)
  * use-sound & Web Audio API (시스템 효과음)
  * Zod (API 페이로드 및 쿼리 파라미터 런타임 유효성 검증)

---

## 3. 폴더 구조 및 소스 파일 설명

```text
word-smart/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth 로그인/세션 관리 라우트 (Google OAuth, Token Refresh)
│   │   ├── db/                          # Supabase 클라우드 DB 연동 라우트
│   │   │   ├── delete/route.ts          # 클라우드 단어장 및 단어 삭제 API (소유권 검증)
│   │   │   ├── download/route.ts        # 클라우드 단어장 다운로드 API (페이징 최적화)
│   │   │   ├── list/route.ts            # 등록된 단어장 목록 및 단어 수 조회 API
│   │   │   └── upload/route.ts          # 단어장 및 단어 일괄 업로드 API (정규화 스키마, 15,000단어 제한 검사)
│   │   ├── drive/                       # 구글 드라이브 연동 라우트
│   │   │   ├── download/route.ts        # 구글 드라이브 파일 내용 다운로드
│   │   │   └── list/route.ts            # 드라이브 폴더 내 CSV 파일 목록 조회
│   │   └── history/route.ts             # 학습/테스트 기록 동기화 API (ServerId 1:1 매핑, Soft/Hard Delete)
│   ├── history/page.tsx                 # 학습/테스트 이력 조회 및 통계 화면
│   ├── pdf/page.tsx                     # (Phase 5) 단어장 PDF 시험지/학습지 생성 및 인쇄 화면
│   ├── settings/page.tsx                # (Phase 2) 단어장 관리 화면 (클라우드 업로드/다운로드, 활성화 토글, 진행률 초기화)
│   ├── study/page.tsx                   # (Phase 3) 플래시카드 기반 단어 학습 화면 (사전 설정 모달, TTS, 사전/번역 연동)
│   ├── test/page.tsx                    # (Phase 4) 8지 선다 및 스펠링 퀴즈 화면 (사전 설정 모달, 50% 힌트)
│   ├── ~offline/page.tsx                # 완전 오프라인 환경 진입 시의 Fallback 폴백 페이지
│   ├── globals.css                      # Tailwind v4 디자인 토큰 및 글로벌 테마 스타일 (CSS 변수)
│   ├── layout.tsx                       # 글로벌 앱 레이아웃 (Standalone PWA 메타데이터, Providers, Header, Navigation)
│   ├── page.tsx                         # 메인 대시보드 (학습/테스트 바로가기, 진행 요약)
│   └── sw.ts                            # Serwist 커스텀 Service Worker 스크립트 (캐싱 규칙)
├── components/
│   ├── ConfirmModal.tsx                 # 범용 액션 확인 모달 (학습 중단, 단어장 삭제, 진행률 초기화 등)
│   ├── DBDownloadModal.tsx              # 클라우드 DB 단어장 목록 조회 및 로컬 다운로드 모달
│   ├── DrawingPad.tsx                   # (Phase 11) 플래시카드 더블터치 필기 연습장 캔버스 (반투명/불투명 토글)
│   ├── DrivePickerModal.tsx             # 구글 드라이브 폴더 브라우저 및 파일 선택 모달 (폴더 핀 고정)
│   ├── FileOpenButton.tsx               # 로컬 CSV 파일 오픈 및 구글 드라이브 모달 연동 버튼 (언어 자동 판독)
│   ├── Header.tsx                       # 상단 앱 바 (오프라인 상태 감지 뱃지, 테마 토글, 프로필, 캐시 Purge 로그아웃)
│   ├── InfoModal.tsx                    # 앱 정보 모달 (최신 버전 강제 업데이트 버튼, 개인정보처리방침 링크, 버전 표기)
│   ├── LanguageToggle.tsx               # 설정 창 전용 언어 모드 전환 라디오 뷰 (영어 / 일본어 / 한자)
│   ├── Logo.tsx                         # 반응형 앱 로고 컴포넌트 (라이트/다크 테마 아이콘 지원)
│   ├── Navigation.tsx                   # Material Design 3 스타일 반응형 네비게이션 (모바일 하단 바 / PC 사이드바)
│   ├── Providers.tsx                    # NextAuth, ThemeProvider, StudySession, TTSSettings 전역 상태 래퍼
│   ├── TTSSettingsModal.tsx             # (Phase 9) 다국어 TTS 음성/속도/피치/볼륨 및 효과음 전역 설정 모달
│   └── ZipfBadge.tsx                    # 난이도 시각화 뱃지 (영어 Zipf 빈도수 / 한자 급수별 별점 표기, 사전 바로가기)
├── hooks/
│   ├── useAppSound.ts                   # 시스템 사운드(효과음) 재생 및 음소거/볼륨 연동 훅
│   ├── useDataSync.ts                   # 네트워크 복구 시 백그라운드 서버 동기화 훅 (지연 업로드, Soft Delete 전송)
│   └── useNetworkStatus.ts              # 브라우저 온/오프라인 상태 실시간 감지 훅
├── lib/
│   ├── constants.ts                     # 앱 정보 안내 문구(`APP_INFO_MESSAGE`) 및 버전 상수(`APP_VERSION`)
│   ├── db.ts                            # Dexie.js 로컬 IndexedDB 스키마 정의 (`wordLists`, `words`, `history`)
│   ├── fetchAuth.ts                     # (Phase 12) 401 Unauthorized 발생 시 투명하게 토큰을 갱신하고 재시도하는 fetch 래퍼
│   ├── supabase.ts                      # Supabase 클라이언트 초기화 (서버 사이드 환경변수 기반)
│   └── textUtils.ts                     # 한자 어간 하이라이팅, 스펠링 마스킹 등 텍스트 처리 유틸리티
├── providers/
│   ├── LanguageModeProvider.tsx         # 전역 언어 모드('en' | 'ja' | 'zh') 상태 관리 훅
│   ├── StudySessionProvider.tsx         # 전역 학습 진행 상태 관리 훅 (비정상 이탈 방지 이벤트 연동)
│   └── TTSSettingsProvider.tsx          # 다국어 TTS 엔진 및 효과음 설정 전역 상태 관리 훅
├── public/
│   ├── icons/                           # PWA 매니페스트 및 디바이스용 아이콘 모음 (192x192, 512x512, 라이트/다크)
│   ├── sounds/                          # 시스템 효과음 음원 파일 (정답, 오답, 클릭, 전환, 완료음 등)
│   └── manifest.json                    # PWA 매니페스트 설정 파일
├── word/                                # 기본 제공 영어 단어장 CSV 데이터셋 (TEPS 분야별 어휘, 필수 숙어 등)
├── japanese/                            # 기본 제공 일본어 단어장 CSV 데이터셋 (JLPT N4, N5 품사별/통합 어휘)
├── chinese/                             # 기본 제공 한자 단어장 CSV 데이터셋 (중학교/고등학교 교육용 기초 한자 900자)
├── auth.ts                              # NextAuth 옵션 설정 (Google OAuth, 리프레시 토큰 순환, 180일 쿠키 유지)
├── next.config.ts                       # Next.js 빌드 설정 (Serwist 플러그인, 6대 보안 HTTP 헤더, CSP 정책)
└── tailwind.config.ts                   # Tailwind CSS 환경 설정
```

### 3.1 데이터베이스 스키마 명세 (Local vs. Cloud)

| 구분 | 로컬 IndexedDB (`lib/db.ts` - Dexie.js) | 서버 클라우드 DB (Supabase PostgreSQL) | 비고 및 권한 정책 |
| :--- | :--- | :--- | :--- |
| **단어장 목록** | `wordLists`<br>(`id`, `title`, `createdAt`, `isActive`, `lang`) | `word_lists`<br>(`id`, `user_email`, `title`, `lang`, `created_at`) | • **조회/다운로드:** 로그인 사용자 전체 공유<br>• **업로드/삭제:** 생성자(`user_email`) 본인만 가능 (최대 50개) |
| **단어 데이터** | `words`<br>(`id`, `listId`, `word`, `partOfSpeech`, `meaningKo`, `exampleEn`, `exampleKo`, `isLearned`, `testCount`, `correctCount`, `zipfScore`) | `words`<br>(`id`, `list_id`, `word`, `part_of_speech`, `meaning_ko`, `example_en`, `example_ko`, `zipf_score`) | • 제2 정규화로 `user_email` 중복 제거 (`list_id` 외래키 종속)<br>• `(list_id, word)` 복합 UNIQUE 제약<br>• 계정당 총 15,000단어 업로드 제한 |
| **학습/테스트 이력** | `history`<br>(`id`, `serverId`, `userEmail`, `createdAt`, `type`, `totalCount`, `completedCount`, `incompleteWords`, `completeWords`, `isSynced`, `isDeleted`, `deletedAt`, `lang`) | `study_history`<br>(`id`, `user_email`, `type`, `total_count`, `completed_count`, `incomplete_words`, `complete_words`, `created_at`, `is_deleted`, `deleted_at`, `lang`) | • 철저한 개인화 (`user_email` 일치 데이터만 접근)<br>• `serverId` 1:1 매핑 및 오프라인 지연 동기화<br>• 논리적 삭제(`is_deleted`) 후 30일 경과 시 자동 영구 삭제 |

### 3.2 언어별 CSV 단어장 컬럼 규격 (`components/FileOpenButton.tsx`)

CSV 파일을 불러올 때 첫 행의 헤더명 또는 문자 유니코드를 분석하여 자동으로 언어 모드(`en` | `ja` | `zh`)를 판별하고 내부 스키마로 매핑합니다.

| 내부 필드 (`Word`) | 🇺🇸 영어 CSV 헤더 (`lang: 'en'`) | 🇯🇵 일본어 CSV 헤더 (`lang: 'ja'`) | 🇨🇳 한자 CSV 헤더 (`lang: 'zh'`) |
| :--- | :--- | :--- | :--- |
| **`word`** | `Word` | `일본어한자` | `한자` |
| **`partOfSpeech`** | `Part of Speech` | `일본어발음` (히라가나) | `부수와 형성원리` |
| **`meaningKo`** | `Korean Meaning` | `한글 뜻과 한자별 한글독음` | `훈음` |
| **`exampleEn`** | `Example Sentence` | `일본어예문` | `한자 단어` (활용 단어) |
| **`exampleKo`** | `Korean Translation` | `예문한글번역문` | `한자 단어 독음` |
| **`zipfScore`** | `zipf_score` 또는 `Zipf Score` (숫자) | `zipf_score` (선택) | `급수 난이도` (예: `"1급"`, `"4급"`) |

### 3.3 필수 환경 변수 (`.env.local` & Vercel Environment Variables)

모든 환경 변수는 `NEXT_PUBLIC_` 접두사 없이 서버 사이드 전용으로 격리되어 브라우저 번들에 노출되지 않습니다.
* `NEXTAUTH_SECRET`: NextAuth JWT 암호화 시크릿 키
* `GOOGLE_CLIENT_ID`: Google Cloud Console OAuth 2.0 클라이언트 ID (Google Drive API `drive.readonly` 스코프 포함)
* `GOOGLE_CLIENT_SECRET`: Google Cloud Console OAuth 2.0 클라이언트 보안 비밀
* `SUPABASE_URL`: Supabase 프로젝트 URL
* `SUPABASE_ANON_KEY`: Supabase 프로젝트 API Key (서버 라우트 핸들러 전용)

---

## 4. 단계별 기능 개발 및 구현 내역 (Phases 1 ~ 14)

### Phase 1: 레이아웃 및 테마 관리
* **반응형 네비게이션 (`components/Navigation.tsx`, `components/Header.tsx`):**
  * Tailwind CSS의 `md:` 브레이크포인트를 통해 모바일에서는 하단 탭 바(Material Design 3 스타일 알약 하이라이트 인디케이터)로, 태블릿 및 데스크톱에서는 좌측 고정 사이드바로 레이아웃이 자연스럽게 스위칭됩니다.
* **테마 토글 및 디자인 토큰 (`components/Logo.tsx`, `components/Providers.tsx`, `app/globals.css`):**
  * `next-themes`를 활용하여 시스템 기본값 감지 및 수동 라이트/다크 전환을 지원합니다. Tailwind v4 CSS 변수 기반 테마 토큰(Slate & Emerald 톤)을 설계하여 테마 전환 시 플리커링 없이 즉각 전환됩니다.
* **단어장 파싱 및 구글 드라이브 연동 (`components/FileOpenButton.tsx`, `components/DrivePickerModal.tsx`):**
  * 로컬 기기 파일 탐색기뿐만 아니라 Google Drive Picker 모달을 통해 클라우드에 저장된 CSV 파일을 직접 읽어옵니다.
  * LocalStorage를 통해 사용자가 자주 찾는 구글 드라이브 폴더의 고유 경로를 기억하는 핀(Pin) 고정 편의 기능을 제공합니다.

### Phase 2: 로컬 DB 스키마 설계 및 관리
* **Dexie.js 오프라인 스토리지 (`lib/db.ts`):**
  * 브라우저 내장 IndexedDB에 `wordLists`, `words`, `history` 테이블을 구축하여 완전한 오프라인 독립성을 보장합니다.
  * 단어장 활성화 여부(`isActive`), 단어별 누적 학습 횟수(`testCount`), 정답 횟수(`correctCount`), 난이도(`zipfScore`), 언어 식별자(`lang`)를 기록합니다.
* **설정 화면 (`app/settings/page.tsx`):**
  * 로컬 DB 데이터의 변경 사항을 실시간 반영하며, 단어장 다중 선택/해제, 이름 수정, 진행률 초기화, CSV 파일 내보내기(Export) 기능을 지원합니다.
  * 로그인 상태일 경우 서버 DB와 직접 연동하는 **클라우드 업로드/다운로드 (Cloud Sync)** 버튼이 표시됩니다.

### Phase 3: 플래시카드 학습 모드 (Study Mode)
* **단어장 통합 및 이탈 방지:**
  * 활성화된 모든 단어장의 데이터를 가상으로 병합하여 하나의 통합 세트로 학습할 수 있습니다. N+1 쿼리 병목을 방지하기 위해 단어장 제목 매핑에 `Map` 인메모리 캐시를 적용했습니다.
  * 학습 진행 도중 실수로 다른 탭으로 이동하거나 현재 탭을 다시 눌렀을 때 `ConfirmModal`을 호출하여 의도치 않은 학습 중단을 방지합니다.
* **학습 설정 모달 & TTS 엔진:**
  * 단어 난이도 필터링(Zipf 점수 기반)을 지원하며, 선택된 학습 수량이 단어장 크기를 초과할 경우 중복 없는 1사이클 학습 후 부족분을 랜덤으로 채우는 셔플링 알고리즘이 동작합니다.
  * Web Speech API를 통해 단어 및 원어 예문 발음을 즉시 청취할 수 있습니다.

### Phase 4: 테스트 모드 (Test Mode)
* **퀴즈 게임 로직 (`app/test/page.tsx`):**
  * **객관식 (MCQ):** 전체 단어 풀에서 정답을 제외한 7개의 오답 뜻을 랜덤 추출하여 총 8개의 보기를 무작위 셔플링하여 제공합니다.
  * **주관식 (Spelling):** 단어 철자의 최대 50%까지만 점진적으로 힌트 글자를 열어주는 지능형 힌트 알고리즘을 적용하여 적절한 난이도와 성취감을 제공합니다.
  * 언어 모드가 일본어('ja')나 한자('zh')일 때는 스펠링 주관식 입력을 자동으로 제한하고 100% 객관식으로 전환 출제됩니다.

### Phase 5: PDF 인쇄 (Export Mode)
* **사전 설정 모달 및 다중 목록 출력 (`app/pdf/page.tsx`):**
  * 활성화된 단어장들을 조합하여 원하는 단어 개수만큼 PDF 시험지/학습지를 동적으로 페이지 분할 계산하여 생성합니다.
  * 빈칸 유형(영어 빈칸, 한글 뜻 빈칸, 무작위 빈칸)을 선택할 수 있습니다.
* **jsPDF + AutoTable 스타일링:**
  * 구글 폰트 CDN에서 나눔고딕(NanumGothic) 폰트 데이터를 실시간 인메모리 Fetch하여 주입함으로써 한글 깨짐 현상을 해결했습니다. 교차 배경색(Zebra striping)이 들어간 깔끔한 그리드 표를 출력합니다.
  * 한자/히라가나 폰트 렌더링 한계를 고려하여, 일본어/한자 모드에서는 친절한 전환 안내 UI를 표시합니다.

### Phase 6: 오프라인 우선(Offline-First) PWA 아키텍처
* **Serwist 커스텀 캐싱 전략 (`app/sw.ts`):**
  * HTML 문서 진입(`request.mode === 'navigate'`) 및 Next.js 클라이언트 라우팅 데이터(`_rsc`)를 `StaleWhileRevalidate` 전략으로 처리하여 비행기 탑승 모드나 네트워크 단절 상태에서도 0.1초 만에 화면이 뜹니다.
  * iOS Safari Standalone 모드 지원을 위해 `layout.tsx`에 `appleWebApp` 메타데이터를 추가했습니다.
* **iOS Safari 오프라인 진입 최적화 (렌더링 블로킹 방지):**
  * NextAuth의 `SessionProvider`가 네트워크에 매달려 첫 화면 렌더링을 차단하지 않도록 `refetchInterval={0}`, `refetchOnWindowFocus={false}`를 부여했습니다.
  * Safari의 간헐적 `navigator.onLine` 오작동에 대응해 모든 백그라운드 동기화 Fetch에 `AbortSignal.timeout(5000)` 및 예외 무시(silent fail) 방어를 적용했습니다.
  * Serwist 기본 `defaultCache` 내의 `NetworkOnly` 캐치올 함정을 제거하고, **`/.*/i`에 대한 `StaleWhileRevalidate` 커스텀 캐치올** 및 구글 폰트 전용 `CacheFirst` 규칙을 명시적으로 구성했습니다.
  * Safari 충돌 방지를 위해 Service Worker의 `navigationPreload: false`로 설정했습니다.
* **학습 이력 동기화 (`app/history/page.tsx`, `app/api/history/route.ts`):**
  * **Server ID 1:1 매핑**: 시간 기반 매핑 대신 서버 응답 UUID를 로컬 DB의 `serverId`로 영구 보관하여 기기간 데이터 정합성을 유지합니다.
  * **지연 일괄 동기화(Batch Sync)**: 오프라인에서 진행된 학습 기록(`isSynced=false`)을 모아 두었다가 온라인 복구 시 한 번에 전송합니다.
  * **논리적 삭제(Soft Delete) & 30일 영구 삭제(Hard Delete)**: 사용자가 삭제한 기록은 `isDeleted = true`로 로컬에서 즉시 숨겨지고 서버에 삭제 상태가 Push되며, 삭제 후 30일이 지난 데이터는 서버 동기화 시점에 물리적으로 완전히 제거됩니다.

### Phase 7: 서버리스 & PWA 보안 하드닝 (Security Hardening)
* **엔드포인트 인가(Authorization) 및 Zod 검증 (`app/api/**`):**
  * 클라이언트 요청 데이터를 무조건 신뢰하지 않고 서버 사이드 `getServerSession`을 통한 인증된 사용자 식별자(이메일)를 기준으로 데이터 소유권을 철저히 통제합니다.
  * 모든 API 라우트에 `zod` 스키마 검증을 적용하여 잘못된 페이로드 유입 시 HTTP 400을 반환합니다.
  * DB 에러 스택 트레이스는 서버 콘솔에만 기록하고 브라우저에는 정제된 메시지만 반환합니다.
* **Zero-Leak 환경 변수 격리 (`lib/supabase.ts`, `.env.local`):**
  * Supabase URL과 Anon Key에서 `NEXT_PUBLIC_` 접두사를 제거하고 순수 서버 측 백엔드 핸들러에서만 사용하는 서버 전용 환경 변수(`SUPABASE_URL`, `SUPABASE_ANON_KEY`)로 격리했습니다.
* **로그아웃 시 PWA 오프라인 캐시 Purge (`components/Header.tsx`):**
  * 공용 기기나 재배포 환경에서 잔류 캐시 노출을 방지하기 위해, 로그아웃 클릭 시 `caches.delete()`를 순회 호출하여 서비스 워커 캐시 스토리지를 완전히 비운 후 `signOut()`합니다.
* **Vercel 배포 전용 6대 강력 HTTP 보안 헤더 (`next.config.ts`):**
  * 맞춤형 **Content-Security-Policy (CSP)** (Serwist worker-src, Google OAuth, Supabase API, Google CDN 폰트 허용).
  * **HSTS**, **X-Frame-Options (DENY)**, **X-Content-Type-Options (nosniff)**, **Referrer-Policy**, **Permissions-Policy** 적용.

### Phase 8: 일본어 한자 확장 (Japanese Kanji Extension)
* **단일 테이블 기반 언어 식별 및 하위 호환성 (`lib/db.ts`, `providers/LanguageModeProvider.tsx`):**
  * Dexie 스키마 및 서버 `word_lists` 테이블에 `lang?: 'en' | 'ja' | 'zh'` 속성을 도입했습니다. 기존 데이터는 `(!l.lang || l.lang === 'en')` 폴백을 통해 영어 단어장으로 정상 처리됩니다.
  * 설정 화면에서 심플한 라디오 버튼으로 언어 모드를 전환하도록 일원화했습니다.
* **CSV 자동 판독 및 일본어 전용 학습 UX (`lib/textUtils.ts`):**
  * CSV 헤더나 첫 단어의 유니코드(히라가나/한자)를 자동 분석해 언어 모드를 자동 지정합니다.
  * 플래시카드 상단에 히라가나 발음(`partOfSpeech`) 알약 뱃지 표시, 한글 뜻 및 한자별 훈독음 글자 크기 50% 확대, 8지선다 보기 버튼 독음 크기 미세 축소(`text-[10px]`) 등 UI 시각 밸런스를 구축했습니다.
  * 일본어 동사/형용사 활용형(`行く` ➡️ `行きます`)에서도 핵심 한자 어간(`行`)을 정확히 분리해 굵게 강조하는 어간 하이라이팅 알고리즘을 탑재했습니다.

### Phase 9: 다국어 TTS 및 시스템 사운드 전역 관리 (Audio Control)
* **전역 설정 모달 (`components/TTSSettingsModal.tsx`, `providers/TTSSettingsProvider.tsx`):**
  * **다국어 보이스 선택**: 영어(Voice URI), 일본어(`ja-JP`), 한국어(`ko-KR`) 각각의 음성을 라디오/탭을 통해 언어별로 독립 선택하여 설정할 수 있습니다.
  * **iOS Safari 중복 음성 식별**: iOS Safari의 Web Speech API가 동일한 이름(예: Kyoko 2개, Yuna 2개)을 반환할 때, `voiceURI` 파싱 및 인덱스 번호를 기반으로 `[System]`, `[Bundle]`, `[#1]` 태그를 붙여 사용자가 원하는 목소리를 구분하여 고를 수 있도록 개선했습니다.
  * 발화 속도(0.5~2.0), 음높이(0.0~2.0), TTS 볼륨, 효과음 음소거 및 볼륨을 한 곳에서 제어하며 설정값은 `localStorage`에 자동 영속화됩니다.
* **자동 TTS 모드 & 터치 영역 확장 (`app/study/page.tsx`):**
  * '자동 TTS' 활성화 시 플래시카드를 좌우로 스와이프할 때마다 화면 터치 없이 단어 발음이 즉시 자동 재생됩니다.
  * 발음 듣기 아이콘(`Volume2`)의 터치 영역을 좌측 여백 전체로 확장하여 모바일 조작 시 오작동을 차단했습니다.

### Phase 10: 한자(漢字) 공부 모드 확장 (Hanja Study Extension)
* **한자 전용 스키마 및 컬럼 매핑:**
  * 한자 단어장 구조에 맞춰 CSV 컬럼의 **'한자'**는 `word`, **'훈음'**은 `meaningKo`, **'부수와 형성원리'**는 `partOfSpeech`로 스마트 매핑됩니다.
  * 한자 급수(예: "1급", "특급", "4급") 저장을 위해 `zipfScore` 타입을 `number | string`으로 확장 마이그레이션했습니다.
* **한자 학습 및 퀴즈 최적화:**
  * 플래시카드 상단에 부수와 형성원리, 중앙에 큰 한자, 하단에 훈음이 표시되며 한국어 TTS(`ko-KR`)로 훈음과 한자 단어 독음을 정확히 낭독합니다.
  * 한자 테스트는 스펠링 주관식 없이 무조건 8지선다 객관식(MCQ)으로만 출제되어 '훈음'을 맞추는 방식으로 진행됩니다.
  * `ZipfBadge` 컴포넌트에서 "1급"(★4), "2급"(★3), "3급"(★2), "4급/5급"(★1) 등 한자 급수 체계에 맞춘 전용 별점을 렌더링합니다.

### Phase 11: 학습 편의 기능 고도화 (Study UX Enhancements)
* **네이버 사전 원클릭 연동 (`ZipfBadge.tsx`):**
  * 플래시카드 및 테스트 문제 카드의 난이도 뱃지(`ZipfBadge`)를 클릭/터치하면 현재 단어가 네이버 사전 새 탭으로 즉시 열립니다 (영어: `en.dict`, 일본어: `ja.dict`, 한자: `hanja.dict`).
* **반투명 필기 연습장 (`components/DrawingPad.tsx`):**
  * 학습 모드에서 플래시카드를 **더블 클릭(더블 터치)**하면 화면의 80% 크기의 반투명 캔버스 모달이 활성화됩니다.
  * 손가락이나 마우스로 카드 위의 글씨를 따라 쓸 수 있으며, 지우개 초기화, 눈 모양 아이콘을 통한 반투명/불투명 토글을 지원합니다. 고DPI 레티나 디스플레이를 위해 `devicePixelRatio` 좌표 보정이 적용되어 있습니다.
* **학습/테스트 진행률 초기화 (`app/settings/page.tsx`):**
  * 설정 화면에서 단어장별 완료율 퍼센트나 게이지를 클릭하면 확인 모달을 거쳐 해당 단어장의 학습 상태(`isLearned`, `testCount`, `correctCount`)를 손쉽게 0으로 리셋할 수 있습니다.
* **네비게이션 동일 탭 이탈 방지 (`components/Navigation.tsx`):**
  * 진행 중인 학습/테스트 상태에서 네비게이션의 동일 탭을 다시 클릭해도 중지 확인 모달이 뜨며, `word-smart-stop-session` 이벤트를 발행해 안전하게 세션을 일시 중지하고 진행 상황을 `localStorage`에 자동 저장합니다.

### Phase 12: 세션 영속화 및 401 투명 복구 (Session Persistence)
* **토큰 갱신 안정화 (`auth.ts`):**
  * Access Token 갱신 실패를 **치명적 실패(`invalid_grant`, 권한 취소 등)**와 **일시적 실패(네트워크 단절, 서버 일시 응답 지연 등)**로 구분했습니다. 일시적 실패 시에는 강제 로그아웃을 유보하고 기존 토큰을 유지해 재시도할 수 있도록 완화했습니다.
  * 토큰 만료 60초 전부터 사전 갱신(Early Refresh)을 시도하며, 브라우저 세션 쿠키 수명(`maxAge`)을 **180일**로 확장했습니다.
* **`fetchWithSessionRetry` 공용 헬퍼 (`lib/fetchAuth.ts`):**
  * 클라이언트 통신 도중 HTTP 401 에러를 만나면 화면이 튕기거나 로그아웃되지 않고, 내부적으로 `getSession()`을 호출하여 백그라운드에서 토큰을 갱신한 뒤 요청을 1회 투명하게 자동 재시도합니다.

### Phase 13: 예문 번역 및 사전 책갈피 버튼 (Folded Corner Translation)
* **접힌 책갈피 디자인 (Folded Corner UI):**
  * 학습 모드(`app/study/page.tsx`)와 테스트 모드(`app/test/page.tsx`)의 예문 박스 우측 하단 귀퉁이에 자연스럽게 접힌 형태의 책갈피 버튼(`rounded-tl-[20px]`, `Languages` 아이콘)을 탑재했습니다.
  * 슬림하고 컴팩트한 모바일 레이아웃(`w-9 h-9`)을 적용하여, 예문과 번역 텍스트 간의 가독성 간격은 유지하면서도 전체 예문 박스의 불필요한 세로 높이를 최소화했습니다.
* **언어별 스마트 사전/번역 분기:**
  * 🇺🇸 **영어 예문:** 파파고 영-한 번역 창 (`https://papago.naver.com/?sl=en&tl=ko&text=...`)
  * 🇯🇵 **일본어 예문:** 파파고 일-한 번역 창 (`https://papago.naver.com/?sl=ja&tl=ko&text=...`)
  * 🇨🇳 **한자 예문/단어:** 네이버 한자 사전 검색 창 (`https://hanja.dict.naver.com/#/search?query=...`)

### Phase 14: 서버 DB 정규화, RLS 보안 및 리포지토리 Public 전환
* **단어(`words`) 테이블 `user_email` 컬럼 제거 (제2 정규화 달성):**
  * 단어는 이미 `list_id`를 통해 부모 단어장(`word_lists`)에 종속되어 있으므로, 불필요하게 단어마다 이메일을 중복 저장하던 안티패턴을 제거했습니다.
  * DB DDL 마이그레이션: `ALTER TABLE words DROP COLUMN user_email;`
  * 고유 제약 조건 재설정: `ALTER TABLE words ADD CONSTRAINT words_list_id_word_key UNIQUE (list_id, word);`
* **서버리스 카운트 쿼리 리팩토링 (`app/api/db/upload/route.ts`):**
  * "계정당 단어 15,000개 제한" 검사 시, `words` 테이블을 이메일로 직접 검색하지 않고 `word_lists`에서 내 단어장 ID 목록(`listIds`)을 먼저 구한 뒤 `in('list_id', listIds)`로 집계하도록 쿼리를 정규화했습니다.
* **NextAuth 서버 세션 기반 인가 및 DB 무결성 정책:**
  * 본 프로젝트는 Supabase Auth 대신 **NextAuth.js (Google OAuth)**로 세션을 관리하며, Supabase 키(`SUPABASE_ANON_KEY`)를 브라우저에 일절 노출하지 않고 오직 Next.js 백엔드 라우트 핸들러(`app/api/**`) 내부에서만 호출합니다.
  * 단어장 조회(`list`) 및 다운로드(`download`)는 로그인한 모든 사용자에게 공유(Public Read)되지만, 단어장 업로드/갱신(`upload`) 및 삭제(`delete`)는 반드시 `getServerSession(authOptions)`의 이메일과 `word_lists.user_email`이 일치하는 소유자만 수행할 수 있도록 서버 코드 레벨에서 엄격히 통제합니다.
* **앱 정보 모달 UI 개편 및 개인정보처리방침 연동 (`components/InfoModal.tsx`):**
  * 최신 버전 업데이트 버튼을 모달 맨 아래에서 설명 텍스트(`APP_INFO_MESSAGE`) 바로 아래 줄 **중앙**으로 재배치하고, 폰트 크기를 본문과 동일한 `text-body-md font-medium`으로 조정하여 시각적 안정감을 높였습니다.
  * 모달 최하단 행 좌측에 `@APP_VERSION`과 같은 스타일로 **"개인정보처리방침"** 링크(`https://landing-doohee2.vercel.app/privacy`)를 추가하여 스토어 배포 및 공공 서비스 신뢰성을 확보했습니다.
* **GitHub Public 전환 대비 Zero-Leak 보안 무결성 검증:**
  * Git 커밋 히스토리 전체에 `.env*` 환경 변수 유출 흔적이 없음을 전수 확인했습니다.
  * Supabase URL/Key 및 Google OAuth Client ID/Secret을 백엔드 런타임 환경변수로 완벽 격리하여 소스 코드가 공개되어도 비밀키가 노출되지 않도록 조치했습니다.
  * NextAuth의 Vercel URL 감지 방식을 점검하여 코드 내 `NEXTAUTH_URL` 하드코딩 의존성을 배제했습니다.

---

## 5. 아키텍처 및 구현 상의 주요 특징 & 주의사항

1. **Next.js 16+ Turbopack 환경과 Serwist 빌드 호환성:**
   * `@serwist/next` 플러그인은 Webpack 번들러 기반으로 동작합니다. Next.js 16의 기본 번들러인 Turbopack 환경에서는 `public/sw.js` 파일이 생성되지 않는 문제가 발생합니다.
   * 따라서 `package.json`의 빌드 스크립트를 `"build": "next build --webpack"`으로 고정하여 프로덕션 빌드 시 Webpack 모드를 강제하도록 구성되어 있습니다.
2. **Serwist의 `...defaultCache` 사용 금지 원칙:**
   * 기본 제공되는 `defaultCache` 내부에는 모든 미매칭 요청(`/.*/i`)을 `NetworkOnly`로 강제하는 규칙이 포함되어 있어, 오프라인 시 Next.js 내부 스크립트 청크나 폰트 로드가 차단되는 치명적 문제가 발생합니다.
   * 이를 해결하기 위해 `sw.ts`에서 `defaultCache`를 제거하고, 정적 자산 `CacheFirst`, HTML/데이터 `StaleWhileRevalidate`, 구글 폰트 `CacheFirst`를 명시한 커스텀 규칙만을 적용했습니다.
3. **iOS Safari PWA 오프라인 렌더링 블로킹 방어:**
   * iOS Safari는 완전 오프라인 상태에서도 `navigator.onLine`이 `true`를 반환하는 버그가 있습니다.
   * `AbortSignal.timeout(5000)` 방어 코드와 NextAuth `SessionProvider`의 자동 갱신 비활성화(`refetchInterval={0}`, `refetchOnWindowFocus={false}`), 서비스 워커 `navigationPreload: false` 세팅을 통해 렌더링 블로킹을 원천 차단했습니다.
4. **다국어 음성(Web Speech API)의 브라우저별 차이 대응:**
   * 브라우저 및 OS에 따라 제공되는 목소리 목록이 다르고, 특히 Safari 환경에서는 동일한 이름의 음성이 복수로 잡히는 현상이 있습니다.
   * `voiceURI` 접미사 및 배열 인덱스를 파싱하여 레이블에 고유 식별자(`[System]`, `[Bundle]`, `[#1]`)를 부여함으로써 사용자 혼선을 해결했습니다.
5. **학습/테스트 중단 시 자동 저장 및 이어하기 (Session Resume):**
   * 학습(`study`) 및 테스트(`test`) 진행 중 앱을 종료하거나 네비게이션을 통해 중단하더라도, 현재 셔플링된 단어 큐와 진행 인덱스, 정오답 상태가 `localStorage`(`word_smart_study_session`, `word_smart_test_session`)에 실시간 저장됩니다.
   * 재진입 시 진행 중이던 세션을 감지하여 **"이어하기"** 또는 **"새로 시작"**을 선택할 수 있어 학습 연속성을 보장합니다.
6. **클라우드 단어장 공유 모델 및 중복 방지 스마트 병합 (Smart Merge):**
   * 로컬 CSV 오픈이나 클라우드 단어장 다운로드 시 동일한 이름의 단어장이 이미 로컬에 존재하면, 기존 단어들의 학습 이력(`isLearned`, `testCount`, `correctCount`)을 보존한 채 `Set` 자료구조로 중복 단어를 걸러내고 새로운 단어만 `bulkAdd`로 안전하게 병합합니다.

---

## 6. 향후 개선 과제 (Future Work)

1. **클라우드 자동 양방향 동기화 (Background Auto-Sync):**
   * 현재는 수동 버튼 클릭을 통한 클라우드 DB 업로드/다운로드 방식이 적용되어 있으며, 추후 웹소켓(Supabase Realtime) 또는 주기적 백그라운드 Sync를 통한 단어장 자동 동기화를 도입할 수 있습니다.
2. **간격 반복 학습 알고리즘 (Spaced Repetition Algorithm):**
   * 에빙하우스 망각 곡선이나 라이트너 시스템(Leitner Box)에 기반하여, 각 단어의 누적 정답률(`correctCount / testCount`)을 토대로 복습 주기를 계산해 취약한 단어를 우선 출제하는 큐레이션 알고리즘을 도입할 수 있습니다.
3. **오프라인 고품질 오디오 캐싱 (Pre-rendered TTS Audio):**
   * 브라우저 내장 Web Speech API는 기기 환경에 따라 음질 차이가 발생할 수 있으므로, 단어별 고음질 mp3 발음 파일을 사전 생성하여 캐싱하는 하이브리드 오디오 파이프라인을 구축할 수 있습니다.

---

## 7. 개발 프롬프트 레퍼런스 (Development Prompt Reference)

향후 유사한 "오프라인 최우선(Offline-First) PWA 다국어 학습 애플리케이션"을 제작할 때 아래 프롬프트를 청사진으로 활용할 수 있습니다:

> "Next.js App Router와 Serwist(Workbox), Dexie.js(IndexedDB), Supabase를 활용해 0.1초 만에 화면이 뜨는 완전 오프라인 우선(Offline-First) 다국어 학습 PWA를 구축해 줘.
> 1. `sw.ts`에서 Serwist 기본 `defaultCache`는 내부에 모든 요청을 `NetworkOnly`로 강제하는 규칙이 있으므로 절대 사용하지 말고, 정적 에셋 `CacheFirst`, HTML 문서와 Next.js RSC 데이터는 `StaleWhileRevalidate`, 구글 폰트는 `CacheFirst`로 처리하는 커스텀 캐시 규칙을 직접 작성해 줘.
> 2. `layout.tsx`에 `appleWebApp` 메타데이터를 구성하고, iOS Safari의 PWA 렌더링 블로킹을 방지하기 위해 `SessionProvider`에 `refetchInterval={0}`, `refetchOnWindowFocus={false}`를 부여하며 `sw.ts`에서는 `navigationPreload: false`로 설정해 줘.
> 3. `@serwist/next`는 Webpack 기반이므로 Next.js 16+ 환경에서 빌드 시 `package.json`의 build 스크립트에 `next build --webpack`을 적용해 줘.
> 4. 로컬 IndexedDB(Dexie.js)를 Local Source of Truth로 삼아 앱 기동 시 즉시 로컬 데이터로 화면을 렌더링하고, 온라인 상태일 때만 백그라운드 훅(`useDataSync`)을 통해 서버 DB와 지연 동기화(Batch Sync & Soft Delete)를 수행해 줘.
> 5. DB 스키마는 정규화 원칙에 따라 자식 테이블(단어)에서 이메일 중복을 배제하고 부모 테이블(단어장)의 외래키(`list_id`)와 연계된 Supabase RLS 정책을 수립해 줘.
> 6. Google OAuth 연동 시 토큰 만료 60초 전 사전 갱신, 세션 쿠키 maxAge 180일 연장, 401 발생 시 `fetchWithSessionRetry`를 통한 1회 투명 자동 재시도 헬퍼를 구축해 줘.
> 7. Web Speech API 다국어 TTS(영어, 일본어, 한국어) 및 사운드 볼륨 제어를 전역 프로바이더로 관리하고, Safari의 중복 음성 이름을 구별할 수 있도록 voiceURI 태그 파싱 로직을 추가해 줘.
> 8. 모든 API 라우트는 Zod 스키마 검증과 서버 사이드 세션 기반 소유권 검증을 강제하고, 민감 키값은 서버 사이드 환경 변수로 완벽히 격리(Zero-Leak)해 줘."
