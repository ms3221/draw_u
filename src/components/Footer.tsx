import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#2f2f2f] text-white/60 py-8">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-3">
        <span className="text-white text-[13px] font-semibold tracking-[0.12em]">드로우유</span>
        <div className="text-[11px] leading-relaxed space-y-1">
          <p>광주광역시 광산구 수완로 9번길 31, 1층 드로우유 인테리어</p>
          <p>대표 : 유두선 &nbsp;|&nbsp; 사업자등록번호 : 878-07-02657</p>
          <p>Tel : 1533-6967 &nbsp;|&nbsp; E-mail : drawuco@gmail.com</p>
        </div>
        <div className="flex items-center gap-4 pt-1 text-[11px]">
          <Link href="#" className="hover:text-white transition-colors">이용약관</Link>
          <Link href="#" className="hover:text-white transition-colors">개인정보처리방침</Link>
        </div>
        <p className="text-[10px] text-white/30">© 2025 DrawU. All rights reserved.</p>
      </div>
    </footer>
  );
}
