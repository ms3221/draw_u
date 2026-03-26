import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: inquiries } = await supabase
    .from("contact_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[1200px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-1">
              Admin
            </p>
            <h1 className="text-xl font-bold text-[#2f2f2f]">고객 요청 관리</h1>
          </div>
          <Link href="/admin">
            <Button
              variant="outline"
              className="rounded-none border-[#d0d0d0] text-[12px] tracking-[0.1em] h-[38px] gap-1.5"
            >
              <ArrowLeft size={14} />
              홈으로
            </Button>
          </Link>
        </div>

        {/* 테이블 */}
        {!inquiries?.length ? (
          <p className="text-[14px] text-[#999] text-center py-20">
            접수된 문의가 없습니다.
          </p>
        ) : (
          <div className="bg-white border border-[#e0e0e0] overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#e0e0e0] text-[11px] tracking-[0.15em] uppercase text-[#999]">
                  <th className="text-left p-4 font-normal">접수일</th>
                  <th className="text-left p-4 font-normal">성함</th>
                  <th className="text-left p-4 font-normal">연락처</th>
                  <th className="text-left p-4 font-normal">주소</th>
                  <th className="text-left p-4 font-normal">평형</th>
                  <th className="text-left p-4 font-normal">예산</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((item) => (
                  <tr key={item.id} className="border-b border-[#f0f0f0] last:border-b-0">
                    <td className="p-4 text-[13px] text-[#999]">
                      {new Date(item.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="p-4 text-[13px] text-[#2f2f2f] font-medium">
                      <Link
                        href={`/admin/inquiries/${item.id}`}
                        className="hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="p-4 text-[13px] text-[#888]">{item.phone}</td>
                    <td className="p-4 text-[13px] text-[#888]">{item.address}</td>
                    <td className="p-4 text-[13px] text-[#888]">{item.area}</td>
                    <td className="p-4 text-[13px] text-[#888]">{item.budget}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
