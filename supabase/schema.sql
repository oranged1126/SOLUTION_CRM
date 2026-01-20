-- POUR 솔루션 CRM - Supabase Database Schema
-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- 1. 담당자 테이블
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 담당자 데이터 삽입
INSERT INTO employees (name) VALUES
    ('김민수'),
    ('이지연'),
    ('박준혁'),
    ('한인규'),
    ('정서윤'),
    ('최도현');

-- 2. 프로젝트 (견적문의) 테이블
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    site_name VARCHAR(255),
    construction_type VARCHAR(100),
    building_type VARCHAR(100),
    address TEXT,
    units VARCHAR(100),
    customer_type VARCHAR(100),
    contact VARCHAR(100),
    contact_name VARCHAR(100),
    source VARCHAR(100),
    inquiry TEXT,
    memo JSONB DEFAULT '{}',
    assigned_to INTEGER REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'new',
    checklist JSONB DEFAULT '{}',
    task_details JSONB DEFAULT '{}',
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_assigned_to ON projects(assigned_to);

-- 3. RLS (Row Level Security) 설정 - 공개 접근 허용
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능 (간단한 CRM용)
CREATE POLICY "Allow all access to employees" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);

-- 테스트 데이터 (선택사항)
INSERT INTO projects (site_name, construction_type, building_type, address, units, customer_type, contact, source, inquiry, memo, status)
VALUES
    ('[경기 용인] 현대홈타운', '옥상방수', '아파트', '경기도 용인시 수지구 죽전로238번길 35', '108세대/6개동', '관리소장', '031-896-6626', '전아모', '강풍으로 인해 지붕이 부분 탈락했으며, 공사 방식과 견적 문의 주심.', '{"constructionType": "옥상방수", "source": "전아모", "expectedDate": "즉시", "note": "-"}', 'new'),
    ('[서울 강남] 래미안아파트', '외벽도장', '아파트', '서울시 강남구 삼성동 123-45', '200세대/3개동', '입주자대표', '02-555-1234', '홈페이지', '외벽 도장이 벗겨져서 재도장 견적 문의드립니다.', '{"constructionType": "외벽도장", "source": "홈페이지", "expectedDate": "3월중", "note": "긴급 아님"}', 'new'),
    ('[경기 성남] 분당파크뷰', '지하주차장방수', '아파트', '경기도 성남시 분당구 정자동 45-6', '300세대/5개동', '관리소장', '031-777-8888', '소개', '지하주차장 누수 문제로 방수 공사 필요합니다.', '{"constructionType": "지하주차장방수", "source": "소개", "expectedDate": "2월말", "note": "누수 심함"}', 'new');
