import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FurnitureStudio from "./FurnitureStudio";

// 이미지 생성은 장당 15~20초 소요 → 서버 함수 타임아웃 상향
export const maxDuration = 120;

export default async function FurniturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return <FurnitureStudio />;
}
