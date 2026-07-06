// 이미지 생성 모델 정의 (서버/클라이언트 공용 — 비용 표시에 사용)
// 가격: Gemini API 공식 (USD, 장당). 원화는 환율 USD_TO_KRW 기준 근사치.

export const RESOLUTIONS = ["1K", "2K", "4K"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
export const DEFAULT_RESOLUTION: Resolution = "1K";

export type ImageModel = {
  id: string;
  label: string;
  desc: string;
  /** 해상도별 장당 단가 (USD) */
  usd: Record<Resolution, number>;
};

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: "gemini-3.1-flash-image",
    label: "3.1 Flash",
    desc: "빠르고 저렴 · 일상 시안",
    usd: { "1K": 0.067, "2K": 0.101, "4K": 0.151 },
  },
  {
    id: "gemini-3-pro-image",
    label: "3 Pro",
    desc: "최고 품질 · 최종 제안용",
    usd: { "1K": 0.134, "2K": 0.134, "4K": 0.24 },
  },
];

export const DEFAULT_MODEL = "gemini-3.1-flash-image";
export const USD_TO_KRW = 1400;
export const MAX_COUNT = 4;
export const MAX_FURNITURE = 10;

// Gemini 이미지 모델이 지원하는 출력 비율 (label, 가로/세로 값)
export const SUPPORTED_ASPECT_RATIOS: [string, number][] = [
  ["1:1", 1], ["2:3", 2 / 3], ["3:2", 3 / 2], ["3:4", 3 / 4], ["4:3", 4 / 3],
  ["4:5", 4 / 5], ["5:4", 5 / 4], ["9:16", 9 / 16], ["16:9", 16 / 9], ["21:9", 21 / 9],
];

/** 원본 이미지 크기(px)에 가장 가까운 지원 비율 라벨을 고른다. 잘못된 입력이면 "16:9". */
export function nearestAspectRatio(width?: number, height?: number): string {
  if (!width || !height) return "16:9";
  const r = width / height;
  let best = "16:9";
  let diff = Infinity;
  for (const [label, val] of SUPPORTED_ASPECT_RATIOS) {
    const d = Math.abs(val - r);
    if (d < diff) {
      diff = d;
      best = label;
    }
  }
  return best;
}

// 보정(편집) 유형. needsProduct=true 면 추가/교체할 제품 사진이 필요하다.
export const EDIT_TYPES = [
  { id: "add", label: "가구 추가", needsProduct: true, hint: "어디에 놓을지 (선택)" },
  { id: "remove", label: "가구 제거", needsProduct: false, hint: "무엇을 뺄지" },
  { id: "replace", label: "가구 교체", needsProduct: true, hint: "무엇을 바꿀지" },
  { id: "retouch", label: "분위기 보정", needsProduct: false, hint: "조명·톤·색감 등" },
] as const;

export type EditType = (typeof EDIT_TYPES)[number]["id"];

export function isValidEditType(t: string): t is EditType {
  return EDIT_TYPES.some((e) => e.id === t);
}

export function editNeedsProduct(t: string): boolean {
  return EDIT_TYPES.find((e) => e.id === t)?.needsProduct ?? false;
}

export function isValidModel(id: string): boolean {
  return IMAGE_MODELS.some((m) => m.id === id);
}

export function isValidResolution(r: string): r is Resolution {
  return (RESOLUTIONS as readonly string[]).includes(r);
}

/** 장당 원화 단가 (반올림). 모델/해상도가 잘못되면 null */
export function krwPerImage(modelId: string, res: Resolution): number | null {
  const m = IMAGE_MODELS.find((x) => x.id === modelId);
  if (!m) return null;
  return Math.round(m.usd[res] * USD_TO_KRW);
}
