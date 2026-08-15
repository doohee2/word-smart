import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const deleteActionSchema = z.object({
  action: z.literal("delete"),
  keys: z.array(z.union([z.string(), z.number()])),
});

const fetchActionSchema = z.object({
  action: z.literal("fetch"),
  ids: z.array(z.union([z.string(), z.number()])),
});

const syncOfflineSchema = z.object({
  action: z.literal("sync_offline"),
  records: z.array(z.object({
    type: z.string(),
    totalCount: z.number(),
    completedCount: z.number(),
    incompleteWords: z.string().optional().default(""),
    completeWords: z.string().optional().default(""),
    createdAt: z.string().optional(),
    lang: z.string().optional(),
  })),
});

const insertSchema = z.object({
  action: z.undefined().optional(),
  type: z.string().min(1),
  totalCount: z.number(),
  completedCount: z.number(),
  incompleteWords: z.string().optional().default(""),
  completeWords: z.string().optional().default(""),
  createdAt: z.string().optional(),
  lang: z.string().optional(),
});

const postHistorySchema = z.union([
  deleteActionSchema,
  fetchActionSchema,
  syncOfflineSchema,
  insertSchema,
]);

const getHistorySchema = z.object({
  limit: z.string().optional(),
  month: z.string().optional(),
  keysOnly: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userEmail = session.user.email;
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = postHistorySchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
    }

    const body = parseResult.data;

    if (body.action === 'delete') {
      if (body.keys.length === 0) return NextResponse.json({ success: true });
      
      const { error } = await supabase
        .from('study_history')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('user_email', userEmail)
        .in('id', body.keys);

      if (error) {
        console.error("Delete History Error:", error);
        return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === 'fetch') {
      if (body.ids.length === 0) return NextResponse.json({ history: [] });
      
      const { data, error } = await supabase
        .from('study_history')
        .select('*')
        .eq('user_email', userEmail)
        .in('id', body.ids);

      if (error) {
        console.error("Fetch Specific History Error:", error);
        return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
      }
      return NextResponse.json({ history: data });
    }

    if (body.action === 'sync_offline') {
      if (body.records.length === 0) return NextResponse.json({ success: true, history: [] });
      
      const insertData = body.records.map((record) => ({
        user_email: userEmail,
        type: record.type,
        total_count: record.totalCount,
        completed_count: record.completedCount,
        incomplete_words: record.incompleteWords || "",
        complete_words: record.completeWords || "",
        created_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
        lang: record.lang
      }));

      const { data, error } = await supabase
        .from('study_history')
        .insert(insertData)
        .select();

      if (error) {
        console.error("Sync Offline History Error:", error);
        return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
      }
      return NextResponse.json({ success: true, history: data });
    }

    // Normal insert
    const { type, totalCount, completedCount, incompleteWords, completeWords, createdAt, lang } = body;

    const { data, error } = await supabase
      .from('study_history')
      .insert({
        user_email: userEmail,
        type,
        total_count: totalCount,
        completed_count: completedCount,
        incomplete_words: incompleteWords || "",
        complete_words: completeWords || "",
        created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
        lang
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase History Insert Error:", error);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, history: data });
  } catch (error) {
    console.error("History POST Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    
    const queryParams = {
      limit: searchParams.get("limit") || undefined,
      month: searchParams.get("month") || undefined,
      keysOnly: searchParams.get("keysOnly") || undefined,
    };

    const parseResult = getHistorySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
    }

    const { limit: limitStr, month, keysOnly: keysOnlyStr } = parseResult.data;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    const keysOnly = keysOnlyStr === 'true';

    // Hard delete records older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase
      .from('study_history')
      .delete()
      .eq('is_deleted', true)
      .lt('deleted_at', thirtyDaysAgo.toISOString());

    let query = supabase
      .from('study_history')
      .select(keysOnly ? 'id, type, created_at, is_deleted' : '*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (month) {
      const startDate = new Date(`${month}-01T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      query = query.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
    } else {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch History Error:", error);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ history: data });
  } catch (error) {
    console.error("History GET Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
