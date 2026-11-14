import { getSession } from "next-auth/react";

let isFatalSessionError = false;

/**
 * 치명적인 세션 만료 플래그를 초기화합니다. (재로그인 또는 세션 복구 시 호출)
 */
export function resetFatalSessionError() {
  isFatalSessionError = false;
}

/**
 * 현재 치명적인 세션 만료 상태인지 조회합니다.
 */
export function getIsFatalSessionError() {
  return isFatalSessionError;
}

/**
 * 401 Unauthorized 에러 발생 시 온라인 상태일 때만 세션을 갱신(getSession)하고 1회 재시도하는 fetch 래퍼 함수입니다.
 * 세션 리프레시가 영구 실패(RefreshAccessTokenError)하면 플래그를 세팅해 뒤따르는 병렬 요청들의 중복 호출을 차단합니다.
 */
export async function fetchWithSessionRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response = await fetch(input, init);

  // 401 Unauthorized 에러 발생 시 토큰 갱신 시도
  if (response.status === 401) {
    // 이미 치명적 세션 만료가 감지되었거나, 오프라인 상태인 경우 불필요한 getSession 연쇄 호출 차단
    if (isFatalSessionError) {
      return response;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return response;
    }

    console.warn("[fetchWithSessionRetry] 401 Unauthorized. Refreshing session...");
    // getSession()을 호출하면 next-auth 클라이언트가 서버로 /api/auth/session 요청을 보내고, 
    // 서버의 jwt 콜백이 실행되면서 토큰이 만료되었다면 refreshAccessToken 로직을 타게 됩니다.
    const session = await getSession();
    
    if (session?.error === "RefreshAccessTokenError") {
      isFatalSessionError = true;
      console.error("[fetchWithSessionRetry] Token refresh failed fatally. isFatalSessionError set to true.");
      return response;
    }

    // 세션 갱신에 성공했거나 일시적 오류인 경우, 새로운 토큰이 쿠키에 반영되었으므로 다시 한 번 요청 시도
    response = await fetch(input, init);
  }

  return response;
}
