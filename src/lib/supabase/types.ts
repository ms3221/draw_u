export type Project = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  details: Record<string, unknown>;
  thumbnail_url: string | null;
  images: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;
export type ProjectUpdate = Partial<ProjectInsert>;
