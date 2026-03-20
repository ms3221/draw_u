"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const processSteps = [
  {
    num: "01",
    title: "미팅 예약",
    desc: "견적문의를 남겨 주시면 확인 후 전화드리고 사무실 미팅 일정을 잡습니다.",
  },
  {
    num: "02",
    title: "사무실 미팅",
    desc: "고객님이 제공해주신 아파트 평면도를 토대로 드로우유의 시안을 보여드립니다.",
  },
  {
    num: "03",
    title: "디자인 계약",
    desc: "계약금 입금 후 고객님께서 주신 피드백과 니즈를 상세히 반영한 디자인과 견적을 안내해 드립니다.",
  },
  {
    num: "04",
    title: "실측 후 디자인 수정",
    desc: "현장 정밀실측과 컨디션을 확인합니다. 그리고 최종 디자인과 견적을 작성합니다.",
  },
  {
    num: "05",
    title: "최종계약",
    desc: "최종 디자인과 견적서가 완료되면 최종계약과 일정표를 안내해드립니다.",
  },
  {
    num: "06",
    title: "공사 진행",
    desc: "최종 결정된 시안 견적을 바탕으로 공사를 진행합니다. 단체 채팅방과 고객 공유페이지에 공사 내용과 공정별 사진을 보내드립니다.",
  },
  {
    num: "07",
    title: "공사 마감",
    desc: "공사 중 하자 발생을 최소화하여 진행합니다.",
  },
  {
    num: "08",
    title: "A/S",
    desc: "A/S 기간은 공사 종료 후 1년이며, 문제 발생 시 신속히 보수 관리를 해드립니니다.",
  },
];

type FormValues = {
  name: string;
  phone: string;
  familyMembers: string;
  availableTime: string;
  address: string;
  area: string;
  startDate: string;
  moveInDate: string;
  budget: string;
  referral: string;
  referralOther: string;
  floorPlan: FileList;
  projectUrl: string;
  freeText: string;
  privacy: boolean;
};

const inputClass =
  "w-full border-b border-[#d0d0d0] py-2 text-[13px] text-[#2f2f2f] placeholder:text-[#bbb] focus:outline-none focus:border-[#2f2f2f] bg-transparent transition-colors";
const labelClass = "block text-[11px] tracking-[0.1em] text-[#888] mb-1";

