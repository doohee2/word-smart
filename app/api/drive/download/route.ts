import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    
    const accessToken = session?.accessToken;

    if (!session || !accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in with Google." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required." },
        { status: 400 }
      );
    }

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
        { error: "Failed to download file from Google Drive." },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="document.pdf"`,
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
