import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiUrl = process.env.DORANK_API_URL;
  const body = await req.json();

  if (!apiUrl) {
    // VPS 없이 테스트할 때: 가짜 jobId 반환 (프론트에서 진행상황 시뮬레이션용)
    return NextResponse.json({ jobId: `mock_${Date.now()}` });
  }

  const res = await fetch(`${apiUrl}/produce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "제작 요청 실패" }, { status: 500 });
  }
  return NextResponse.json(await res.json());
}
