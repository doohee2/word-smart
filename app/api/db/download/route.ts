import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");

    if (!listId) {
      return NextResponse.json({ error: "Missing listId" }, { status: 400 });
    }

    // Fetch the list details
    const { data: listData, error: listError } = await supabase
      .from('word_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError) {
      console.error("Fetch List Error:", listError);
      return NextResponse.json({ error: "Failed to fetch word list" }, { status: 500 });
    }

    // Fetch all words for this list with pagination to bypass Supabase max-rows limit
    let allWords: any[] = [];
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
        return NextResponse.json({ error: "Failed to fetch words" }, { status: 500 });
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
