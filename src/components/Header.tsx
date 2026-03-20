"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "HOME", href: "/" },
  { label: "ABOUT", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "CONTACT", href: "/contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
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
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[56px] flex items-center",
        headerBg
      )}
    >
      <div className="max-w-[1280px] mx-auto w-full px-6 flex items-center justify-between">
        {/* 로고 */}
        <Link
          href="/"
          className={cn("text-xl font-bold tracking-[0.15em] uppercase", textColor)}
        >
          DrawU
        </Link>

        {/* PC 네비게이션 */}
        <nav className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[13px] font-medium tracking-[0.12em] transition-opacity hover:opacity-60",
                textColor,
                pathname === item.href ? "opacity-100 border-b border-current pb-0.5" : "opacity-80"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 모바일 메뉴 */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden">
            <span className={cn("p-1 inline-flex", textColor)}>
              <Menu size={22} />
            </span>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-white p-0">
            <div className="flex items-center justify-between px-6 h-[56px] border-b border-[#e0e0e0]">
              <span className="text-xl font-bold tracking-[0.15em] text-[#2f2f2f]">DrawU</span>
            </div>
            <nav className="flex flex-col px-6 pt-8 gap-7">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "text-[14px] font-medium tracking-[0.12em] text-[#2f2f2f]",
                    pathname === item.href ? "opacity-100" : "opacity-60"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
