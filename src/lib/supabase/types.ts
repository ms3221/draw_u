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

export type ContactInquiry = {
  id: string;
  name: string;
  phone: string;
  family_members: string | null;
  available_time: string | null;
  address: string | null;
  area: string | null;
  start_date: string | null;
  move_in_date: string | null;
  budget: string | null;
  referral: string | null;
  referral_other: string | null;
  floor_plan_urls: string[] | null;
  reference_photo_urls: string[] | null;
  project_url: string | null;
  free_text: string | null;
  notion_synced: boolean;
  notion_page_id: string | null;
  notion_synced_at: string | null;
  created_at: string;
};
