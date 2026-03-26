"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const processSteps = [
  {
    num: "01",
    title: "상담 신청",
    desc: "고객님의 취향과 라이프스타일이 담긴 신청서를 작성해 주시면, 내용을 꼼꼼히 검토한 후 1~2일 내에 유선으로 미팅 예약을 안내해 드립니다.",
  },
  {
    num: "02",
    title: "1차미팅 (인터뷰)",
    desc: "예약된 일정에 맞추어 사무실 내방 미팅을 진행합니다. 고객님의 라이프스타일과 공간이 지향하는 가치에 대해 깊이 있는 대화를 나누며, 이를 바탕으로 구체적인 디자인 방향성과 최적의 예산 계획을 수립합니다.",
  },
  {
    num: "03",
    title: "2차미팅 (디자인 컨셉 및 가견적)",
    desc: "1차 상담 내용을 면밀히 분석하여 구체화된 디자인 컨셉을 제안합니다. 해당 컨셉이 반영된 기초 도면을 바탕으로, 프로젝트의 규모와 자재를 고려한 상세 견적서를 작성하여 투명하게 안내해 드립니다.",
  },
  {
    num: "04",
    title: "계약미팅 및 현장실측",
    desc: "확정된 디자인 컨셉과 예산 계획을 바탕으로 정식 계약을 체결합니다. 이후 정밀한 현장 실측을 통해 기존 도면과의 오차를 세밀하게 점검하며, 실제 공간에 최적화된 시공 데이터로 업데이트합니다.",
  },
  {
    num: "05",
    title: "디자인 미팅",
    desc: "약 4회에 걸친 디자인 미팅을 통해 상상을 현실로 구체화합니다. 질감과 조도까지 고려한 3D 시안과 체계적인 공사 계획을 공유하며 시공 전 완벽한 결과물을 미리 확인하실 수 있습니다.",
  },
  {
    num: "06",
    title: "공사 진행 및 일일리포트",
    desc: "최종 확정된 디자인과 견적을 바탕으로 본격적인 시공에 착수합니다. 전용 소통 채널 및 고객 공유 페이지를 통해 매일의 공정 현황과 현장 사진을 투명하게 공유해 드립니다.",
  },
  {
    num: "07",
    title: "마감공사",
    desc: "공간의 완성도를 결정짓는 가장 중요한 공정입니다. 준공 청소 이후, 퀄리티를 극대화하는 세밀한 디테일 작업과 '7일간의 집중 케어'를 통해 완벽한 마무리를 실현합니다. 이 과정에서 공간의 가장 아름다운 순간을 기록하는 사진 촬영이 병행되며, 현장 상황에 맞춰 최상의 결과물을 아카이빙합니다.",
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
  referencePhotos: FileList;
  projectUrl: string;
  freeText: string;
  privacy: boolean;
};

const inputClass =
  "w-full border-b border-[#d0d0d0] py-2 text-[13px] text-[#2f2f2f] placeholder:text-[#bbb] focus:outline-none focus:border-[#2f2f2f] bg-transparent transition-colors";
const labelClass = "block text-[11px] tracking-[0.1em] text-[#888] mb-1";

