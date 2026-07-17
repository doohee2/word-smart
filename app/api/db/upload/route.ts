import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, words } = body;

    if (!title || !words || !Array.isArray(words)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 1. Get or Create Word List (unique by title)
    // We try to insert, and if it fails due to unique constraint, we select it.
    let listId;
    const { data: insertedList, error: insertError } = await supabase
      .from('word_lists')
      .insert({ user_email: session.user.email, title })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        const { data: existingList, error: selectError } = await supabase
          .from('word_lists')
          .select('id')
          .eq('title', title)
          .single();
          
        if (selectError) {
          console.error("Select Error:", selectError);
          return NextResponse.json({ error: "Failed to fetch existing word list" }, { status: 500 });
        }
        listId = existingList.id;
      } else {
        console.error("Insert List Error:", insertError);
        return NextResponse.json({ error: "Failed to create word list" }, { status: 500 });
      }
    } else {
      listId = insertedList.id;
    }

    // 2. Insert Words with upsert (ignoring duplicates based on list_id + word)
    const wordsToInsert = words.map(w => ({
      list_id: listId,
      user_email: session.user.email,
      word: w.word,
      part_of_speech: w.partOfSpeech || null,
      meaning_ko: w.meaningKo,
      example_en: w.exampleEn || null,
      example_ko: w.exampleKo || null,
    }));

    const { error: wordsError } = await supabase
      .from('words')
      .upsert(wordsToInsert, { onConflict: 'list_id,word', ignoreDuplicates: true });

    if (wordsError) {
      console.error("Insert Words Error:", wordsError);
      return NextResponse.json({ error: "Failed to upload words" }, { status: 500 });
    }

    return NextResponse.json({ success: true, listId });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
