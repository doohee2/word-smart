import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { z } from "zod";

const driveDownloadSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
});

export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;

    if (!session || !accessToken) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parseResult = driveDownloadSchema.safeParse({ fileId: searchParams.get("fileId") });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "요청을 처리할 수 없습니다." },
        { status: 400 }
      );
    }

    const { fileId } = parseResult.data;

    const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(driveApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive API Error:", errorText);
      return NextResponse.json(
        { error: "요청을 처리할 수 없습니다." },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="document.csv"`,
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}
