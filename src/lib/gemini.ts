import "server-only";

import { GoogleGenAI } from "@google/genai";

export type InlineImage = { mimeType: string; data: string }; // data = base64

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY 가 설정되지 않았습니다.");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/**
 * 공간 + (스케치) + 가구 이미지를 받아 가구가 배치된 인테리어 합성 이미지 1장을 생성한다.
 * 이미지 순서는 프롬프트에서 설명한 순서(원본 → 스케치 → 가구들)와 일치해야 한다.
 */
export async function generateFurnitureImage(params: {
  model: string;
  prompt: string;
  images: InlineImage[];
  imageSize: string; // "1K" | "2K" | "4K"
  aspectRatio?: string; // "16:9" 등. 지정 시 출력 비율 고정(원본 공간 비율 따라가기)
}): Promise<InlineImage | null> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: params.model,
    contents: [
      {
        role: "user",
        parts: [
          { text: params.prompt },
          ...params.images.map((img) => ({ inlineData: img })),
        ],
      },
    ],
    config: {
      imageConfig: {
        imageSize: params.imageSize,
        ...(params.aspectRatio ? { aspectRatio: params.aspectRatio } : {}),
      },
    },
  });

  const parts = res.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        mimeType: part.inlineData.mimeType ?? "image/png",
        data: part.inlineData.data,
      };
    }
  }
  return null;
}

/**
 * 합성 지시 프롬프트 구성.
 * 전제(실전 검증):
 *  - Image 1 = 본사진(실제 빈 공간 실사). 최종 결과의 베이스/배경이며 구조·조명·카메라를 그대로 유지.
 *  - hasSketch=true 면 Image 2 = 스케치 배치안(같은 공간을 다른 툴로 그린 배치 가이드). 배치 위치 참고용.
 *  - 나머지 = 실제 가구 제품 사진.
 * 실제 빈 공간 위에 실제 가구를, 스케치가 지시하는 위치에 자연스럽게 얹는다.
 */
export function buildFurniturePrompt(opts: {
  hasSketch: boolean;
  userPrompt: string;
  furnitureCount?: number;
}): string {
  // 핵심: ① 본사진(실사) = 불변의 베이스/배경 ② 스케치 = 배치 가이드(룩·색·조명은 무시)
  // ③ 제품 외형/색 충실도(제품 사진 기준, 스케치 색 아님) ④ 실사 톤·자연스러운 그림자
  // ⑤ 커튼 종류/창밖 뷰/채광·시간대 등 본사진 그대로. 영어로 작성해 지시 이행도를 높인다.
  const lines: string[] = [
    "You are an expert interior visualization artist. Add real furniture into a real photograph of an empty room, producing ONE photorealistic photo of that exact room, now furnished.",
    "",
    "Provided images, in order:",
    "- Image 1: A REAL photograph of the actual EMPTY room. This is the base scene and background. Keep its architecture, walls, windows, curtains, window view, floor, ceiling, built-in kitchen and cabinetry, lighting and the CAMERA VIEWPOINT exactly as-is. The final image must look like this same photograph, only with furniture added.",
  ];

  const furnitureLine =
    opts.furnitureCount && opts.furnitureCount > 0
      ? `- The following ${opts.furnitureCount} images: the REAL product photos of the furniture to place, given in placement order.`
      : "- The remaining images: the REAL product photos of the furniture to place.";

  if (opts.hasSketch) {
    lines.push(
      "- Image 2: A layout sketch / SketchUp draft of the SAME room, showing the intended furniture arrangement — where each piece sits, its orientation and scale. Use it ONLY as a placement guide. Do NOT copy its sketch/line-render look, its lighting, or its colors into the final image.",
      furnitureLine
    );
  } else {
    lines.push(furnitureLine);
  }

  lines.push(
    "",
    "Your task:",
    opts.hasSketch
      ? "- Place the real furniture into the real room (Image 1) at the positions, orientations and scale indicated by the sketch (Image 2)."
      : "- Place the real furniture into the real room (Image 1) with a natural, well-balanced interior layout that fits the space and its perspective.",
    "- Reproduce each product's true design, shape, color, material, texture and proportions EXACTLY from its product photo. Do not redesign or recolor. Take colors from the product photos, NOT from the sketch.",
    "- Keep everything about the real room photo unchanged: same walls, same curtains (if they are sheer, keep them sheer — do not make them heavy/opaque), same window and outdoor view, same bright daylight and color temperature, same camera angle. Do not change the time of day or invent a new view.",
    "- Render natural soft shadows and believable contact shadows so each piece is grounded on the floor, matching the room's existing light direction. No sketch outlines, no compositing artifacts, no text, no watermark, no logo, no border, no deformed shapes.",
    "- Output ONE cohesive, photorealistic interior photograph.",
  );

  if (opts.userPrompt.trim()) {
    lines.push(
      "",
      "Desired style and placement (apply these while strictly keeping all rules above):",
      opts.userPrompt.trim()
    );
  }

  return lines.join("\n");
}

