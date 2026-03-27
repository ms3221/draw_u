"use server";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!;

const REFERRAL_MAP: Record<string, string> = {
  instagram: "인스타그램",
  blog: "블로그",
  referral: "지인소개",
  other: "기타",
};

type SubmitToNotionData = {
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
  referralOther?: string;
  floorPlanUrls?: string[];
  referencePhotoUrls?: string[];
  projectUrl?: string;
  freeText?: string;
};

export async function submitToNotion(data: SubmitToNotionData) {
  const referralLabel =
    data.referral === "other" && data.referralOther
      ? data.referralOther
      : REFERRAL_MAP[data.referral] || data.referral;

  const properties: Record<string, unknown> = {
    "프로젝트 이름": { title: [{ text: { content: `${data.name} 님` } }] },
    이름: { rich_text: [{ text: { content: data.name } }] },
    연락처: { rich_text: [{ text: { content: data.phone } }] },
    "가족 구성원": { rich_text: [{ text: { content: data.familyMembers } }] },
    "연락 가능한 시간": {
      multi_select: [{ name: data.availableTime }],
    },
    "현장 주소": { rich_text: [{ text: { content: data.address } }] },
    "공사 범위": { rich_text: [{ text: { content: data.area } }] },
    "공사 예산": { rich_text: [{ text: { content: data.budget } }] },
    "공사 시작일": { date: { start: data.startDate } },
    "입주 / 영업 희망일": { date: { start: data.moveInDate } },
    "문의 사항": {
      rich_text: [{ text: { content: data.freeText || "" } }],
    },
    "유입 경로": { select: { name: referralLabel } },
    "상담 신청일": { date: { start: getKSTDate() } },
    "관심 프로젝트 URL": { url: data.projectUrl || null },
  };

  if (data.floorPlanUrls?.length) {
    properties["평면도"] = {
      files: data.floorPlanUrls.map((url, i) => ({
        name: `평면도_${i + 1}`,
        type: "external",
        external: { url },
      })),
    };
  }

  if (data.referencePhotoUrls?.length) {
    properties["참고사진"] = {
      files: data.referencePhotoUrls.map((url, i) => ({
        name: `참고사진_${i + 1}`,
        type: "external",
        external: { url },
      })),
    };
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Notion API error:", error);
    return { success: false, error: "Notion 전송 실패" };
  }

  return { success: true };
}

function getKSTDate(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}
