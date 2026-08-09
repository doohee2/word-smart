import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const downloadQuerySchema = z.object({
  listId: z.string().min(1, "단어장 ID가 필요합니다."),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = downloadQuerySchema.safeParse({ listId: searchParams.get("listId") });

    if (!parseResult.success) {
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
    }

    const { listId } = parseResult.data;

    // Fetch the list details (no ownership verification required for downloading)
    const { data: listData, error: listError } = await supabase
      .from('word_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !listData) {
      console.error("Fetch List Error:", listError);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 404 });
    }

    // Fetch all words for this list with pagination to bypass Supabase max-rows limit
    let allWords: Record<string, unknown>[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('list_id', listId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("Fetch Words Error:", error);
        return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
      }

      if (data && data.length > 0) {
        allWords = allWords.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    return NextResponse.json({ list: listData, words: allWords });
  } catch (error) {
    console.error("Download Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
