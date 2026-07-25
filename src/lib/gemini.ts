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
  // ⑤ 구조·설비(콘센트/스위치/손잡이, 조명 on/off)·광질·WB는 본사진 그대로 보존
  //    — 무드 지시("시그니처 채광")를 프롬프트에 넣으면 원본 보존과 충돌해 방을 새로 그림.
  //      룩 통일은 후처리(P1-1 색 그레이딩)에서 담당. docs/furniture-studio/02-improvement-prd.md 참조.
  // 한국어 테스트 버전 (2026-07-15) — 결과 검증 후 영문 전환 여부 결정.
  const lines: string[] = [
    "당신은 인테리어 시각화 전문 아티스트입니다. 실제 빈 공간의 사진에 실제 가구를 배치해서, 바로 그 공간에 가구가 놓인 실사 사진 1장을 만들어 주세요.",
    "",
    "제공되는 이미지 (순서대로):",
    "- Image 1: 실제 '빈 공간'을 촬영한 실사 사진입니다. 최종 결과물의 베이스이자 배경입니다. 건축 구조, 벽, 창문, 커튼, 창밖 풍경, 바닥, 천장, 빌트인 주방과 수납장, 조명 기구(각 조명의 켜짐/꺼짐 상태 포함), 그리고 카메라 시점을 정확히 그대로 유지하세요. 최종 이미지는 이 사진 그대로에 가구만 추가된 모습이어야 합니다.",
  ];

  const furnitureLine =
    opts.furnitureCount && opts.furnitureCount > 0
      ? `- 이후 ${opts.furnitureCount}장: 배치할 가구의 실제 제품 사진입니다 (배치 순서대로 제공).`
      : "- 나머지 이미지들: 배치할 가구의 실제 제품 사진입니다.";

  if (opts.hasSketch) {
    lines.push(
      "- Image 2: 같은 공간의 가구 배치 스케치(스케치업 시안)입니다. 각 가구가 어디에 놓이는지, 방향과 크기를 보여줍니다. 오직 배치 가이드로만 사용하세요. 스케치의 선·렌더링 느낌, 조명, 색감을 최종 이미지에 절대 가져오지 마세요.",
      furnitureLine
    );
  } else {
    lines.push(furnitureLine);
  }

  lines.push(
    "",
    "작업 내용:",
    opts.hasSketch
      ? "- 스케치(Image 2)가 지시하는 위치·방향·크기 그대로, 실제 공간(Image 1)에 실제 가구를 배치하세요."
      : "- 실제 공간(Image 1)의 구조와 원근에 어울리는 자연스럽고 균형 잡힌 배치로 실제 가구를 배치하세요.",
    "- 각 제품의 실제 디자인·형태·색상·소재·질감·비율을 제품 사진 그대로 정확히 재현하세요. 디자인을 바꾸거나 색을 바꾸지 마세요. 색상은 스케치가 아니라 제품 사진에서 가져오세요.",
    "- 원본 공간 사진의 모든 것을 그대로 유지하세요: 같은 벽, 같은 커튼(얇은 셰어 커튼이면 그대로 얇게 — 두껍거나 불투명하게 바꾸지 말 것), 같은 창문과 창밖 풍경, 같은 카메라 각도. 시간대를 바꾸거나 없던 풍경을 만들어내지 마세요.",
    "- Image 1의 모든 소형 설비를 정확히 보존하세요 — 콘센트, 조명 스위치, 문·서랍 손잡이, 환기구, 라디에이터, 화재감지기: 위치·형태·개수를 그대로 유지. Image 1에서 꺼져 있는 조명은 반드시 꺼진 상태로 두세요. 램프, 천장 조명, LED 스트립을 켜지 마세요.",
    "- Image 1의 조명, 화이트밸런스, 색온도를 정확히 따르세요. 핑크·마젠타 색 편향, 색 보정(그레이딩)이나 필터 느낌을 절대 적용하지 마세요.",
    "- 각 가구가 바닥에 자연스럽게 놓여 보이도록, 공간의 기존 빛 방향과 일치하는 부드러운 그림자와 사실적인 접지 그림자를 렌더링하세요. 스케치 외곽선, 합성 흔적, 텍스트, 워터마크, 로고, 테두리, 왜곡된 형태는 금지입니다.",
    "- 하나로 자연스럽게 어우러진 실사 인테리어 사진 1장을 출력하세요.",
  );

  if (opts.userPrompt.trim()) {
    lines.push(
      "",
      "원하는 스타일과 배치 (위의 모든 규칙을 엄격히 지키면서 적용하세요):",
      opts.userPrompt.trim()
    );
  }

  return lines.join("\n");
}

