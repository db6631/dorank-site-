import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const apiUrl = process.env.DORANK_API_URL;

  if (!apiUrl || jobId.startsWith("mock_")) {
    // VPS 없이 테스트: 3초 지나면 완료된 걸로 시뮬레이션
    const startedAt = Number(jobId.replace("mock_", "")) || Date.now();
    const done = Date.now() - startedAt > 3000;
    return NextResponse.json(
      done
        ? { status: "done", file: "mock.mp4", title: "예시 영상" }
        : { status: "running", title: "예시 영상" }
    );
  }

  const res = await fetch(`${apiUrl}/jobs/${jobId}`, {
    headers: process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {},
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "작업 조회 실패" }, { status: 500 });
  return NextResponse.json(await res.json());
}
