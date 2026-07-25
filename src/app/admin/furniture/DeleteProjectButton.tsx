"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteFurnitureProject } from "./projects-actions";

export default function DeleteProjectButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`"${name}" 프로젝트를 삭제할까요?`)) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteFurnitureProject(fd);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      title="프로젝트 삭제"
      className="w-8 h-8 flex items-center justify-center text-[#bbb] hover:text-red-500 transition-colors disabled:opacity-40"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
    </button>
  );
}
