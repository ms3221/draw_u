"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Sparkles,
  Download,
  Star,
  Loader2,
  ImageIcon,
  Info,
  Copy,
  Check,
  Wand2,
} from "lucide-react";
import {
  IMAGE_MODELS,
  DEFAULT_MODEL,
  RESOLUTIONS,
  DEFAULT_RESOLUTION,
  krwPerImage,
  MAX_COUNT,
  MAX_FURNITURE,
  EDIT_TYPES,
  editNeedsProduct,
  type Resolution,
  type EditType,
} from "@/lib/gemini-models";
import { generateFurniture, editFurniture, type GenerationMeta } from "./actions";

type Slot = { file: File; url: string };
type ResultItem = { id: string; url: string; meta: GenerationMeta };

// 업로드 전 다운스케일: 원본 스케치업/제품 사진이 수 MB~수천만 px 이라
// server action / Vercel 함수 본문 제한(4.5MB)과 생성 속도에 부담.
// 긴 변 1600px, jpeg 0.85 로 축소 (여러 장이어도 합계가 4.5MB 를 넘지 않도록).
// Nano Banana 는 입력을 내부 리사이즈하므로 이 해상도로도 품질 저하 없음.
const MAX_UPLOAD_SIDE = 1600;
const UPLOAD_QUALITY = 0.85;

async function downscaleImage(file: File): Promise<File> {
  // 브라우저가 디코드 못 하는 포맷(HEIC 등)은 원본을 그대로 사용
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob((b) => res(b), "image/jpeg", UPLOAD_QUALITY)
  );
  if (!blob) return file;

  const name = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

async function readSlot(file: File): Promise<Slot> {
  const resized = await downscaleImage(file);
  return { file: resized, url: URL.createObjectURL(resized) };
}

// data URL(결과 이미지) → File. 보정 베이스로 넘길 때 사용.
async function dataUrlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
}

type Tab = "generate" | "edit";

