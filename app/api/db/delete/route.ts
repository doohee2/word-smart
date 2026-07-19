import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { listId } = await request.json();

    if (!listId) {
      return NextResponse.json({ error: "단어장 ID가 누락되었습니다." }, { status: 400 });
    }

    // 1. Fetch the word list to check ownership
    const { data: wordList, error: fetchError } = await supabase
      .from("word_lists")
      .select("user_email")
      .eq("id", listId)
      .single();

    if (fetchError || !wordList) {
      return NextResponse.json({ error: "단어장을 찾을 수 없습니다." }, { status: 404 });
    }

    if (wordList.user_email !== session.user.email) {
      return NextResponse.json({ error: "이 단어장을 삭제할 권한이 없습니다." }, { status: 403 });
    }

    // 2. Delete the words associated with the list (to be safe, though foreign key CASCADE might handle it)
    const { error: wordsDeleteError } = await supabase
      .from("words")
      .delete()
      .eq("list_id", listId);

    if (wordsDeleteError) {
      console.error("Words Delete Error:", wordsDeleteError);
      return NextResponse.json({ error: "단어 삭제 중 오류가 발생했습니다." }, { status: 500 });
    }

    // 3. Delete the word list itself
    const { error: listDeleteError } = await supabase
      .from("word_lists")
      .delete()
      .eq("id", listId);

    if (listDeleteError) {
      console.error("List Delete Error:", listDeleteError);
      return NextResponse.json({ error: "단어장 삭제 중 오류가 발생했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "단어장이 성공적으로 삭제되었습니다." });

  } catch (error) {
    console.error("Delete Word List Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
