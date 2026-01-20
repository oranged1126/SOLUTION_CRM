# POUR 솔루션 CRM 배포 가이드

## 전체 구조

```
잔디 Webhook → Vercel Serverless Function → Supabase DB
                                                ↓
                        프론트엔드 (Vercel) ← 데이터 조회
```

---

## 1단계: Supabase 설정

### 1.1 Supabase 계정 생성
1. https://supabase.com 접속
2. 회원가입 (GitHub 로그인 추천)
3. "New Project" 클릭
4. 프로젝트 정보 입력:
   - Name: `pour-crm`
   - Database Password: (안전한 비밀번호 설정)
   - Region: `Northeast Asia (Seoul)` 선택
5. "Create new project" 클릭

### 1.2 데이터베이스 테이블 생성
1. 프로젝트 대시보드에서 좌측 "SQL Editor" 클릭
2. "New query" 클릭
3. `supabase/schema.sql` 파일 내용 전체 복사 & 붙여넣기
4. "Run" 버튼 클릭
5. 테이블 생성 확인 (좌측 "Table Editor"에서 확인)

### 1.3 API 키 복사
1. 좌측 "Settings" → "API" 클릭
2. 아래 두 값을 복사해서 메모장에 저장:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJI...` (긴 문자열)

---

## 2단계: Vercel 배포

### 2.1 Vercel 계정 생성
1. https://vercel.com 접속
2. 회원가입 (GitHub 로그인 추천)

### 2.2 프로젝트 업로드

**방법 A: GitHub 연동 (추천)**
1. CRM 폴더를 GitHub 저장소에 업로드
2. Vercel에서 "Add New Project" 클릭
3. GitHub 저장소 선택
4. "Import" 클릭

**방법 B: CLI 직접 배포**
```bash
# Vercel CLI 설치
npm install -g vercel

# CRM 폴더로 이동
cd "C:\Users\김소라\OneDrive\바탕 화면\CRM"

# 로그인
vercel login

# 배포
vercel --prod
```

### 2.3 환경 변수 설정
1. Vercel 프로젝트 대시보드에서 "Settings" → "Environment Variables"
2. 아래 두 변수 추가:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` (1.3에서 복사한 URL) |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJI...` (1.3에서 복사한 키) |

3. "Save" 클릭
4. "Deployments" 탭에서 "Redeploy" 클릭 (환경변수 적용)

### 2.4 배포 확인
- Vercel 대시보드에서 도메인 확인 (예: `https://pour-crm.vercel.app`)
- 해당 URL로 접속해서 CRM 화면 확인

---

## 3단계: 잔디 Webhook 연결

### 3.1 잔디 커넥트 설정
1. 잔디 PC/모바일 앱 실행
2. 견적문의 대화방 입장
3. 우측 상단 "..." → "커넥트" 클릭
4. "Webhook 발신 (Outgoing Webhook)" 선택
5. "연동하기" 클릭

### 3.2 Webhook URL 입력
```
https://your-project.vercel.app/api/jandi/webhook
```
(your-project 부분을 실제 Vercel 도메인으로 변경)

### 3.3 트리거 설정
- **키워드**: 특정 단어가 포함된 메시지만 전송 (예: "견적문의", "현장")
- 또는 모든 메시지 전송 선택

### 3.4 저장 및 테스트
1. "저장" 클릭
2. 해당 대화방에 테스트 메시지 작성
3. CRM 화면 새로고침해서 신규 견적 등록 확인

---

## 메시지 형식

잔디에서 아래 형식으로 메시지를 보내면 자동 파싱됩니다:

```
현장 : [경기 용인] 현대홈타운
건물유형 : 아파트
주소 : 경기도 용인시 수지구 죽전로238번길 35
단지개요 : 108세대/6개동
고객유형 : 관리소장
연락처 : 031-896-6626
유입경로 : 전아모
문의내용 : 강풍으로 인해 지붕이 부분 탈락했으며, 공사 방식과 견적 문의 주심.

[ 내부메모 ]
공사유형 : 옥상방수
예정시기 : 즉시
특이사항 : -
```

---

## 문제 해결

### 데이터가 안 보여요
1. Vercel 환경변수 확인 (SUPABASE_URL, SUPABASE_ANON_KEY)
2. Supabase 대시보드 → Table Editor에서 데이터 확인
3. 브라우저 개발자도구(F12) → Console에서 에러 확인

### Webhook이 안 돼요
1. Vercel Functions 로그 확인: Vercel 대시보드 → Functions → Logs
2. 잔디 커넥트 설정에서 URL 재확인
3. https:// 프로토콜 확인

### CORS 에러
- Vercel Serverless Functions에 이미 CORS 헤더가 설정되어 있음
- 문제 지속 시 브라우저 캐시 삭제 후 재시도

---

## 비용

| 서비스 | 무료 한도 | 예상 사용량 |
|--------|-----------|-------------|
| **Vercel** | 100GB 대역폭/월 | 충분 |
| **Supabase** | 500MB DB, 무제한 API | 충분 |

**결론: 완전 무료로 운영 가능!**
