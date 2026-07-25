import "server-only";

import type { InlineImage } from "@/lib/gemini";

// OpenAI gpt-image-2 이미지 편집(/v1/images/edits) 호출.
// Gemini 쪽 generateFurnitureImage 와 동일한 시그니처로, actions 에서 모델에 따라
// 라우팅만 바꿔 재사용한다. 프롬프트의 "Image 1..N" 지칭 방식은 공식 가이드와 동일.
// size 는 지정하지 않는다 (auto) — 출력 비율·크기를 입력 이미지에 맞춰 모델이 정하므로
// UI 의 해상도 선택은 GPT 모델에서 사용하지 않는다.

const EDITS_URL = "https://api.openai.com/v1/images/edits";

/**
 * gpt-image-2 로 이미지 편집/합성 1장 생성.
 * 품질은 medium 고정, 크기는 auto (비용·속도 균형 — 필요 시 여기서 조정).
 */
export async function generateOpenAIFurnitureImage(params: {
  model: string;
  prompt: string;
  images: InlineImage[];
  imageSize: string; // Gemini 와 시그니처 통일용 — GPT 에선 미사용 (auto)
  aspectRatio?: string;
}): Promise<InlineImage | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 가 설정되지 않았습니다. (.env 에 추가 필요)");
  }

  const form = new FormData();
  form.append("model", params.model);
  form.append("prompt", params.prompt);
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
