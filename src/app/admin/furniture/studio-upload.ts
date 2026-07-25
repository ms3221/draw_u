// 클라이언트 직접 storage 업로드 유틸 (브라우저 전용).
// 파일 바이트가 서버 액션 본문을 거치지 않으므로 Vercel 4.5MB 제한을 받지 않는다.
// (리포 컨벤션: ProjectForm.tsx / ContactClient.tsx 와 동일한 방식)

import { createClient } from "@/lib/supabase/client";
import { STUDIO_BUCKET } from "./studio-shared";

// 업로드 전 다운스케일: 원본 스케치업/제품 사진이 수 MB~수천만 px 라 업로드/생성 속도에 부담.
// 긴 변 1600px, jpeg 0.85 로 축소. Nano Banana 는 입력을 내부 리사이즈하므로 품질 저하 없음.
const MAX_UPLOAD_SIDE = 1600;
const UPLOAD_QUALITY = 0.85;

export async function downscaleImage(file: File): Promise<File> {
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

/**
 * 다운스케일 후 furniture-studio 버킷에 업로드하고 public URL 을 반환.
 * kind 에 따라 프로젝트 하위 경로가 정해진다.
 */
export async function uploadStudioImage(
  projectId: string,
  file: File,
  kind: "assets" | "base" | "uploads"
): Promise<string> {
  const supabase = createClient();
  const resized = await downscaleImage(file);
  const ext = resized.type === "image/jpeg" ? "jpg" : "png";
  const path = `${projectId}/${kind}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(STUDIO_BUCKET)
    .upload(path, resized, { contentType: resized.type });
  if (error) throw new Error("이미지 업로드에 실패했습니다.");

  const {
    data: { publicUrl },
  } = supabase.storage.from(STUDIO_BUCKET).getPublicUrl(path);
  return publicUrl;
}
