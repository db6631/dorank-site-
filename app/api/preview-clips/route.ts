import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiUrl = process.env.DORANK_API_URL;
  const body = await req.json();

  if (!apiUrl) {
    return NextResponse.json({ error: "서버 연결 안 됨 (DORANK_API_URL 없음)" }, { status: 500 });
  }

  const res = await fetch(`${apiUrl}/preview-clips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ error: data.error || "미리보기 준비 실패" }, { status: 500 });
  }

  const props = await res.json();
  // 백엔드가 http://VPS주소로 돌려준 영상/효과음 URL을, 우리 사이트(https)를 거치는 프록시 경로로 바꿔치기
  // (https 페이지 안에서 http 리소스를 직접 재생하면 브라우저가 mixed content로 조용히 막아버림)
  props.clips = (props.clips || []).map((c: { videoUrl: string; sfxPath?: string; [k: string]: unknown }) => ({
    ...c,
    videoUrl: `/api/downloads/${c.videoUrl.split("/").pop()}`,
    sfxPath: c.sfxPath ? `/api/sfx/${c.sfxPath.split("/").pop()}` : undefined,
  }));

  return NextResponse.json(props);
}
