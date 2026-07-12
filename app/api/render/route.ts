import { NextResponse } from "next/server";
import { publishedStore } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  const { title, clipIds } = body as { title: string; clipIds: string[] };

  // 🔌 VPS 백엔드 연결 지점:
  // 실제로는 여기서 VPS의 편집 서버(FFmpeg)에 렌더링 요청을 보내고,
  // 완료되면 결과 URL을 받아서 저장해야 함.
  // const res = await fetch(`${process.env.DORANK_API_URL}/render`, {
  //   method: "POST",
  //   body: JSON.stringify({ title, clipIds }),
  // });

  const video = {
    id: Date.now(),
    title,
    count: clipIds?.length ?? 0,
    status: "편집완료" as const,
  };
  publishedStore.unshift(video);

  return NextResponse.json({ ok: true, video });
}
