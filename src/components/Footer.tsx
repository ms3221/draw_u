import Link from "next/link";
import { Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#2f2f2f] text-white/70 py-14">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center gap-6">
        <span className="text-white text-xl font-bold tracking-[0.15em]">DrawU</span>
        <div className="text-center text-[12px] leading-relaxed space-y-1">
          <p>서울특별시 강남구 테헤란로 123 DrawU빌딩 5F</p>
          <p>대표 : 홍길동 &nbsp;|&nbsp; 사업자등록번호 : 000-00-00000</p>
          <p>Tel : 02-000-0000 &nbsp;|&nbsp; E-mail : hello@drawu.kr</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            <Instagram size={18} />
          </Link>
        </div>
        <div className="flex gap-5 text-[11px]">
          <Link href="#" className="hover:text-white transition-colors">이용약관</Link>
          <Link href="#" className="hover:text-white transition-colors">개인정보처리방침</Link>
        </div>
        <p className="text-[11px]">© 2025 DrawU Construction. All rights reserved.</p>
      </div>
    </footer>
  );
}
