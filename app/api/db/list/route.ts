import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(_request: NextRequest) {
  try {

    // 1. Fetch all word lists
    const { data: lists, error: listsError } = await supabase
      .from('word_lists')
      .select('id, title, user_email, created_at')
      .order('title', { ascending: true });

    if (listsError) {
      console.error("Lists Error:", listsError);
      return NextResponse.json({ error: "Failed to fetch word lists" }, { status: 500 });
    }

    // 2. We will just return the lists, and we can fetch words length if needed, 
    // or just return lists and let client fetch words. Let's do a quick loop for counts if list is small.
    
    // Better way without RPC:
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
