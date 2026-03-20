const faqs = [
  {
    step: "01",
    title: "견적 신청",
    items: [
      "위 링크의 상담 신청서를 작성해주시면, 신청서 내용을 참고하여 1~3일내에 예약 안내 전화를 드립니다.",
      "전화·채팅 문의만으로는 '상담 내용'이 제한됩니다. 전시장 상담과 프로젝트 제안서까지 받아 보시는 걸 권장드립니다.",
      "DrawU는 사용자와 생활을 이해하는 시간을 중요하게 생각합니다. 첫 상담으로부터 3주 이상 공사 준비기간을 권장 드립니다.",
    ],
  },
  {
    step: "02",
    title: "1차 미팅 / 견적 상담",
    items: [
      "예약안내 전화를 드려 상담 시간을 확정하고, 1차 견적 상담을 진행합니다. (1차 상담은 전시장에서 권장드립니다.)",
      "공사 전 유의사항에 대해 설명드리며 사용자의 취향, 라이프스타일 등에 대해서 충분히 이야기를 나누는 시간을 갖습니다.",
      "프로젝트 예산을 조정하며 포트폴리오, 래퍼런스 등을 참고하여 프로젝트의 방향성을 설정합니다.",
      "1차 상담 시 현장의 평면도를 준비해 주시면 더욱 자세하고 정확한 상담이 가능합니다.",
    ],
  },
  {
    step: "03",
    title: "2차 미팅 / 현장 가측",
    items: [
      "상황에 따라서 2차미팅이 생략되는 경우 상세 견적서가 아닌 대략적인 예상 견적서로 안내드립니다. (증·감액 발생될 수 있음)",
      "현장가측은 1시간 이내로 진행되며, 별도의 실측비·출장비는 발생되지 않습니다.",
      "프로젝트 진행 현장의 상황에 따라서 1차·2차 미팅의 순서는 변경될 수 있습니다.",
      "프로젝트 현장의 가능한 레이아웃, 동선을 체크하며 가측을 진행하고, 공간에 대해 상담합니다.",
    ],
  },
  {
    step: "04",
    title: "프로젝트 제안서 / 견적서 제안",
    items: [
      "2차 미팅을 마친 현장의 견적서는 공사 내용에 변경이 없는 경우 추가 견적등의 금액 변경이 없을 것을 약속드립니다.",
      "DrawU가 추천드리는 컨셉 이미지와 사용자의 생활, 취향을 그려낸 프로젝트 제안서를 브리핑합니다.",
      "견적서의 내용에 대해 상세히 설명드리며 사용할 마감재 등에 대한 소통이 이루어집니다.",
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen pt-[56px] bg-white">
      <div className="max-w-[800px] mx-auto px-6 py-20">
        <div className="mb-14">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[#999] mb-3">Process</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#2f2f2f]">견적 진행 절차</h1>
        </div>

        <div className="flex flex-col gap-12">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-t border-[#e0e0e0] pt-8">
              <div className="flex items-center gap-5 mb-6">
                <span className="text-[12px] tracking-[0.2em] text-[#999]">{faq.step}</span>
                <h2 className="text-[20px] font-semibold text-[#2f2f2f]">{faq.title}</h2>
              </div>
              <ul className="flex flex-col gap-4 pl-10">
                {faq.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-[16px] text-[#555] leading-relaxed">
                    <span className="text-[#bbb] shrink-0 mt-0.5">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
