import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 1. Fetch only word lists belonging to the authenticated user
    let { data: lists, error: listsError } = await supabase
      .from('word_lists')
      .select('id, title, lang, user_email, created_at')
      .eq('user_email', session.user.email)
      .order('title', { ascending: true });

    // Fallback if lang column does not exist in Supabase DB yet (Postgres error 42703)
    if (listsError && listsError.code === '42703') {
      const fallback = await supabase
        .from('word_lists')
        .select('id, title, user_email, created_at')
        .eq('user_email', session.user.email)
        .order('title', { ascending: true });
      lists = fallback.data as any;
      listsError = fallback.error;
    }

    if (listsError) {
      console.error("Lists Error:", listsError);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }

    if (!lists) {
      return NextResponse.json({ lists: [] });
    }

    // 2. Fetch words length securely
    const listsWithCounts = await Promise.all(lists.map(async (list) => {
      const { count } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id);
        
      return { ...list, count: count || 0 };
    }));

    return NextResponse.json({ lists: listsWithCounts });
  } catch (error) {
    console.error("Fetch Lists Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
