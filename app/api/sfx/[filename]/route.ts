import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const apiUrl = process.env.DORANK_API_URL;
  if (!apiUrl) return NextResponse.json({ error: "VPS 연결 안 됨" }, { status: 500 });

  const upstream = await fetch(`${apiUrl}/sfx/${encodeURIComponent(filename)}`, {
    headers: process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {},
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "파일을 못 찾음" }, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
