"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Sparkles,
  Download,
  Loader2,
  ImageIcon,
  Info,
  Copy,
  Check,
  Wand2,
  Trash2,
  MessageSquare,
  ZoomIn,
} from "lucide-react";
import {
  IMAGE_MODELS,
  DEFAULT_MODEL,
  RESOLUTIONS,
  DEFAULT_RESOLUTION,
  krwPerImage,
  MAX_COUNT,
  MAX_FURNITURE,
  isOpenAIModel,
  type Resolution,
} from "@/lib/gemini-models";
import {
  generateFurniture,
  editFurniture,
  type GenerationMeta,
} from "./actions";
import {
  registerFurnitureAsset,
  setProjectBase,
  deleteFurnitureAsset,
  deleteFurnitureResult,
  addResultComment,
  deleteResultComment,
} from "./projects-actions";
import {
  INPUT_ROLE_LABELS,
  RAW_MAX_EXTRA_IMAGES,
  type FurnitureAsset,
  type FurnitureResult,
  type InputRef,
  type ResultComment,
} from "./studio-shared";
import { uploadStudioImage } from "./studio-upload";
import PlacementCanvas, {
  compositeCollage,
  type CollagePlacement,
} from "./PlacementCanvas";
import MaskCanvas, { type MaskCanvasHandle } from "./MaskCanvas";

type Tab = "generate" | "edit";

// 클릭하면 입력칸에 채워지는 예시 프롬프트
const GENERATE_FEEL_EXAMPLES = [
  "따뜻하고 아늑한 우드톤, 소파는 창가 쪽, 러그는 소파 아래",
  "호텔 스위트룸 느낌, 차분한 그레이지 톤, 여백 있게 미니멀",
  "자판디 스타일, 내추럴 오크와 베이지 린넨, 세이지 그린 포인트, 셰어 커튼의 부드러운 자연광",
  "TV장은 왼쪽 벽에 붙이고, 다이닝 테이블은 주방 쪽으로",
];

const EDIT_PROMPT_EXAMPLES: { label: string; text: string }[] = [
  {
    label: "색칠 영역 제거",
    text: "빨간 표시 영역의 물건을 제거하고, 가려졌던 바닥과 벽을 자연스럽게 복원해줘. 나머지는 전부 그대로 유지해줘.",
  },
  {
    label: "가구 추가",
    text: "Image 2의 가구를 빨간 표시 자리에 추가해줘. 공간의 원근과 크기, 빛 방향, 색온도에 맞추고 바닥에 부드러운 접지 그림자를 넣어줘. 나머지는 전부 그대로 유지해줘.",
  },
  {
    label: "가구 교체",
    text: "빨간 표시가 가리키는 가구를 Image 2의 제품으로 교체해줘. 위치·방향·크기는 기존 가구와 동일하게 유지하고, 제품의 디자인·색·소재는 제품 사진 그대로 재현해줘. 나머지는 전부 그대로.",
  },
  {
    label: "밝기·톤 보정",
    text: "전체적으로 조금 더 밝고 따뜻한 오후 햇살 느낌으로 보정해줘. 가구와 배치, 구도는 전부 그대로 유지해줘.",
  },
  {
    label: "그림자·이질감 정리",
    text: "합성 티가 나는 부분을 자연스럽게 정리해줘. 가구마다 창가 빛 방향에 맞는 접지 그림자를 넣고 색온도를 통일해줘. 배치와 가구는 전부 그대로.",
  },
  {
    label: "소재 변경",
    text: "빨간 표시한 가구의 소재를 베이지 패브릭으로 바꿔줘. 형태·위치·크기는 그대로, 나머지도 전부 그대로 유지해줘.",
  },
  {
    label: "매물사진 마무리",
    text: "이 인테리어 사진을 전문 부동산 매물 사진처럼 자연스러운 주광 노출과 톤 밸런스로 다시 만들어줘. 가구·배치·구도는 전부 그대로 유지해줘.",
  },
  {
    label: "저녁 분위기",
    text: "이 사진의 시간대를 저녁 8시로 바꿔줘. 창밖은 어두운 밤이 되게 하고, 실내 램프와 조명을 켜서 아늑한 저녁 분위기로 만들어줘. 가구와 배치는 전부 그대로 유지해줘.",
  },
  {
    label: "빈 방 만들기",
    text: "이 방의 가구와 물건을 전부 치워서 빈 방으로 만들어줘. 벽·바닥·창문·커튼·붙박이장 등 공간 구조는 그대로 유지하고, 가구가 가리고 있던 부분은 자연스럽게 복원해줘.",
  },
  {
    label: "벽 색 변경",
    text: "이 공간의 벽 색만 세이지 그린으로 바꿔줘. 가구·조명·소품·바닥은 전부 그대로 유지해줘.",
  },
];

/** 저장 실패로 이 화면에서만 보이는 결과 (새로고침하면 사라짐) */
type FallbackItem = { id: string; url: string; meta: GenerationMeta };

/** 상세 모달에서 공용으로 쓰는 형태 (저장 결과 + 폴백 모두 수용) */
type DetailItem = {
  url: string;
  userPrompt: string;
  enhancedPrompt: string;
  fullPrompt: string;
  model: string;
  resolution: string;
  inputRefs: InputRef[];
  createdBy?: string;
};

function resultToDetail(r: FurnitureResult): DetailItem {
  return {
    url: r.url,
    userPrompt: r.user_prompt,
    enhancedPrompt: r.enhanced_prompt,
    fullPrompt: r.full_prompt,
    model: r.model,
    resolution: r.resolution,
    inputRefs: r.input_refs ?? [],
    createdBy: r.created_by,
  };
}

function fallbackToDetail(f: FallbackItem): DetailItem {
  return {
    url: f.url,
    userPrompt: f.meta.userPrompt,
    enhancedPrompt: f.meta.enhancedPrompt,
    fullPrompt: f.meta.fullPrompt,
    model: f.meta.model,
    resolution: f.meta.resolution,
    inputRefs: [],
  };
}

