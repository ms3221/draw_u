import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.draw-u.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/project`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: projects } = await supabase
      .from("projects")
      .select("id, updated_at")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (!projects) return staticPages;

    const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
      url: `${BASE_URL}/project/${project.id}`,
      lastModified: new Date(project.updated_at),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...staticPages, ...projectPages];
  } catch {
    return staticPages;
  }
}
