import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { z } from "zod";

const driveListSchema = z.object({
  folderId: z.string().optional().default("root"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;

    if (!session || !accessToken) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = driveListSchema.safeParse({ folderId: searchParams.get("folderId") || undefined });

    if (!parseResult.success) {
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
    }

    const { folderId } = parseResult.data;

    const query = `'${folderId}' in parents and (mimeType='application/vnd.google-apps.folder' or mimeType='text/csv') and trashed=false`;
    const fields = "files(id, name, modifiedTime, size, mimeType)";
    
    const driveApiUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name`;

    const response = await fetch(driveApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Drive API list failed with status:", response.status);
      return NextResponse.json(
        { error: "요청을 처리할 수 없습니다." },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error listing drive files:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
