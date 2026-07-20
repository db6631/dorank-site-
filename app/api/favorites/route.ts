import { NextResponse } from "next/server";

const headers = () => ({
  "Content-Type": "application/json",
  ...(process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {}),
});

export async function GET() {
  const apiUrl = process.env.DORANK_API_URL;
  if (!apiUrl) return NextResponse.json([]);

  const res = await fetch(`${apiUrl}/favorites`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return NextResponse.json([]);
  return NextResponse.json(await res.json());
}

export async function POST(req: Request) {
  const apiUrl = process.env.DORANK_API_URL;
  const body = await req.json();
  if (!apiUrl) return NextResponse.json({ ok: true });

  const res = await fetch(`${apiUrl}/favorites`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ error: "즐겨찾기 추가 실패" }, { status: 500 });
  return NextResponse.json(await res.json());
}
