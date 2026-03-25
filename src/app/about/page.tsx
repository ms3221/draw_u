import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export const metadata: Metadata = {
  title: "회사 소개",
  description: "draw_u 인테리어의 철학과 팀을 소개합니다.",
  alternates: { canonical: "https://www.draw-u.kr/about" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white relative pt-[100px]">
      {/* 회사 소개 */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-[720px] ml-20">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2f2f2f] mb-6 leading-snug">
            About.us
          </h2>
          {/* <Separator className="bg-[#2f2f2f]/30 w-12 h-px mb-10" /> */}
          <div className="space-y-5 text-[14px] text-[#555] leading-[1.9]">
            <p>
              <b className="text-[#2f2f2f]">드로우유</b>는 사용자의 온전한
              공간이 될 수 있도록 사람과 생활에 집중하며,
              <br />
              '미디어와 유행만을 좇아서 좋은 공간의 기준이 되는 것'을 지양하고,
              <br />
              사용자의 생활과 공간을 심미적으로 그려내는 회사입니다.
            </p>
            <p>
              <b className="text-[#2f2f2f]">드로우유</b>는 공간을 완성시키기
              위한 설계와 시공 과정,
              <br />
              사용자의 생활까지를 인테리어와 디자인이라고 정의합니다.
              <br />
              우리의 역할은 미학적인 균형을 유지하면서 방향성과 디테일을
              제시하며
              <br />
              합리적인 조건 속에 니즈를 실현시키는 것입니다.
            </p>
            <p>
              사용자의 작은 제안이 우리의 프로젝트로 발전되고, 이는 사용자의
              생활과 삶에 영향을 줍니다.
            </p>
            <p>
              <b className="text-[#2f2f2f]">드로우유</b>는 사용자의 피드백을
              최우선 아젠다로 두고 프로젝트를 계획하고 진행할 것이며,
              <br />
              클라이언트와 함께 라이프 스타일을 공유하고 공간을 고민하며
              그려내는 과정에서,
              <br />
              저희도 함께 성장합니다.
            </p>
            <p className="pt-2 text-[15px] text-[#2f2f2f]">
              여러분의 일상을 함께하는 공간을 우리,
              <br />
              함께 그려내고 싶습니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-4 mt-12">
            {[
              { label: "PROJECT", korean: "현장사진", href: "/project" },
              { label: "CONTACT", korean: "상담문의", href: "/contact" },
            ].map((btn) => (
              <Link
                key={btn.href}
                href={btn.href}
                className="group relative flex items-center justify-center w-[140px] h-[44px] border border-[#2f2f2f]/30 hover:border-[#2f2f2f] transition-colors duration-200"
              >
                <span className="text-[12px] tracking-[0.15em] text-[#2f2f2f]/80 group-hover:opacity-0 group-hover:-translate-y-1 transition-all duration-200">
                  {btn.label}
                </span>
                <span className="absolute text-[12px] tracking-[0.08em] text-[#2f2f2f] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                  {btn.korean}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
