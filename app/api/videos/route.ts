import { NextResponse } from "next/server";

// 발행현황: VPS의 renders 폴더에 실제로 있는 완성 영상 목록을 가져옴
export async function GET() {
  const apiUrl = process.env.DORANK_API_URL;
  if (!apiUrl) return NextResponse.json([]);

  try {
    const res = await fetch(`${apiUrl}/videos`, {
      headers: process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {},
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json([]);
    const files: { file: string }[] = await res.json();
    // 화면이 기대하는 형태로 변환
    return NextResponse.json(
      files.map((f, i) => ({
        id: i,
        title: f.file.replace(/^\d+_/, "").replace(/\.mp4$/, "").replace(/_/g, " "),
        file: f.file,
        count: 0,
        status: "편집완료",
      })).reverse() // 최신이 위로
    );
  } catch {
    return NextResponse.json([]);
  }
}
