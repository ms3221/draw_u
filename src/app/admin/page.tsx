import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FolderOpen, MessageSquareText } from "lucide-react";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const [{ count: projectCount }, { count: inquiryCount }] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("contact_inquiries").select("*", { count: "exact", head: true }),
  ]);

  const menus = [
    {
      title: "프로젝트",
      desc: `등록된 프로젝트 ${projectCount ?? 0}건`,
      href: "/admin/projects",
      icon: FolderOpen,
    },
    {
      title: "고객 요청",
      desc: `접수된 문의 ${inquiryCount ?? 0}건`,
      href: "/admin/inquiries",
      icon: MessageSquareText,
    },
  ];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[800px] mx-auto">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-1">
          Admin
        </p>
        <h1 className="text-xl font-bold text-[#2f2f2f] mb-10">관리자 홈</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="group bg-white border border-[#e0e0e0] p-8 hover:border-[#2f2f2f] transition-colors"
            >
              <menu.icon size={28} className="text-[#999] group-hover:text-[#2f2f2f] transition-colors mb-4" />
              <h2 className="text-[16px] font-semibold text-[#2f2f2f] mb-1">
                {menu.title}
              </h2>
              <p className="text-[13px] text-[#999]">{menu.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
