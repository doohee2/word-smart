import { getSession } from "next-auth/react";

/**
 * 401 Unauthorized 에러 발생 시 세션을 갱신(getSession)하고 1회 재시도하는 fetch 래퍼 함수입니다.
 */
export async function fetchWithSessionRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response = await fetch(input, init);

  // 401 Unauthorized 에러 발생 시 토큰 갱신 시도
  if (response.status === 401) {
    console.warn("[fetchWithSessionRetry] 401 Unauthorized. Refreshing session...");
    // getSession()을 호출하면 next-auth 클라이언트가 서버로 /api/auth/session 요청을 보내고, 
    // 서버의 jwt 콜백이 실행되면서 토큰이 만료되었다면 refreshAccessToken 로직을 타게 됩니다.
    const session = await getSession();
    
    if (session?.error === "RefreshAccessTokenError") {
      // 치명적 오류로 인해 갱신이 실패한 경우 (route.ts에서 error 플래그 설정됨)
      // 이 경우 보통 signOut을 호출하거나 에러를 그대로 반환하여 상위에서 처리하게 합니다.
      // 강제 로그아웃 처리는 _app이나 Header 등의 상위 컴포넌트에서 useSession 훅의 error 상태를 감지하여 수행하는 것이 일반적입니다.
      // 혹은 브라우저 환경이므로 여기서 직접 이벤트를 발생시키거나 signOut()을 호출할 수도 있습니다.
      // 여기서는 그냥 원래의 401 응답을 리턴하여 호출부에서 실패를 감지하게 둡니다.
      console.error("[fetchWithSessionRetry] Token refresh failed fatally.");
      return response;
    }

    // 세션 갱신에 성공했거나 일시적 오류인 경우, 새로운 토큰이 쿠키에 반영되었으므로 다시 한 번 요청 시도
    response = await fetch(input, init);
  }

  return response;
}
