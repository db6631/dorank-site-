import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiUrl = process.env.DORANK_API_URL;
  const body = await req.json();

  if (!apiUrl) {
    const items = (body.clipIds || []).map((id: string) => ({
      id, label: "예시라벨", caption: "예시 반응 자막이에요", sfx: "impact",
    }));
    return NextResponse.json(items);
  }

  const res = await fetch(`${apiUrl}/preview-labels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "자막 미리보기 생성 실패" }, { status: 500 });
  }
  return NextResponse.json(await res.json());
}
