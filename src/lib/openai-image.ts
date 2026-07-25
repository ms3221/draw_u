import "server-only";

import type { InlineImage } from "@/lib/gemini";

// OpenAI gpt-image-2 이미지 편집(/v1/images/edits) 호출.
// Gemini 쪽 generateFurnitureImage 와 동일한 시그니처로, actions 에서 모델에 따라
// 라우팅만 바꿔 재사용한다. 프롬프트의 "Image 1..N" 지칭 방식은 공식 가이드와 동일.

const EDITS_URL = "https://api.openai.com/v1/images/edits";

// gpt-image-2 size 제약: 양변 16의 배수, 장변 ≤3840, 총픽셀 655,360~8,294,400
const MIN_PIXELS = 655_360;
const MAX_PIXELS = 8_294_400;
const MAX_EDGE = 3840;

function round16(v: number): number {
  return Math.max(16, Math.round(v / 16) * 16);
}

/** 해상도(1K/2K/4K) + 비율 라벨("16:9")을 gpt-image-2 size 문자열로 변환 */
export function openAISizeFor(imageSize: string, aspectRatio?: string): string {
  const long = imageSize === "4K" ? 3840 : imageSize === "2K" ? 2048 : 1024;

  let ratio = 16 / 9; // width / height
  if (aspectRatio) {
    const [a, b] = aspectRatio.split(":").map(Number);
    if (a && b) ratio = a / b;
  }

  let w = ratio >= 1 ? long : long * ratio;
  let h = ratio >= 1 ? long / ratio : long;

  // 총픽셀 범위로 스케일 보정 (극단 비율의 1K 가 최소치 미달하는 경우 등)
  const pixels = w * h;
  if (pixels < MIN_PIXELS) {
    const f = Math.sqrt(MIN_PIXELS / pixels);
    w *= f;
    h *= f;
  } else if (pixels > MAX_PIXELS) {
    const f = Math.sqrt(MAX_PIXELS / pixels);
    w *= f;
    h *= f;
  }

  w = Math.min(round16(w), MAX_EDGE);
  h = Math.min(round16(h), MAX_EDGE);
  return `${w}x${h}`;
}

/**
 * gpt-image-2 로 이미지 편집/합성 1장 생성.
 * 품질은 medium 고정 (비용·속도 균형 — 필요 시 여기서 조정).
 */
export async function generateOpenAIFurnitureImage(params: {
  model: string;
  prompt: string;
  images: InlineImage[];
  imageSize: string;
  aspectRatio?: string;
}): Promise<InlineImage | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 가 설정되지 않았습니다. (.env 에 추가 필요)");
  }

  const form = new FormData();
  form.append("model", params.model);
  form.append("prompt", params.prompt);
  form.append("size", openAISizeFor(params.imageSize, params.aspectRatio));
  form.append("quality", "medium");
  form.append("n", "1");
  params.images.forEach((img, i) => {
    const ext = img.mimeType.includes("png") ? "png" : "jpg";
    form.append(
      "image[]",
      new Blob([Buffer.from(img.data, "base64")], { type: img.mimeType }),
      `input-${i + 1}.${ext}`
    );
  });

  const res = await fetch(EDITS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenAI 이미지 생성 실패 (${res.status}): ${body.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as {
    data?: { b64_json?: string }[];
  };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) return null;

  return { mimeType: "image/png", data: b64 };
}
