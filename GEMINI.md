# Word Smart (워드 스마트) - 개발 문서

## 1. 프로젝트 개요
**Word Smart**는 CSV 형태의 단어장 데이터를 불러와 오프라인 환경에서도 동작하는 PWA(Progressive Web App) 기반의 영단어 학습 애플리케이션입니다.
사용자는 구글 드라이브나 로컬 디바이스에서 단어장 파일을 가져올 수 있으며, 학습(플래시카드), 테스트(객관식/주관식), 관리(단어장 통계), PDF 인쇄(학습지/시험지) 기능을 통해 체계적인 단어 학습을 진행할 수 있습니다.

## 2. 기술 프레임워크
* **Core:** Next.js 14+ (App Router), React, TypeScript
* **Styling:** Tailwind CSS v4, Lucide Icons, clsx, tailwind-merge
* **Database / Storage:** Dexie.js (IndexedDB wrapper for local offline storage)
* **Authentication & API:** NextAuth.js (Google OAuth), Google Drive API
* **PWA:** `@serwist/next`, `@serwist/precaching` (오프라인 캐싱 및 Service Worker)
* **Animations:** Framer Motion (플래시카드 스와이프 효과)
* **Utilities:** PapaParse (CSV 파싱), jsPDF & jspdf-autotable (PDF 생성)

## 3. 폴더 구조 및 소스 파일 설명

```text
word-smart/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth 로그인 및 세션 관리 라우트
│   │   └── drive/                       # 구글 드라이브 API 연동 라우트
│   │       ├── download/route.ts        # 구글 드라이브 파일 다운로드
│   │       └── list/route.ts            # 폴더 내 CSV 파일 목록 조회
│   ├── pdf/page.tsx                     # (Phase 5) PDF 인쇄 및 미리보기 화면
│   ├── settings/page.tsx                # (Phase 2) 단어장 목록 조회 및 관리 화면
│   ├── study/page.tsx                   # (Phase 3) 플래시카드 기반 단어 학습 화면
│   ├── test/page.tsx                    # (Phase 4) 8지 선다 및 스펠링 퀴즈 화면
│   ├── globals.css                      # Tailwind v4 디자인 토큰 및 글로벌 스타일
│   ├── layout.tsx                       # 공통 레이아웃 (Navigation, Header 포함)
│   ├── page.tsx                         # 메인 대시보드 (학습/테스트 진입점)
│   └── sw.ts                            # PWA Service Worker 등록 스크립트
├── components/
│   ├── DrivePickerModal.tsx             # 구글 드라이브 파일 선택 UI 모달
│   ├── FileOpenButton.tsx               # 로컬/드라이브 파일 열기 분기 및 CSV 파싱 로직
│   ├── Header.tsx                       # 상단 글로벌 앱 바 (로고, 설정, 파일열기 아이콘 등)
│   ├── Navigation.tsx                   # 반응형 네비게이션 (PC: 좌측 사이드바, 모바일: 하단 탭)
│   └── Providers.tsx                    # NextAuth Session Provider 래퍼
├── lib/
│   └── db.ts                            # Dexie.js 데이터베이스 스키마 정의 (`wordLists`, `words` 테이블)
├── public/
│   ├── icons/                           # PWA 아이콘 모음 (192x192, 512x512)
│   └── manifest.json                    # PWA 매니페스트 파일
├── tailwind.config.ts                   # Tailwind CSS 환경 설정 파일
└── next.config.ts                       # Next.js 및 Serwist(PWA) 빌드 설정
```

## 4. 주요 기능별 구현 소스 설명

### Phase 1: 레이아웃 및 파일 데이터 로드
* **반응형 네비게이션 (`components/Navigation.tsx`, `components/Header.tsx`):**
  Tailwind CSS의 `md:` 브레이크포인트를 활용하여 모바일에서는 하단 바텀 탭으로, PC에서는 고정 사이드바로 레이아웃이 자연스럽게 변경됩니다.