export default function ContactClient() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const referralValue = watch("referral");

  const onSubmit = () => {
    setSubmitted(true);
  };

  return (
    <div className="bg-white pt-[100px]">
      {/* 2컬럼 메인 */}
      <div className="max-w-[1280px] mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-[40%_60%] gap-16 items-start">
        {/* 좌측 — 프로세스 타임라인 */}
        <div className="md:sticky md:top-[120px]">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-2">How We Work</p>
          <h2 className="text-2xl font-bold text-[#2f2f2f] mb-10">상담 진행 프로세스</h2>

          <div className="flex flex-col">
            {processSteps.map((step, idx) => (
              <div key={step.num} className="flex gap-4 relative">
                {/* 타임라인 선 */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border border-[#2f2f2f] flex items-center justify-center shrink-0 bg-white z-10">
                    <span className="text-[10px] font-mono text-[#2f2f2f]">{step.num}</span>
                  </div>
                  {idx < processSteps.length - 1 && (
                    <div className="w-px flex-1 bg-[#e0e0e0] my-1" />
                  )}
                </div>
                {/* 텍스트 */}
                <div className="pb-8">
                  <p className="text-[14px] font-semibold text-[#2f2f2f] leading-none mb-1.5">
                    {step.title}
                  </p>
                  <p className="text-[12px] text-[#888] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측 — 폼 */}
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-2">Online Inquiry</p>
          <h2 className="text-2xl font-bold text-[#2f2f2f] mb-10">견적 문의</h2>

          {submitted ? (
            <div className="flex flex-col items-start gap-4 py-12">
              <CheckCircle2 size={40} className="text-[#2f2f2f]" />
              <h3 className="text-xl font-semibold text-[#2f2f2f]">문의가 접수되었습니다</h3>
              <p className="text-[14px] text-[#666] leading-relaxed">
                담당자가 확인 후 24시간 내 연락드리겠습니다.
                <br />
                드로우유를 믿어주셔서 감사합니다.
              </p>
              <Button
                onClick={() => { setSubmitted(false); reset(); }}
                variant="outline"
                className="mt-4 rounded-none border-[#2f2f2f] text-[#2f2f2f] hover:bg-[#2f2f2f] hover:text-white text-[12px] tracking-[0.1em]"
              >
                새 문의 작성
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-7" noValidate>
              {/* 성함 */}
              <div>
                <label className={labelClass}>
                  성함 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name", { required: true })}
                  placeholder="홍길동"
                  className={inputClass}
                />
                {errors.name && <p className="text-[11px] text-red-400 mt-1">성함을 입력해주세요.</p>}
              </div>

              {/* 연락처 */}
              <div>
                <label className={labelClass}>
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("phone", { required: true })}
                  placeholder="010-0000-0000"
                  className={inputClass}
                />
                {errors.phone && <p className="text-[11px] text-red-400 mt-1">연락처를 입력해주세요.</p>}
              </div>

              {/* 가족 구성원 */}
              <div>
                <label className={labelClass}>
                  가족 구성원 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("familyMembers", { required: true })}
                  placeholder="예: 부부+아이 1명, 반려견 1마리 등"
                  className={inputClass}
                />
                {errors.familyMembers && <p className="text-[11px] text-red-400 mt-1">가족 구성원을 입력해주세요.</p>}
              </div>

              {/* 통화 가능 시간 */}
              <div>
                <label className={labelClass}>
                  통화 가능 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("availableTime", { required: true })}
                  placeholder="예: 평일 오후 2시 이후"
                  className={inputClass}
                />
                {errors.availableTime && <p className="text-[11px] text-red-400 mt-1">통화 가능 시간을 입력해주세요.</p>}
              </div>

              {/* 주소 */}
              <div>
                <label className={labelClass}>
                  주소 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("address", { required: true })}
                  placeholder="공사 예정 주소를 입력해주세요"
                  className={inputClass}
                />
                {errors.address && <p className="text-[11px] text-red-400 mt-1">주소를 입력해주세요.</p>}
              </div>

              {/* 평형 */}
              <div>
                <label className={labelClass}>
                  평형 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("area", { required: true })}
                  placeholder="예: 34평형"
                  className={inputClass}
                />
                {errors.area && <p className="text-[11px] text-red-400 mt-1">평형을 입력해주세요.</p>}
              </div>

              {/* 공사 일정 */}
              <div>
                <label className={labelClass}>
                  공사 일정 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-6 mt-1">
                  <div>
                    <p className="text-[11px] text-[#bbb] mb-1">공사 시작</p>
                    <input
                      {...register("startDate", { required: true })}
                      type="date"
                      className={inputClass}
                    />
                    {errors.startDate && <p className="text-[11px] text-red-400 mt-1">날짜를 선택해주세요.</p>}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#bbb] mb-1">입주 예정일</p>
                    <input
                      {...register("moveInDate", { required: true })}
                      type="date"
                      className={inputClass}
                    />
                    {errors.moveInDate && <p className="text-[11px] text-red-400 mt-1">날짜를 선택해주세요.</p>}
                  </div>
                </div>
              </div>

              {/* 예산 */}
              <div>
                <label className={labelClass}>
                  예산 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("budget", { required: true })}
                  placeholder="예: 5,000만원"
                  className={inputClass}
                />
                {errors.budget && <p className="text-[11px] text-red-400 mt-1">예산을 입력해주세요.</p>}
              </div>

              {/* 유입 경로 */}
              <div>
                <label className={labelClass}>
                  유입 경로 <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("referral", { required: true })}
                  className="w-full border-b border-[#d0d0d0] py-2 text-[13px] text-[#2f2f2f] focus:outline-none focus:border-[#2f2f2f] bg-transparent transition-colors appearance-none cursor-pointer"
                >
                  <option value="">선택해주세요</option>
                  <option value="instagram">인스타그램</option>
                  <option value="blog">블로그</option>
                  <option value="referral">지인 추천</option>
                  <option value="other">기타</option>
                </select>
                {errors.referral && <p className="text-[11px] text-red-400 mt-1">유입 경로를 선택해주세요.</p>}
                {referralValue === "other" && (
                  <input
                    {...register("referralOther", { required: true })}
                    placeholder="어떻게 알게 되셨나요?"
                    className={`${inputClass} mt-4`}
                  />
                )}
                {errors.referralOther && <p className="text-[11px] text-red-400 mt-1">내용을 입력해주세요.</p>}
              </div>

              {/* 평면도 첨부 */}
              <div>
                <label className={labelClass}>평면도 첨부</label>
                <input
                  {...register("floorPlan")}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="w-full pt-2 text-[12px] text-[#888] file:mr-4 file:py-1 file:px-3 file:border file:border-[#d0d0d0] file:text-[11px] file:bg-white file:text-[#555] file:cursor-pointer hover:file:bg-[#f5f5f5] cursor-pointer"
                />
                <p className="text-[11px] text-[#aaa] mt-1.5">미첨부 시 원활한 상담이 어려울 수 있습니다.</p>
              </div>

              {/* 관심 프로젝트 URL */}
              <div>
                <label className={labelClass}>관심 프로젝트 URL</label>
                <input
                  {...register("projectUrl")}
                  type="url"
                  placeholder="https://"
                  className={inputClass}
                />
              </div>

              {/* 자유 입력 */}
              <div className="border border-[#e0e0e0] p-5 mt-2">
                <p className="text-[13px] font-medium text-[#2f2f2f] leading-snug mb-1">
                  당신의 취향을 드로우유의 시선으로 채워드릴게요.
                </p>
                <p className="text-[12px] text-[#999] mb-4">자유롭게 적어주세요.</p>
                <textarea
                  {...register("freeText")}
                  rows={6}
                  placeholder="원하는 분위기, 좋아하는 소재, 컬러 톤, 참고하고 싶은 공간 등 무엇이든 좋습니다."
                  className="w-full text-[13px] text-[#2f2f2f] placeholder:text-[#ccc] focus:outline-none bg-transparent resize-none border-b border-dashed border-[#d0d0d0] pb-2"
                />
              </div>

              {/* 개인정보 수집 및 이용 동의 */}
              <div className="flex items-start gap-3 pt-1">
                <input
                  {...register("privacy", { required: true })}
                  type="checkbox"
                  id="privacy"
                  className="mt-0.5 w-4 h-4 accent-[#2f2f2f] cursor-pointer shrink-0"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <label htmlFor="privacy" className="text-[12px] text-[#555] cursor-pointer leading-snug">
                    개인정보 수집 및 이용에 동의합니다 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className="text-[11px] text-[#888] underline underline-offset-2 hover:text-[#2f2f2f] transition-colors"
                  >
                    [보기]
                  </button>
                </div>
              </div>
              {errors.privacy && <p className="text-[11px] text-red-400 -mt-5">개인정보 수집 및 이용에 동의해주세요.</p>}

              {/* 제출 버튼 */}
              <Button
                type="submit"
                className="rounded-none bg-[#2f2f2f] hover:bg-black text-white text-[12px] tracking-[0.15em] py-5 font-semibold cursor-pointer mt-2"
              >
                확인
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* 하단 지도 */}
      <div className="border-t border-[#e8e8e8] mt-4">
        <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="pr-8 pb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#aaa] mb-2">Location</p>
            <p className="text-[14px] font-medium text-[#2f2f2f] leading-snug">광주광역시 광산구 수완로 9번길 31</p>
            <p className="text-[12px] text-[#888] mt-0.5">1층 드로우유 인테리어</p>
          </div>
          <div className="px-8 pb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#aaa] mb-2">Phone</p>
            <p className="text-[14px] font-medium text-[#2f2f2f]">1533-6967</p>
            <p className="text-[12px] text-[#888] mt-0.5">평일 09:00 ~ 18:00</p>
          </div>
          <div className="pl-8 pb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#aaa] mb-2">Email</p>
            <p className="text-[14px] font-medium text-[#2f2f2f]">drawuco@gmail.com</p>
            <p className="text-[12px] text-[#888] mt-0.5">24시간 접수 가능</p>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-6 pb-16">
          <div className="w-full h-[380px] rounded-2xl overflow-hidden">
            <iframe
              src="https://maps.google.com/maps?q=광주광역시+광산구+수완로+9번길+31&output=embed&hl=ko&z=16"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
