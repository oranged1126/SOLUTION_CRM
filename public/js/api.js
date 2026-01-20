// POUR 솔루션 CRM - API Module (Vercel + Supabase)

const API_BASE_URL = '/api';

const API = {
    // 프로젝트 관련 API
    projects: {
        // 모든 프로젝트 가져오기
        async getAll() {
            try {
                const response = await fetch(`${API_BASE_URL}/projects`);
                const data = await response.json();
                return this.transformProjects(data);
            } catch (error) {
                console.error('프로젝트 목록 조회 실패:', error);
                return [];
            }
        },

        // 신규 프로젝트 (미배정) 가져오기
        async getNew() {
            try {
                const response = await fetch(`${API_BASE_URL}/projects?status=new`);
                const data = await response.json();
                return this.transformProjects(data);
            } catch (error) {
                console.error('신규 프로젝트 조회 실패:', error);
                return [];
            }
        },

        // 특정 프로젝트 가져오기
        async getById(id) {
            try {
                const response = await fetch(`${API_BASE_URL}/projects/${id}`);
                const data = await response.json();
                return this.transformProject(data);
            } catch (error) {
                console.error('프로젝트 조회 실패:', error);
                return null;
            }
        },

        // 담당자 배정
        async assign(projectId, employeeId) {
            try {
                const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assignedTo: employeeId })
                });
                const data = await response.json();
                return this.transformProject(data);
            } catch (error) {
                console.error('담당자 배정 실패:', error);
                return null;
            }
        },

        // 체크리스트 업데이트
        async updateChecklist(projectId, checklist) {
            try {
                const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checklist })
                });
                const data = await response.json();
                return this.transformProject(data);
            } catch (error) {
                console.error('체크리스트 업데이트 실패:', error);
                return null;
            }
        },

        // 프로젝트 완료
        async complete(projectId, checklist) {
            try {
                const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'completed', checklist })
                });
                const data = await response.json();
                return this.transformProject(data);
            } catch (error) {
                console.error('프로젝트 완료 처리 실패:', error);
                return null;
            }
        },

        // 프로젝트 중단
        async cancel(projectId, reason) {
            try {
                const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled', reason })
                });
                const data = await response.json();
                return this.transformProject(data);
            } catch (error) {
                console.error('프로젝트 중단 처리 실패:', error);
                return null;
            }
        },

        // 업무 상세 정보 저장
        async saveTaskDetail(projectId, taskId, detail) {
            try {
                // 먼저 현재 프로젝트의 taskDetails를 가져옴
                const project = await this.getById(projectId);
                const taskDetails = project?.taskDetails || {};
                taskDetails[taskId] = detail;

                const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskDetails })
                });
                const data = await response.json();
                return this.transformProject(data);
            } catch (error) {
                console.error('업무 상세 저장 실패:', error);
                return null;
            }
        },

        // DB 필드명 → 프론트엔드 필드명 변환
        transformProject(data) {
            if (!data) return null;
            return {
                id: data.id?.toString(),
                siteName: data.site_name,
                constructionType: data.construction_type,
                buildingType: data.building_type,
                address: data.address,
                units: data.units,
                customerType: data.customer_type,
                contact: data.contact,
                contactName: data.contact_name,
                source: data.source,
                inquiry: data.inquiry,
                memo: data.memo || {},
                assignedTo: data.assigned_to?.toString(),
                status: data.status,
                checklist: data.checklist || {},
                taskDetails: data.task_details || {},
                createdAt: data.created_at,
                assignedAt: data.assigned_at,
                completedAt: data.completed_at,
                cancelledAt: data.cancelled_at,
                cancelReason: data.cancel_reason
            };
        },

        transformProjects(dataArray) {
            if (!Array.isArray(dataArray)) return [];
            return dataArray.map(data => this.transformProject(data));
        }
    },

    // 담당자 관련 API
    employees: {
        // 모든 담당자 가져오기
        async getAll() {
            try {
                const response = await fetch(`${API_BASE_URL}/employees`);
                const data = await response.json();
                return data.map(e => ({
                    id: e.id?.toString(),
                    name: e.name
                }));
            } catch (error) {
                console.error('담당자 목록 조회 실패:', error);
                return [];
            }
        },

        // 담당자별 배정된 프로젝트 가져오기
        async getProjects(employeeId) {
            try {
                const response = await fetch(`${API_BASE_URL}/employee-projects?employeeId=${employeeId}`);
                const data = await response.json();
                return API.projects.transformProjects(data);
            } catch (error) {
                console.error('담당자 프로젝트 조회 실패:', error);
                return [];
            }
        }
    }
};

// 데이터 래퍼 (기존 LocalStorage 인터페이스 유지)
const DataStore = {
    projects: {
        async getAll() {
            return await API.projects.getAll();
        },

        async getNew() {
            return await API.projects.getNew();
        },

        async getById(id) {
            return await API.projects.getById(id);
        },

        async assign(projectId, employeeId) {
            return await API.projects.assign(projectId, employeeId);
        },

        async updateChecklist(projectId, checklist) {
            return await API.projects.updateChecklist(projectId, checklist);
        },

        async complete(projectId, checklist) {
            return await API.projects.complete(projectId, checklist);
        },

        async cancel(projectId, reason) {
            return await API.projects.cancel(projectId, reason);
        },

        async saveTaskDetail(projectId, taskId, detail) {
            return await API.projects.saveTaskDetail(projectId, taskId, detail);
        }
    },

    employees: {
        async getAll() {
            return await API.employees.getAll();
        },

        async getProjects(employeeId) {
            return await API.employees.getProjects(employeeId);
        }
    }
};