* **단어장 파싱 및 구글 드라이브 연동 (`components/FileOpenButton.tsx`):**
  사용자의 로그인 상태(`useSession`)에 따라 분기합니다. 비로그인 시 로컬 `<input type="file">`을 호출하고, 로그인 시 `DrivePickerModal`을 띄워 드라이브에서 CSV를 읽어옵니다. 데이터는 `PapaParse`로 JSON화 하여 DB에 넘깁니다.

### Phase 2: 로컬 DB 스키마 설계 및 관리
* **Dexie.js 오프라인 스토리지 (`lib/db.ts`):**
  브라우저 내장 IndexedDB를 쉽게 사용하기 위해 Dexie를 세팅했습니다. 단어장 목록(`wordLists`)과 개별 단어(`words`)를 Relation 형태로 관리합니다.
* **설정 화면 (`app/settings/page.tsx`):**
  `useLiveQuery` 훅을 통해 DB 데이터의 변화(단어장 추가/삭제)를 즉시 UI에 반영합니다. 총 단어수, 테스트 횟수, 완료비율을 실시간으로 계산해 줍니다.

### Phase 3: 학습 모드 (Study Mode)
* **플래시 카드 애니메이션 (`app/study/page.tsx`):**
  `framer-motion`의 `<AnimatePresence>`를 사용하여 카드가 넘겨질 때 X축 위치, 회전(rotate), 스케일(scale)이 변화하는 스와이프 효과를 부여했습니다.
* **학습 상태 업데이트:**
  [학습 중] 또는 [학습 완료] 버튼 클릭 시 `db.words.update` 함수를 호출해 `isLearned` 불리언 값을 변경합니다.

### Phase 4: 테스트 모드 (Test Mode)
* **퀴즈 게임 로직 (`app/test/page.tsx`):**
  * **객관식 (MCQ):** 전체 단어 목록에서 정답을 제외한 7개의 오답 뜻을 랜덤 추출하여 보기 8개를 셔플링해 제공합니다.
  * **주관식 (Spelling):** 오답을 제출할 경우 단어의 길이(length)를 파악해 무작위 위치의 글자를 하나씩 점진적으로 공개하는 힌트 알고리즘을 적용했습니다.

### Phase 5: PDF 인쇄 (Export Mode)
* **jsPDF + AutoTable 연동 (`app/pdf/page.tsx`):**
  클라이언트 측에서 동적으로 PDF를 렌더링합니다. 한글 인코딩 깨짐을 막기 위해 런타임에 Google Fonts CDN에서 나눔고딕 TTF 폰트를 다운로드해 `doc.addFileToVFS`로 주입합니다. 학습지용 꽉 찬 화면과, 시험용 빈칸(`___`) 블라인드 처리 분기 로직을 함께 구현했습니다.

## 5. 개선 필요사항 및 퓨처 워크 (Future Work)

1. **상태 동기화 (Cloud Sync):**
   현재 모든 데이터는 기기 로컬 IndexedDB에만 저장됩니다. 사용자가 다른 기기(PC <-> 모바일)에서 접속할 경우 데이터가 연동되지 않으므로, 추후 구글 드라이브 앱 데이터 폴더나 별도 Backend를 통한 클라우드 동기화 기능이 필요합니다.
2. **다크 모드 세밀화:**
   Tailwind v4 설정에 다크모드 변수들이 할당되어 있으나, 일부 UI 컴포넌트 간 대비(Contrast)가 명확하지 않은 부분이 있을 수 있습니다. 시스템 테마 토글 스위치 제공 및 컬러 팔레트 추가 검증이 요구됩니다.
3. **학습 알고리즘 고도화 (Spaced Repetition):**
   단순 리스트 나열과 셔플 방식 대신, 에빙하우스 망각 곡선이나 라이트너 시스템(Leitner System)에 기반한 복습 주기 알고리즘을 도입하면 학습 효율이 크게 개선될 것입니다.
4. **오디오 (TTS) 오프라인 성능:**
   현재 브라우저 내장 Web Speech API를 활용하므로 OS별 발음 품질 편차가 존재합니다. 고품질 발음 파일을 미리 생성해 캐싱하거나 Google Cloud TTS의 연동을 고려해 볼 수 있습니다.
