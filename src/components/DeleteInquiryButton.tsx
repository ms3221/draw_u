"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInquiry } from "@/app/admin/inquiries/actions";

export default function DeleteInquiryButton({
  inquiryId,
  redirectTo,
  size = "sm",
}: {
  inquiryId: string;
  /** 삭제 후 이동할 경로 (없으면 현재 페이지 새로고침) */
  redirectTo?: string;
  size?: "xs" | "sm";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    if (
      !window.confirm("이 문의를 삭제하시겠습니까? 첨부 파일도 함께 삭제됩니다.")
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await deleteInquiry(inquiryId);
        if (result.success) {
          toast.success(result.message);
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("삭제 중 오류가 발생했습니다.");
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
      className="rounded-none border-[#d0d0d0] tracking-[0.1em] gap-1.5 text-red-500 hover:text-red-600"
    >
      <Trash2 size={size === "xs" ? 11 : 13} />
      {isPending ? "삭제 중..." : "삭제"}
    </Button>
  );
}
