import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiUrl = process.env.DORANK_API_URL;
  const body = await req.json();

  if (!apiUrl) {
    return NextResponse.json({ error: "서버 연결 안 됨 (DORANK_API_URL 없음)" }, { status: 500 });
  }

  const res = await fetch(`${apiUrl}/preview-clips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ error: data.error || "미리보기 준비 실패" }, { status: 500 });
  }
  return NextResponse.json(await res.json());
}
