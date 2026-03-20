import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "견적 문의",
  description: "draw_u에 견적 및 상담 문의를 남겨주세요.",
  alternates: { canonical: "https://www.draw-u.kr/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
