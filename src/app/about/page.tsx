import { Separator } from "@/components/ui/separator";

const values = [
  {
    num: "01",
    title: "신뢰",
    desc: "고객과의 약속을 최우선으로 합니다. 투명한 계약과 정직한 시공으로 믿음을 쌓아갑니다.",
  },
  {
    num: "02",
    title: "기술",
    desc: "20년 이상의 현장 경험과 최신 공법을 결합하여 최고의 시공 품질을 보장합니다.",
  },
  {
    num: "03",
    title: "소통",
    desc: "고객의 요구를 경청하고, 시공 전 과정에서 긴밀한 소통으로 만족스러운 결과를 만듭니다.",
  },
];

const stats = [
  { value: "500+", label: "완공 프로젝트" },
  { value: "20+", label: "경력 연수" },
  { value: "98%", label: "고객 만족도" },
  { value: "100%", label: "하자 보증" },
];

export default function AboutPage() {
  return (
    <>
      {/* 페이지 히어로 */}
      <section className="relative pt-[56px]">
        <div
          className="h-[320px] md:h-[420px] bg-cover bg-center relative flex items-center justify-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1920&q=80')",
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 text-center text-white">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/60 mb-3">Company</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About Us</h1>
          </div>
        </div>
      </section>

      {/* 회사 소개 */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-3">Our Story</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2f2f2f] mb-6 leading-snug">
              DrawU의
              <br />
              이야기
            </h2>
            <Separator className="bg-[#2f2f2f] w-12 h-px mb-8" />
            <div className="space-y-4 text-[14px] text-[#555] leading-[1.9]">
              <p>
                DrawU Construction은 2004년 창업 이래, 대한민국 곳곳에 안전하고 아름다운 공간을
                만들어 왔습니다. 주거용·상업용 건축물의 신축부터 리모델링까지, 고객의 꿈을 현실로
                구현하는 것이 저희의 사명입니다.
              </p>
              <p>
                단순한 시공을 넘어 고객과 함께 공간의 가치를 설계합니다. 설계 단계부터 완공 후
                AS까지, 전 과정에서 고객 곁에 있겠습니다.
              </p>
              <p>
                500건 이상의 시공 경험과 20년의 노하우를 바탕으로, 오늘도 더 나은 공간을 위해
                최선을 다합니다.
              </p>
            </div>
          </div>
          <div className="w-full aspect-[4/3] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80"
              alt="회사 소개"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 핵심 가치 */}
      <section className="bg-[#f5f5f5] py-24 px-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-3">Core Values</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2f2f2f]">핵심 가치</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e0e0e0]">
            {values.map((v) => (
              <div key={v.num} className="bg-white p-10 flex flex-col gap-4">
                <span className="text-[11px] tracking-[0.2em] text-[#bbb] font-mono">{v.num}</span>
                <h3 className="text-[22px] font-bold text-[#2f2f2f]">{v.title}</h3>
                <Separator className="bg-[#e0e0e0] w-full" />
                <p className="text-[13px] text-[#666] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 수치 통계 */}
      <section className="bg-[#2f2f2f] py-20 px-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
            {stats.map((s, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="text-4xl md:text-5xl font-bold text-white">{s.value}</span>
                <span className="text-[12px] tracking-[0.15em] text-white/50 uppercase">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 대표 인사말 */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-[860px] mx-auto text-center flex flex-col items-center gap-8">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#999]">CEO Message</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#2f2f2f] leading-snug">
            &ldquo;고객의 공간이 곧 우리의 자부심입니다&rdquo;
          </h2>
          <Separator className="bg-[#e0e0e0] w-16 h-px" />
          <p className="text-[14px] text-[#555] leading-[2] max-w-[640px]">
            20년간 한결같이 지켜온 원칙이 있습니다. 내 가족이 살 집처럼 짓자. 그 마음으로 모든
            현장에 임하고 있습니다. DrawU와 함께 꿈꾸는 공간을 현실로 만들어 드리겠습니다.
          </p>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[15px] font-semibold text-[#2f2f2f]">홍길동</span>
            <span className="text-[12px] text-[#999] tracking-widest">CEO &amp; Founder</span>
          </div>
        </div>
      </section>
    </>
  );
}