export default function FurnitureStudio() {
  const [tab, setTab] = useState<Tab>("generate");

  const [original, setOriginal] = useState<Slot | null>(null);
  const [sketch, setSketch] = useState<Slot | null>(null);
  const [furniture, setFurniture] = useState<Slot[]>([]);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [resolution, setResolution] = useState<Resolution>(DEFAULT_RESOLUTION);
  const [count, setCount] = useState(1);

  // 보정(편집) 상태
  const [editBase, setEditBase] = useState<Slot | null>(null);
  const [editType, setEditType] = useState<EditType>("add");
  const [editInstruction, setEditInstruction] = useState("");
  const [editProduct, setEditProduct] = useState<Slot | null>(null);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ResultItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canGenerate = !!original && furniture.length > 0 && !pending;

  const editNeedProduct = editNeedsProduct(editType);
  const editNeedText = editType !== "add"; // remove/replace/retouch 는 지시 필수
  const canEdit =
    !!editBase &&
    (!editNeedProduct || !!editProduct) &&
    (!editNeedText || editInstruction.trim().length > 0) &&
    !pending;

  function pushResults(images: string[], meta: GenerationMeta) {
    const items: ResultItem[] = images.map((url) => ({
      id: crypto.randomUUID(),
      url,
      meta,
    }));
    setResults((prev) => [...items, ...prev]);
  }

  // 결과 카드의 "보정" → 해당 이미지를 베이스로 편집 탭 진입
  async function startEdit(item: ResultItem) {
    setError(null);
    const f = await dataUrlToFile(item.url, `base-${Date.now()}.png`);
    setEditBase(await readSlot(f));
    setEditType("add");
    setEditInstruction("");
    setEditProduct(null);
    setTab("edit");
  }

  function handleEdit() {
    if (!canEdit || !editBase) return;
    setError(null);

    const fd = new FormData();
    fd.set("base", editBase.file);
    if (editProduct) fd.set("product", editProduct.file);
    fd.set("editType", editType);
    fd.set("instruction", editInstruction);
    fd.set("model", model);
    fd.set("resolution", resolution);
    fd.set("count", String(count));

    startTransition(async () => {
      const res = await editFurniture(fd);
      if (res.success) pushResults(res.images, res.meta);
      else setError(res.message);
    });
  }

  function handleGenerate() {
    if (!original || furniture.length === 0) return;
    setError(null);

    const fd = new FormData();
    fd.set("original", original.file);
    if (sketch) fd.set("sketch", sketch.file);
    furniture.forEach((f) => fd.append("furniture", f.file));
    fd.set("prompt", prompt);
    fd.set("model", model);
    fd.set("resolution", resolution);
    fd.set("count", String(count));

    startTransition(async () => {
      const res = await generateFurniture(fd);
      if (res.success) {
        // 새 결과를 앞에 누적 (베스트 고르기 위해 계속 쌓임). 각 결과에 생성 메타 부착.
        const items: ResultItem[] = res.images.map((url) => ({
          id: crypto.randomUUID(),
          url,
          meta: res.meta,
        }));
        setResults((prev) => [...items, ...prev]);
      } else {
        setError(res.message);
      }
    });
  }

  function toggleFav(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function download(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `furniture-${Date.now()}.png`;
    a.click();
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
              Admin · Beta
            </p>
            <h1 className="text-xl font-bold text-[#2f2f2f]">AI 가구 배치</h1>
          </div>
          <Link href="/admin">
            <Button
              variant="outline"
              className="rounded-none border-[#d0d0d0] text-[12px] tracking-[0.1em] h-[38px] gap-1.5"
            >
              <ArrowLeft size={14} />
              홈으로
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
              {t === "generate" ? "새로 생성" : "보정 · 편집"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* ── 입력 패널 ── */}
          <div className="space-y-5">
            {tab === "generate" ? (
              <>
            {/* 베이스 */}
            <Panel title="베이스 (고정)">
              <div className="grid grid-cols-2 gap-3">
                <ImageSlot
                  label="본사진 (빈 공간) *"
                  slot={original}
                  onPick={async (f) => setOriginal(await readSlot(f))}
                  onClear={() => setOriginal(null)}
                />
                <ImageSlot
                  label="스케치 배치안"
                  slot={sketch}
                  onPick={async (f) => setSketch(await readSlot(f))}
                  onClear={() => setSketch(null)}
                />
              </div>
              <p className="text-[11px] text-[#aaa] mt-2">
                <b>본사진</b>: 가구를 채울 실제 빈 공간 사진 (결과의 배경이 됩니다).{" "}
                <b>스케치 배치안</b>: 같은 공간을 그린 배치 가이드 — 어디에 어떤 가구를
                놓을지 참고합니다. 최종 이미지는 본사진 그대로에 아래 가구만
                얹습니다.
              </p>
            </Panel>

            {/* 가구 */}
            <Panel title={`가구 (최대 ${MAX_FURNITURE}장) *`}>
              <div className="grid grid-cols-2 gap-3">
                {furniture.map((s, i) => (
                  <ImageSlot
                    key={s.url}
                    label={`가구 ${i + 1}`}
                    slot={s}
                    onClear={() =>
                      setFurniture((p) => p.filter((_, idx) => idx !== i))
                    }
                  />
                ))}
                {furniture.length < MAX_FURNITURE && (
                  <ImageSlot
                    label="가구 추가"
                    slot={null}
                    onPick={async (f) => {
                      const s = await readSlot(f);
                      setFurniture((p) => [...p, s]);
                    }}
                  />
                )}
              </div>
              <p className="text-[11px] text-[#aaa] mt-2">
                가구만 바꿔가며 여러 번 생성해 보세요. 결과는 오른쪽에 쌓입니다.
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
              <p className="text-[11px] text-[#aaa] mt-2">
                입력하면 AI가 알아서 최적의 영어 프롬프트로 변환해 적용합니다.
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
              </>
            ) : (
              <>
                {/* ── 보정 입력 ── */}
                <Panel title="보정할 이미지 *">
                  {editBase ? (
                    <div className="relative border border-[#e0e0e0] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editBase.url}
                        alt="보정 베이스"
                        className="w-full aspect-[4/3] object-cover"
                      />
                      <button
                        onClick={() => setEditBase(null)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <ImageSlot
                        label="이미지 올리기"
                        slot={null}
                        onPick={async (f) => setEditBase(await readSlot(f))}
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-[#aaa] mt-2">
                    생성 결과의 <b>보정</b> 버튼을 누르면 자동으로 채워집니다. 완성
                    이미지를 직접 올려도 됩니다.
                  </p>
                </Panel>

                <Panel title="보정 유형">
                  <div className="grid grid-cols-2 gap-2">
                    {EDIT_TYPES.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEditType(e.id)}
                        className={`h-[38px] border text-[13px] transition-colors ${
                          editType === e.id
                            ? "border-[#2f2f2f] bg-[#2f2f2f] text-white"
                            : "border-[#e0e0e0] text-[#666] hover:border-[#bbb]"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </Panel>

                {editNeedProduct && (
                  <Panel
                    title={editType === "add" ? "추가할 가구 *" : "교체할 가구 *"}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <ImageSlot
                        label="가구 사진"
                        slot={editProduct}
                        onPick={async (f) => setEditProduct(await readSlot(f))}
                        onClear={() => setEditProduct(null)}
                      />
                    </div>
                  </Panel>
                )}

                <Panel
                  title={`지시${editNeedText ? " *" : " (선택)"} — ${
                    EDIT_TYPES.find((e) => e.id === editType)?.hint ?? ""
                  }`}
                >
                  <textarea
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    placeholder={
                      editType === "add"
                        ? "예: 창가 소파 옆에 / 다이닝 테이블 오른쪽에"
                        : editType === "remove"
                        ? "예: 오른쪽 창가 브라운 소파"
                        : editType === "replace"
                        ? "예: 가운데 다이닝 테이블"
                        : "예: 전체적으로 조금 더 밝고 따뜻한 톤으로"
                    }
                    rows={3}
                    className="w-full border border-[#e0e0e0] p-3 text-[13px] resize-none focus:outline-none focus:border-[#2f2f2f]"
                  />
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
            {error && (
              <p className="text-[12px] text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* ── 결과 패널 ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-[#2f2f2f]">
                결과 {results.length > 0 && `(${results.length})`}
              </h2>
              {favorites.size > 0 && (
                <span className="text-[11px] text-[#999]">
                  ⭐ {favorites.size}장 선택됨
                </span>
              )}
            </div>

            {results.length === 0 && !pending ? (
              <div className="border border-dashed border-[#e0e0e0] py-32 flex flex-col items-center justify-center text-[#bbb]">
                <ImageIcon size={40} className="mb-3" strokeWidth={1} />
                <p className="text-[13px]">
                  왼쪽에서 이미지를 올리고 생성하면 여기에 표시됩니다.
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
                      <Loader2
                        size={24}
                        className="animate-spin text-[#ccc]"
                      />
                    </div>
                  ))}

                {results.map((item, i) => (
                  <div
                    key={item.id}
                    className="group relative border border-[#e0e0e0] overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={`결과 ${i + 1}`}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleFav(item.id)}
                        title="즐겨찾기"
                        className="w-8 h-8 bg-white/90 hover:bg-white flex items-center justify-center"
                      >
                        <Star
                          size={14}
                          className={
                            favorites.has(item.id)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-[#666]"
                          }
                        />
                      </button>
                      <button
                        onClick={() => setDetail(item)}
                        title="프롬프트 정보"
                        className="w-8 h-8 bg-white/90 hover:bg-white flex items-center justify-center"
                      >
                        <Info size={14} className="text-[#666]" />
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        title="이 이미지 보정"
                        className="w-8 h-8 bg-white/90 hover:bg-white flex items-center justify-center"
                      >
                        <Wand2 size={14} className="text-[#666]" />
                      </button>
                      <button
                        onClick={() => download(item.url)}
                        title="다운로드"
                        className="w-8 h-8 bg-white/90 hover:bg-white flex items-center justify-center"
                      >
                        <Download size={14} className="text-[#666]" />
                      </button>
                    </div>
                    {/* 하단 캡션: 모델·해상도 + 한국어 요구 요약 */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/55 text-white px-2.5 py-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] truncate">
                        {item.meta.userPrompt || "추가 지시 없음"}
                      </span>
                      <span className="text-[10px] text-white/70 shrink-0">
                        {modelLabel(item.meta.model)} · {item.meta.resolution}
                      </span>
                    </div>
                    {favorites.has(item.id) && (
                      <div className="absolute top-2 left-2">
                        <Star size={16} className="fill-yellow-400 text-yellow-400" />
                      </div>
                    )}
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
        />
      )}
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

function ImageSlot({
  label,
  slot,
  onPick,
  onClear,
}: {
  label: string;
  slot: Slot | null;
  onPick?: (file: File) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (slot) {
    return (
      <div className="relative aspect-square border border-[#e0e0e0] overflow-hidden group/slot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slot.url} alt={label} className="w-full h-full object-cover" />
        {onClear && (
          <button
            onClick={onClear}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
          >
            <X size={13} />
          </button>
        )}
        <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1">
          {label}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      className="aspect-square border border-dashed border-[#d0d0d0] hover:border-[#2f2f2f] flex flex-col items-center justify-center gap-1 text-[#999] hover:text-[#2f2f2f] transition-colors"
    >
      {onPick && label.includes("추가") ? (
        <Plus size={20} />
      ) : (
        <Upload size={18} />
      )}
      <span className="text-[11px]">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && onPick) onPick(f);
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
}: {
  item: ResultItem;
  onClose: () => void;
  onDownload: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyFull() {
    try {
      await navigator.clipboard.writeText(item.meta.fullPrompt);
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
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>

          {/* 메타 */}
          <div className="p-5 space-y-4">
            <Field label="원하는 느낌 (입력)">
              {item.meta.userPrompt ? (
                <p className="text-[13px] text-[#2f2f2f] whitespace-pre-wrap">
                  {item.meta.userPrompt}
                </p>
              ) : (
                <p className="text-[13px] text-[#bbb]">추가 지시 없음</p>
              )}
            </Field>

            {item.meta.enhancedPrompt && (
              <Field label="AI 변환 (영어)">
                <p className="text-[13px] text-[#555] whitespace-pre-wrap">
                  {item.meta.enhancedPrompt}
                </p>
              </Field>
            )}

            <div className="flex gap-6">
              <Field label="모델">
                <p className="text-[13px] text-[#2f2f2f]">
                  {modelLabel(item.meta.model)}
                </p>
              </Field>
              <Field label="해상도">
                <p className="text-[13px] text-[#2f2f2f]">
                  {item.meta.resolution}
                </p>
              </Field>
            </div>

            <details className="group">
              <summary className="text-[11px] tracking-[0.1em] uppercase text-[#999] cursor-pointer select-none">
                전체 프롬프트 보기
              </summary>
              <pre className="mt-2 text-[11px] text-[#666] whitespace-pre-wrap bg-[#fafafa] border border-[#eee] p-3 leading-relaxed">
                {item.meta.fullPrompt}
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
