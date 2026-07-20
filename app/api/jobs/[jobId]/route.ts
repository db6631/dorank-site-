import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const apiUrl = process.env.DORANK_API_URL;

  if (!apiUrl || jobId.startsWith("mock_")) {
    // VPS 없이 테스트: 3초 지나면 완료된 걸로 시뮬레이션
    const isTopics = jobId.startsWith("mock_topics_");
    const startedAt = Number(jobId.replace("mock_topics_", "").replace("mock_", "")) || Date.now();
    const done = Date.now() - startedAt > 3000;
    if (isTopics) {
      return NextResponse.json(
        done
          ? { status: "done", topics: [
              { title: "역대급 파쿠르 실패 TOP6", keyword: "extremesports", verifiedCount: 12 },
              { title: "충격적인 몰카 반응 TOP5", keyword: "prank", verifiedCount: 9 },
              { title: "레전드 만족 영상 TOP6", keyword: "satisfying", verifiedCount: 15 },
            ] }
          : { status: "running", progress: "확인 중..." }
      );
    }
    return NextResponse.json(
      done
        ? { status: "done", file: "mock.mp4", title: "예시 영상" }
        : { status: "running", title: "예시 영상" }
    );
  }

  // ⚠️ 원본 응답의 상태코드(404 등)를 그대로 살려서 넘겨야, 프론트에서
  // "서버가 이 작업을 모른다"는 걸 구분해서 무한대기 없이 바로 실패 처리할 수 있음
  const res = await fetch(`${apiUrl}/jobs/${jobId}`, {
    headers: process.env.DORANK_API_KEY ? { "x-api-key": process.env.DORANK_API_KEY } : {},
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({ error: "응답을 읽을 수 없음" }));
  return NextResponse.json(data, { status: res.status });
}
