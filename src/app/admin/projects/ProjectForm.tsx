"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { X, Upload, Star, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImageAction, deleteImageAction } from "./actions";
import type { Project } from "@/lib/supabase/types";

type DetailEntry = { key: string; value: string | Record<string, string> };

const DEFAULT_DETAILS: DetailEntry[] = [
  {
    key: "Material",
    value: { Floor: "", Walls: "", Ceiling: "" },
  },
  { key: "Size", value: "" },
  { key: "Year", value: "" },
  { key: "Location", value: "" },
];

function parseDetails(
  details: Record<string, unknown>
): DetailEntry[] {
  if (Object.keys(details).length === 0) return DEFAULT_DETAILS;

  return Object.entries(details).map(([key, value]) => ({
    key,
    value:
      typeof value === "object" && value !== null
        ? (value as Record<string, string>)
        : String(value ?? ""),
  }));
}

export default function ProjectForm({
  project,
  action,
}: {
  project?: Project;
  action: (formData: FormData) => Promise<void>;
}) {
  const [images, setImages] = useState<string[]>(project?.images ?? []);
  const [thumbnailUrl, setThumbnailUrl] = useState(
    project?.thumbnail_url ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState<DetailEntry[]>(
    parseDetails((project?.details as Record<string, unknown>) ?? {})
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("projectId", project?.id ?? "temp");
        const url = await uploadImageAction(fd);
        newUrls.push(url);
      }

      const updated = [...images, ...newUrls];
      setImages(updated);
      if (!thumbnailUrl && newUrls[0]) {
        setThumbnailUrl(newUrls[0]);
      }
      toast.success(`이미지 ${newUrls.length}장 업로드 완료`);
    } catch (err) {
      toast.error("이미지 업로드 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(url: string) {
    try {
      await deleteImageAction(url);
      toast.success("이미지 삭제 완료");
    } catch {
      toast.error("이미지 삭제 실패");
    }
    const updated = images.filter((u) => u !== url);
    setImages(updated);
    if (thumbnailUrl === url) {
      setThumbnailUrl(updated[0] ?? "");
    }
  }

  function updateDetailKey(index: number, newKey: string) {
    setDetails((prev) =>
      prev.map((d, i) => (i === index ? { ...d, key: newKey } : d))
    );
  }

  function updateDetailValue(
    index: number,
    value: string | Record<string, string>
  ) {
    setDetails((prev) =>
      prev.map((d, i) => (i === index ? { ...d, value } : d))
    );
  }

  function updateSubValue(index: number, subKey: string, subValue: string) {
    setDetails((prev) =>
      prev.map((d, i) => {
        if (i !== index || typeof d.value !== "object") return d;
        return { ...d, value: { ...d.value, [subKey]: subValue } };
      })
    );
  }

  function addSubField(index: number) {
    setDetails((prev) =>
      prev.map((d, i) => {
        if (i !== index || typeof d.value !== "object") return d;
        return { ...d, value: { ...d.value, "": "" } };
      })
    );
  }

  function removeSubField(index: number, subKey: string) {
    setDetails((prev) =>
      prev.map((d, i) => {
        if (i !== index || typeof d.value !== "object") return d;
        const { [subKey]: _, ...rest } = d.value;
        return { ...d, value: rest };
      })
    );
  }

  function addDetail() {
    setDetails((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeDetail(index: number) {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleDetailType(index: number) {
    setDetails((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        return {
          ...d,
          value: typeof d.value === "object" ? "" : { "": "" },
        };
      })
    );
  }

  function buildDetailsJson(): string {
    const obj: Record<string, unknown> = {};
    for (const d of details) {
      if (!d.key) continue;
      if (typeof d.value === "object") {
        const filtered: Record<string, string> = {};
        for (const [k, v] of Object.entries(d.value)) {
          if (k || v) filtered[k] = v;
        }
        if (Object.keys(filtered).length > 0) obj[d.key] = filtered;
      } else if (d.value) {
        obj[d.key] = d.value;
      }
    }
    return JSON.stringify(obj);
  }

  return (
    <form action={action} className="space-y-8">
      {/* 기본 정보 */}
      <div className="bg-white border border-[#e0e0e0] p-6 space-y-5">
        <h2 className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-4">
          기본 정보
        </h2>

        <div>
          <Label className="text-[12px] tracking-[0.1em] text-[#999] uppercase">
            프로젝트명 *
          </Label>
          <Input
            name="name"
            defaultValue={project?.name ?? ""}
            required
            className="mt-1 rounded-none border-[#d0d0d0]"
          />
        </div>

        <div>
          <Label className="text-[12px] tracking-[0.1em] text-[#999] uppercase">
            주소
          </Label>
          <Input
            name="address"
            defaultValue={project?.address ?? ""}
            className="mt-1 rounded-none border-[#d0d0d0]"
          />
        </div>

        <div>
          <Label className="text-[12px] tracking-[0.1em] text-[#999] uppercase">
            설명
          </Label>
          <Textarea
            name="description"
            defaultValue={project?.description ?? ""}
            rows={4}
            className="mt-1 rounded-none border-[#d0d0d0] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[12px] tracking-[0.1em] text-[#999] uppercase">
              정렬 순서
            </Label>
            <Input
              name="sort_order"
              type="number"
              defaultValue={project?.sort_order ?? 0}
              className="mt-1 rounded-none border-[#d0d0d0]"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_published"
                value="true"
                defaultChecked={project?.is_published ?? false}
                className="w-4 h-4"
              />
              <span className="text-[13px] text-[#555]">공개</span>
            </label>
          </div>
        </div>
      </div>

      {/* 세부 정보 */}
      <div className="bg-white border border-[#e0e0e0] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] tracking-[0.3em] uppercase text-[#999]">
            세부 정보
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addDetail}
            className="text-[12px] gap-1 h-7"
          >
            <Plus size={12} />
            항목 추가
          </Button>
        </div>

        <div className="space-y-4">
          {details.map((detail, index) => (
            <div key={index} className="border border-[#f0f0f0] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={detail.key}
                  onChange={(e) => updateDetailKey(index, e.target.value)}
                  placeholder="항목명 (예: Material)"
                  className="rounded-none border-[#d0d0d0] text-[13px] flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleDetailType(index)}
                  className="text-[11px] h-8 text-[#999]"
                >
                  {typeof detail.value === "object" ? "단일값" : "하위항목"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDetail(index)}
                  className="h-8 w-8 p-0 text-red-400"
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              {typeof detail.value === "object" ? (
                <div className="space-y-2 pl-4">
                  {Object.entries(detail.value).map(
                    ([subKey, subValue], si) => (
                      <div key={si} className="flex items-center gap-2">
                        <Input
                          value={subKey}
                          onChange={(e) => {
                            const newObj = {
                              ...(detail.value as Record<string, string>),
                            };
                            const val = newObj[subKey];
                            delete newObj[subKey];
                            newObj[e.target.value] = val;
                            updateDetailValue(index, newObj);
                          }}
                          placeholder="항목 (예: Floor)"
                          className="rounded-none border-[#d0d0d0] text-[12px] w-1/3"
                        />
                        <Input
                          value={subValue}
                          onChange={(e) =>
                            updateSubValue(index, subKey, e.target.value)
                          }
                          placeholder="값 (예: Tile)"
                          className="rounded-none border-[#d0d0d0] text-[12px] flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubField(index, subKey)}
                          className="h-7 w-7 p-0 text-red-400"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    )
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addSubField(index)}
                    className="text-[11px] gap-1 h-7 text-[#999]"
                  >
                    <Plus size={10} />
                    하위 항목 추가
                  </Button>
                </div>
              ) : (
                <Input
                  value={detail.value}
                  onChange={(e) => updateDetailValue(index, e.target.value)}
                  placeholder="값 (예: 65py, 215㎡)"
                  className="rounded-none border-[#d0d0d0] text-[12px]"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 이미지 업로드 */}
      <div className="bg-white border border-[#e0e0e0] p-6">
        <h2 className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-4">
          이미지
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-[#d0d0d0] hover:border-[#999] p-8 text-center transition-colors duration-200"
        >
          <Upload size={20} className="mx-auto mb-2 text-[#999]" />
          <p className="text-[12px] text-[#999]">
            {uploading
              ? "업로드 중..."
              : "클릭하여 이미지를 선택하세요 (다중 선택 가능)"}
          </p>
        </button>

        {images.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {images.map((url, i) => (
              <div key={i} className="relative group">
                <div className="relative aspect-square overflow-hidden bg-[#f5f5f5]">
                  <Image
                    src={url}
                    alt={`이미지 ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                </div>

                {/* 오버레이 */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl(url)}
                    className={`p-1.5 rounded-full ${
                      thumbnailUrl === url
                        ? "bg-yellow-400 text-black"
                        : "bg-white/80 text-[#555] hover:bg-white"
                    }`}
                    title="대표 이미지로 지정"
                  >
                    <Star size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="p-1.5 rounded-full bg-white/80 text-red-500 hover:bg-white"
                    title="삭제"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 대표 이미지 표시 */}
                {thumbnailUrl === url && (
                  <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 font-medium">
                    대표
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* hidden fields */}
      <input type="hidden" name="details" value={buildDetailsJson()} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="thumbnail_url" value={thumbnailUrl} />

      <Separator className="bg-[#e0e0e0]" />

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          className="rounded-none bg-[#2f2f2f] hover:bg-black text-[12px] tracking-[0.15em] h-[44px] px-8"
        >
          {project ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  );
}
