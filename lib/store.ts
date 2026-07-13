// ⚠️ 지금은 서버 메모리에만 저장하는 "가짜 DB" 입니다.
// 나중에 VPS에 진짜 백엔드(scraper의 candidates.db)가 준비되면
// 이 파일 대신 그 서버에 fetch 요청하도록 바꾸면 됩니다.
// (바꿀 위치는 app/api/*/route.ts 안에 표시해둠)

export type Candidate = {
  id: string;
  topic: string;
  source: "tiktok" | "reels";
  views: string;
  viewCount: number;
  hasViews: boolean;
  thumbHue: string;
  thumbnailUrl?: string;
  url?: string;
  keyword?: string;
};

export type PublishedVideo = {
  id: number;
  title: string;
  count: number;
  status: "편집완료" | "업로드됨";
};

export const MOCK_CANDIDATES: Candidate[] = [
  { id: "c1", topic: "실제로 무서운 함정 파쿠르", source: "tiktok", views: "20.2M", viewCount: 20200000, hasViews: true, thumbHue: "from-emerald-700 to-emerald-950", keyword: "parkour" },
  { id: "c2", topic: "물에 빠진 최악의 착지", source: "tiktok", views: "17.3M", viewCount: 17300000, hasViews: true, thumbHue: "from-cyan-700 to-cyan-950", keyword: "parkour" },
  { id: "c3", topic: "비현실적인 파쿠르 점프", source: "reels", views: "10.3M", viewCount: 10300000, hasViews: true, thumbHue: "from-sky-700 to-sky-950", keyword: "extremesports" },
  { id: "c4", topic: "컵 피라미드 실패 모음", source: "tiktok", views: "2.1M", viewCount: 2100000, hasViews: true, thumbHue: "from-rose-700 to-rose-950", keyword: "fail" },
  { id: "c5", topic: "도심 파쿠르 최고 순간", source: "reels", views: "2.0M", viewCount: 2000000, hasViews: true, thumbHue: "from-amber-700 to-amber-950", keyword: "parkour" },
  { id: "c6", topic: "장난치다 진심 빡친 반응", source: "reels", views: "890K", viewCount: 890000, hasViews: true, thumbHue: "from-fuchsia-700 to-fuchsia-950", keyword: "prank" },
];

// 서버 프로세스가 살아있는 동안만 유지되는 임시 배열
export const publishedStore: PublishedVideo[] = [];