/**
 * 스케치 우선 생성 프롬프트 (실험, 영어).
 * 발상: 사진에 스케치를 "번역"해 얹는 대신, 스케치의 구도·배치를 캔버스로 쓰고
 * 그 위에 본사진의 재질·색·조명을 입힌다 — 배치 정확도는 스케치에서 공짜로 얻는다.
 * 이미지 순서(코드와 일치): Image 1 = 스케치, Image 2 = 본사진(빈 공간), 이후 = 가구들.
 * paletteNotes = 본사진을 LLM 으로 분석한 재질·색·조명 영문 노트 (텍스트 지시가
 * 이미지 참조보다 준수율이 높아 재질 이식을 보강한다).
 */
export function buildSketchFirstPrompt(opts: {
  userPrompt: string;
  furnitureCount: number;
  paletteNotes?: string;
}): string {
  const lines: string[] = [
    "Create one photorealistic interior photograph.",
    "",
    "Image 1 is a layout sketch of a room. It defines the final composition exactly: the camera angle, the room geometry, and where each furniture piece sits — its position, orientation and size. Follow this layout precisely.",
    "",
    "Image 2 is a real photograph of the same room, empty. Take all visual reality from it: the actual wall, floor and ceiling materials and colors, the windows and the view outside them, the curtains, built-in cabinetry, small fixtures, and the natural lighting, white balance and the on/off state of every light.",
    "",
    `The remaining ${opts.furnitureCount} image(s) are real product photos of the furniture, in the order they appear in the layout.`,
    "",
    "Re-render the sketch as a real photograph of this room: composition from Image 1, surfaces and lighting from Image 2, and every furniture piece replaced with its real product — exact design, shape, color, material and texture from its product photo — grounded with soft, realistic contact shadows that match the room's light direction. The result is a clean photograph with no sketch lines, text, watermark or border.",
  ];

  if (opts.paletteNotes?.trim()) {
    lines.push(
      "",
      "Room material and lighting notes, extracted from the photograph (treat as ground truth):",
      opts.paletteNotes.trim()
    );
  }

  if (opts.userPrompt.trim()) {
    lines.push("", "Style request:", opts.userPrompt.trim());
  }

  return lines.join("\n");
}

/**
 * 캔버스 배치(러프 콜라주) 생성 프롬프트 (영어).
 * 유저가 본사진 위에 제품 사진을 직접 얹어 위치·크기를 픽셀로 지정한 콜라주를
 * 실사로 완성시킨다 — 배치 번역이 필요 없어 위치·크기 모호함이 없다.
 * 이미지 순서(코드와 일치): Image 1 = 콜라주, Image 2 = 깨끗한 본사진, 이후 = 제품 사진들.
 */
export function buildCollagePrompt(opts: {
  userPrompt: string;
  furnitureCount: number;
}): string {
  const lines: string[] = [
    "Create one photorealistic interior photograph.",
    "",
    "Image 1 is a rough placement collage: real product photos have been pasted flat onto a photograph of a room to show exactly where each product goes and how large it should be. The pasted cutouts look unnatural on purpose — they are only a placement guide.",
    "",
    "Image 2 is the same room photograph, clean and without any pasted cutouts.",
    "",
    `The remaining ${opts.furnitureCount} image(s) are the original product photos of the pasted furniture.`,
    "",
    "Re-render the collage as one natural photograph:",
    "- Keep every product exactly at the position and size shown in Image 1.",
    "- Integrate each product realistically into the room: correct perspective for its position, lighting direction and color temperature taken from the room, and soft, realistic contact shadows grounding it on the floor.",
    "- Reproduce each product's true design, shape, color, material and texture from its original product photo.",
    "- Where a pasted cutout covered the background (including its white backdrop), restore the room using Image 2.",
    "- Keep the room itself exactly as in Image 2: same architecture, walls, windows, curtains, view outside, floor, ceiling, built-in cabinetry, small fixtures, the on/off state of every light, white balance and camera viewpoint.",
    "- The result is a clean photograph with no cutout edges, text, watermark or border.",
  ];

  if (opts.userPrompt.trim()) {
    lines.push("", "Style request:", opts.userPrompt.trim());
  }

  return lines.join("\n");
}

