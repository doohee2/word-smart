import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const uploadSchema = z.object({
  title: z.string().min(1),
  lang: z.enum(['en', 'ja', 'zh']).optional(),
  words: z.array(
    z.object({
      word: z.string().min(1),
      partOfSpeech: z.string().optional().nullable(),
      meaningKo: z.string(),
      exampleEn: z.string().optional().nullable(),
      exampleKo: z.string().optional().nullable(),
      zipfScore: z.union([z.number(), z.string()]).optional().nullable(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = uploadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
    }

    const { title, lang = 'en', words } = parseResult.data;

    const { data: userLists } = await supabase
      .from('word_lists')
      .select('id, title')
      .eq('user_email', session.user.email);

    const existingList = userLists?.find(l => l.title === title);

    if (!existingList && userLists && userLists.length >= 50) {
      return NextResponse.json({ error: "단어장은 최대 50개까지만 업로드할 수 있습니다." }, { status: 403 });
    }

    const { count: totalWordsCount } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', session.user.email);
    
    let expectedTotal = (totalWordsCount || 0) + words.length;
    
    if (existingList) {
      const { count: existingListWordsCount } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', existingList.id);
      expectedTotal = (totalWordsCount || 0) - (existingListWordsCount || 0) + words.length;
    }

    if (expectedTotal > 15000) {
      return NextResponse.json({ error: "계정당 단어는 총 15,000개까지만 저장할 수 있습니다. 불필요한 단어장을 삭제 후 시도해주세요." }, { status: 403 });
    }

    // 1. Get or Create Word List (unique by title)
    let listId;
    let { data: insertedList, error: insertError } = await supabase
      .from('word_lists')
      .insert({ user_email: session.user.email, title, lang })
      .select()
      .single();

    // Fallback if lang column does not exist yet in Supabase schema (error 42703)
    if (insertError && insertError.code === '42703') {
      const fallback = await supabase
        .from('word_lists')
        .insert({ user_email: session.user.email, title })
        .select()
        .single();
      insertedList = fallback.data;
      insertError = fallback.error;
    }

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        let { data: existing, error: selectError } = await supabase
          .from('word_lists')
          .update({ lang })
          .eq('title', title)
          .eq('user_email', session.user.email)
          .select('id')
          .single();
          
        if (selectError && selectError.code === '42703') {
          const fb = await supabase
            .from('word_lists')
            .select('id')
            .eq('title', title)
            .eq('user_email', session.user.email)
            .single();
          existing = fb.data;
          selectError = fb.error;
        }
          
        if (selectError || !existing) {
          console.error("Select Error:", selectError);
          return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
        }
        listId = existing.id;
      } else {
        console.error("Insert List Error:", insertError);
        return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
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
      zipf_score: w.zipfScore !== undefined ? w.zipfScore : null,
    }));

    const { error: wordsError } = await supabase
      .from('words')
      .upsert(wordsToInsert, { onConflict: 'list_id,word', ignoreDuplicates: true });

    if (wordsError) {
      console.error("Insert Words Error:", wordsError);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, listId });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
