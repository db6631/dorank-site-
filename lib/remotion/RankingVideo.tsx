import React from "react";
import {
  AbsoluteFill, Sequence, OffthreadVideo, Audio, useVideoConfig,
} from "remotion";

export const FPS = 30;

export interface ClipInput {
  id: string;
  videoUrl: string;  // 실제 mp4 재생 URL (다운로드된 원본 파일 경로/URL)
  startSec: number;
  durationSec: number;
  label: string;
  caption: string;
  sfxPath?: string;  // 효과음 파일 경로 (public/sfx/xxx.mp3 형태, 없으면 생략)
}

export interface Theme {
  bar: string;    // css color, 예: "rgba(0,0,0,0.78)"
  ranks: string[]; // 순위별 색깔 (1,2,3위... 마지막 값은 4위 이후 전부 재사용)
}

export interface RankingProps {
  title: string;
  clips: ClipInput[];
  theme: Theme;
  captionEnabled: boolean;
}

const LIST_TOP_PADDING = 170;
const LIST_ROW_HEIGHT = 92;

function rankColor(theme: Theme, rank: number) {
  return theme.ranks[Math.min(rank - 1, theme.ranks.length - 1)];
}

export const RankingVideo: React.FC<RankingProps> = ({ title, clips, theme, captionEnabled }) => {
  const { fps } = useVideoConfig();

  // 각 클립이 몇 프레임부터 시작하는지 누적 계산 (클립마다 길이가 달라도 정확하게)
  let acc = 0;
  const starts = clips.map((c) => {
    const s = acc;
    acc += Math.round(c.durationSec * fps);
    return s;
  });

  const barHeight = LIST_TOP_PADDING + clips.length * LIST_ROW_HEIGHT + 20;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* 클립들을 순서대로 이어붙여서 재생 (트림도 여기서 바로 처리) */}
      {clips.map((c, i) => (
        <Sequence key={c.id} from={starts[i]} durationInFrames={Math.round(c.durationSec * fps)}>
          <OffthreadVideo
            src={c.videoUrl}
            startFrom={Math.round(c.startSec * fps)}
            delayRenderTimeoutInMilliseconds={60000}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {c.sfxPath && <Audio src={c.sfxPath} volume={0.55} />}
        </Sequence>
      ))}

      {/* 상단 제목바 (전체 영상에 항상 표시) */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: barHeight,
          backgroundColor: theme.bar,
        }}
      >
        <div
          style={{
            color: "white", fontSize: 52, fontWeight: 800, textAlign: "center",
            marginTop: 36, fontFamily: "sans-serif",
          }}
        >
          {title}
        </div>

        {/* 순위 목록: 재생된 클립까지 누적으로 계속 보임 */}
        {clips.map((c, i) => (
          <Sequence key={c.id} from={starts[i]} showInTimeline={false}>
            <div
              style={{
                position: "absolute", left: 40, top: LIST_TOP_PADDING + i * LIST_ROW_HEIGHT,
                fontSize: 46, fontWeight: 800, color: rankColor(theme, i + 1),
                fontFamily: "sans-serif",
              }}
            >
              {i + 1}. {c.label}
            </div>
          </Sequence>
        ))}
      </div>

      {/* 하단 반응 자막: 해당 클립 구간에만 표시 */}
      {captionEnabled &&
        clips.map((c, i) => (
          <Sequence key={c.id} from={starts[i]} durationInFrames={Math.round(c.durationSec * fps)}>
            <div
              style={{
                position: "absolute", bottom: 180, left: 0, width: "100%", height: 130,
                backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontSize: 42, fontWeight: 700, fontFamily: "sans-serif" }}>
                {c.caption}
              </span>
            </div>
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