// 본사진 재질·색·조명 분석 지시 (스케치 우선 모드 보조)
const PALETTE_SYSTEM = [
  "You are an interior visualization assistant. Analyze this photograph of an empty room.",
  "Describe, in concise English prose (max 120 words), the exact visual facts a renderer needs:",
  "wall / floor / ceiling colors and materials, curtains, windows and what is visible outside,",
  "built-in cabinetry, each light source and whether it is on or off, the direction of light,",
  "color temperature and white balance.",
  "State only what is visible. Output plain prose only, no preamble.",
].join(" ");

/**
 * 본사진에서 재질·색·조명 노트를 추출한다 (영문). 실패 시 빈 문자열 (프롬프트에서 생략).
 */
export async function analyzeRoomPalette(image: InlineImage): Promise<string> {
  try {
    const ai = getClient();
    const res = await ai.models.generateContent({
      model: ENHANCE_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: PALETTE_SYSTEM }, { inlineData: image }],
        },
      ],
    });
    return (res.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text)
      .filter(Boolean)
      .join(" ")
      .trim();
  } catch {
    return "";
  }
}

/**
 * 보정(편집) 프롬프트 구성. (한국어 — 생성 프롬프트와 언어 통일)
 * 이미지 순서(코드와 일치해야 함):
 *   Image 1 = 보정 대상(완성 실사 결과)
 *   (hasOriginal) 다음 = 같은 공간의 원본 빈 공간 사진 — 구조·복원 기준
 *   (hasSketch)   다음 = 배치 스케치 — 구도·배치 참고
 *   (hasProduct)  다음 = 추가/교체할 실제 제품 사진
 */