/**
 * 보정(편집) 프롬프트 구성.
 * Image 1 = 이미 완성된 실사 결과(베이스). 지정한 변경만 적용하고 나머지는 그대로 유지한다.
 * add/replace 는 Image 2 로 제품 사진이 추가된다.
 */
export function buildEditPrompt(opts: {
  editType: string;
  instruction: string;
  hasProduct: boolean;
}): string {
  const inst = opts.instruction.trim();

  const head = [
    "Image 1 is a finished, photorealistic interior photograph of a furnished room.",
    "Apply ONLY the change described below. Keep everything else in the photo exactly identical — the same room, walls, windows, curtains, floor, ceiling, built-in cabinetry, ALL other furniture, the lighting, color temperature and the camera viewpoint must not change.",
    "",
  ];

  const body: string[] = [];
  switch (opts.editType) {
    case "add":
      body.push(
        "Image 2 is a REAL product photo of a furniture item.",
        `ADD this item into the room${inst ? `, positioned as follows: ${inst}` : ", placed naturally in a suitable empty spot"}.`,
        "Match the room's perspective, realistic scale, lighting direction and color temperature, with a soft, believable contact shadow grounding it on the floor.",
        "Reproduce the item's true design, shape, color, material and texture EXACTLY as in Image 2. Do not restyle or recolor it."
      );
      break;
    case "remove":
      body.push(
        `REMOVE the following from the photo: ${inst || "the item indicated"}.`,
        "Realistically reconstruct whatever would be behind and underneath it — floor, rug, wall, curtains, window/view — so the area looks natural, as if that item had never been there."
      );
      break;
    case "replace":
      body.push(
        "Image 2 is a REAL product photo of a furniture item.",
        `REPLACE the following item in the photo — ${inst || "the item indicated"} — with the product shown in Image 2, keeping the SAME position, orientation and scale.`,
        "Match the room's perspective, lighting and shadows. Reproduce the new item's true design, shape, color, material and texture EXACTLY as in Image 2. Do not restyle or recolor it."
      );
      break;
    case "retouch":
    default:
      body.push(
        `Apply this adjustment to the photograph: ${inst}.`,
        "Do NOT add, remove, move or restyle any furniture. Keep the layout, all furniture and the composition identical; only adjust the requested aspect (such as lighting, tone or color mood)."
      );
      break;
  }

  const tail = [
    "",
    "Output ONE cohesive, photorealistic interior photograph. No text, no watermark, no logo, no border, no compositing artifacts.",
  ];

  return [...head, ...body, ...tail].join("\n");
}

// 텍스트 모델: 한국어 요구를 영어 스타일 지시로 변환할 때 사용.
// gemini-3.5-flash = 최신 안정 flash (공식 권장: 빠르고 저렴 + Gemini 3 지능).
const ENHANCE_MODEL = "gemini-3.5-flash";

const ENHANCE_SYSTEM = [
  "You are a prompt engineer for an interior image-editing model (Nano Banana).",
  "Convert the user's request (usually Korean) into concise ENGLISH instructions that describe ONLY the user's desired result: mood/atmosphere, furniture placement and orientation, materials/colors they want, and lighting feel.",
  "Rules for your output:",
  "- Use short, comma-separated phrases. Be specific, avoid vague words.",
  "- Do NOT include rules about preserving the room or furniture fidelity — those are handled separately.",
  "- Do NOT introduce contradictions (e.g. 'minimal empty room' + 'lots of decor').",
  "- Do NOT invent furniture or details the user did not ask for.",
  "- Output ONLY the English instruction phrases, no preamble, no quotes, no explanation.",
].join("\n");

/**
 * 유저의 한국어 요구사항을 베스트 프랙티스 영어 스타일 지시로 변환한다.
 * 비어 있으면 빈 문자열, 실패하면 원문을 그대로 반환(폴백).
 */
export async function enhanceUserRequest(koreanRequest: string): Promise<string> {
  const text = koreanRequest.trim();
  if (!text) return "";

  try {
    const ai = getClient();
    const res = await ai.models.generateContent({
      model: ENHANCE_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `${ENHANCE_SYSTEM}\n\nUser request:\n${text}` }],
        },
      ],
    });
    const out = (res.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text)
      .filter(Boolean)
      .join(" ")
      .trim();
    return out || text;
  } catch {
    // 변환 실패 시 원문 한국어를 그대로 사용 (이미지 모델도 한국어 일부 이해)
    return text;
  }
}

/**
 * 최종 프롬프트 조립: 불변의 필수 규칙(코드 고정) + 유저 요구(LLM 영어 변환).
 */
export async function composeFurniturePrompt(opts: {
  hasSketch: boolean;
  userPrompt: string;
}): Promise<string> {
  const enhanced = await enhanceUserRequest(opts.userPrompt);
  return buildFurniturePrompt({ hasSketch: opts.hasSketch, userPrompt: enhanced });
}
