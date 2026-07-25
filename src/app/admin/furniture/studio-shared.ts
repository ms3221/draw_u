// 가구 스튜디오 공용 타입·상수 (서버/클라이언트 공용)
// "use server" 파일은 async 함수만 export 할 수 있어 여기로 분리.

export const STUDIO_BUCKET = "furniture-studio";

export type FurnitureProject = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  base_url: string | null;
  sketch_url: string | null;
};

export type FurnitureAsset = {
  id: string;
  project_id: string;
  url: string;
  original_name: string | null;
  created_by: string;
  created_at: string;
};

/** 결과에 쓰인 입력 이미지 이력 (스냅샷 — 원본이 삭제돼도 url 은 유효 유지) */
export type InputRef = {
  role:
    | "base"
    | "sketch"
    | "furniture"
    | "edit_base"
    | "product"
    | "extra"
    | "collage"
    | "mask";
  url: string;
  asset_id?: string;
  result_id?: string;
};

export type FurnitureResult = {
  id: string;
  project_id: string;
  url: string;
  kind: "generate" | "edit";
  user_prompt: string;
  enhanced_prompt: string;
  full_prompt: string;
  model: string;
  resolution: string;
  input_refs: InputRef[];
  created_by: string;
  created_at: string;
};

/** 결과 이미지에 남기는 요청사항(댓글) */
export type ResultComment = {
  id: string;
  project_id: string;
  result_id: string;
  body: string;
  created_by: string;
  created_at: string;
};

export const INPUT_ROLE_LABELS: Record<InputRef["role"], string> = {
  base: "본사진",
  sketch: "스케치",
  furniture: "가구",
  edit_base: "보정 원본",
  product: "제품",
  extra: "추가 이미지",
  collage: "배치 콜라주",
  mask: "영역 표시",
};

/** 직접 프롬프트(raw) 모드에서 함께 보낼 수 있는 추가 이미지 수 (보정 대상 1장 제외) */
export const RAW_MAX_EXTRA_IMAGES = 4;

/** public URL → 버킷 내부 경로. furniture-studio 소속이 아니면 null */
export function bucketPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${STUDIO_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}