export function buildEditPrompt(opts: {
  editType: string;
  instruction: string;
  hasProduct: boolean;
  hasOriginal?: boolean;
  hasSketch?: boolean;
  /** 유저가 빨간 브러시로 대상 영역을 칠한 안내 이미지 포함 여부 */
  hasMask?: boolean;
  /** 유저가 제품을 끌어다 놓은 배치 콜라주 포함 여부 (raw 전용, Image 1 자리) */
  hasCollage?: boolean;
  /** 콜라주에 배치된 제품 원본 사진 수 (hasCollage 시) */
  productCount?: number;
  /** 추가 참고 이미지 수 (raw 전용) */
  extraCount?: number;
}): string {
  const inst = opts.instruction.trim();

  // 직접 프롬프트: 템플릿·규칙 없이 유저 입력을 그대로 전달.
  // 배치 콜라주/영역 표시가 있으면 그 이미지의 의미만 짧게 덧붙인다 (유저는 번호를 모르므로).
  if (opts.editType === "raw") {
    if (opts.hasCollage) {
      const tail = [
        opts.productCount
          ? ` 그 다음 ${opts.productCount}장은 배치된 제품의 원본 사진이니 각 제품의 디자인·형태·색·소재의 기준으로 사용하세요.`
          : "",
        opts.extraCount
          ? ` 마지막 ${opts.extraCount}장은 추가 참고 이미지입니다.`
          : "",
      ].join("");
      return [
        inst,
        "",
        `참고: Image 1은 현재 사진 위에 제품 사진들을 임시로 붙여 위치·크기·회전을 표시한 배치 콜라주입니다. Image 2는 같은 사진의 깨끗한 원본입니다. 각 제품을 콜라주에 표시된 위치·크기·회전 그대로, 공간의 원근·조명에 맞는 자연스러운 실사로 통합하고 부드러운 접지 그림자를 넣으세요. 붙인 조각이 가리던 배경은 Image 2를 기준으로 복원하세요.${tail} 최종 결과물에는 붙인 흔적·경계선이 전혀 남지 않아야 합니다.`,
      ].join("\n");
    }
    if (opts.hasMask) {
      return [
        inst,
        "",
        "참고: Image 2는 Image 1과 동일한 사진에 반투명 빨간색 브러시로 영역을 칠한 안내 이미지입니다. 빨간 표시는 위 요청이 적용될 정확한 위치를 가리킵니다. 위치 파악용으로만 사용하고, 최종 결과물에는 빨간 표시가 전혀 남지 않아야 합니다.",
      ].join("\n");
    }
    return inst;
  }

  // 동적 이미지 번호: 표시 → 원본 → 스케치 → 제품 순으로 Image 2부터 부여
  let n = 2;
  const maskLabel = opts.hasMask ? `Image ${n++}` : null;
  const originalLabel = opts.hasOriginal ? `Image ${n++}` : null;
  const sketchLabel = opts.hasSketch ? `Image ${n++}` : null;
  const productLabel = opts.hasProduct ? `Image ${n++}` : null;

  const head = [
    "당신은 인테리어 시각화 전문 아티스트입니다. 완성된 실사 인테리어 사진에 아래 지시된 변경 딱 하나만 적용해 주세요.",
    "",
    "제공되는 이미지 (순서대로):",
    "- Image 1: 보정 대상인 완성 실사 인테리어 사진입니다. 아래 지시된 변경 외에는 모든 것을 그대로 유지하세요 — 같은 공간, 벽, 창문, 커튼, 바닥, 천장, 빌트인 가구, 소형 설비(콘센트, 조명 스위치, 문·서랍 손잡이, 환기구), 다른 모든 가구, 조명과 각 조명의 켜짐/꺼짐 상태, 색온도, 카메라 시점이 바뀌면 안 됩니다.",
  ];

  if (maskLabel) {
    head.push(
      `- ${maskLabel}: Image 1과 동일한 사진 위에 반투명 빨간색 브러시로 영역을 칠해 표시한 안내 이미지입니다. 빨간 표시는 요청한 변경이 적용될 정확한 위치와 대상을 가리킵니다. 위치 파악용으로만 사용하고, 최종 결과물에는 빨간 표시가 전혀 남지 않아야 합니다.`
    );
  }
  if (originalLabel) {
    head.push(
      `- ${originalLabel}: 같은 공간을 가구 없이 촬영한 '원본 빈 공간' 사진입니다. 공간의 건축 구조, 벽, 창문, 커튼, 창밖 풍경, 바닥, 빌트인, 소형 설비, 조명 상태를 판단하는 기준으로만 사용하세요. 특히 가구를 제거하거나 교체해서 가려져 있던 영역이 드러나면, 상상하지 말고 이 원본 사진의 실제 모습대로 복원하세요. 단, 공간을 빈 상태로 되돌리거나 Image 1에 있는 다른 가구를 지우지 마세요.`
    );
  }
  if (sketchLabel) {
    head.push(
      `- ${sketchLabel}: 같은 공간의 가구 배치 스케치(배치 가이드)입니다. 이 공간의 전체 구도와 각 가구의 위치·방향·크기를 이해하는 참고로만 사용하세요. 스케치의 선, 렌더링 느낌, 색감, 조명을 결과에 절대 가져오지 마세요.`
    );
  }
  if (productLabel) {
    head.push(
      `- ${productLabel}: 추가/교체할 가구의 실제 제품 사진입니다.`
    );
  }

  head.push("", "작업 내용:");

  const body: string[] = [];
  switch (opts.editType) {
    case "add":
      body.push(
        `- ${productLabel}의 제품을 공간에 추가하세요${
          inst
            ? ` — 위치: ${inst}`
            : maskLabel
            ? ` — 위치: ${maskLabel}의 빨간 표시 자리`
            : " — 적절한 빈 자리에 자연스럽게 배치"
        }.`,
        "- 공간의 원근과 실제 스케일, 빛 방향, 색온도에 맞추고, 바닥에 자연스럽게 닿는 부드러운 접지 그림자를 렌더링하세요.",
        `- 제품의 실제 디자인·형태·색상·소재·질감을 ${productLabel} 그대로 정확히 재현하세요. 디자인이나 색을 바꾸지 마세요.`
      );
      break;
    case "remove":
      body.push(
        `- 사진에서 다음을 제거하세요: ${
          inst || (maskLabel ? "빨간색으로 표시된 영역의 물체" : "지시된 대상")
        }.`,
        maskLabel
          ? `- 제거할 대상과 범위는 ${maskLabel}의 빨간 표시가 정확히 가리킵니다.`
          : "",
        originalLabel
          ? `- 제거로 드러나는 바닥·러그·벽·커튼·창문/풍경은 ${originalLabel}(원본 빈 공간)의 실제 모습을 기준으로, 처음부터 그 물건이 없었던 것처럼 자연스럽게 복원하세요.`
          : "- 제거로 드러나는 바닥·러그·벽·커튼·창문/풍경을, 처음부터 그 물건이 없었던 것처럼 자연스럽게 복원하세요."
      );
      break;
    case "replace":
      body.push(
        `- 사진 속 다음 가구 — ${
          inst || (maskLabel ? "빨간 표시가 가리키는 가구" : "지시된 대상")
        } — 를 ${productLabel}의 제품으로 교체하세요. 위치·방향·크기는 기존 가구와 동일하게 유지하세요.`,
        maskLabel
          ? `- 교체할 대상은 ${maskLabel}의 빨간 표시가 정확히 가리킵니다.`
          : "",
        "- 공간의 원근, 조명, 그림자에 맞추세요.",
        `- 새 제품의 실제 디자인·형태·색상·소재·질감을 ${productLabel} 그대로 정확히 재현하세요. 디자인이나 색을 바꾸지 마세요.`,
        originalLabel
          ? `- 교체 과정에서 드러나는 배경 영역은 ${originalLabel}(원본 빈 공간)의 실제 모습을 기준으로 복원하세요.`
          : ""
      );
      break;
    case "retouch":
    default:
      body.push(
        `- 사진에 다음 조정만 적용하세요: ${inst}.`,
        maskLabel
          ? `- 조정은 ${maskLabel}의 빨간 표시 영역에만 적용하세요.`
          : "",
        "- 가구를 추가·제거·이동하거나 스타일을 바꾸지 마세요. 배치, 모든 가구, 구도를 동일하게 유지하고 요청된 부분(조명, 톤, 색감 등)만 조정하세요."
      );
      break;
  }

  const tail = [
    "",
    "공통 규칙:",
    "- Image 1의 조명, 화이트밸런스, 색온도를 정확히 따르세요. 핑크·마젠타 색 편향, 색 보정(그레이딩)이나 필터 느낌을 절대 적용하지 마세요. 꺼져 있는 조명을 켜지 마세요.",
    "- 하나로 자연스럽게 어우러진 실사 인테리어 사진 1장을 출력하세요. 텍스트, 워터마크, 로고, 테두리, 합성 흔적, 스케치 외곽선은 금지입니다.",
  ];

  return [...head, ...body.filter(Boolean), ...tail].join("\n");
}

