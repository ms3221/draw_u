"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import {
  generateFurnitureImage,
  enhanceUserRequest,
  buildFurniturePrompt,
  buildSketchFirstPrompt,
  buildCollagePrompt,
  analyzeRoomPalette,
  buildEditPrompt,
  type InlineImage,
} from "@/lib/gemini";
import { generateOpenAIFurnitureImage } from "@/lib/openai-image";
import {
  DEFAULT_MODEL,
  DEFAULT_RESOLUTION,
  isValidModel,
  isOpenAIModel,
  isValidResolution,
  isValidEditType,
  editNeedsProduct,
  nearestAspectRatio,
  MAX_COUNT,
  MAX_FURNITURE,
} from "@/lib/gemini-models";
import {
  STUDIO_BUCKET,
  bucketPathFromUrl,
  RAW_MAX_EXTRA_IMAGES,
  type FurnitureResult,
  type InputRef,
} from "./studio-shared";

export type GenerationMeta = {
  userPrompt: string; // 유저가 입력한 원문
  enhancedPrompt: string; // AI가 정제한 한국어 스타일 지시
  fullPrompt: string; // 이미지 모델에 실제 전달된 전체 프롬프트
  model: string;
  resolution: string;
};

/**
 * 생성/보정 응답.
 * saved: DB+storage 에 영구 저장된 결과 (팀 전원 공유).
 * fallbacks: 저장에 실패한 장의 data URL — 생성 비용을 잃지 않도록 화면에는 표시하되
 *            영속화되지 않았음을 warning 으로 알린다. (장별 처리로 응답 4.5MB 초과 방지)
 */
export type GenerateResult =
  | {
      success: true;
      saved: FurnitureResult[];
      fallbacks: { url: string; meta: GenerationMeta }[];
      warning?: string;
    }
  | { success: false; message: string };

export type GenerateInput = {
  projectId: string;
  assetIds: string[];
  prompt: string;
  /**
   * photo(기본) = 본사진을 캔버스로, 스케치는 배치 참고 (기존 방식).
   * sketch(실험) = 스케치의 구도를 캔버스로, 본사진의 재질·색·조명을 입힘.
   *   본사진 색 분석 노트(LLM)를 프롬프트에 함께 주입한다. 스케치 필수.
   * collage(실험) = 유저가 본사진 위에 가구를 직접 배치한 러프 콜라주를
   *   실사로 완성. collageUrl 필수.
   */
  mode?: "photo" | "sketch" | "collage";
  /** collage 모드: 클라이언트가 합성·업로드한 배치 콜라주의 storage URL */
  collageUrl?: string;
  model: string;
  resolution: string;
  count: number;
};

export type EditInput = {
  projectId: string;
  /** 결과 라이브러리의 결과를 베이스로 보정할 때 */
  baseResultId?: string;
  /** 클라이언트가 storage 에 직접 올린 이미지를 베이스로 쓸 때 (furniture-studio 버킷 URL) */
  baseUrl?: string;
  editType: string;
  instruction: string;
  /** add/replace 에 쓸 가구 — 라이브러리 에셋 참조 */
  productAssetId?: string;
  /** raw(직접 프롬프트) 전용: 함께 보낼 추가 이미지 (라이브러리 가구 또는 업로드) */
  extraImages?: { url: string; assetId?: string }[];
  /** 베이스 위에 빨간 브러시로 대상 영역을 칠한 안내 이미지의 storage URL */
  maskUrl?: string;
  /** 베이스 위에 가구를 끌어다 놓은 배치 콜라주의 storage URL (raw 전용) */
  collageUrl?: string;
  /** 콜라주에 배치된 라이브러리 가구 id 들 (제품 원본 사진 자동 첨부용) */
  collageAssetIds?: string[];
  model: string;
  resolution: string;
  count: number;
};

