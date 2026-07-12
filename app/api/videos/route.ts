import { NextResponse } from "next/server";
import { publishedStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(publishedStore);
}

export async function PATCH(req: Request) {
  const { id } = await req.json();
  const video = publishedStore.find((v) => v.id === id);
  if (video) video.status = "업로드됨";

  // 🔌 VPS 백엔드 연결 지점:
  // 실제 유튜브 업로드는 여기서 유튜브 Data API 호출로 대체
  // await fetch(`${process.env.DORANK_API_URL}/upload/${id}`, { method: "POST" });

  return NextResponse.json({ ok: true, video });
}
