import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const referralLabels: Record<string, string> = {
  instagram: "인스타그램",
  blog: "블로그",
  referral: "지인 추천",
  other: "기타",
};

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: item } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (!item) notFound();

  const fields = [
    { label: "성함", value: item.name },
    { label: "연락처", value: item.phone },
    { label: "가족 구성원", value: item.family_members },
    { label: "통화 가능 시간", value: item.available_time },
    { label: "주소", value: item.address },
    { label: "평형", value: item.area },
    { label: "공사 시작", value: item.start_date },
    { label: "입주 예정일", value: item.move_in_date },
    { label: "예산", value: item.budget },
    {
      label: "유입 경로",
      value:
        referralLabels[item.referral] || item.referral + (item.referral_other ? ` (${item.referral_other})` : ""),
    },
    { label: "관심 프로젝트 URL", value: item.project_url },
    { label: "자유 입력", value: item.free_text },
  ];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[800px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-1">
              Admin
            </p>
            <h1 className="text-xl font-bold text-[#2f2f2f]">
              {item.name}님의 문의
            </h1>
            <p className="text-[12px] text-[#999] mt-1">
              {new Date(item.created_at).toLocaleString("ko-KR")}
            </p>
          </div>
          <Link href="/admin/inquiries">
            <Button
              variant="outline"
              className="rounded-none border-[#d0d0d0] text-[12px] tracking-[0.1em] h-[38px] gap-1.5"
            >
              <ArrowLeft size={14} />
              목록으로
            </Button>
          </Link>
        </div>

        {/* 상세 정보 */}
        <div className="bg-white border border-[#e0e0e0]">
          {fields.map(
            (field) =>
              field.value && (
                <div
                  key={field.label}
                  className="flex border-b border-[#f0f0f0] last:border-b-0"
                >
                  <div className="w-[140px] shrink-0 p-4 text-[11px] tracking-[0.1em] text-[#999] bg-[#fafafa]">
                    {field.label}
                  </div>
                  <div className="p-4 text-[13px] text-[#2f2f2f] whitespace-pre-wrap">
                    {field.label === "관심 프로젝트 URL" ? (
                      <a
                        href={field.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {field.value}
                      </a>
                    ) : (
                      field.value
                    )}
                  </div>
                </div>
              )
          )}
        </div>

        {/* 평면도 */}
        {item.floor_plan_urls?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[14px] font-semibold text-[#2f2f2f] mb-4">
              평면도
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {item.floor_plan_urls.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#e0e0e0] overflow-hidden hover:border-[#2f2f2f] transition-colors"
                >
                  <img
                    src={url}
                    alt={`평면도 ${idx + 1}`}
                    className="w-full h-[200px] object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 참고사진 */}
        {item.reference_photo_urls?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[14px] font-semibold text-[#2f2f2f] mb-4">
              참고사진
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {item.reference_photo_urls.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#e0e0e0] overflow-hidden hover:border-[#2f2f2f] transition-colors"
                >
                  <img
                    src={url}
                    alt={`참고사진 ${idx + 1}`}
                    className="w-full h-[200px] object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
