import { NextResponse } from "next/server";

const MOCK_TOPICS = [
  { title: "역대급 파쿠르 실패 순간 TOP6", keyword: "parkourfail" },
  { title: "충격적인 몰카 반응 모음 TOP5", keyword: "prank" },
  { title: "보는 내내 시원한 만족 영상 TOP6", keyword: "oddlysatisfying" },
];

export async function GET() {
  const apiUrl = process.env.DORANK_API_URL;
  if (!apiUrl) return NextResponse.json(MOCK_TOPICS);

  try {
    const res = await fetch(`${apiUrl}/topics`, {
      headers: process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`VPS 응답 실패: ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("주제 추천 실패, 예시 데이터로 대체:", err);
    return NextResponse.json(MOCK_TOPICS);
  }
}
