"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, Check, ArrowUp, ArrowDown, Play, Upload,
  Sparkles, X, Eye, Music2, Video, RefreshCw, CheckCircle2, Clock, ExternalLink, ArrowUpDown,
  Palette, Link2, Plus
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
  const [published, setPublished] = useState<PublishedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [sortByViews, setSortByViews] = useState(false);

  // ── 주제선택 탭 상태: 이 주제로 스크래핑만 실행 → 소재수집 탭으로 이동 ──
  const [topics, setTopics] = useState<{ title: string; keyword: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [scrapingIdx, setScrapingIdx] = useState<number | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const loadTopics = async () => {
    setTopicsLoading(true);
    const res = await fetch("/api/topics");
    setTopics(await res.json());
    setTopicsLoading(false);
  };

  // 네트워크가 잠깐 흔들려도 한 번 더 시도해보는 fetch (모바일 환경 대응)
  const fetchWithRetry = async (url: string, options?: RequestInit, retries = 2): Promise<Response> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fetch(url, options);
      } catch (err) {
        if (i === retries) throw err;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    throw new Error("네트워크 요청 실패");
  };

  const pollJob = async (id: string): Promise<any> => {
    const MAX_ATTEMPTS = 100; // 3초 * 100 = 최대 5분
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (res.status === 404) {
          return { status: "error", error: "서버가 재시작돼서 작업 기록이 사라졌어요. 다시 시도해주세요." };
        }
        const data = await res.json();
        if (data.status === "done" || data.status === "error") return data;
      } catch {
        // 일시적 네트워크 문제는 무시하고 다음 시도에서 계속 (연결 흔들림 대응)
      }
    }
    return { status: "error", error: "시간이 너무 오래 걸려서 중단했어요 (5분 초과)" };
  };

  const [resumingScrape, setResumingScrape] = useState<{ jobId: string; title: string; keyword: string } | null>(null);

  const selectTopic = async (idx: number) => {
    const t = topics[idx];
    setScrapingIdx(idx);
    setScrapeError(null);
    try {
      const res = await fetchWithRetry("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: t.keyword }),
      });
      const { jobId: sJobId } = await res.json();
      localStorage.setItem("dorank_scrape_job", JSON.stringify({ jobId: sJobId, title: t.title, keyword: t.keyword }));
      const result = await pollJob(sJobId);
      localStorage.removeItem("dorank_scrape_job");
      if (result.status === "error") throw new Error(result.error);

      if (!result.count || result.count === 0) {
        setScrapeError(`"#${t.keyword}" 키워드로 찾은 클립이 없어요. "다른 주제"를 눌러서 다시 시도해주세요.`);
        return;
      }

      // 스크래핑 끝 → 이 주제 제목을 기본 제목으로, 소재수집 탭으로 이동해서 그 키워드만 보여줌
      setTitle(t.title);
      await loadCandidates();
      setActiveKeyword(t.keyword);
      setTab("collect");
    } catch (err) {
      localStorage.removeItem("dorank_scrape_job");
      setScrapeError(String(err));
    } finally {
      setScrapingIdx(null);
    }
  };

  // 새로고침 후 이전 작업을 이어서 확인 (스크래핑)
  const resumeScrapeJob = async (saved: { jobId: string; title: string; keyword: string }) => {
    setResumingScrape(saved);
    setScrapeError(null);
    try {
      const result = await pollJob(saved.jobId);
      localStorage.removeItem("dorank_scrape_job");
      if (result.status === "error") throw new Error(result.error);
      if (!result.count || result.count === 0) {
        setScrapeError(`"#${saved.keyword}" 키워드로 찾은 클립이 없어요. "다른 주제"를 눌러서 다시 시도해주세요.`);
        return;
      }
      setTitle(saved.title);
      await loadCandidates();
      setActiveKeyword(saved.keyword);
      setTab("collect");
    } catch (err) {
      localStorage.removeItem("dorank_scrape_job");
      setScrapeError(String(err));
    } finally {
      setResumingScrape(null);
    }
  };

  // ── 검토편집 탭: 실제 렌더링 작업 상태 ──────────────
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderJobStatus, setRenderJobStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [renderFile, setRenderFile] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // ── 스타일 테마 + 자막 on/off + 링크 직접 추가 ──────────────
  const [themes, setThemes] = useState<{ id: string; name: string }[]>([]);
  const [themeId, setThemeId] = useState("gold");
  const [captionEnabled, setCaptionEnabled] = useState(true);
  const [linkInput, setLinkInput] = useState("");
  const [linkAdding, setLinkAdding] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // ── 자막/라벨 미리보기 (렌더링 전에 수정 가능) ──────────────
  const [labelPreviews, setLabelPreviews] = useState<Record<string, { label: string; caption: string; sfx: string }>>({});
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);

  const generateLabelPreview = async () => {
    setLabelsLoading(true);
    setLabelsError(null);
    try {
      const res = await fetchWithRetry("/api/preview-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipIds: picked.map((p) => p.id), title }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const map: Record<string, { label: string; caption: string; sfx: string }> = {};
      for (const item of data) map[item.id] = { label: item.label, caption: item.caption, sfx: item.sfx };
      setLabelPreviews(map);
    } catch (err) {
      setLabelsError(String(err));
    } finally {
      setLabelsLoading(false);
    }
  };

  const updateLabelPreview = (id: string, field: "label" | "caption", value: string) => {
    setLabelPreviews((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // ── 클립별 시작시점/길이 조절 ──────────────
  const [clipTrims, setClipTrims] = useState<Record<string, { startSec: number; durationSec: number }>>({});
  const getTrim = (id: string) => clipTrims[id] ?? { startSec: 0.5, durationSec: 5 };
  const setTrim = (id: string, field: "startSec" | "durationSec", value: number) => {
    setClipTrims((prev) => ({ ...prev, [id]: { ...getTrim(id), [field]: value } }));
  };


  const loadThemes = async () => {
    const res = await fetch("/api/themes");
    setThemes(await res.json());
  };

  const addLink = async () => {
    if (!linkInput.trim()) return;
    setLinkAdding(true);
    setLinkError(null);
    try {
      const res = await fetchWithRetry("/api/add-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkInput.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const manualClip: Candidate = {
        id: data.id,
        topic: "(직접 추가한 링크)",
        source: data.source,
        views: "-",
        viewCount: 0,
        hasViews: false,
        thumbHue: "from-zinc-700 to-zinc-950",
        url: data.url,
        keyword: "manual",
      };
      setPicked((prev) => (prev.length >= 6 ? prev : [...prev, manualClip]));
      setLinkInput("");
    } catch (err) {
      setLinkError(String(err));
    } finally {
      setLinkAdding(false);
    }
  };

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
    loadThemes();

    // 화면을 나갔다 다시 들어왔을 때, 아직 안 끝난 작업이 있으면 이어서 확인
    try {
      const savedScrape = localStorage.getItem("dorank_scrape_job");
      if (savedScrape) resumeScrapeJob(JSON.parse(savedScrape));
      const savedRender = localStorage.getItem("dorank_render_job");
      if (savedRender) resumeRenderJob(JSON.parse(savedRender));
    } catch {
      // 저장된 값이 이상하면 그냥 무시
    }
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
    setRenderJobStatus("running");
    setRenderFile(null);
    setRenderError(null);
    try {
      const clips = picked.map((p) => {
        const trim = getTrim(p.id);
        const preview = labelPreviews[p.id];
        return {
          id: p.id,
          startSec: trim.startSec,
          durationSec: trim.durationSec,
          ...(preview ? { label: preview.label, caption: preview.caption, sfx: preview.sfx } : {}),
        };
      });
      const res = await fetchWithRetry("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, clips, themeId, captionEnabled }),
      });
      const { jobId: rJobId } = await res.json();
      setRenderJobId(rJobId);
      localStorage.setItem("dorank_render_job", JSON.stringify({ jobId: rJobId, title }));
      const result = await pollJob(rJobId);
      localStorage.removeItem("dorank_render_job");
      if (result.status === "error") throw new Error(result.error);
      setRenderFile(result.file);
      setRenderJobStatus("done");
      loadPublished();
    } catch (err) {
      localStorage.removeItem("dorank_render_job");
      setRenderError(String(err));
      setRenderJobStatus("error");
    }
  };

  // 새로고침 후 이전 편집 작업을 이어서 확인
  const resumeRenderJob = async (saved: { jobId: string; title: string }) => {
    setTitle(saved.title);
    setRenderJobId(saved.jobId);
    setRenderJobStatus("running");
    setTab("review");
    try {
      const result = await pollJob(saved.jobId);
      localStorage.removeItem("dorank_render_job");
      if (result.status === "error") throw new Error(result.error);
      setRenderFile(result.file);
      setRenderJobStatus("done");
      loadPublished();
    } catch (err) {
      localStorage.removeItem("dorank_render_job");
      setRenderError(String(err));
      setRenderJobStatus("error");
    }
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
    setRenderJobStatus("idle");
    setRenderFile(null);
    setRenderJobId(null);
    setLabelPreviews({});
    setClipTrims({});
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
                  disabled={scrapingIdx !== null}
                  className="flex items-center gap-1 text-amber-400 disabled:opacity-40"
                >
                  <RefreshCw size={12} /> 다른 주제
                </button>
              </div>

              {resumingScrape && (
                <div className="flex items-center gap-2 text-amber-400 text-xs border border-amber-500/30 bg-amber-500/10 rounded-xl p-3 mb-3">
                  <Clock size={14} className="animate-pulse" />
                  이전에 시작한 "{resumingScrape.title}" 작업 이어서 확인 중...
                </div>
              )}

              {scrapeError && (
                <div className="text-rose-400 text-xs border border-rose-500/30 bg-rose-500/10 rounded-xl p-3 mb-3">
                  실패했어요: {scrapeError}
                </div>
              )}

              <div className="space-y-3">
                {topics.map((t, idx) => (
                  <div key={idx} className="border border-zinc-800 rounded-xl p-4 bg-zinc-900">
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold mb-1.5">
                      <Sparkles size={11} /> #{t.keyword}
                    </div>
                    <p className="text-sm font-bold leading-snug mb-3">{t.title}</p>
                    <button
                      onClick={() => selectTopic(idx)}
                      disabled={scrapingIdx !== null}
                      className="w-full py-2.5 rounded-lg font-bold text-xs bg-amber-400 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600 flex items-center justify-center gap-1.5"
                    >
                      {scrapingIdx === idx ? (
                        <><Clock size={12} className="animate-pulse" /> 틱톡에서 소재 찾는 중...</>
                      ) : (
                        "이 주제로 소재 찾기"
                      )}
                    </button>
                  </div>
                ))}
              </div>
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
                <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1.5">
                  <Palette size={12} className="text-amber-400" /> 스타일 테마
                </label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {themes.map((t) => {
                    const SWATCH: Record<string, string> = {
                      gold: "from-amber-400 to-rose-600",
                      neon: "from-fuchsia-500 to-cyan-400",
                      dark: "from-blue-600 to-blue-300",
                      pastel: "from-rose-200 to-yellow-200",
                    };
                    return (
                      <button
                        key={t.id}
                        onClick={() => setThemeId(t.id)}
                        className={`shrink-0 flex flex-col items-center gap-1 px-1 ${themeId === t.id ? "" : "opacity-50"}`}
                      >
                        <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${SWATCH[t.id] ?? "from-zinc-600 to-zinc-800"} ${themeId === t.id ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950" : ""}`} />
                        <span className="text-[9px] text-zinc-400 whitespace-nowrap">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setCaptionEnabled((v) => !v)}
                className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5"
              >
                <span className="text-xs text-zinc-300">하단 반응 자막 표시</span>
                <span className={`w-9 h-5 rounded-full relative transition-colors ${captionEnabled ? "bg-amber-400" : "bg-zinc-700"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${captionEnabled ? "left-4.5" : "left-0.5"}`} style={{ left: captionEnabled ? "18px" : "2px" }} />
                </span>
              </button>

              <div>
                <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1.5">
                  <Link2 size={12} className="text-amber-400" /> 링크로 직접 추가 (틱톡/유튜브/릴스)
                </label>
                <div className="flex gap-1.5">
                  <input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={addLink}
                    disabled={linkAdding || !linkInput.trim() || picked.length >= 6}
                    className="px-3 rounded-lg bg-zinc-800 text-amber-400 disabled:opacity-40"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {linkError && <p className="text-[10px] text-rose-400 mt-1">{linkError}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">순위 순서 (위/아래로 조정)</span>
                  <button
                    onClick={generateLabelPreview}
                    disabled={picked.length === 0 || labelsLoading}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 disabled:opacity-40"
                  >
                    <Sparkles size={11} className={labelsLoading ? "animate-pulse" : ""} />
                    {labelsLoading ? "생성 중..." : "AI 자막 미리보기"}
                  </button>
                </div>
                {labelsError && <p className="text-[10px] text-rose-400 mb-2">{labelsError}</p>}
                <div className="space-y-2">
                  {picked.length === 0 && (
                    <div className="text-center text-zinc-600 text-sm py-8 border border-dashed border-zinc-800 rounded-xl">
                      소재수집 탭에서 클립을 먼저 담아주세요
                    </div>
                  )}
                  {picked.map((c, idx) => {
                    const trim = getTrim(c.id);
                    const preview = labelPreviews[c.id];
                    return (
                      <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 space-y-2">
                        <div className="flex items-center gap-2">
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

                        <div className="flex items-center gap-2 pl-9 text-[10px] text-zinc-500">
                          <label className="flex items-center gap-1">
                            시작
                            <input
                              type="number" step="0.5" min="0" value={trim.startSec}
                              onChange={(e) => setTrim(c.id, "startSec", Number(e.target.value))}
                              className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-zinc-200"
                            />초
                          </label>
                          <label className="flex items-center gap-1">
                            길이
                            <input
                              type="number" step="0.5" min="1" value={trim.durationSec}
                              onChange={(e) => setTrim(c.id, "durationSec", Number(e.target.value))}
                              className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-zinc-200"
                            />초
                          </label>
                        </div>

                        {preview && (
                          <div className="pl-9 space-y-1">
                            <input
                              value={preview.label}
                              onChange={(e) => updateLabelPreview(c.id, "label", e.target.value)}
                              placeholder="순위 라벨"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-amber-300 font-bold"
                            />
                            <input
                              value={preview.caption}
                              onChange={(e) => updateLabelPreview(c.id, "caption", e.target.value)}
                              placeholder="반응 자막"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {renderJobStatus === "idle" && (
                <button
                  onClick={startRender}
                  disabled={picked.length === 0}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600 flex items-center justify-center gap-2"
                >
                  <Play size={16} /> 자동 편집 시작
                </button>
              )}
              {renderJobStatus === "running" && (
                <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-xs">
                    <Clock size={14} className="animate-pulse" /> 다운로드 → 자막/효과음 생성 → 편집 진행 중...
                  </div>
                  <p className="text-[11px] text-zinc-500">보통 1~3분 정도 걸려요, 화면 꺼도 계속 진행돼요</p>
                </div>
              )}
              {renderJobStatus === "done" && renderFile && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold border border-emerald-500/30 bg-emerald-500/10 rounded-xl p-3">
                    <CheckCircle2 size={16} /> 완성됐어요!
                  </div>
                  <video
                    src={`/api/files/${renderFile}`}
                    controls
                    className="w-full rounded-xl border border-zinc-800"
                  />
                  <a
                    href={`/api/files/${renderFile}`}
                    download
                    className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 text-zinc-950 flex items-center justify-center gap-2"
                  >
                    <Upload size={16} className="rotate-180" /> 다운로드
                  </a>
                  <button
                    onClick={() => { setRenderJobStatus("idle"); setRenderFile(null); setRenderJobId(null); }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-800 border border-zinc-700 text-amber-400"
                  >
                    이대로 다시 수정하기
                  </button>
                  <button onClick={reset} className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                    완전히 새 영상 만들기
                  </button>
                </div>
              )}
              {renderJobStatus === "error" && (
                <div className="space-y-2">
                  <div className="text-rose-400 text-sm border border-rose-500/30 bg-rose-500/10 rounded-xl p-3">
                    실패했어요: {renderError}
                  </div>
                  <button onClick={() => setRenderJobStatus("idle")} className="w-full py-2.5 rounded-xl text-sm font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                    다시 시도
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
