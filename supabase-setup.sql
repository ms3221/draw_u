-- =============================================
-- 1. projects 테이블
-- =============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT false,
  sort_order INT4 DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_published ON projects (is_published, sort_order);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 2. admin_users 테이블
-- =============================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL
);

-- 관리자 이메일 등록 (실제 이메일로 변경)
-- INSERT INTO admin_users (email) VALUES ('admin@draw-u.kr');

-- =============================================
-- 3. RLS 정책
-- =============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 공개 프로젝트 누구나 읽기
CREATE POLICY "Public can read published projects"
  ON projects FOR SELECT
  USING (is_published = true);

-- 관리자: 모든 프로젝트 읽기
CREATE POLICY "Admins can read all projects"
  ON projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT au.id FROM auth.users au
      JOIN admin_users adm ON au.email = adm.email
    )
  );

-- 관리자: INSERT
CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT au.id FROM auth.users au
      JOIN admin_users adm ON au.email = adm.email
    )
  );

-- 관리자: UPDATE
CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT au.id FROM auth.users au
      JOIN admin_users adm ON au.email = adm.email
    )
  );

-- 관리자: DELETE
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (
    auth.uid() IN (
      SELECT au.id FROM auth.users au
      JOIN admin_users adm ON au.email = adm.email
    )
  );

-- =============================================
-- 4. Storage 버킷
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true);

-- 퍼블릭 읽기
CREATE POLICY "Public can read project images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

-- 관리자만 업로드
CREATE POLICY "Admins can upload project images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-images'
    AND auth.uid() IN (
      SELECT au.id FROM auth.users au
      JOIN admin_users adm ON au.email = adm.email
    )
  );

-- 관리자만 삭제
CREATE POLICY "Admins can delete project images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images'
    AND auth.uid() IN (
      SELECT au.id FROM auth.users au
      JOIN admin_users adm ON au.email = adm.email
    )
  );

-- =============================================
-- 5. contact_inquiries 테이블 (상담 신청)
-- =============================================
-- NOTE: 이 테이블은 기존에 Supabase 대시보드에서 직접 생성되어
--       소스 관리 밖에 있었다. 아래는 코드가 기대하는 스키마의 문서화이며,
--       이미 운영 중인 테이블이 있다면 "마이그레이션" 블록만 실행하면 된다.

-- (참고용 전체 정의 — 테이블이 없을 때만 실행)
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  family_members TEXT,
  available_time TEXT,
  address TEXT,
  area TEXT,
  start_date TEXT,
  move_in_date TEXT,
  budget TEXT,
  referral TEXT,
  referral_other TEXT,
  floor_plan_urls JSONB,
  reference_photo_urls JSONB,
  project_url TEXT,
  free_text TEXT,
  notion_synced BOOLEAN DEFAULT false,
  notion_page_id TEXT,
  notion_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ▼▼▼ 마이그레이션: Supabase 대시보드 → SQL Editor 에서 실행 ▼▼▼
-- (이미 운영 중인 contact_inquiries 테이블에 Notion 동기화 상태 컬럼 추가)
-- =============================================
ALTER TABLE contact_inquiries
  ADD COLUMN IF NOT EXISTS notion_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notion_page_id TEXT,
  ADD COLUMN IF NOT EXISTS notion_synced_at TIMESTAMPTZ;

-- 관리자 판별 헬퍼 함수.
-- RLS 정책에서 auth.users 를 직접 조회하면 authenticated 역할에
-- SELECT 권한이 없어 "permission denied for table users" 가 발생한다.
-- SECURITY DEFINER 로 소유자 권한 실행 + JWT 이메일만 사용해 이를 회피한다.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = (auth.jwt() ->> 'email')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 관리자 UPDATE 허용 (재전송 시 동기화 상태 갱신용)
DROP POLICY IF EXISTS "Admins can update inquiries" ON contact_inquiries;
CREATE POLICY "Admins can update inquiries"
  ON contact_inquiries FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 관리자 DELETE 허용 (문의 삭제용)
DROP POLICY IF EXISTS "Admins can delete inquiries" ON contact_inquiries;
CREATE POLICY "Admins can delete inquiries"
  ON contact_inquiries FOR DELETE
  USING (public.is_admin());

-- 관리자: contact 버킷 첨부파일 삭제 허용 (문의 삭제 시 정리용)
DROP POLICY IF EXISTS "Admins can delete contact files" ON storage.objects;
CREATE POLICY "Admins can delete contact files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contact' AND public.is_admin());

-- ⚠️ 확인 필요: contact_inquiries 의 RLS 가 활성화되어 있고,
--    (1) 상담 폼의 anon INSERT 정책, (2) 관리자 SELECT 정책이
--    이미 존재해야 한다 (기존 폼/관리자 페이지가 동작 중이라면 이미 있음).
--    아래는 누락 시 참고용 — 이미 있으면 실행하지 말 것.
--
-- ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Anyone can insert inquiries"
--   ON contact_inquiries FOR INSERT WITH CHECK (true);
--
-- CREATE POLICY "Admins can read inquiries"
--   ON contact_inquiries FOR SELECT
--   USING (
--     auth.uid() IN (
--       SELECT au.id FROM auth.users au
--       JOIN admin_users adm ON au.email = adm.email
--     )
--   );
-- =============================================
-- ▲▲▲ 마이그레이션 끝 ▲▲▲
-- =============================================

-- =============================================
-- 6. 가구 스튜디오: 프로젝트별 라이브러리 영속화 & 팀 공유
--    (2026-07-23, 마이그레이션 furniture_studio_library 로 적용됨)
-- =============================================
ALTER TABLE furniture_projects
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  ADD COLUMN IF NOT EXISTS sketch_url TEXT;

CREATE TABLE IF NOT EXISTS furniture_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES furniture_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  original_name TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_furniture_assets_project
  ON furniture_assets (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS furniture_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES furniture_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('generate','edit')),
  user_prompt TEXT NOT NULL DEFAULT '',
  enhanced_prompt TEXT NOT NULL DEFAULT '',
  full_prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  resolution TEXT NOT NULL,
  input_refs JSONB NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_furniture_results_project
  ON furniture_results (project_id, created_at DESC);

-- RLS: 서버 액션도 anon key + 유저 쿠키로 동작 → 정책 필수. SELECT은 관리자 전원(팀 공유).
ALTER TABLE furniture_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE furniture_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access assets" ON furniture_assets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins full access results" ON furniture_results
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 버킷: 클라이언트 직접 업로드(4.5MB 서버 액션 본문 제한 우회) + public read
INSERT INTO storage.buckets (id, name, public)
VALUES ('furniture-studio', 'furniture-studio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read furniture studio files"
  ON storage.objects FOR SELECT USING (bucket_id = 'furniture-studio');
CREATE POLICY "Admins can upload furniture studio files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'furniture-studio' AND public.is_admin());
CREATE POLICY "Admins can delete furniture studio files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'furniture-studio' AND public.is_admin());

-- =============================================
-- 7. 가구 스튜디오: 결과 요청사항(댓글)
--    (2026-07-23, 마이그레이션 furniture_result_comments 로 적용됨)
-- =============================================
CREATE TABLE IF NOT EXISTS furniture_result_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES furniture_projects(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES furniture_results(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_furniture_result_comments_project
  ON furniture_result_comments (project_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_furniture_result_comments_result
  ON furniture_result_comments (result_id, created_at ASC);

ALTER TABLE furniture_result_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access result comments" ON furniture_result_comments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
