"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, Check, ArrowUp, ArrowDown, Play, Upload,
  Sparkles, X, Eye, Music2, Video, RefreshCw, CheckCircle2, Clock, ExternalLink, ArrowUpDown
} from "lucide-react";
import type { Candidate, PublishedVideo } from "@/lib/store";

const SOURCE_STYLE = {
  tiktok: { label: "TikTok", icon: Music2, cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  reels: { label: "Reels", icon: Video, cls: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
};

const RANK_BADGE = [
  "bg-gradient-to-br from-amber-300 to-amber-600 text-amber-950",
  "bg-gradient-to-br from-zinc-300 to-zinc-500 text-zinc-900",
  "bg-gradient-to-br from-orange-400 to-orange-700 text-orange-950",
  "bg-zinc-800 text-zinc-300 border border-zinc-700",
  "bg-zinc-800 text-zinc-300 border border-zinc-700",
  "bg-zinc-800 text-zinc-300 border border-zinc-700",
];

export default function DashboardPage() {
  const [tab, setTab] = useState<"topic" | "collect" | "review" | "publish">("topic");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Candidate[]>([]);
  const [title, setTitle] = useState("역대급 파쿠르 실패 반응 랭킹 TOP6");
  const [renderState, setRenderState] = useState<"idle" | "rendering" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [published, setPublished] = useState<PublishedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [sortByViews, setSortByViews] = useState(false);

  // ── 주제선택 탭 상태 ──────────────────────────────
  const [topics, setTopics] = useState<{ title: string; keyword: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [producingIdx, setProducingIdx] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"running" | "done" | "error" | null>(null);
  const [jobFile, setJobFile] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const loadTopics = async () => {
    setTopicsLoading(true);
    const res = await fetch("/api/topics");
    setTopics(await res.json());
    setTopicsLoading(false);
  };

  const startProduce = async (idx: number) => {
    const t = topics[idx];
    setProducingIdx(idx);
    setJobStatus("running");
    setJobFile(null);
    setJobError(null);
    const res = await fetch("/api/produce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t.title, keyword: t.keyword }),
    });
    const data = await res.json();
    setJobId(data.jobId);
  };

  useEffect(() => {
    if (!jobId || jobStatus !== "running") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (data.status === "done") {
        setJobStatus("done");
        setJobFile(data.file);
        clearInterval(interval);
      } else if (data.status === "error") {
        setJobStatus("error");
        setJobError(data.error || "알 수 없는 오류");
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const loadCandidates = async () => {
    setLoading(true);
    const res = await fetch("/api/candidates");
    setCandidates(await res.json());
    setLoading(false);
  };

  const loadPublished = async () => {
    const res = await fetch("/api/videos");
    setPublished(await res.json());
  };

  useEffect(() => {
    loadCandidates();
    loadPublished();
    loadTopics();
  }, []);

  const keywords = Array.from(new Set(candidates.map((c) => c.keyword).filter(Boolean))) as string[];
  const visibleCandidates = candidates
    .filter((c) => !activeKeyword || c.keyword === activeKeyword)
    .sort((a, b) => (sortByViews ? b.viewCount - a.viewCount : 0));

  const togglePick = (clip: Candidate) => {
    setPicked((prev) => {
      const exists = prev.find((p) => p.id === clip.id);
      if (exists) return prev.filter((p) => p.id !== clip.id);
      if (prev.length >= 6) return prev;
      return [...prev, clip];
    });
  };

  const move = (idx: number, dir: number) => {
    setPicked((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const startRender = async () => {
    setRenderState("rendering");
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(95, p + Math.random() * 15 + 5));
    }, 400);

    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, clipIds: picked.map((p) => p.id) }),
    });
    await res.json();

    clearInterval(interval);
    setProgress(100);
    setRenderState("done");
    loadPublished();
  };

  const publish = async (id: number) => {
    await fetch("/api/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadPublished();
  };

  const reset = () => {
    setPicked([]);
    setRenderState("idle");
    setProgress(0);
    setTab("collect");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex justify-center">
      <div className="w-full max-w-sm min-h-screen bg-zinc-950 border-x border-zinc-900 flex flex-col">
        <div className="px-5 pt-6 pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-widest uppercase">
            <TrendingUp size={14} strokeWidth={2.5} />
            도랭킹 팩토리
          </div>
          <h1 className="text-xl font-extrabold tracking-tight mt-1">
            소재수집 → 편집 → 발행
          </h1>
        </div>

        <div className="flex px-5 gap-1 pt-3">
          {[
            { id: "topic" as const, label: "주제선택", badge: null as number | null },
            { id: "collect" as const, label: "소재수집", badge: candidates.length },
            { id: "review" as const, label: "검토편집", badge: picked.length || null },
            { id: "publish" as const, label: "발행현황", badge: published.length || null },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-[10px] font-bold py-2.5 rounded-lg border transition-colors ${
                tab === t.id
                  ? "bg-amber-400 text-zinc-950 border-amber-400"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className={`ml-1 ${tab === t.id ? "text-zinc-900" : "text-amber-400"}`}>
                  ({t.badge})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex-1 px-5 py-5">
          {tab === "topic" && (
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                <span>{topicsLoading ? "주제 뽑는 중..." : "오늘 만들어볼 만한 주제"}</span>
                <button
                  onClick={loadTopics}
                  disabled={jobStatus === "running"}
                  className="flex items-center gap-1 text-amber-400 disabled:opacity-40"
                >
                  <RefreshCw size={12} /> 다른 주제
                </button>
              </div>

              {jobStatus === null && (
                <div className="space-y-3">
                  {topics.map((t, idx) => (
                    <div key={idx} className="border border-zinc-800 rounded-xl p-4 bg-zinc-900">
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold mb-1.5">
                        <Sparkles size={11} /> #{t.keyword}
                      </div>
                      <p className="text-sm font-bold leading-snug mb-3">{t.title}</p>
                      <button
                        onClick={() => startProduce(idx)}
                        className="w-full py-2.5 rounded-lg font-bold text-xs bg-amber-400 text-zinc-950"
                      >
                        이 주제로 만들기
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {jobStatus === "running" && (
                <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900 text-center space-y-3">
                  <p className="text-sm font-bold">{producingIdx !== null ? topics[producingIdx]?.title : ""}</p>
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-xs">
                    <Clock size={14} className="animate-pulse" />
                    틱톡 검색 → 다운로드 → 편집 자동 진행 중...
                  </div>
                  <p className="text-[11px] text-zinc-500">보통 1~3분 정도 걸려요, 화면 꺼도 계속 진행돼요</p>
                </div>
              )}

              {jobStatus === "done" && jobFile && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold border border-emerald-500/30 bg-emerald-500/10 rounded-xl p-3">
                    <CheckCircle2 size={16} /> 완성됐어요!
                  </div>
                  <video
                    src={`${process.env.NEXT_PUBLIC_DORANK_FILES_URL ?? ""}/files/${jobFile}`}
                    controls
                    className="w-full rounded-xl border border-zinc-800"
                  />
                  <a
                    href={`${process.env.NEXT_PUBLIC_DORANK_FILES_URL ?? ""}/files/${jobFile}`}
                    download
                    className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 text-zinc-950 flex items-center justify-center gap-2"
                  >
                    <Upload size={16} className="rotate-180" /> 다운로드
                  </a>
                  <button
                    onClick={() => { setJobStatus(null); setJobId(null); setJobFile(null); loadTopics(); }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    다른 주제로 또 만들기
                  </button>
                </div>
              )}

              {jobStatus === "error" && (
                <div className="space-y-3">
                  <div className="text-rose-400 text-sm border border-rose-500/30 bg-rose-500/10 rounded-xl p-3">
                    실패했어요: {jobError}
                  </div>
                  <button
                    onClick={() => { setJobStatus(null); setJobId(null); }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "collect" && (
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>{loading ? "불러오는 중..." : `봇이 찾은 후보 클립 (${visibleCandidates.length})`}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSortByViews((v) => !v)}
                    className={`flex items-center gap-1 ${sortByViews ? "text-amber-400" : "text-zinc-500"}`}
                  >
                    <ArrowUpDown size={12} /> 조회수순
                  </button>
                  <button onClick={loadCandidates} className="flex items-center gap-1 text-amber-400">
                    <RefreshCw size={12} /> 새로고침
                  </button>
                </div>
              </div>

              {keywords.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-5 px-5 no-scrollbar">
                  <button
                    onClick={() => setActiveKeyword(null)}
                    className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                      !activeKeyword ? "bg-amber-400 text-zinc-950 border-amber-400" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    전체
                  </button>
                  {keywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => setActiveKeyword(kw)}
                      className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                        activeKeyword === kw ? "bg-amber-400 text-zinc-950 border-amber-400" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      #{kw}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {visibleCandidates.map((c) => {
                  const picked_ = picked.find((p) => p.id === c.id);
                  const S = SOURCE_STYLE[c.source];
                  return (
                    <div
                      key={c.id}
                      onClick={() => togglePick(c)}
                      className={`aspect-[9/16] relative rounded-xl border overflow-hidden text-left cursor-pointer ${
                        picked_ ? "border-amber-400 ring-2 ring-amber-400/50" : "border-zinc-800"
                      }`}
                    >
                      <div className={`absolute inset-0 ${c.thumbnailUrl ? "bg-zinc-900" : `bg-gradient-to-br ${c.thumbHue}`}`}>
                        {c.thumbnailUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.thumbnailUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                      </div>

                      {/* 위쪽: 출처 배지 + 선택 체크 */}
                      <div className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${S.cls}`}>
                        <S.icon size={9} /> {S.label}
                      </div>
                      {picked_ && (
                        <div className="absolute top-1.5 right-1.5 bg-amber-400 text-zinc-950 rounded-full p-1">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}

                      {/* 오른쪽 아래: 원본 영상 미리보기 버튼 (새 탭, 작은 버튼으로 한정) */}
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-1.5 right-1.5 z-10 bg-black/70 rounded-full p-1.5"
                        >
                          <Play size={11} className="text-white" fill="white" />
                        </a>
                      )}

                      {/* 아래쪽: 캡션 + 조회수 (그라데이션 스크림 위) */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-1.5 px-1.5 pointer-events-none">
                        <p className="text-[10px] text-white leading-snug line-clamp-2">{c.topic}</p>
                        {c.hasViews && (
                          <span className="flex items-center gap-0.5 text-[9px] text-zinc-300 font-mono mt-1">
                            <Eye size={9} /> {c.views}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setTab("review")}
                disabled={picked.length === 0}
                className="w-full mt-3 py-3 rounded-xl font-bold text-sm bg-amber-400 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                검토·편집으로 ({picked.length}개 담음)
              </button>
            </div>
          )}

          {tab === "review" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1.5">
                  <Sparkles size={12} className="text-amber-400" /> AI가 뽑은 제목 (수정 가능)
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="text-xs text-zinc-500 mb-2">순위 순서 (위/아래로 조정)</div>
                <div className="space-y-2">
                  {picked.length === 0 && (
                    <div className="text-center text-zinc-600 text-sm py-8 border border-dashed border-zinc-800 rounded-xl">
                      소재수집 탭에서 클립을 먼저 담아주세요
                    </div>
                  )}
                  {picked.map((c, idx) => (
                    <div key={c.id} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                      <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold ${RANK_BADGE[idx]}`}>
                        {idx + 1}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate">{c.topic}</span>
                      <button onClick={() => move(idx, -1)} className="p-1 text-zinc-500 disabled:opacity-20" disabled={idx === 0}>
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => move(idx, 1)} className="p-1 text-zinc-500 disabled:opacity-20" disabled={idx === picked.length - 1}>
                        <ArrowDown size={14} />
                      </button>
                      <button onClick={() => togglePick(c)} className="p-1 text-zinc-600">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {renderState === "idle" && (
                <button
                  onClick={startRender}
                  disabled={picked.length === 0}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600 flex items-center justify-center gap-2"
                >
                  <Play size={16} /> 자동 편집 시작
                </button>
              )}
              {renderState === "rendering" && (
                <div className="border border-zinc-800 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-1 text-amber-400"><Clock size={12} /> 편집 서버에서 렌더링 중</span>
                    <span className="font-mono">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              {renderState === "done" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold border border-emerald-500/30 bg-emerald-500/10 rounded-xl p-3">
                    <CheckCircle2 size={16} /> 편집 완료! 발행현황 탭에서 확인하세요
                  </div>
                  <button onClick={reset} className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                    새 영상 만들기
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "publish" && (
            <div className="space-y-3">
              {published.length === 0 && (
                <div className="text-center text-zinc-600 text-sm py-10 border border-dashed border-zinc-800 rounded-xl">
                  아직 완성된 영상이 없어요
                </div>
              )}
              {published.map((v) => (
                <div key={v.id} className="border border-zinc-800 rounded-xl p-3 bg-zinc-900">
                  <div className="text-sm font-bold mb-1">{v.title}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{v.count}개 클립 · TOP{v.count}</span>
                    {v.status === "편집완료" ? (
                      <button
                        onClick={() => publish(v.id)}
                        className="flex items-center gap-1 text-xs font-bold bg-amber-400 text-zinc-950 px-3 py-1.5 rounded-full"
                      >
                        <Upload size={12} /> 유튜브 업로드
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <CheckCircle2 size={12} /> 업로드됨
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
