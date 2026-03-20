"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, Instagram, BookOpen } from "lucide-react";
import Image from "next/image";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "HOME", href: "/", korean: null },
  { label: "ABOUT", href: "/about", korean: "회사소개" },
  { label: "PROJECT", href: "/project", korean: "현장사진" },
  { label: "CONTACT", href: "/contact", korean: "상담문의" },
];

const snsLinks = [
  {
    label: "네이버 블로그",
    href: "https://blog.naver.com/draw_u_interior",
    icon: "naver",
  },
  {
    label: "인스타그램",
    href: "https://www.instagram.com/draw_u_interior/",
    icon: "instagram",
  },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [snsOpen, setSnsOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerBg = isHome
    ? scrolled
      ? "bg-white border-b border-[#2f2f2f]"
      : "bg-transparent"
    : "bg-white border-b border-[#2f2f2f]";

  const textColor = isHome && !scrolled ? "text-white" : "text-[#2f2f2f]";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[100px] flex items-center",
        headerBg,
      )}
    >
      <div className="max-w-[1280px] mx-auto w-full px-6 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="draw_u"
            width={130}
            height={52}
            style={{ width: "auto", height: 52 }}
            className={cn(
              "object-contain transition-all duration-300",
              isHome && !scrolled ? "brightness-0 invert" : "",
            )}
            priority
          />
          <span
            className={cn(
              "text-[24px] font-semibold tracking-[0.12em] transition-colors duration-300",
              isHome && !scrolled ? "text-white" : "text-[#2f2f2f]",
            )}
          >
            DRAW U
          </span>
        </Link>

        {/* PC 네비게이션 */}
        <nav className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center justify-center h-8 transition-opacity hover:opacity-100",
                textColor,
                pathname === item.href ? "opacity-100" : "opacity-80",
              )}
            >
              <span className={cn(
                "text-[13px] font-medium tracking-[0.12em] transition-all duration-200",
                item.korean ? "group-hover:opacity-0 group-hover:-translate-y-1" : "",
              )}>
                {item.label}
              </span>
              {item.korean && (
                <span className="absolute text-[13px] font-medium tracking-[0.06em] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap">
                  {item.korean}
                </span>
              )}
              {pathname === item.href && (
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-current" />
              )}
            </Link>
          ))}

          {/* SNS 드롭다운 */}
          <div
            className="relative"
            onMouseEnter={() => setSnsOpen(true)}
            onMouseLeave={() => setSnsOpen(false)}
          >
            <button
              className={cn(
                "flex items-center gap-1 h-8 text-[13px] font-medium tracking-[0.12em] opacity-80 hover:opacity-100 transition-opacity",
                textColor,
              )}
            >
              SNS <ChevronDown size={11} className={cn("transition-transform duration-200", snsOpen ? "rotate-180" : "")} />
            </button>

            {/* 드롭다운 메뉴 */}
            <div className={cn(
              "absolute top-full right-0 w-[150px] bg-white border border-[#e0e0e0] shadow-md transition-all duration-200",
              snsOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none",
            )}>
              {snsLinks.map((sns) => (
                <Link
                  key={sns.href}
                  href={sns.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-3 text-[12px] tracking-[0.06em] text-[#444] hover:bg-[#f5f5f5] hover:text-[#2f2f2f] transition-colors"
                >
                  {sns.icon === "naver" ? <BookOpen size={14} /> : <Instagram size={14} />}
                  {sns.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* 모바일 메뉴 */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden">
            <span className={cn("p-1 inline-flex", textColor)}>
              <Menu size={22} />
            </span>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-white p-0">
            <div className="flex items-center gap-3 px-6 h-[100px] border-b border-[#e0e0e0]">
              <Image
                src="/images/logo.png"
                alt="draw_u"
                width={80}
                height={30}
                style={{ width: "auto", height: 30 }}
                className="object-contain"
              />
              <span className="text-[16px] font-semibold tracking-[0.12em] text-[#2f2f2f]">
                DRAW U
              </span>
            </div>
            <nav className="flex flex-col px-6 pt-8 gap-7">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between text-[14px] font-medium tracking-[0.12em] text-[#2f2f2f]",
                    pathname === item.href ? "opacity-100" : "opacity-60",
                  )}
                >
                  <span>{item.label}</span>
                  {item.korean && (
                    <span className="text-[11px] text-[#999] tracking-normal">{item.korean}</span>
                  )}
                </Link>
              ))}
              <div className="flex flex-col gap-4 pt-2 border-t border-[#f0f0f0]">
                <span className="text-[11px] tracking-[0.15em] text-[#bbb] uppercase">SNS</span>
                {snsLinks.map((sns) => (
                  <Link
                    key={sns.href}
                    href={sns.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 text-[13px] text-[#555] opacity-70 hover:opacity-100 tracking-[0.06em]"
                  >
                    {sns.icon === "naver" ? <BookOpen size={14} /> : <Instagram size={14} />}
                    {sns.label}
                  </Link>
                ))}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
