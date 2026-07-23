import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const body = await request.json();

    if (body.action === 'fetch' && Array.isArray(body.ids)) {
      if (body.ids.length === 0) return NextResponse.json({ history: [] });
      
      const { data, error } = await supabase
        .from('study_history')
        .select('*')
        .eq('user_email', userEmail)
        .in('id', body.ids);

      if (error) {
        console.error("Fetch Specific History Error:", error);
        return NextResponse.json({ error: "Failed to fetch specific history" }, { status: 500 });
      }
      return NextResponse.json({ history: data });
    }

    const { type, totalCount, completedCount, incompleteWords, completeWords } = body;

    if (!type || typeof totalCount !== 'number' || typeof completedCount !== 'number') {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('study_history')
      .insert({
        user_email: userEmail,
        type,
        total_count: totalCount,
        completed_count: completedCount,
        incomplete_words: incompleteWords || "",
        complete_words: completeWords || ""
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase History Insert Error:", error);
      return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
    }

    return NextResponse.json({ success: true, history: data });
  } catch (error) {
    console.error("History POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const month = searchParams.get("month");
    const keysOnly = searchParams.get("keysOnly") === 'true';

    let query = supabase
      .from('study_history')
      .select(keysOnly ? 'id, type, created_at' : '*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (month) {
      // month is YYYY-MM
      // Supabase between needs full timestamps. E.g., >= 2026-07-01T00:00:00Z and < 2026-08-01T00:00:00Z
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
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    return NextResponse.json({ history: data });
  } catch (error) {
    console.error("History GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