/** 버킷 public URL 에서 이미지 바이트를 내려받아 inline 형식으로 변환 */
async function downloadInline(url: string): Promise<InlineImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`입력 이미지를 불러오지 못했습니다. (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    mimeType: res.headers.get("content-type") || "image/jpeg",
    data: buf.toString("base64"),
  };
}

async function aspectRatioOf(image: InlineImage): Promise<string> {
  try {
    const meta = await sharp(Buffer.from(image.data, "base64")).metadata();
    return nearestAspectRatio(meta.width, meta.height);
  } catch {
    return "16:9";
  }
}

/**
 * 생성 결과 1장을 storage 업로드 + DB insert.
 * 실패하면 null (호출부에서 data URL 폴백 처리 — 생성 비용 유실 방지).
 */
async function saveResult(params: {
  supabase: SupabaseClient;
  projectId: string;
  image: InlineImage;
  kind: "generate" | "edit";
  meta: GenerationMeta;
  inputRefs: InputRef[];
  createdBy: string;
}): Promise<FurnitureResult | null> {
  const { supabase, projectId, image, kind, meta, inputRefs, createdBy } = params;
  try {
    const ext = image.mimeType.includes("jpeg") ? "jpg" : "png";
    const path = `${projectId}/results/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STUDIO_BUCKET)
      .upload(path, Buffer.from(image.data, "base64"), {
        contentType: image.mimeType,
      });
    if (uploadError) return null;

    const {
      data: { publicUrl },
    } = supabase.storage.from(STUDIO_BUCKET).getPublicUrl(path);

    const { data, error } = await supabase
      .from("furniture_results")
      .insert({
        project_id: projectId,
        url: publicUrl,
        kind,
        user_prompt: meta.userPrompt,
        enhanced_prompt: meta.enhancedPrompt,
        full_prompt: meta.fullPrompt,
        model: meta.model,
        resolution: meta.resolution,
        input_refs: inputRefs,
        created_by: createdBy,
      })
      .select("*")
      .single();

    if (error || !data) return null;
    return data as FurnitureResult;
  } catch {
    return null;
  }
}

function toDataUrl(image: InlineImage): string {
  return `data:${image.mimeType};base64,${image.data}`;
}

/** 모델 provider 에 따라 이미지 생성 함수를 라우팅 (시그니처 동일) */
function imageGenerator(model: string) {
  return isOpenAIModel(model)
    ? generateOpenAIFurnitureImage
    : generateFurnitureImage;
}

/** 생성 → 장별 저장. images/meta 를 saved/fallbacks 로 정리하는 공통 마무리 */
async function persistImages(params: {
  supabase: SupabaseClient;
  projectId: string;
  images: InlineImage[];
  kind: "generate" | "edit";
  meta: GenerationMeta;
  inputRefs: InputRef[];
  createdBy: string;
}): Promise<Extract<GenerateResult, { success: true }>> {
  const saved: FurnitureResult[] = [];
  const fallbacks: { url: string; meta: GenerationMeta }[] = [];

  // 장별 순차 저장 — 한 장의 실패가 다른 장에 영향을 주지 않는다
  for (const image of params.images) {
    const row = await saveResult({ ...params, image });
    if (row) saved.push(row);
    else fallbacks.push({ url: toDataUrl(image), meta: params.meta });
  }

  return {
    success: true,
    saved,
    fallbacks,
    warning:
      fallbacks.length > 0
        ? `${fallbacks.length}장은 저장에 실패해 이 화면에서만 보입니다. 필요하면 다운로드해 두세요.`
        : undefined,
  };
}

/**
 * 새로 생성: 프로젝트의 베이스(본사진/스케치) + 라이브러리 가구(참조)로 count 장 생성.
 * 이미지 바이트는 storage 참조로만 주고받아 서버 액션 본문 4.5MB 제한을 우회한다.
 * 결과는 장별로 storage + DB 에 자동 저장된다 (팀 공유).
 */
