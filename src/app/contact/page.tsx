"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Phone, Mail, MapPin, ArrowRight } from "lucide-react";

const processSteps = [
  {
    num: "01",
    title: "상담 문의",
    desc: "전화 또는 온라인 폼으로 문의를 남겨주세요. 24시간 내 담당자가 연락드립니다.",
  },
  {
    num: "02",
    title: "현장 방문 및 견적",
    desc: "전문 담당자가 현장을 방문하여 정확한 실측과 무료 견적을 제공합니다.",
  },
  {
    num: "03",
    title: "계약 체결",
    desc: "투명한 계약서 작성으로 공사 범위, 금액, 일정을 명확히 합의합니다.",
  },
  {
    num: "04",
    title: "시공 진행",
    desc: "숙련된 시공팀이 체계적인 일정에 따라 공사를 진행하며 진행 상황을 공유합니다.",
  },
  {
    num: "05",
    title: "검수 및 준공",
    desc: "시공 완료 후 고객과 함께 꼼꼼히 검수하고, 하자 없이 준공합니다.",
  },
  {
    num: "06",
    title: "AS 보증",
    desc: "준공 후에도 책임 있는 사후 관리로 고객의 만족을 끝까지 지킵니다.",
  },
];

const contactInfo = [
  {
    icon: Phone,
    label: "전화 문의",
    value: "02-000-0000",
    sub: "평일 09:00 ~ 18:00",
  },
  {
    icon: Mail,
    label: "이메일",
    value: "hello@drawu.kr",
    sub: "24시간 접수 가능",
  },
  {
    icon: MapPin,
    label: "오시는 길",
    value: "서울 강남구 테헤란로 123",
    sub: "DrawU빌딩 5F",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    type: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 실제 서버 연동 시 여기에 API 호출
    setSubmitted(true);
  };

  return (
    <>
      {/* 페이지 히어로 */}
      <section className="relative pt-[56px]">
        <div
          className="h-[280px] md:h-[360px] bg-cover bg-center relative flex items-center justify-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1920&q=80')",
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 text-center text-white">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/60 mb-3">
              Consultation
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Contact</h1>
          </div>
        </div>
      </section>

      {/* 프로세스 섹션 */}
      <section className="bg-[#f5f5f5] py-24 px-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-3">How We Work</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2f2f2f]">상담 진행 프로세스</h2>
          </div>

          {/* 프로세스 스텝 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e0e0e0]">
            {processSteps.map((step, idx) => (
              <div
                key={step.num}
                className="bg-white p-8 md:p-10 flex flex-col gap-4 relative group hover:bg-[#2f2f2f] transition-colors duration-300"
              >
                <span className="text-[11px] tracking-[0.2em] text-[#bbb] font-mono group-hover:text-white/40 transition-colors">
                  {step.num}
                </span>
                <h3 className="text-[17px] font-semibold text-[#2f2f2f] group-hover:text-white transition-colors">
                  {step.title}
                </h3>
                <Separator className="bg-[#e0e0e0] group-hover:bg-white/20 transition-colors" />
                <p className="text-[13px] text-[#666] leading-relaxed group-hover:text-white/70 transition-colors">
                  {step.desc}
                </p>
                {/* 화살표 (마지막 제외) */}
                {idx < processSteps.length - 1 && (
                  <ArrowRight
                    size={14}
                    className="absolute top-8 right-6 text-[#ccc] group-hover:text-white/30 transition-colors hidden md:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 문의 폼 + 연락처 정보 */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* 문의 폼 */}
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-3">
              Online Inquiry
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#2f2f2f] mb-8">온라인 문의</h2>

            {submitted ? (
              <div className="flex flex-col items-start gap-4 py-12">
                <CheckCircle2 size={40} className="text-[#2f2f2f]" />
                <h3 className="text-xl font-semibold text-[#2f2f2f]">문의가 접수되었습니다</h3>
                <p className="text-[14px] text-[#666] leading-relaxed">
                  담당자가 확인 후 24시간 내 연락드리겠습니다.
                  <br />
                  DrawU Construction을 믿어주셔서 감사합니다.
                </p>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="mt-4 rounded-none border-[#2f2f2f] text-[#2f2f2f] hover:bg-[#2f2f2f] hover:text-white text-[12px] tracking-[0.1em]"
                >
                  새 문의 작성
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="name"
                      className="text-[12px] tracking-[0.08em] text-[#444]"
                    >
                      성함 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="홍길동"
                      className="rounded-none border-[#d0d0d0] focus-visible:ring-0 focus-visible:border-[#2f2f2f] text-[13px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="phone"
                      className="text-[12px] tracking-[0.08em] text-[#444]"
                    >
                      연락처 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      required
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="010-0000-0000"
                      className="rounded-none border-[#d0d0d0] focus-visible:ring-0 focus-visible:border-[#2f2f2f] text-[13px]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="email"
                    className="text-[12px] tracking-[0.08em] text-[#444]"
                  >
                    이메일
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    className="rounded-none border-[#d0d0d0] focus-visible:ring-0 focus-visible:border-[#2f2f2f] text-[13px]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="type"
                    className="text-[12px] tracking-[0.08em] text-[#444]"
                  >
                    문의 유형
                  </Label>
                  <select
                    id="type"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="h-10 px-3 border border-[#d0d0d0] text-[13px] text-[#444] focus:outline-none focus:border-[#2f2f2f] bg-white"
                  >
                    <option value="">선택해주세요</option>
                    <option value="신축">신축 공사</option>
                    <option value="리모델링">인테리어 리모델링</option>
                    <option value="보강">구조 보강 및 보수</option>
                    <option value="기타">기타 문의</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="message"
                    className="text-[12px] tracking-[0.08em] text-[#444]"
                  >
                    문의 내용 <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    value={form.message}
                    onChange={handleChange}
                    placeholder="문의하실 내용을 자유롭게 입력해주세요."
                    rows={6}
                    className="rounded-none border-[#d0d0d0] focus-visible:ring-0 focus-visible:border-[#2f2f2f] text-[13px] resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  className="rounded-none bg-[#2f2f2f] hover:bg-black text-white text-[13px] tracking-[0.12em] py-5 font-semibold cursor-pointer"
                >
                  문의 제출하기
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </form>
            )}
          </div>

          {/* 연락처 정보 */}
          <div className="flex flex-col gap-10">
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-3">
                Contact Info
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-[#2f2f2f] mb-8">연락처 정보</h2>
            </div>

            <div className="flex flex-col gap-8">
              {contactInfo.map((info, idx) => {
                const Icon = info.icon;
                return (
                  <div key={idx} className="flex items-start gap-5">
                    <div className="w-10 h-10 bg-[#f5f5f5] flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-[#2f2f2f]" />
                    </div>
                    <div>
                      <p className="text-[11px] tracking-[0.15em] uppercase text-[#999] mb-1">
                        {info.label}
                      </p>
                      <p className="text-[15px] font-semibold text-[#2f2f2f]">{info.value}</p>
                      <p className="text-[12px] text-[#888] mt-0.5">{info.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="bg-[#e0e0e0]" />

            {/* 지도 플레이스홀더 */}
            <div className="w-full h-[220px] bg-[#f5f5f5] flex items-center justify-center border border-[#e0e0e0]">
              <div className="text-center">
                <MapPin size={28} className="text-[#bbb] mx-auto mb-2" />
                <p className="text-[12px] text-[#999]">지도 영역</p>
                <p className="text-[11px] text-[#bbb]">서울 강남구 테헤란로 123</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
