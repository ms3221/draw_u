"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendToNotion } from "@/app/admin/inquiries/actions";

export default function ResendNotionButton({
  inquiryId,
  alreadySynced = false,
  size = "sm",
}: {
  inquiryId: string;
  /** 이미 전송된 문의면 중복 경고 문구를 보여준다 */
  alreadySynced?: boolean;
  size?: "xs" | "sm";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    const message = alreadySynced
      ? "이미 Notion 에 전송된 문의입니다.\n다시 전송하면 Notion 에 중복 페이지가 생길 수 있습니다.\n그래도 재전송하시겠습니까?"
      : "이 문의를 Notion 으로 전송하시겠습니까?";
    if (!window.confirm(message)) return;
    startTransition(async () => {
      try {
        const result = await resendToNotion(inquiryId);
        if (result.success) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("재전송 중 오류가 발생했습니다.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleClick}
      disabled={isPending}
      className="rounded-none border-[#d0d0d0] tracking-[0.1em] gap-1.5"
    >
      <Send size={size === "xs" ? 11 : 13} />
      {isPending ? "전송 중..." : "Notion 재전송"}
    </Button>
  );
}
