"use server";

import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-auth";
import {
  generateFurnitureImage,
  enhanceUserRequest,
  buildFurniturePrompt,
  buildEditPrompt,
  type InlineImage,
} from "@/lib/gemini";
import {
  DEFAULT_MODEL,
  DEFAULT_RESOLUTION,
  isValidModel,
  isValidResolution,
  isValidEditType,
  editNeedsProduct,
  nearestAspectRatio,
  MAX_COUNT,
  MAX_FURNITURE,
} from "@/lib/gemini-models";

async function fileToInline(file: File): Promise<InlineImage> {
  const buf = Buffer.from(await file.arrayBuffer());
  return {
    mimeType: file.type || "image/jpeg",
    data: buf.toString("base64"),
  };
}

export type GenerationMeta = {
  userPrompt: string; // 유저가 입력한 한국어 원문
  enhancedPrompt: string; // AI가 변환한 영어 스타일 지시
  fullPrompt: string; // 이미지 모델에 실제 전달된 전체 프롬프트
  model: string;
  resolution: string;
};

export type GenerateResult =
  | { success: true; images: string[]; meta: GenerationMeta } // data URL 배열
  | { success: false; message: string };

/**
 * 프로토타입용: 원본 + (스케치) + 가구 이미지를 받아 count 장을 병렬 생성.
 * 결과는 저장하지 않고 data URL 로 바로 반환한다. (영속화는 추후 DB/Storage 연동)
 */
export async function generateFurniture(
  formData: FormData
): Promise<GenerateResult> {
  await requireAdmin();

  const model = (formData.get("model") as string) || DEFAULT_MODEL;
  if (!isValidModel(model)) {
    return { success: false, message: "지원하지 않는 모델입니다." };
  }

  const resolution = (formData.get("resolution") as string) || DEFAULT_RESOLUTION;
  if (!isValidResolution(resolution)) {
    return { success: false, message: "지원하지 않는 해상도입니다." };
  }

  const count = Math.min(
    MAX_COUNT,
    Math.max(1, Number(formData.get("count") || 1))
  );
  const userPrompt = (formData.get("prompt") as string) || "";

  const original = formData.get("original");
  const sketch = formData.get("sketch");
  const furniture = formData
    .getAll("furniture")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_FURNITURE);

  if (!(original instanceof File) || original.size === 0) {
    return { success: false, message: "원본 공간 이미지를 올려주세요." };
  }
  if (furniture.length === 0) {
    return { success: false, message: "가구 이미지를 1장 이상 올려주세요." };
  }

  const hasSketch = sketch instanceof File && sketch.size > 0;

  // 원본(스케치업) 비율을 읽어 출력 비율을 맞춘다. (원본 buffer 는 inline 에도 재사용)
  const originalBuf = Buffer.from(await original.arrayBuffer());
  let aspectRatio = "16:9";
  try {
    const meta = await sharp(originalBuf).metadata();
    aspectRatio = nearestAspectRatio(meta.width, meta.height);
  } catch {
    // 메타 읽기 실패 시 기본값 유지
  }

  // 이미지 순서: 원본 → (스케치) → 가구들  (프롬프트 설명과 일치해야 함)
  const images: InlineImage[] = [
    { mimeType: original.type || "image/jpeg", data: originalBuf.toString("base64") },
  ];
  if (hasSketch) images.push(await fileToInline(sketch as File));
  for (const f of furniture) images.push(await fileToInline(f));

  // 유저 한국어 요구 → 영어 스타일 지시로 변환 (LLM 1회) 후 필수 규칙과 결합
  const enhancedPrompt = await enhanceUserRequest(userPrompt);
  const prompt = buildFurniturePrompt({
    hasSketch,
    userPrompt: enhancedPrompt,
    furnitureCount: furniture.length,
  });

  try {
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        generateFurnitureImage({
          model,
          prompt,
          images,
          imageSize: resolution,
          aspectRatio,
        })
      )
    );

    const dataUrls = results
      .filter((r): r is InlineImage => r !== null)
      .map((r) => `data:${r.mimeType};base64,${r.data}`);

    if (dataUrls.length === 0) {
      return {
        success: false,
        message: "이미지를 생성하지 못했습니다. 다시 시도해 주세요.",
      };
    }

    return {
      success: true,
      images: dataUrls,
      meta: { userPrompt, enhancedPrompt, fullPrompt: prompt, model, resolution },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { success: false, message: `생성 실패: ${msg}` };
  }
}

/**
 * 보정(편집): 이미 완성된 결과 이미지 1장을 베이스로, 지정한 변경만 적용해 count 장 생성.
 * add/replace 는 product(추가·교체할 제품 사진)가 필요하다. 비율은 베이스 이미지 기준.
 */
export async function editFurniture(
  formData: FormData
): Promise<GenerateResult> {
  await requireAdmin();

  const model = (formData.get("model") as string) || DEFAULT_MODEL;
  if (!isValidModel(model)) {
    return { success: false, message: "지원하지 않는 모델입니다." };
  }

  const resolution = (formData.get("resolution") as string) || DEFAULT_RESOLUTION;
  if (!isValidResolution(resolution)) {
    return { success: false, message: "지원하지 않는 해상도입니다." };
  }

  const count = Math.min(
    MAX_COUNT,
    Math.max(1, Number(formData.get("count") || 1))
  );

  const editType = (formData.get("editType") as string) || "add";
  if (!isValidEditType(editType)) {
    return { success: false, message: "지원하지 않는 보정 유형입니다." };
  }

  const instruction = (formData.get("instruction") as string) || "";
  const base = formData.get("base");
  const product = formData.get("product");

  if (!(base instanceof File) || base.size === 0) {
    return { success: false, message: "보정할 베이스 이미지를 올려주세요." };
  }

  const hasProduct = product instanceof File && product.size > 0;
  if (editNeedsProduct(editType) && !hasProduct) {
    return { success: false, message: "추가/교체할 가구 사진을 올려주세요." };
  }
  if (
    (editType === "remove" || editType === "replace" || editType === "retouch") &&
    !instruction.trim()
  ) {
    return { success: false, message: "보정 내용을 입력해 주세요." };
  }

  // 베이스 비율 유지 (baseBuf 는 inline 에도 재사용)
  const baseBuf = Buffer.from(await base.arrayBuffer());
  let aspectRatio = "16:9";
  try {
    const meta = await sharp(baseBuf).metadata();
    aspectRatio = nearestAspectRatio(meta.width, meta.height);
  } catch {
    // 기본값 유지
  }

  // 이미지 순서: 베이스 → (제품)  (프롬프트의 Image 1 / Image 2 와 일치)
  const images: InlineImage[] = [
    { mimeType: base.type || "image/png", data: baseBuf.toString("base64") },
  ];
  if (hasProduct) images.push(await fileToInline(product as File));

  const prompt = buildEditPrompt({ editType, instruction, hasProduct });

  try {
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        generateFurnitureImage({
          model,
          prompt,
          images,
          imageSize: resolution,
          aspectRatio,
        })
      )
    );

    const dataUrls = results
      .filter((r): r is InlineImage => r !== null)
      .map((r) => `data:${r.mimeType};base64,${r.data}`);

    if (dataUrls.length === 0) {
      return {
        success: false,
        message: "이미지를 생성하지 못했습니다. 다시 시도해 주세요.",
      };
    }

    return {
      success: true,
      images: dataUrls,
      meta: {
        userPrompt: instruction,
        enhancedPrompt: "",
        fullPrompt: prompt,
        model,
        resolution,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { success: false, message: `보정 실패: ${msg}` };
  }
}