export async function generateFurniture(
  input: GenerateInput
): Promise<GenerateResult> {
  const { user, supabase } = await requireAdmin();

  const model = input.model || DEFAULT_MODEL;
  if (!isValidModel(model)) {
    return { success: false, message: "지원하지 않는 모델입니다." };
  }
  const resolution = input.resolution || DEFAULT_RESOLUTION;
  if (!isValidResolution(resolution)) {
    return { success: false, message: "지원하지 않는 해상도입니다." };
  }
  const count = Math.min(MAX_COUNT, Math.max(1, Number(input.count) || 1));
  const userPrompt = input.prompt || "";

  const { data: project } = await supabase
    .from("furniture_projects")
    .select("id, base_url, sketch_url")
    .eq("id", input.projectId)
    .single();

  if (!project) return { success: false, message: "프로젝트를 찾을 수 없습니다." };
  if (!project.base_url) {
    return {
      success: false,
      message: "본사진(빈 공간)을 먼저 등록해 주세요.",
    };
  }

  const mode =
    input.mode === "sketch" || input.mode === "collage" ? input.mode : "photo";
  if (mode === "sketch" && !project.sketch_url) {
    return {
      success: false,
      message: "스케치 우선 방식은 스케치 배치안이 등록되어 있어야 합니다.",
    };
  }
  if (mode === "collage" && !bucketPathFromUrl(input.collageUrl)) {
    return {
      success: false,
      message: "배치 콜라주 이미지가 올바르지 않습니다. 다시 시도해 주세요.",
    };
  }

  const assetIds = (input.assetIds ?? []).slice(0, MAX_FURNITURE);
  if (assetIds.length === 0) {
    return { success: false, message: "가구를 1개 이상 선택해 주세요." };
  }

  const { data: assets } = await supabase
    .from("furniture_assets")
    .select("id, url")
    .eq("project_id", input.projectId)
    .in("id", assetIds);

  // 선택 순서 유지 (in() 은 순서를 보장하지 않음)
  const orderedAssets = assetIds
    .map((id) => (assets ?? []).find((a) => a.id === id))
    .filter((a): a is { id: string; url: string } => !!a);

  if (orderedAssets.length === 0) {
    return { success: false, message: "선택한 가구를 찾을 수 없습니다." };
  }

  try {
    const baseImage = await downloadInline(project.base_url);
    const sketchImage = project.sketch_url
      ? await downloadInline(project.sketch_url)
      : null;
    const furnitureImages = await Promise.all(
      orderedAssets.map((a) => downloadInline(a.url))
    );

    const enhancedPrompt = await enhanceUserRequest(userPrompt);

    let images: InlineImage[];
    let prompt: string;
    let aspectRatio: string;

    if (mode === "collage" && input.collageUrl) {
      // 캔버스 배치(실험): 유저가 위치·크기를 픽셀로 지정한 콜라주가 배치 가이드.
      // 이미지 순서: 콜라주 → 깨끗한 본사진 → 가구들 (buildCollagePrompt 와 일치)
      const collageImage = await downloadInline(input.collageUrl);
      images = [collageImage, baseImage, ...furnitureImages];
      prompt = buildCollagePrompt({
        userPrompt: enhancedPrompt,
        furnitureCount: orderedAssets.length,
      });
      aspectRatio = await aspectRatioOf(baseImage);
    } else if (mode === "sketch" && sketchImage) {
      // 스케치 우선(실험): 스케치가 캔버스(구도), 본사진은 재질·색·조명 소스.
      // 본사진 색 분석 노트를 프롬프트에 주입해 재질 이식을 보강한다.
      // 이미지 순서: 스케치 → 본사진 → 가구들 (buildSketchFirstPrompt 와 일치)
      const paletteNotes = await analyzeRoomPalette(baseImage);
      images = [sketchImage, baseImage, ...furnitureImages];
      prompt = buildSketchFirstPrompt({
        userPrompt: enhancedPrompt,
        furnitureCount: orderedAssets.length,
        paletteNotes,
      });
      // 결과 구도가 스케치를 따르므로 출력 비율도 스케치 기준
      aspectRatio = await aspectRatioOf(sketchImage);
    } else {
      // 사진 우선(기존): 이미지 순서: 원본 → (스케치) → 가구들
      images = [
        baseImage,
        ...(sketchImage ? [sketchImage] : []),
        ...furnitureImages,
      ];
      prompt = buildFurniturePrompt({
        hasSketch: !!sketchImage,
        userPrompt: enhancedPrompt,
        furnitureCount: orderedAssets.length,
      });
      aspectRatio = await aspectRatioOf(baseImage);
    }

    const results = await Promise.all(
      Array.from({ length: count }, () =>
        imageGenerator(model)({
          model,
          prompt,
          images,
          imageSize: resolution,
          aspectRatio,
        })
      )
    );

    const generated = results.filter((r): r is InlineImage => r !== null);
    if (generated.length === 0) {
      return {
        success: false,
        message: "이미지를 생성하지 못했습니다. 다시 시도해 주세요.",
      };
    }

    const inputRefs: InputRef[] = [
      ...(mode === "collage" && input.collageUrl
        ? [{ role: "collage", url: input.collageUrl } as InputRef]
        : []),
      { role: "base", url: project.base_url },
      ...(mode !== "collage" && project.sketch_url
        ? [{ role: "sketch", url: project.sketch_url } as InputRef]
        : []),
      ...orderedAssets.map(
        (a): InputRef => ({ role: "furniture", url: a.url, asset_id: a.id })
      ),
    ];

    return await persistImages({
      supabase,
      projectId: input.projectId,
      images: generated,
      kind: "generate",
      meta: { userPrompt, enhancedPrompt, fullPrompt: prompt, model, resolution },
      inputRefs,
      createdBy: user.email ?? "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { success: false, message: `생성 실패: ${msg}` };
  }
}

/**
 * 보정(편집): 저장된 결과(resultId) 또는 storage 에 올린 이미지(baseUrl)를 베이스로,
 * 지정한 변경만 적용해 count 장 생성. add/replace 는 라이브러리 가구(productAssetId)가 필요.
 */
export async function editFurniture(input: EditInput): Promise<GenerateResult> {
  const { user, supabase } = await requireAdmin();

  const model = input.model || DEFAULT_MODEL;
  if (!isValidModel(model)) {
    return { success: false, message: "지원하지 않는 모델입니다." };
  }
  const resolution = input.resolution || DEFAULT_RESOLUTION;
  if (!isValidResolution(resolution)) {
    return { success: false, message: "지원하지 않는 해상도입니다." };
  }
  const count = Math.min(MAX_COUNT, Math.max(1, Number(input.count) || 1));

  const editType = input.editType || "add";
  if (!isValidEditType(editType)) {
    return { success: false, message: "지원하지 않는 보정 유형입니다." };
  }
  const instruction = input.instruction || "";
  const hasMaskInput = !!bucketPathFromUrl(input.maskUrl ?? "");
  const hasCollageInput =
    input.editType === "raw" && !!bucketPathFromUrl(input.collageUrl ?? "");
  // 제거/교체는 빨간 영역 표시만으로도 대상 특정이 가능하다
  const maskSatisfiesText =
    hasMaskInput && (editType === "remove" || editType === "replace");
  if (editType !== "add" && !instruction.trim() && !maskSatisfiesText) {
    return { success: false, message: "보정 내용을 입력해 주세요." };
  }

  // 직접 프롬프트 모드: 유저 입력이 그대로 전달되므로 원본/스케치를 자동 첨부하지
  // 않는다. 대신 유저가 고른 추가 이미지(라이브러리/업로드)를 그대로 함께 보낸다.
  const isRaw = editType === "raw";
  const extras = isRaw
    ? (input.extraImages ?? [])
        .filter((x) => bucketPathFromUrl(x.url))
        .slice(0, RAW_MAX_EXTRA_IMAGES)
    : [];

  // 프로젝트의 원본 빈 공간 사진 + 스케치 — 구도·복원 기준으로 함께 전달
  const { data: project } = await supabase
    .from("furniture_projects")
    .select("id, base_url, sketch_url")
    .eq("id", input.projectId)
    .single();

  if (!project) return { success: false, message: "프로젝트를 찾을 수 없습니다." };

  // 베이스: 저장된 결과 참조 or 클라이언트가 올린 storage URL
  let baseUrl: string | null = null;
  let baseResultId: string | undefined;
  if (input.baseResultId) {
    const { data: baseResult } = await supabase
      .from("furniture_results")
      .select("id, url")
      .eq("id", input.baseResultId)
      .single();
    if (!baseResult) {
      return { success: false, message: "보정할 결과를 찾을 수 없습니다." };
    }
    baseUrl = baseResult.url;
    baseResultId = baseResult.id;
  } else if (input.baseUrl && bucketPathFromUrl(input.baseUrl)) {
    baseUrl = input.baseUrl;
  }
  if (!baseUrl) {
    return { success: false, message: "보정할 베이스 이미지를 선택해 주세요." };
  }

  // 제품: add/replace 는 라이브러리 에셋 참조 필수
  let product: { id: string; url: string } | null = null;
  if (editNeedsProduct(editType)) {
    if (!input.productAssetId) {
      return { success: false, message: "추가/교체할 가구를 선택해 주세요." };
    }
    const { data: asset } = await supabase
      .from("furniture_assets")
      .select("id, url")
      .eq("id", input.productAssetId)
      .eq("project_id", input.projectId)
      .single();
    if (!asset) {
      return { success: false, message: "선택한 가구를 찾을 수 없습니다." };
    }
    product = asset;
  }

  try {
    // 이미지 순서: 보정 대상 → (원본 빈 공간) → (스케치) → (제품)
    // — buildEditPrompt 의 동적 번호 부여 순서와 일치해야 함
    const baseImage = await downloadInline(baseUrl);
    // 배치 콜라주 (raw 전용, 있으면 마스크보다 우선)
    const collageImage = hasCollageInput
      ? await downloadInline(input.collageUrl!)
      : null;
    // 영역 표시는 raw 포함 모든 유형에서 사용 가능 (raw 는 Image 2 로 전달됨)
    const maskImage =
      !collageImage && hasMaskInput
        ? await downloadInline(input.maskUrl!)
        : null;

    // 콜라주에 배치된 제품 원본 사진 자동 첨부 (배치 순서 유지)
    let collageProducts: { id: string; url: string }[] = [];
    if (collageImage && (input.collageAssetIds?.length ?? 0) > 0) {
      const ids = [...new Set(input.collageAssetIds!)];
      const { data: rows } = await supabase
        .from("furniture_assets")
        .select("id, url")
        .eq("project_id", input.projectId)
        .in("id", ids);
      collageProducts = ids
        .map((id) => (rows ?? []).find((a) => a.id === id))
        .filter((a): a is { id: string; url: string } => !!a);
    }
    const collageProductImages = await Promise.all(
      collageProducts.map((a) => downloadInline(a.url))
    );
    const originalImage =
      !isRaw && project.base_url
        ? await downloadInline(project.base_url)
        : null;
    const sketchImage =
      !isRaw && project.sketch_url
        ? await downloadInline(project.sketch_url)
        : null;
    const productImage = product ? await downloadInline(product.url) : null;
    const extraInline = await Promise.all(
      extras.map((x) => downloadInline(x.url))
    );

    // 이미지 순서 — buildEditPrompt 의 번호 부여와 일치해야 함
    // 콜라주: 콜라주 → 깨끗한 보정 대상 → 배치 제품들 → (추가)
    // 그 외: 보정 대상 → (영역 표시) → (원본) → (스케치) → (추가) → (제품)
    const images: InlineImage[] = collageImage
      ? [collageImage, baseImage, ...collageProductImages, ...extraInline]
      : [
          baseImage,
          ...(maskImage ? [maskImage] : []),
          ...(originalImage ? [originalImage] : []),
          ...(sketchImage ? [sketchImage] : []),
          ...extraInline,
          ...(productImage ? [productImage] : []),
        ];
    const aspectRatio = await aspectRatioOf(baseImage);

    const prompt = buildEditPrompt({
      editType,
      instruction,
      hasProduct: !!productImage,
      hasOriginal: !!originalImage,
      hasSketch: !!sketchImage,
      hasMask: !!maskImage,
      hasCollage: !!collageImage,
      productCount: collageProductImages.length,
      extraCount: extraInline.length,
    });

    const results = await Promise.all(
      Array.from({ length: count }, () =>
        imageGenerator(model)({
          model,
          prompt,
          images,
          imageSize: resolution,
          aspectRatio,
        })
      )
    );

    const generated = results.filter((r): r is InlineImage => r !== null);
    if (generated.length === 0) {
      return {
        success: false,
        message: "이미지를 생성하지 못했습니다. 다시 시도해 주세요.",
      };
    }

    const inputRefs: InputRef[] = [
      ...(collageImage && input.collageUrl
        ? [{ role: "collage", url: input.collageUrl } as InputRef]
        : []),
      { role: "edit_base", url: baseUrl, result_id: baseResultId },
      ...collageProducts.map(
        (a): InputRef => ({ role: "furniture", url: a.url, asset_id: a.id })
      ),
      ...(maskImage && input.maskUrl
        ? [{ role: "mask", url: input.maskUrl } as InputRef]
        : []),
      ...(originalImage && project.base_url
        ? [{ role: "base", url: project.base_url } as InputRef]
        : []),
      ...(sketchImage && project.sketch_url
        ? [{ role: "sketch", url: project.sketch_url } as InputRef]
        : []),
      ...extras.map(
        (x): InputRef => ({ role: "extra", url: x.url, asset_id: x.assetId })
      ),
      ...(product
        ? [{ role: "product", url: product.url, asset_id: product.id } as InputRef]
        : []),
    ];

    return await persistImages({
      supabase,
      projectId: input.projectId,
      images: generated,
      kind: "edit",
      meta: {
        userPrompt: instruction,
        enhancedPrompt: "",
        fullPrompt: prompt,
        model,
        resolution,
      },
      inputRefs,
      createdBy: user.email ?? "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { success: false, message: `보정 실패: ${msg}` };
  }
}
