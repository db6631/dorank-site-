import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiUrl = process.env.DORANK_API_URL;
  const body = await req.json().catch(() => ({}));

  if (!apiUrl) {
    return NextResponse.json({ jobId: `mock_topics_${Date.now()}` });
  }

  const res = await fetch(`${apiUrl}/topics/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "주제 생성 요청 실패" }, { status: 500 });
  }
  return NextResponse.json(await res.json());
}