export default function ContactClient() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const referralValue = watch("referral");

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const supabase = createClient();

      // 파일 업로드 헬퍼
      const uploadFiles = async (files: FileList | undefined, folder: string) => {
        const urls: string[] = [];
        if (!files?.length) return urls;
        for (const file of Array.from(files)) {
          const ext = file.name.split(".").pop();
          const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage
            .from("contact")
            .upload(path, file);
          if (!error) {
            const { data: urlData } = supabase.storage
              .from("contact")
              .getPublicUrl(path);
            urls.push(urlData.publicUrl);
          }
        }
        return urls;
      };

      const [floorPlanUrls, referencePhotoUrls] = await Promise.all([
        uploadFiles(data.floorPlan, "floor-plans"),
        uploadFiles(data.referencePhotos, "reference-photos"),
      ]);

      const { error } = await supabase.from("contact_inquiries").insert({
        name: data.name,
        phone: data.phone,
        family_members: data.familyMembers,
        available_time: data.availableTime,
        address: data.address,
        area: data.area,
        start_date: data.startDate,
        move_in_date: data.moveInDate,
        budget: data.budget,
        referral: data.referral,
        referral_other: data.referralOther || null,
        floor_plan_urls: floorPlanUrls.length ? floorPlanUrls : null,
        reference_photo_urls: referencePhotoUrls.length ? referencePhotoUrls : null,
        project_url: data.projectUrl || null,
        free_text: data.freeText || null,
      });

      if (error) throw error;
      setSubmitted(true);
      setTimeout(() => {
        document
          .getElementById("inquiry-result")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error(err);
      alert("문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white pt-[100px]">
      {/* 2컬럼 메인 */}
      <div className="max-w-[1280px] mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-[40%_60%] gap-16 items-start">
        {/* 좌측 — 모바일에서는 contents로 풀어서 개별 order 적용, 데스크톱에서는 하나의 sticky 컬럼 */}
        <div className="contents md:block md:sticky md:top-[120px]">
          {/* 상담 진행 프로세스 — 항상 위 */}
          <div className="order-1 md:order-none">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-2">
              How We Work
            </p>
            <h2 className="text-2xl font-bold text-[#2f2f2f] mb-10">
              상담 진행 프로세스
            </h2>

            <div className="flex flex-col">
              {processSteps.map((step, idx) => (
                <div key={step.num} className="flex gap-4 relative">
                  {/* 타임라인 선 */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border border-[#2f2f2f] flex items-center justify-center shrink-0 bg-white z-10">
                      <span className="text-[10px] font-mono text-[#2f2f2f]">
                        {step.num}
                      </span>
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
                    <p className="text-[12px] text-[#888] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 안내사항 — 항상 아래 */}
          <div className="order-3 md:order-none">
            <h2 className="text-2xl font-bold text-[#2f2f2f] mb-6">안내사항</h2>
            <div className="space-y-4 text-[13px] text-[#555] leading-[1.8]">
              <p>
                <span className="text-[#2f2f2f] mr-1.5">◌</span>
                남겨주신 소중한 정보를 바탕으로 담당 디자이너가 사전 검토를
                진행합니다. 접수 후 영업일 기준 1~2일 이내에 개별 연락을 드려
                상세한 안내를 도와드립니다.
              </p>
              <p>
                <span className="text-[#2f2f2f] mr-1.5">◌</span>
                더욱 만족스러운 공간을 그려내기 위해, 첫 만남은 고객님의 일상과
                이야기를 편안하게 나누는 인터뷰 형식으로 진행하고 있습니다.
              </p>
              <p>
                <span className="text-[#2f2f2f] mr-1.5">◌</span>
                나누어 주신 소중한 이야기를 바탕으로, 고객님의 취향과 예산에 꼭
                맞는 드로우유의 컨셉 제안서와 가견적서를 준비해 드립니다.
              </p>
              <p>
                <span className="text-[#2f2f2f] mr-1.5">◌</span>
                현장을 직접 방문하기 전 안내해 드리는 디자인과 견적은 실제 현장
                상황에 따라 부득이하게 변경될 수 있는 점 참고 부탁드립니다.
              </p>
              <p>
                <span className="text-[#2f2f2f] mr-1.5">◌</span>
                집중도 있는 상담을 위해 미팅은 예약제로 진행하고 있으며, 평일
                방문이 어려우신 분들을 위해 주말과 공휴일 상담도 열려 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 우측 — 폼: 모바일 두 번째 / 데스크톱 우측 */}
        <div className="order-2 md:order-none">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-2">
            Online Inquiry
          </p>
          <h2 className="text-2xl font-bold text-[#2f2f2f] mb-10">상담신청</h2>

          {submitted ? (
            <div
              id="inquiry-result"
              className="flex flex-col items-start gap-4 py-12"
            >
              <CheckCircle2 size={40} className="text-[#2f2f2f]" />
              <h3 className="text-xl font-semibold text-[#2f2f2f]">
                문의가 접수되었습니다
              </h3>
              <div className="space-y-3 text-[13px] text-[#555] leading-[1.8]">
                <p>
                  <span className="text-[#2f2f2f] mr-1.5">◌</span>
                  남겨주신 소중한 정보를 바탕으로 담당 디자이너가 사전 검토를
                  진행합니다. 접수 후 영업일 기준 1~2일 이내에 개별 연락을 드려
                  상세한 안내를 도와드립니다.
                </p>
                <p>
                  <span className="text-[#2f2f2f] mr-1.5">◌</span>
                  더욱 만족스러운 공간을 그려내기 위해, 첫 만남은 고객님의
                  일상과 이야기를 편안하게 나누는 인터뷰 형식으로 진행하고
                  있습니다.
                </p>
              </div>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  reset();
                }}
                variant="outline"
                className="mt-4 rounded-none border-[#2f2f2f] text-[#2f2f2f] hover:bg-[#2f2f2f] hover:text-white text-[12px] tracking-[0.1em]"
              >
                새 문의 작성
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-7"
              noValidate
            >
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
                {errors.name && (
                  <p className="text-[11px] text-red-400 mt-1">
                    성함을 입력해주세요.
                  </p>
                )}
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
                {errors.phone && (
                  <p className="text-[11px] text-red-400 mt-1">
                    연락처를 입력해주세요.
                  </p>
                )}
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
                {errors.familyMembers && (
                  <p className="text-[11px] text-red-400 mt-1">
                    가족 구성원을 입력해주세요.
                  </p>
                )}
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
                {errors.availableTime && (
                  <p className="text-[11px] text-red-400 mt-1">
                    통화 가능 시간을 입력해주세요.
                  </p>
                )}
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
                {errors.address && (
                  <p className="text-[11px] text-red-400 mt-1">
                    주소를 입력해주세요.
                  </p>
                )}
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
                {errors.area && (
                  <p className="text-[11px] text-red-400 mt-1">
                    평형을 입력해주세요.
                  </p>
                )}
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
                    {errors.startDate && (
                      <p className="text-[11px] text-red-400 mt-1">
                        날짜를 선택해주세요.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#bbb] mb-1">입주 예정일</p>
                    <input
                      {...register("moveInDate", { required: true })}
                      type="date"
                      className={inputClass}
                    />
                    {errors.moveInDate && (
                      <p className="text-[11px] text-red-400 mt-1">
                        날짜를 선택해주세요.
                      </p>
                    )}
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
                {errors.budget && (
                  <p className="text-[11px] text-red-400 mt-1">
                    예산을 입력해주세요.
                  </p>
                )}
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
                {errors.referral && (
                  <p className="text-[11px] text-red-400 mt-1">
                    유입 경로를 선택해주세요.
                  </p>
                )}
                {referralValue === "other" && (
                  <input
                    {...register("referralOther", { required: true })}
                    placeholder="어떻게 알게 되셨나요?"
                    className={`${inputClass} mt-4`}
                  />
                )}
                {errors.referralOther && (
                  <p className="text-[11px] text-red-400 mt-1">
                    내용을 입력해주세요.
                  </p>
                )}
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
                <p className="text-[11px] text-[#aaa] mt-1.5">
                  첨부시 더 원활한 상담이 가능합니다.
                </p>
              </div>

              {/* 참고사진 첨부 */}
              <div>
                <label className={labelClass}>참고사진 첨부</label>
                <input
                  {...register("referencePhotos")}
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full pt-2 text-[12px] text-[#888] file:mr-4 file:py-1 file:px-3 file:border file:border-[#d0d0d0] file:text-[11px] file:bg-white file:text-[#555] file:cursor-pointer hover:file:bg-[#f5f5f5] cursor-pointer"
                />
                <p className="text-[11px] text-[#aaa] mt-1.5">
                  원하시는 분위기나 스타일의 사진을 첨부해주세요.
                </p>
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
                <p className="text-[12px] text-[#999] mb-4">
                  자유롭게 적어주세요.
                </p>
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
                  <label
                    htmlFor="privacy"
                    className="text-[12px] text-[#555] cursor-pointer leading-snug"
                  >
                    개인정보 수집 및 이용에 동의합니다{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className="text-[11px] text-[#888] underline underline-offset-2 hover:text-[#2f2f2f] transition-colors"
                  >
                    [보기]
                  </button>
                </div>
              </div>
              {errors.privacy && (
                <p className="text-[11px] text-red-400 -mt-5">
                  개인정보 수집 및 이용에 동의해주세요.
                </p>
              )}

              {/* 제출 버튼 */}
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-none bg-[#2f2f2f] hover:bg-black text-white text-[12px] tracking-[0.15em] py-5 font-semibold cursor-pointer mt-2 disabled:opacity-50"
              >
                {submitting ? "접수 중..." : "확인"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* 하단 지도 */}
      <div className="border-t border-[#e8e8e8] mt-4">
        <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="pr-8 pb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#aaa] mb-2">
              Location
            </p>
            <p className="text-[14px] font-medium text-[#2f2f2f] leading-snug">
              광주광역시 광산구 수완로 9번길 31
            </p>
            <p className="text-[12px] text-[#888] mt-0.5">
              1층 드로우유 인테리어
            </p>
          </div>
          <div className="px-8 pb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#aaa] mb-2">
              Phone
            </p>
            <p className="text-[14px] font-medium text-[#2f2f2f]">1533-6967</p>
            <p className="text-[12px] text-[#888] mt-0.5">평일 09:00 ~ 18:00</p>
          </div>
          <div className="pl-8 pb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#aaa] mb-2">
              Email
            </p>
            <p className="text-[14px] font-medium text-[#2f2f2f]">
              drawuco@gmail.com
            </p>
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