// 텍스트 모델: 유저의 요구를 간결한 스타일 지시로 정제할 때 사용.
// gemini-3.5-flash = 최신 안정 flash (공식 권장: 빠르고 저렴 + Gemini 3 지능).
// 프롬프트 한국어 테스트 중이므로 산출물도 한국어 (규칙과 언어 통일).
const ENHANCE_MODEL = "gemini-3.5-flash";

const ENHANCE_SYSTEM = [
  "당신은 인테리어 이미지 편집 모델(Nano Banana)용 프롬프트 엔지니어입니다.",
  "유저의 요청을, 유저가 원하는 결과만 담은 간결한 한국어 지시문으로 정제하세요: 무드/분위기, 가구 배치와 방향, 원하는 소재/색상, 조명 느낌.",
  "출력 규칙:",
  "- 짧은 구문을 쉼표로 나열하세요. 구체적으로 쓰고, 모호한 단어는 피하세요.",
  "- 공간 보존이나 가구 충실도에 관한 문구('원본 색감 유지', '공간 구조 유지', '원본 그대로' 등)는 절대 출력에 넣지 마세요 — 별도 규칙으로 이미 처리됩니다.",
  "- 모순을 만들지 마세요 (예: '미니멀한 빈 공간' + '소품 많이').",
  "- 유저가 요청하지 않은 가구나 디테일을 지어내지 마세요.",
  "- 지시 구문만 출력하세요. 서두, 따옴표, 설명은 금지입니다.",
].join("\n");

/**
 * 유저의 요구사항을 간결한 한국어 스타일 지시로 정제한다.
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
    // 정제 실패 시 원문을 그대로 사용
    return text;
  }
}

/**
 * 최종 프롬프트 조립: 불변의 필수 규칙(코드 고정) + 유저 요구(LLM 한국어 정제).
 */
export async function composeFurniturePrompt(opts: {
  hasSketch: boolean;
  userPrompt: string;
}): Promise<string> {
  const enhanced = await enhanceUserRequest(opts.userPrompt);
  return buildFurniturePrompt({ hasSketch: opts.hasSketch, userPrompt: enhanced });
}
