import { NextResponse } from "next/server";

const MOCK_THEMES = [
  { id: "gold", name: "골드 (기본)" },
  { id: "neon", name: "네온" },
  { id: "dark", name: "다크 블루" },
  { id: "pastel", name: "파스텔" },
];

export async function GET() {
  const apiUrl = process.env.DORANK_API_URL;
  if (!apiUrl) return NextResponse.json(MOCK_THEMES);

  try {
    const res = await fetch(`${apiUrl}/themes`, {
      headers: process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`VPS 응답 실패: ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("테마 조회 실패, 예시로 대체:", err);
    return NextResponse.json(MOCK_THEMES);
  }
}
