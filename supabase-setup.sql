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
