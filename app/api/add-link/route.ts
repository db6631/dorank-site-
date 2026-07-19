import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiUrl = process.env.DORANK_API_URL;
  const body = await req.json();

  if (!apiUrl) {
    return NextResponse.json({ id: `mock_${Date.now()}`, source: "manual", url: body.url });
  }

  const res = await fetch(`${apiUrl}/add-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "링크 추가 실패" }, { status: 500 });
  }
  return NextResponse.json(await res.json());
}
