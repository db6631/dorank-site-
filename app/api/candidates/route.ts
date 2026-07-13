import { NextResponse } from "next/server";
import { MOCK_CANDIDATES } from "@/lib/store";
import { hueForId, formatViews } from "@/lib/format";

export async function GET() {
  const apiUrl = process.env.DORANK_API_URL;

  // VPS 주소가 설정 안 되어있으면 예전처럼 가짜 데이터로 동작 (테스트용)
  if (!apiUrl) {
    return NextResponse.json(MOCK_CANDIDATES);
  }

  try {
    const res = await fetch(`${apiUrl}/candidates`, {
      headers: process.env.DORANK_API_KEY
        ? { "x-api-key": process.env.DORANK_API_KEY }
        : {},
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`VPS 응답 실패: ${res.status}`);
    }

    const rows: any[] = await res.json();

    // VPS(DB) 형태 → 대시보드 화면이 기대하는 형태로 변환
    const candidates = rows.map((r) => {
      // 틱톡이 lazy-load 전에 주는 1x1 투명 placeholder gif는 진짜 썸네일이 아님 → 걸러냄
      const rawThumb: string = r.thumbnail_url || "";
      const thumbnailUrl = rawThumb.startsWith("data:image/gif") ? undefined : rawThumb;

      return {
        id: r.id,
        topic: (r.caption?.trim() || r.keyword || "(제목 없음)").slice(0, 120),
        source: r.source,
        views: formatViews(r.views),
        viewCount: r.views || 0,
        hasViews: !!r.views && r.views > 0,
        thumbHue: hueForId(r.id),
        thumbnailUrl,
        url: r.url || "",
        keyword: r.keyword || "",
      };
    });

    return NextResponse.json(candidates);
  } catch (err) {
    console.error("VPS 연결 실패, 가짜 데이터로 대체:", err);
    return NextResponse.json(MOCK_CANDIDATES);
  }
}
