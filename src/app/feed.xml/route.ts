import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.draw-u.kr";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  const items = (projects ?? [])
    .map(
      (project) => `
    <item>
      <title>${escapeXml(project.name)}</title>
      <link>${BASE_URL}/project/${project.id}</link>
      <description>${escapeXml(project.description || `드로우유 인테리어 - ${project.name} 시공 사례`)}</description>
      <pubDate>${new Date(project.created_at).toUTCString()}</pubDate>
      <guid>${BASE_URL}/project/${project.id}</guid>
    </item>`
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>드로우유 인테리어</title>
    <link>${BASE_URL}</link>
    <description>드로우유 - 취향을 듣고, 생활을 담아 공간을 그리는 인테리어 전문 업체</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