export default function FurnitureStudio({
  projectId,
  projectName,
  baseUrl,
  sketchUrl,
  assets,
  results,
  comments,
}: {
  projectId: string;
  projectName: string;
  baseUrl: string | null;
  sketchUrl: string | null;
  assets: FurnitureAsset[];
  results: FurnitureResult[];
  comments: ResultComment[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("generate");

  // 생성 설정
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [genMode, setGenMode] = useState<"photo" | "sketch" | "collage">(
    "photo"
  );
  // 캔버스 배치 모드의 스티커들
  const [placements, setPlacements] = useState<CollagePlacement[]>([]);
  // 좁은 패널에선 배치가 어려우므로 기본은 대형 모달에서 편집
  const [collageExpanded, setCollageExpanded] = useState(false);
  // 단계별 편집 탭의 캔버스 배치 (보정 대상 위에 가구 얹기)
  const [editPlacements, setEditPlacements] = useState<CollagePlacement[]>([]);
  const [editCollageExpanded, setEditCollageExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [resolution, setResolution] = useState<Resolution>(DEFAULT_RESOLUTION);
  const [count, setCount] = useState(1);

  // 보정(편집) 상태
  const [editBase, setEditBase] = useState<{
    url: string;
    resultId?: string;
  } | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  // 직접 프롬프트(raw) 모드의 추가 이미지 (라이브러리 가구 또는 업로드)
  const [rawExtras, setRawExtras] = useState<
    { url: string; assetId?: string }[]
  >([]);
  const [rawUpload, setRawUpload] = useState<{
    done: number;
    total: number;
  } | null>(null);
  // 영역 표시(브러시 마스킹)
  const [maskOn, setMaskOn] = useState(false);
  const [maskDirty, setMaskDirty] = useState(false);
  // 좁은 패널에선 색칠이 어려우므로 기본은 대형 모달에서 편집
  const [maskExpanded, setMaskExpanded] = useState(false);
  const maskRef = useRef<MaskCanvasHandle>(null);

  const [fallbacks, setFallbacks] = useState<FallbackItem[]>([]);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // 업로드·삭제 등 즉시 반영 액션 진행 중
  // 가구 다중 업로드 진행 상황 (라이브러리 슬롯에 n/total 스피너 표시)
  const [assetUpload, setAssetUpload] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const canGenerate =
    !!baseUrl &&
    (genMode === "collage" ? placements.length > 0 : selected.size > 0) &&
    (genMode !== "sketch" || !!sketchUrl) &&
    !pending &&
    !busy;

  // result_id → 요청사항 목록 (생성 시간순)
  const commentsByResult = comments.reduce<Record<string, ResultComment[]>>(
    (acc, c) => {
      (acc[c.result_id] ??= []).push(c);
      return acc;
    },
    {}
  );
  const commentsResult = commentsFor
    ? results.find((r) => r.id === commentsFor) ?? null
    : null;

  // 보정은 직접 프롬프트 단일 모드 — 프롬프트 필수
  const canEdit =
    !!editBase && editInstruction.trim().length > 0 && !pending && !busy;
  // 추가 이미지의 시작 번호: 영역 표시가 있으면 Image 2 를 표시가 차지
  const extraStart = maskOn && maskDirty ? 3 : 2;

  function resetMask() {
    maskRef.current?.clear();
    setMaskOn(false);
    setMaskDirty(false);
    setMaskExpanded(false);
  }

  async function runMutation(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  // ── 베이스 (프로젝트당 1세트, 교체 방식) ──
  function handleBaseUpload(file: File, kind: "base" | "sketch") {
    void runMutation(async () => {
      const url = await uploadStudioImage(projectId, file, "base");
      await setProjectBase(
        projectId,
        kind === "base" ? { baseUrl: url } : { sketchUrl: url }
      );
    });
  }

  function handleBaseClear(kind: "base" | "sketch") {
    void runMutation(async () => {
      await setProjectBase(
        projectId,
        kind === "base" ? { baseUrl: null } : { sketchUrl: null }
      );
    });
  }

  // ── 가구 라이브러리 (여러 장 동시 업로드) ──
  function handleAssetsUpload(files: File[]) {
    if (files.length === 0) return;
    setError(null);
    setBusy(true);
    setAssetUpload({ done: 0, total: files.length });
    void (async () => {
      try {
        await Promise.all(
          files.map(async (file) => {
            const url = await uploadStudioImage(projectId, file, "assets");
            await registerFurnitureAsset(projectId, url, file.name);
            setAssetUpload((p) => (p ? { ...p, done: p.done + 1 } : p));
          })
        );
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "일부 가구 업로드에 실패했습니다."
        );
      } finally {
        // 실패해도 성공한 장은 반영되도록 항상 새로고침
        router.refresh();
        setBusy(false);
        setAssetUpload(null);
      }
    })();
  }

  function handleAssetDelete(asset: FurnitureAsset) {
    if (!confirm("이 가구를 라이브러리에서 삭제할까요?")) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(asset.id);
      return next;
    });
    void runMutation(() => deleteFurnitureAsset(asset.id, projectId));
  }

  // ── 캔버스 배치: 라이브러리 가구를 스티커로 추가 ──
  function addPlacementTo(
    asset: FurnitureAsset,
    setter: React.Dispatch<React.SetStateAction<CollagePlacement[]>>
  ) {
    const img = new Image();
    img.onload = () => {
      setter((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          assetId: asset.id,
          url: asset.url,
          x: 0.35,
          y: 0.4,
          w: 0.28,
          aspect: img.naturalHeight / img.naturalWidth || 1,
          rot: 0,
        },
      ]);
    };
    img.src = asset.url;
  }

  const addPlacement = (a: FurnitureAsset) => addPlacementTo(a, setPlacements);
  const addEditPlacement = (a: FurnitureAsset) =>
    addPlacementTo(a, setEditPlacements);

  // ── 직접 프롬프트 모드: 추가 이미지 ──
  function toggleRawAsset(asset: FurnitureAsset) {
    setRawExtras((prev) => {
      if (prev.some((x) => x.assetId === asset.id)) {
        return prev.filter((x) => x.assetId !== asset.id);
      }
      if (prev.length >= RAW_MAX_EXTRA_IMAGES) return prev;
      return [...prev, { url: asset.url, assetId: asset.id }];
    });
  }

  function handleRawExtraUpload(files: File[]) {
    const list = files.slice(0, RAW_MAX_EXTRA_IMAGES - rawExtras.length);
    if (list.length === 0) return;
    setError(null);
    setBusy(true);
    setRawUpload({ done: 0, total: list.length });
    void (async () => {
      try {
        await Promise.all(
          list.map(async (file) => {
            const url = await uploadStudioImage(projectId, file, "uploads");
            setRawExtras((prev) =>
              prev.length < RAW_MAX_EXTRA_IMAGES ? [...prev, { url }] : prev
            );
            setRawUpload((p) => (p ? { ...p, done: p.done + 1 } : p));
          })
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
      } finally {
        setBusy(false);
        setRawUpload(null);
      }
    })();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_FURNITURE) next.add(id);
      return next;
    });
  }

  // ── 생성/보정 ──
  function applyGenerateResult(res: Awaited<ReturnType<typeof generateFurniture>>) {
    if (res.success) {
      if (res.fallbacks.length > 0) {
        setFallbacks((prev) => [
          ...res.fallbacks.map((f) => ({
            id: crypto.randomUUID(),
            url: f.url,
            meta: f.meta,
          })),
          ...prev,
        ]);
      }
      setWarning(res.warning ?? null);
      router.refresh();
    } else {
      setError(res.message);
    }
  }

  function handleGenerate() {
    if (!canGenerate) return;
    setError(null);
    setWarning(null);

    startTransition(async () => {
      try {
        let collageUrl: string | undefined;
        let assetIds: string[];

        if (genMode === "collage") {
          // 배치 순서 유지 + 중복 제거 (같은 가구를 여러 번 얹어도 제품 사진은 1장)
          assetIds = [...new Set(placements.map((p) => p.assetId))];
          const file = await compositeCollage(baseUrl!, placements);
          collageUrl = await uploadStudioImage(projectId, file, "uploads");
        } else {
          assetIds = [...selected];
        }

        const res = await generateFurniture({
          projectId,
          assetIds,
          prompt,
          mode: genMode,
          collageUrl,
          model,
          resolution,
          count,
        });
        applyGenerateResult(res);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "생성 준비에 실패했습니다."
        );
      }
    });
  }

  function handleEdit() {
    if (!canEdit || !editBase) return;
    setError(null);
    setWarning(null);

    startTransition(async () => {
      try {
        // 캔버스 배치가 있으면 콜라주 합성본을, 없고 영역 표시가 있으면
        // 원본+표시 합성본을 업로드해 안내 이미지로 전달
        let maskUrl: string | undefined;
        let collageUrl: string | undefined;
        let collageAssetIds: string[] | undefined;
        if (editPlacements.length > 0) {
          collageAssetIds = [...new Set(editPlacements.map((p) => p.assetId))];
          const file = await compositeCollage(editBase.url, editPlacements);
          collageUrl = await uploadStudioImage(projectId, file, "uploads");
        } else if (maskOn && maskDirty) {
          const file = await maskRef.current?.exportAnnotated();
          if (file) {
            maskUrl = await uploadStudioImage(projectId, file, "uploads");
          }
        }

        const res = await editFurniture({
          projectId,
          baseResultId: editBase.resultId,
          baseUrl: editBase.resultId ? undefined : editBase.url,
          editType: "raw",
          instruction: editInstruction,
          extraImages: rawExtras.length > 0 ? rawExtras : undefined,
          maskUrl,
          collageUrl,
          collageAssetIds,
          model,
          resolution,
          count,
        });
        applyGenerateResult(res);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "보정 준비에 실패했습니다."
        );
      }
    });
  }

  // 결과 카드의 "보정" → 해당 결과를 베이스로 편집 탭 진입
  function startEdit(result: FurnitureResult) {
    setError(null);
    setEditBase({ url: result.url, resultId: result.id });
    setEditInstruction("");
    resetMask();
    setEditPlacements([]);
    setTab("edit");
  }

  function handleEditBaseUpload(file: File) {
    void runMutation(async () => {
      const url = await uploadStudioImage(projectId, file, "uploads");
      resetMask();
      setEditPlacements([]);
      setEditBase({ url });
    });
  }

  function handleResultDelete(result: FurnitureResult) {
    if (!confirm("이 결과를 삭제할까요? 팀 전체 화면에서 사라집니다.")) return;
    void runMutation(() => deleteFurnitureResult(result.id, projectId));
  }

  async function download(url: string) {
    try {
      // 원격 public URL 은 a[download] 가 무시되므로 blob 으로 받아 저장
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `furniture-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  // 모델/해상도/장수: 생성·보정 탭 공용
  const commonControls = (
    <>
      <Panel title="모델">
        <div className="space-y-2">
          {IMAGE_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`w-full text-left border p-3 transition-colors ${
                model === m.id
                  ? "border-[#2f2f2f] bg-[#2f2f2f]/[0.03]"
                  : "border-[#e0e0e0] hover:border-[#bbb]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#2f2f2f]">
                  {m.label}
                  {m.id === DEFAULT_MODEL && (
                    <span className="ml-1.5 text-[10px] text-[#999] font-normal">
                      기본
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-[#888]">
                  약 {krwPerImage(m.id, resolution)?.toLocaleString()}원/장
                </span>
              </div>
              <p className="text-[11px] text-[#aaa] mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="해상도">
        {isOpenAIModel(model) ? (
          <p className="text-[12px] text-[#999] py-1.5">
            GPT는 원본 비율·크기에 맞춰 자동으로 정해집니다.
          </p>
        ) : (
          <div className="flex gap-2">
            {RESOLUTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                className={`flex-1 h-[38px] border text-[13px] transition-colors ${
                  resolution === r
                    ? "border-[#2f2f2f] bg-[#2f2f2f] text-white"
                    : "border-[#e0e0e0] text-[#666] hover:border-[#bbb]"
                }`}
              >
                {r}
                {r === DEFAULT_RESOLUTION && (
                  <span className="ml-1 text-[10px] opacity-60">기본</span>
                )}
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="생성 장수">
        <div className="flex gap-2">
          {Array.from({ length: MAX_COUNT }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`flex-1 h-[38px] border text-[13px] transition-colors ${
                count === n
                  ? "border-[#2f2f2f] bg-[#2f2f2f] text-white"
                  : "border-[#e0e0e0] text-[#666] hover:border-[#bbb]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Panel>
    </>
  );

  const costHint =
    krwPerImage(model, resolution) != null
      ? ` · 약 ${(krwPerImage(model, resolution)! * count).toLocaleString()}원`
      : "";

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[1300px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-1">
              Admin · Beta · AI 가구 배치
            </p>
            <h1 className="text-xl font-bold text-[#2f2f2f]">{projectName}</h1>
          </div>
          <Link href="/admin/furniture">
            <Button
              variant="outline"
              className="rounded-none border-[#d0d0d0] text-[12px] tracking-[0.1em] h-[38px] gap-1.5"
            >
              <ArrowLeft size={14} />
              프로젝트 목록
            </Button>
          </Link>
        </div>

        {/* 탭 */}
        <div className="flex gap-6 mb-6 border-b border-[#eee]">
          {(["generate", "edit"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={`pb-2.5 text-[13px] tracking-[0.05em] -mb-px border-b-2 transition-colors ${
                tab === t
                  ? "border-[#2f2f2f] text-[#2f2f2f] font-semibold"
                  : "border-transparent text-[#999] hover:text-[#666]"
              }`}
            >
              {t === "generate" ? "한번에 생성" : "단계별 편집"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* ── 입력 패널 ── */}
          <div className="space-y-5">
            {tab === "generate" ? (
              <>
                {/* 베이스 — 프로젝트에 저장, 팀 공유 */}
                <Panel title="베이스 (프로젝트 공용)">
                  <div className="grid grid-cols-2 gap-3">
                    <ImageSlot
                      label="본사진 (빈 공간) *"
                      url={baseUrl}
                      onPick={(f) => handleBaseUpload(f, "base")}
                      onClear={() => handleBaseClear("base")}
                      onZoom={baseUrl ? () => setLightboxUrl(baseUrl) : undefined}
                    />
                    <ImageSlot
                      label="스케치 배치안"
                      url={sketchUrl}
                      onPick={(f) => handleBaseUpload(f, "sketch")}
                      onClear={() => handleBaseClear("sketch")}
                      onZoom={
                        sketchUrl ? () => setLightboxUrl(sketchUrl) : undefined
                      }
                    />
                  </div>
                  <p className="text-[11px] text-[#aaa] mt-2">
                    <b>본사진</b>: 가구를 채울 실제 빈 공간 사진 (결과의 배경이
                    됩니다). <b>스케치 배치안</b>: 같은 공간을 그린 배치 가이드.
                    프로젝트에 저장되어 팀 전원이 함께 사용합니다. 올리면
                    교체됩니다.
                  </p>
                </Panel>

                {/* 생성 방식 (프롬프트 실험용 토글) */}
                <Panel title="생성 방식">
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "photo", label: "사진 우선", disabled: false, hint: undefined },
                        {
                          id: "sketch",
                          label: "스케치 우선",
                          disabled: !sketchUrl,
                          hint: "스케치 배치안이 필요합니다",
                        },
                        {
                          id: "collage",
                          label: "캔버스 배치",
                          disabled: !baseUrl,
                          hint: "본사진이 필요합니다",
                        },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setGenMode(m.id);
                          // 캔버스 배치는 바로 크게 열어 편집
                          if (m.id === "collage") setCollageExpanded(true);
                        }}
                        disabled={m.disabled}
                        title={m.disabled ? m.hint : undefined}
                        className={`h-[38px] border text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          genMode === m.id
                            ? "border-[#2f2f2f] bg-[#2f2f2f] text-white"
                            : "border-[#e0e0e0] text-[#666] hover:border-[#bbb]"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#aaa] mt-2">
                    <b>사진 우선</b>: 본사진 위에 스케치를 참고해 가구를 얹음
                    (기존). <b>스케치 우선</b>: 스케치 구도에 본사진의
                    색·재질·조명을 입힘. <b>캔버스 배치</b>: 본사진 위에 가구를
                    직접 끌어다 놓은 배치 그대로 실사 생성 — 위치·크기가 가장
                    정확합니다.
                  </p>
                </Panel>

                {/* 캔버스 배치 */}
                {genMode === "collage" && baseUrl && (
                  <Panel title={`캔버스 배치 — ${placements.length}개 얹음`}>
                    <CollageEditor
                      baseUrl={baseUrl}
                      placements={placements}
                      onChange={setPlacements}
                      expanded={collageExpanded}
                      onExpandChange={setCollageExpanded}
                      assets={assets}
                      onAddAsset={addPlacement}
                    />
                    <p className="text-[11px] text-[#aaa] mt-2">
                      가구를 클릭해 올리고, 드래그로 위치·우하단 핸들로 크기·
                      상단 핸들로 회전을 맞추세요. 뒤쪽 가구는 작게 줄이면
                      원근이 그대로 전달되고, 겹칠 때는{" "}
                      <b>뒤에 놓일 가구부터 추가</b>하세요 — 나중에 올린 것이
                      앞(위)에 그려집니다. 이 배치 그대로 실사가 생성됩니다.
                    </p>
                  </Panel>
                )}

                {/* 가구 라이브러리 — 업로드 즉시 저장, 선택해서 생성 */}
                <Panel
                  title={
                    genMode === "collage"
                      ? "가구 라이브러리 — 클릭해 캔버스에 추가 *"
                      : `가구 라이브러리 — ${selected.size}/${MAX_FURNITURE}개 선택 *`
                  }
                >
                  <div className="grid grid-cols-2 gap-3">
                    {assets.map((a) => (
                      <AssetCard
                        key={a.id}
                        asset={a}
                        selected={
                          genMode === "collage"
                            ? placements.some((p) => p.assetId === a.id)
                            : selected.has(a.id)
                        }
                        onToggle={() =>
                          genMode === "collage"
                            ? addPlacement(a)
                            : toggleSelect(a.id)
                        }
                        onDelete={() => handleAssetDelete(a)}
                        onZoom={() => setLightboxUrl(a.url)}
                      />
                    ))}
                    {assetUpload ? (
                      <UploadingSlot done={assetUpload.done} total={assetUpload.total} />
                    ) : (
                      <ImageSlot
                        label="가구 추가"
                        url={null}
                        onPickFiles={handleAssetsUpload}
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[#aaa] mt-2">
                    올린 가구는 프로젝트 라이브러리에 저장됩니다. 여러 장을 한
                    번에 올릴 수 있어요. 카드를 눌러 생성에 쓸 가구를
                    선택하세요. 결과는 오른쪽에 쌓입니다.
                  </p>
                </Panel>

                {/* 텍스트 지시 */}
                <Panel title="원하는 느낌 (선택)">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="한국어로 편하게 적으세요. 예: 따뜻하고 아늑한 느낌으로, 소파는 창가 쪽에 배치"
                    rows={3}
                    className="w-full border border-[#e0e0e0] p-3 text-[13px] resize-none focus:outline-none focus:border-[#2f2f2f]"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {GENERATE_FEEL_EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        title={ex}
                        className="px-2 py-1 border border-[#e0e0e0] text-[11px] text-[#888] hover:border-[#2f2f2f] hover:text-[#2f2f2f] transition-colors"
                      >
                        {ex.length > 24 ? `${ex.slice(0, 24)}…` : ex}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#aaa] mt-2">
                    입력하면 AI가 알아서 최적의 프롬프트로 변환해 적용합니다.
                    예시를 누르면 채워집니다.
                  </p>
                </Panel>

                {commonControls}

                {/* 생성 버튼 */}
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="w-full h-[46px] rounded-none bg-[#2f2f2f] hover:bg-black text-[13px] tracking-[0.1em] gap-2 disabled:opacity-40"
                >
                  {pending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      생성 중… (장당 약 15~20초)
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {count}장 생성
                      <span className="opacity-70">{costHint}</span>
                    </>
                  )}
                </Button>
                {!baseUrl && (
                  <p className="text-[11px] text-[#c00] text-center">
                    본사진을 먼저 등록해야 생성할 수 있습니다.
                  </p>
                )}
              </>
            ) : (
              <>
                {/* ── 보정 입력 ── */}
                <p className="text-[11px] text-[#999] leading-relaxed">
                  추천 흐름: 화가처럼 <b>가장 뒤(안쪽)에 놓일 가구부터</b> 앞
                  순서로 하나씩 추가 → 소품 → 마지막에 해상도를 2K/4K로 올려{" "}
                  <b>매물사진 마무리</b>. 실험은 1K로 싸게, 확정본만 고해상도로.
                  한 번에 한 가지만 시키면 실패가 줄고, 매 단계가 자동
                  저장됩니다.
                </p>

                <Panel title="보정할 이미지 *">
                  {editBase ? (
                    maskOn ? (
                      /* 같은 트리 위치에서 클래스만 바꿔 인라인 ↔ 대형 모달 전환
                         — MaskCanvas 가 리마운트되지 않아 칠한 내용이 유지된다 */
                      <div
                        className={
                          maskExpanded
                            ? "fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
                            : ""
                        }
                        onClick={(e) => {
                          if (maskExpanded && e.target === e.currentTarget)
                            setMaskExpanded(false);
                        }}
                      >
                        <div
                          className={
                            maskExpanded
                              ? "bg-white p-4 w-full max-w-[1100px] max-h-[92vh] overflow-y-auto"
                              : ""
                          }
                        >
                          {maskExpanded && (
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[13px] font-semibold text-[#2f2f2f]">
                                영역 색칠 — 바꿀 곳을 칠하세요
                              </p>
                              <Button
                                onClick={() => setMaskExpanded(false)}
                                className="rounded-none bg-[#2f2f2f] hover:bg-black text-[12px] h-[32px] px-4"
                              >
                                완료
                              </Button>
                            </div>
                          )}
                          <MaskCanvas
                            ref={maskRef}
                            imageUrl={editBase.url}
                            onDirtyChange={setMaskDirty}
                          />
                          {!maskExpanded && (
                            <button
                              onClick={() => setMaskExpanded(true)}
                              className="w-full mt-2 h-[30px] border border-[#e0e0e0] text-[12px] text-[#666] hover:border-[#2f2f2f] hover:text-[#2f2f2f] transition-colors"
                            >
                              크게 색칠하기
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative border border-[#e0e0e0] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editBase.url}
                          alt="보정 베이스"
                          className="w-full aspect-[4/3] object-cover cursor-zoom-in"
                          onClick={() => setLightboxUrl(editBase.url)}
                        />
                        <button
                          onClick={() => {
                            resetMask();
                            setEditPlacements([]);
                            setEditBase(null);
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {baseUrl && (
                        <button
                          onClick={() => {
                            resetMask();
                            setEditInstruction("");
                            setEditBase({ url: baseUrl });
                          }}
                          className="relative aspect-square border border-dashed border-[#d0d0d0] hover:border-[#2f2f2f] overflow-hidden group/start"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={baseUrl}
                            alt="본사진"
                            className="w-full h-full object-cover opacity-60 group-hover/start:opacity-90 transition-opacity"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[11px] py-1.5">
                            빈 본사진에서 시작
                          </span>
                        </button>
                      )}
                      <ImageSlot
                        label="이미지 올리기"
                        url={null}
                        onPick={handleEditBaseUpload}
                      />
                    </div>
                  )}

                  {editBase && editPlacements.length === 0 && (
                    <button
                      onClick={() => {
                        if (maskOn) {
                          resetMask();
                        } else {
                          setMaskOn(true);
                          setMaskExpanded(true); // 켜면 바로 크게 열어 색칠
                        }
                      }}
                      className={`w-full mt-2 h-[34px] border text-[12px] transition-colors ${
                        maskOn
                          ? "border-[#2f2f2f] bg-[#2f2f2f] text-white"
                          : "border-[#e0e0e0] text-[#666] hover:border-[#bbb]"
                      }`}
                    >
                      {maskOn
                        ? "영역 표시 끄기 (표시 삭제)"
                        : "영역 표시 — 바꿀 곳을 색칠"}
                    </button>
                  )}

                  <p className="text-[11px] text-[#aaa] mt-2">
                    생성 결과의 <b>보정</b> 버튼을 누르면 자동으로 채워집니다.
                    완성 이미지를 직접 올려도 됩니다.
                    {editBase && (
                      <>
                        {" "}
                        <b>영역 표시</b>를 켜고 바꿀 부분을 빨갛게 칠하면 그
                        위치가 프롬프트와 함께 정확히 전달됩니다.
                      </>
                    )}
                  </p>
                </Panel>

                {/* 캔버스 배치 — 보정 대상 위에 가구 끌어다 놓기 (색칠과 배타) */}
                {editBase && !maskOn && (
                  <Panel
                    title={`캔버스 배치 (선택) — ${editPlacements.length}개 얹음`}
                  >
                    <CollageEditor
                      baseUrl={editBase.url}
                      placements={editPlacements}
                      onChange={setEditPlacements}
                      expanded={editCollageExpanded}
                      onExpandChange={setEditCollageExpanded}
                      assets={assets}
                      onAddAsset={addEditPlacement}
                    />
                    <p className="text-[11px] text-[#aaa] mt-2">
                      가구를 끌어다 놓으면 배치 콜라주와 제품 원본 사진이
                      프롬프트와 함께 자동 전달됩니다. 뒤쪽 가구는 작게 줄이고,
                      겹칠 때는 <b>뒤에 놓일 가구부터 추가</b>하세요 (나중에
                      올린 것이 앞에 그려짐). 배치를 쓰는 동안 영역 색칠은
                      사용할 수 없습니다.
                    </p>
                  </Panel>
                )}

                <Panel
                  title={`추가 이미지 (선택, ${rawExtras.length}/${RAW_MAX_EXTRA_IMAGES}장)`}
                >
                    <div className="grid grid-cols-2 gap-3">
                      {rawExtras.map((x, i) => (
                        <div
                          key={x.url}
                          className="relative aspect-square border border-[#e0e0e0] overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={x.url}
                            alt={`추가 이미지 ${i + 1}`}
                            onClick={() => setLightboxUrl(x.url)}
                            className="w-full h-full object-cover cursor-zoom-in"
                          />
                          <button
                            onClick={() =>
                              setRawExtras((prev) =>
                                prev.filter((p) => p.url !== x.url)
                              )
                            }
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                          >
                            <X size={13} />
                          </button>
                          <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1">
                            {editPlacements.length > 0
                              ? `추가 ${i + 1}`
                              : `Image ${i + extraStart}`}
                          </span>
                        </div>
                      ))}
                      {rawExtras.length < RAW_MAX_EXTRA_IMAGES &&
                        (rawUpload ? (
                          <UploadingSlot
                            done={rawUpload.done}
                            total={rawUpload.total}
                          />
                        ) : (
                          <ImageSlot
                            label="이미지 추가"
                            url={null}
                            onPickFiles={handleRawExtraUpload}
                          />
                        ))}
                    </div>

                    {assets.length > 0 && (
                      <>
                        <p className="text-[11px] tracking-[0.15em] uppercase text-[#999] mt-4 mb-2">
                          라이브러리에서 선택
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {assets.map((a) => (
                            <AssetCard
                              key={a.id}
                              asset={a}
                              selected={rawExtras.some(
                                (x) => x.assetId === a.id
                              )}
                              onToggle={() => toggleRawAsset(a)}
                              onZoom={() => setLightboxUrl(a.url)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    <p className="text-[11px] text-[#aaa] mt-2">
                      {editPlacements.length > 0
                        ? "배치 콜라주·제품 사진 뒤에 순서대로 함께 전달됩니다."
                        : `보정할 이미지가 Image 1${
                            maskOn && maskDirty ? ", 영역 표시가 Image 2" : ""
                          }, 여기 이미지들이 순서대로 Image ${extraStart}부터 프롬프트와 함께 전달됩니다.`}
                    </p>
                  </Panel>

                <Panel title="프롬프트 * — 입력한 내용이 그대로 전달됩니다">
                  <textarea
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    placeholder={
                      "모델에 전달할 프롬프트를 그대로 입력하세요.\n예: Image 1에서 빨간 표시 영역의 의자를 제거하고, 가려졌던 바닥과 벽을 자연스럽게 복원해줘. 나머지는 전부 그대로 유지."
                    }
                    rows={6}
                    className="w-full border border-[#e0e0e0] p-3 text-[13px] resize-none focus:outline-none focus:border-[#2f2f2f]"
                  />
                  <p className="text-[11px] tracking-[0.15em] uppercase text-[#999] mt-3 mb-1.5">
                    예시 — 누르면 채워집니다
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EDIT_PROMPT_EXAMPLES.map((ex) => (
                      <button
                        key={ex.label}
                        onClick={() => setEditInstruction(ex.text)}
                        title={ex.text}
                        className="px-2 py-1 border border-[#e0e0e0] text-[11px] text-[#888] hover:border-[#2f2f2f] hover:text-[#2f2f2f] transition-colors"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#aaa] mt-2">
                    채워진 예시를 상황에 맞게 고쳐 쓰세요. 팁: 바꿀 것 하나 +
                    &ldquo;나머지는 그대로&rdquo;가 기본 공식입니다.
                  </p>
                </Panel>

                {commonControls}

                {/* 보정 버튼 */}
                <Button
                  onClick={handleEdit}
                  disabled={!canEdit}
                  className="w-full h-[46px] rounded-none bg-[#2f2f2f] hover:bg-black text-[13px] tracking-[0.1em] gap-2 disabled:opacity-40"
                >
                  {pending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      보정 중… (장당 약 15~20초)
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      {count}장 보정
                      <span className="opacity-70">{costHint}</span>
                    </>
                  )}
                </Button>
              </>
            )}
            {busy && (
              <p className="text-[12px] text-[#999] text-center">
                <Loader2 size={12} className="inline animate-spin mr-1" />
                처리 중…
              </p>
            )}
            {error && (
              <p className="text-[12px] text-red-500 text-center">{error}</p>
            )}
            {warning && (
              <p className="text-[12px] text-amber-600 text-center">{warning}</p>
            )}
          </div>

          {/* ── 결과 패널 (프로젝트에 저장 — 팀 공유) ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-[#2f2f2f]">
                결과{" "}
                {results.length + fallbacks.length > 0 &&
                  `(${results.length + fallbacks.length})`}
              </h2>
              <span className="text-[11px] text-[#999]">
                자동 저장 · 팀 전원 공유
              </span>
            </div>

            {results.length === 0 && fallbacks.length === 0 && !pending ? (
              <div className="border border-dashed border-[#e0e0e0] py-32 flex flex-col items-center justify-center text-[#bbb]">
                <ImageIcon size={40} className="mb-3" strokeWidth={1} />
                <p className="text-[13px]">
                  왼쪽에서 이미지를 올리고 생성하면 여기에 저장됩니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 생성 중 스켈레톤 */}
                {pending &&
                  Array.from({ length: count }, (_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="aspect-[4/3] border border-[#e0e0e0] bg-[#f5f5f5] flex items-center justify-center"
                    >
                      <Loader2 size={24} className="animate-spin text-[#ccc]" />
                    </div>
                  ))}

                {/* 저장 실패 폴백 (이 화면에서만 보임) */}
                {fallbacks.map((item) => (
                  <div
                    key={item.id}
                    className="group relative border border-amber-300 overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt="저장 실패 결과"
                      className="w-full aspect-[4/3] object-cover cursor-zoom-in"
                      onClick={() => setLightboxUrl(item.url)}
                    />
                    <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5">
                      저장 실패 — 이 화면에서만 보임
                    </span>
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                      <OverlayButton
                        onClick={() => setLightboxUrl(item.url)}
                        icon={<ZoomIn size={13} />}
                      >
                        크게 보기
                      </OverlayButton>
                      <OverlayButton
                        onClick={() => setDetail(fallbackToDetail(item))}
                        icon={<Info size={13} />}
                      >
                        프롬프트 정보
                      </OverlayButton>
                      <OverlayButton
                        onClick={() => download(item.url)}
                        icon={<Download size={13} />}
                      >
                        다운로드
                      </OverlayButton>
                    </div>
                  </div>
                ))}

                {/* 저장된 결과 */}
                {results.map((item, i) => (
                  <div
                    key={item.id}
                    className="group relative border border-[#e0e0e0] overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={`결과 ${i + 1}`}
                      className="w-full aspect-[4/3] object-cover cursor-zoom-in"
                      onClick={() => setLightboxUrl(item.url)}
                    />
                    {/* 요청사항 배지: 있으면 항상 표시 */}
                    {(commentsByResult[item.id]?.length ?? 0) > 0 && (
                      <button
                        onClick={() => setCommentsFor(item.id)}
                        title="요청사항 보기"
                        className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-[10px] px-1.5 py-1"
                      >
                        <MessageSquare size={11} />
                        {commentsByResult[item.id].length}
                      </button>
                    )}
                    {/* 호버: 검은 오버레이 + 가운데 텍스트 버튼 (오버레이 자체는 클릭 통과 → 이미지 클릭 = 크게 보기) */}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                      <OverlayButton
                        onClick={() => setLightboxUrl(item.url)}
                        icon={<ZoomIn size={13} />}
                      >
                        크게 보기
                      </OverlayButton>
                      <OverlayButton
                        onClick={() => setCommentsFor(item.id)}
                        icon={<MessageSquare size={13} />}
                      >
                        요청사항
                        {(commentsByResult[item.id]?.length ?? 0) > 0 &&
                          ` (${commentsByResult[item.id].length})`}
                      </OverlayButton>
                      <OverlayButton
                        onClick={() => setDetail(resultToDetail(item))}
                        icon={<Info size={13} />}
                      >
                        프롬프트 정보
                      </OverlayButton>
                      <OverlayButton
                        onClick={() => startEdit(item)}
                        icon={<Wand2 size={13} />}
                      >
                        이 이미지 편집
                      </OverlayButton>
                      <OverlayButton
                        onClick={() => download(item.url)}
                        icon={<Download size={13} />}
                      >
                        다운로드
                      </OverlayButton>
                      <OverlayButton
                        danger
                        onClick={() => handleResultDelete(item)}
                        icon={<Trash2 size={13} />}
                      >
                        삭제
                      </OverlayButton>
                    </div>
                    {/* 하단 캡션: 모델·해상도 + 한국어 요구 요약 */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/55 text-white px-2.5 py-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] truncate">
                        {item.user_prompt || "추가 지시 없음"}
                      </span>
                      <span className="text-[10px] text-white/70 shrink-0">
                        {modelLabel(item.model)} · {item.resolution}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {detail && (
        <DetailModal
          item={detail}
          onClose={() => setDetail(null)}
          onDownload={() => download(detail.url)}
          onZoom={setLightboxUrl}
        />
      )}

      {commentsResult && (
        <CommentsModal
          projectId={projectId}
          result={commentsResult}
          comments={commentsByResult[commentsResult.id] ?? []}
          onClose={() => setCommentsFor(null)}
          onZoom={setLightboxUrl}
        />
      )}

      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}

/** 캔버스 배치 에디터: 인라인 ↔ 대형 모달 전환 + 모달 안 가구 추가 스트립 */
function CollageEditor({
  baseUrl,
  placements,
  onChange,
  expanded,
  onExpandChange,
  assets,
  onAddAsset,
}: {
  baseUrl: string;
  placements: CollagePlacement[];
  onChange: (next: CollagePlacement[]) => void;
  expanded: boolean;
  onExpandChange: (v: boolean) => void;
  assets: FurnitureAsset[];
  onAddAsset: (a: FurnitureAsset) => void;
}) {
  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          : ""
      }
      onClick={(e) => {
        if (expanded && e.target === e.currentTarget) onExpandChange(false);
      }}
    >
      <div
        className={
          expanded
            ? "bg-white p-4 w-full max-w-[1200px] max-h-[92vh] overflow-y-auto"
            : ""
        }
      >
        {expanded && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-[#2f2f2f]">
              캔버스 배치 — 가구를 끌어다 놓고 크기·회전을 맞추세요
            </p>
            <Button
              onClick={() => onExpandChange(false)}
              className="rounded-none bg-[#2f2f2f] hover:bg-black text-[12px] h-[32px] px-4"
            >
              완료
            </Button>
          </div>
        )}
        {expanded && assets.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => onAddAsset(a)}
                title={`${a.original_name ?? "가구"} 추가`}
                className="shrink-0 w-14 h-14 border border-[#e0e0e0] hover:border-[#2f2f2f] overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={a.original_name ?? "가구"}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
        <PlacementCanvas
          baseUrl={baseUrl}
          placements={placements}
          onChange={onChange}
        />
        {!expanded && (
          <button
            onClick={() => onExpandChange(true)}
            className="w-full mt-2 h-[30px] border border-[#e0e0e0] text-[12px] text-[#666] hover:border-[#2f2f2f] hover:text-[#2f2f2f] transition-colors"
          >
            크게 배치하기
          </button>
        )}
      </div>
    </div>
  );
}

/** 가구 다중 업로드 진행 슬롯 */
function UploadingSlot({ done, total }: { done: number; total: number }) {
  return (
    <div className="aspect-square border border-dashed border-[#d0d0d0] flex flex-col items-center justify-center gap-1.5 text-[#999]">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-[11px]">
        {done}/{total} 등록 중
      </span>
    </div>
  );
}

/** 전체화면 이미지 뷰어: 배경 클릭·X 로 닫기 */
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="크게 보기"
        className="max-w-full max-h-full object-contain"
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
      >
        <X size={20} />
      </button>
    </div>
  );
}

/** 결과별 요청사항(댓글) 모달 */
function CommentsModal({
  projectId,
  result,
  comments,
  onClose,
  onZoom,
}: {
  projectId: string;
  result: FurnitureResult;
  comments: ResultComment[];
  onClose: () => void;
  onZoom: (url: string) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addResultComment(projectId, result.id, text);
      setDraft("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(commentId: string) {
    if (!confirm("이 요청사항을 삭제할까요?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteResultComment(commentId, projectId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-[520px] w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-[#eee]">
          <h3 className="text-[14px] font-semibold text-[#2f2f2f] flex items-center gap-1.5">
            <MessageSquare size={14} />
            요청사항 {comments.length > 0 && `(${comments.length})`}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#2f2f2f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* 대상 이미지 미리보기 */}
          <div className="p-4 pb-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt="대상 결과"
              onClick={() => onZoom(result.url)}
              className="w-full max-h-[180px] object-cover border border-[#e0e0e0] cursor-zoom-in"
            />
          </div>

          {/* 목록 */}
          <div className="p-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-[12px] text-[#bbb] text-center py-4">
                아직 요청사항이 없습니다. 첫 요청을 남겨보세요.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="border border-[#eee] p-3 group/comment">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[#999]">
                      {c.created_by} ·{" "}
                      {new Date(c.created_at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() => remove(c.id)}
                      title="삭제"
                      className="text-[#ccc] hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-[13px] text-[#2f2f2f] whitespace-pre-wrap">
                    {c.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 입력 */}
        <div className="p-4 border-t border-[#eee]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="예: 소파 색이 실제 제품과 달라요. 좀 더 밝은 브라운으로 보정해 주세요."
            rows={2}
            className="w-full border border-[#e0e0e0] p-3 text-[13px] resize-none focus:outline-none focus:border-[#2f2f2f]"
          />
          {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
          <Button
            onClick={submit}
            disabled={!draft.trim() || saving}
            className="w-full mt-2 rounded-none bg-[#2f2f2f] hover:bg-black text-[12px] h-[38px] gap-1.5 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <MessageSquare size={13} />
            )}
            요청 남기기
          </Button>
        </div>
      </div>
    </div>
  );
}

function modelLabel(id: string): string {
  return IMAGE_MODELS.find((m) => m.id === id)?.label ?? id;
}

// ── 서브 컴포넌트 ──

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#e0e0e0] p-4">
      <p className="text-[11px] tracking-[0.15em] uppercase text-[#999] mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

/** 이미지 호버 오버레이용 텍스트 버튼 (아이콘 + 라벨) */
function OverlayButton({
  onClick,
  icon,
  danger,
  children,
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`pointer-events-auto w-[130px] max-w-[85%] h-[30px] flex items-center justify-center gap-1.5 text-[12px] bg-white/90 hover:bg-white transition-colors ${
        danger ? "text-red-500" : "text-[#2f2f2f]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/** 라이브러리 가구 카드: 클릭 = 선택 토글, 호버 시 🔍 확대 / X 삭제 */
function AssetCard({
  asset,
  selected,
  onToggle,
  onDelete,
  onZoom,
}: {
  asset: FurnitureAsset;
  selected: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onZoom?: () => void;
}) {
  return (
    <div
      className={`relative aspect-square border overflow-hidden cursor-pointer group/asset transition-colors ${
        selected ? "border-[#2f2f2f] ring-1 ring-[#2f2f2f]" : "border-[#e0e0e0]"
      }`}
      onClick={onToggle}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.url}
        alt={asset.original_name ?? "가구"}
        className="w-full h-full object-cover"
      />
      {selected && (
        <span className="absolute top-1.5 left-1.5 w-5 h-5 bg-[#2f2f2f] text-white flex items-center justify-center">
          <Check size={12} />
        </span>
      )}
      {/* 호버: 오버레이 자체는 클릭 통과 → 카드 클릭 = 선택/추가 유지 */}
      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/asset:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
        {onZoom && (
          <OverlayButton onClick={onZoom} icon={<ZoomIn size={12} />}>
            크게 보기
          </OverlayButton>
        )}
        {onDelete && (
          <OverlayButton danger onClick={onDelete} icon={<Trash2 size={12} />}>
            삭제
          </OverlayButton>
        )}
      </div>
      <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate">
        {asset.original_name ?? "가구"}
      </span>
    </div>
  );
}

function ImageSlot({
  label,
  url,
  onPick,
  onPickFiles,
  onClear,
  onZoom,
}: {
  label: string;
  url: string | null;
  onPick?: (file: File) => void;
  /** 지정하면 다중 선택 모드 — 선택된 모든 파일을 한 번에 전달 */
  onPickFiles?: (files: File[]) => void;
  onClear?: () => void;
  onZoom?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) return;
    if (onPickFiles) onPickFiles(files);
    else if (onPick) onPick(files[0]);
  }

  const canReceive = !!(onPick || onPickFiles);
  const dropHandlers = canReceive
    ? {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        },
        onDragLeave: () => setDragOver(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        },
      }
    : {};

  if (url) {
    return (
      <div
        {...dropHandlers}
        className={`relative aspect-square border overflow-hidden group/slot ${
          dragOver
            ? "border-[#2f2f2f] ring-2 ring-[#2f2f2f]/40"
            : "border-[#e0e0e0]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          onClick={onZoom}
          className={`w-full h-full object-cover ${onZoom ? "cursor-zoom-in" : ""}`}
        />
        {/* 호버: 오버레이 자체는 클릭 통과 → 이미지 클릭 = 크게 보기 유지 */}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/slot:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
          {onZoom && (
            <OverlayButton onClick={onZoom} icon={<ZoomIn size={12} />}>
              크게 보기
            </OverlayButton>
          )}
          {onPick && (
            <OverlayButton
              onClick={() => inputRef.current?.click()}
              icon={<Upload size={12} />}
            >
              교체
            </OverlayButton>
          )}
          {onClear && (
            <OverlayButton danger onClick={onClear} icon={<X size={13} />}>
              비우기
            </OverlayButton>
          )}
        </div>
        <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1">
          {label}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={!!onPickFiles}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      {...dropHandlers}
      className={`aspect-square border border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
        dragOver
          ? "border-[#2f2f2f] bg-[#2f2f2f]/[0.04] text-[#2f2f2f]"
          : "border-[#d0d0d0] hover:border-[#2f2f2f] text-[#999] hover:text-[#2f2f2f]"
      }`}
    >
      {(onPick || onPickFiles) && label.includes("추가") ? (
        <Plus size={20} />
      ) : (
        <Upload size={18} />
      )}
      <span className="text-[11px]">
        {dragOver ? "여기에 놓기" : label}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={!!onPickFiles}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}

function DetailModal({
  item,
  onClose,
  onDownload,
  onZoom,
}: {
  item: DetailItem;
  onClose: () => void;
  onDownload: () => void;
  onZoom: (url: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyFull() {
    try {
      await navigator.clipboard.writeText(item.fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 불가 시 무시 */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-[860px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-[#eee] sticky top-0 bg-white">
          <h3 className="text-[14px] font-semibold text-[#2f2f2f]">
            생성 정보
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#2f2f2f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* 이미지 */}
          <div className="bg-[#fafafa] p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt="결과"
              onClick={() => onZoom(item.url)}
              className="max-w-full max-h-[60vh] object-contain cursor-zoom-in"
            />
          </div>

          {/* 메타 */}
          <div className="p-5 space-y-4">
            <Field label="원하는 느낌 (입력)">
              {item.userPrompt ? (
                <p className="text-[13px] text-[#2f2f2f] whitespace-pre-wrap">
                  {item.userPrompt}
                </p>
              ) : (
                <p className="text-[13px] text-[#bbb]">추가 지시 없음</p>
              )}
            </Field>

            {item.enhancedPrompt && (
              <Field label="AI 변환">
                <p className="text-[13px] text-[#555] whitespace-pre-wrap">
                  {item.enhancedPrompt}
                </p>
              </Field>
            )}

            <div className="flex gap-6">
              <Field label="모델">
                <p className="text-[13px] text-[#2f2f2f]">
                  {modelLabel(item.model)}
                </p>
              </Field>
              <Field label="해상도">
                <p className="text-[13px] text-[#2f2f2f]">{item.resolution}</p>
              </Field>
              {item.createdBy && (
                <Field label="생성자">
                  <p className="text-[13px] text-[#2f2f2f]">{item.createdBy}</p>
                </Field>
              )}
            </div>

            {/* 이 결과에 쓰인 입력 이미지 (이력) */}
            {item.inputRefs.length > 0 && (
              <Field label="사용된 입력 이미지">
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {item.inputRefs.map((ref, i) => (
                    <button
                      key={`${ref.url}-${i}`}
                      onClick={() => onZoom(ref.url)}
                      className="relative aspect-square border border-[#e0e0e0] overflow-hidden block cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ref.url}
                        alt={INPUT_ROLE_LABELS[ref.role]}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1 py-0.5">
                        {INPUT_ROLE_LABELS[ref.role]}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <details className="group">
              <summary className="text-[11px] tracking-[0.1em] uppercase text-[#999] cursor-pointer select-none">
                전체 프롬프트 보기
              </summary>
              <pre className="mt-2 text-[11px] text-[#666] whitespace-pre-wrap bg-[#fafafa] border border-[#eee] p-3 leading-relaxed">
                {item.fullPrompt}
              </pre>
            </details>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={copyFull}
                variant="outline"
                className="rounded-none border-[#d0d0d0] text-[12px] h-[36px] gap-1.5 flex-1"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "복사됨" : "프롬프트 복사"}
              </Button>
              <Button
                onClick={onDownload}
                className="rounded-none bg-[#2f2f2f] hover:bg-black text-[12px] h-[36px] gap-1.5 flex-1"
              >
                <Download size={14} />
                다운로드
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.1em] uppercase text-[#999] mb-1">
        {label}
      </p>
      {children}
    </div>
  );
}
