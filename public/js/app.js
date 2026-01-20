// POUR 솔루션 CRM - Main Application (Vercel + Supabase)

class CRMApp {
    constructor() {
        this.currentScreen = 'home-screen';
        this.currentProject = null;
        this.currentTask = null;
        this.currentEmployeePage = 0;
        this.employeesPerPage = 3;
        this.employees = [];
        this.projects = [];
        this.photoInputTarget = null;
        this.currentHistoryTab = 'completed';
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        await this.renderHomeScreen();
        dragDropManager.init();
    }

    async loadData() {
        this.employees = await DataStore.employees.getAll();
        this.projects = await DataStore.projects.getAll();
    }

    setupEventListeners() {
        // 하단 네비게이션
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const screenId = e.currentTarget.dataset.screen;
                this.navigateTo(screenId);
            });
        });

        // 담당자 페이지네이션
        document.getElementById('prev-employees').addEventListener('click', () => {
            if (this.currentEmployeePage > 0) {
                this.currentEmployeePage--;
                this.renderEmployees();
            }
        });

        document.getElementById('next-employees').addEventListener('click', () => {
            const maxPage = Math.ceil(this.employees.length / this.employeesPerPage) - 1;
            if (this.currentEmployeePage < maxPage) {
                this.currentEmployeePage++;
                this.renderEmployees();
            }
        });

        // 처리 내역 탭 클릭
        document.getElementById('tab-completed').addEventListener('click', () => {
            this.switchHistoryTab('completed');
        });

        document.getElementById('tab-cancelled').addEventListener('click', () => {
            this.switchHistoryTab('cancelled');
        });

        // 팝업 닫기
        document.getElementById('popup-close').addEventListener('click', () => {
            this.closePopup('project-popup');
        });

        // 뒤로가기 버튼
        document.getElementById('task-back-btn').addEventListener('click', () => {
            this.navigateTo('home-screen');
        });

        document.getElementById('detail-back-btn').addEventListener('click', () => {
            this.navigateTo('task-screen');
        });

        // 체크리스트 완료/중단
        document.getElementById('btn-complete').addEventListener('click', () => {
            this.completeProject();
        });

        document.getElementById('btn-cancel').addEventListener('click', () => {
            this.showPopup('cancel-popup');
        });

        // 중단 팝업
        document.getElementById('confirm-cancel').addEventListener('click', () => {
            this.cancelProject();
        });

        document.getElementById('close-cancel-popup').addEventListener('click', () => {
            this.closePopup('cancel-popup');
        });

        // 업무 아이템 클릭 (체크박스 영역 제외)
        document.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const taskId = item.dataset.task;
                    this.openTaskDetail(taskId);
                }
            });
        });

        // 상세 화면 저장
        document.getElementById('btn-save-detail').addEventListener('click', () => {
            this.saveTaskDetail();
        });

        // 사진 업로드
        document.querySelectorAll('.photo-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handlePhotoUpload(e);
            });
        });

        // PT 파일 업로드
        document.getElementById('pt-file').addEventListener('change', (e) => {
            this.handlePTUpload(e);
        });

        // 프로젝트 배정 이벤트 수신
        document.addEventListener('projectAssigned', async (e) => {
            await this.loadData();
            await this.renderHomeScreen();
        });

        // 프로젝트 열기 이벤트 수신
        document.addEventListener('openProject', (e) => {
            const { projectId } = e.detail;
            this.openProjectTask(projectId);
        });

        // 자료 화면 이벤트
        document.getElementById('back-to-folders').addEventListener('click', () => {
            document.getElementById('folder-list').style.display = 'flex';
            document.getElementById('gallery-view').style.display = 'none';
        });

        document.getElementById('btn-add-gallery-photo').addEventListener('click', () => {
            document.getElementById('gallery-photo-input').click();
        });

        document.getElementById('gallery-photo-input').addEventListener('change', (e) => {
            this.handleGalleryPhotoUpload(e);
        });
    }

    // 화면 전환
    navigateTo(screenId, direction = 'right') {
        const currentScreen = document.getElementById(this.currentScreen);
        const nextScreen = document.getElementById(screenId);

        if (this.currentScreen === screenId) return;

        // 네비게이션 활성화 상태 업데이트
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screenId);
        });

        // 화면 전환 애니메이션
        if (direction === 'right') {
            currentScreen.classList.add('slide-left');
            currentScreen.classList.remove('active');
            nextScreen.classList.add('active');
            nextScreen.classList.remove('slide-left');
        } else {
            nextScreen.classList.remove('slide-left');
            nextScreen.classList.add('active');
            currentScreen.classList.remove('active');
        }

        this.currentScreen = screenId;

        // 화면별 초기화
        if (screenId === 'calendar-screen') {
            calendarManager.init();
        } else if (screenId === 'files-screen') {
            this.renderFilesScreen();
        } else if (screenId === 'home-screen') {
            this.renderHomeScreen();
        }
    }

    // 홈 화면 렌더링
    async renderHomeScreen() {
        await this.loadData();
        await this.renderNewProjects();
        await this.renderEmployees();
        this.renderHistory();
    }

    // 신규 견적 버튼 렌더링
    async renderNewProjects() {
        const grid = document.getElementById('new-projects-grid');
        const newProjects = await DataStore.projects.getNew();

        if (newProjects.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>신규 견적 문의가 없습니다.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = newProjects.map(project => `
            <div class="project-btn" data-project-id="${project.id}">
                <span class="project-name">${this.formatSiteName(project.siteName)}</span>
                <span class="project-type">${project.constructionType}</span>
            </div>
        `).join('');

        // 버튼 클릭 이벤트 (상세 팝업)
        grid.querySelectorAll('.project-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // 드래그 중이 아닐 때만 팝업 표시
                if (!dragDropManager.isDragging) {
                    const projectId = btn.dataset.projectId;
                    await this.showProjectPopup(projectId);
                }
            });
        });
    }

    // 현장명 포맷팅
    formatSiteName(siteName) {
        if (!siteName) return '';
        return siteName.replace('현장 : ', '');
    }

    // 담당자 영역 렌더링
    async renderEmployees() {
        const container = document.getElementById('employees-container');
        const startIdx = this.currentEmployeePage * this.employeesPerPage;
        const endIdx = startIdx + this.employeesPerPage;
        const visibleEmployees = this.employees.slice(startIdx, endIdx);

        const employeeCards = await Promise.all(visibleEmployees.map(async employee => {
            const assignedProjects = await DataStore.employees.getProjects(employee.id);
            return `
                <div class="employee-card" data-employee-id="${employee.id}">
                    <div class="employee-name">${employee.name}</div>
                    <div class="employee-projects">
                        ${assignedProjects.map(project => `
                            <div class="assigned-project" data-project-id="${project.id}">
                                <div class="project-name">${this.formatSiteName(project.siteName)}</div>
                                <div class="project-type">${project.constructionType}</div>
                            </div>
                        `).join('')}
                        ${assignedProjects.length === 0 ? '<div class="empty-state"><p>-</p></div>' : ''}
                    </div>
                </div>
            `;
        }));

        container.innerHTML = employeeCards.join('');

        // 배정된 프로젝트 클릭 이벤트
        container.querySelectorAll('.assigned-project').forEach(item => {
            item.addEventListener('click', () => {
                const projectId = item.dataset.projectId;
                this.openProjectTask(projectId);
            });
        });

        // 페이지네이션 버튼 상태 업데이트
        const maxPage = Math.ceil(this.employees.length / this.employeesPerPage) - 1;
        const prevBtn = document.getElementById('prev-employees');
        const nextBtn = document.getElementById('next-employees');

        prevBtn.disabled = this.currentEmployeePage === 0;
        nextBtn.disabled = this.currentEmployeePage >= maxPage;

        // 페이지 인디케이터 업데이트
        this.renderPageIndicator(maxPage + 1);
    }

    // 페이지 인디케이터 렌더링
    renderPageIndicator(totalPages) {
        const indicator = document.getElementById('page-indicator');
        indicator.innerHTML = Array(totalPages).fill(0).map((_, idx) =>
            `<div class="page-dot ${idx === this.currentEmployeePage ? 'active' : ''}"></div>`
        ).join('');
    }

    // 처리 내역 탭 전환
    switchHistoryTab(status) {
        this.currentHistoryTab = status;

        // 탭 버튼 활성화 상태 업데이트
        document.getElementById('tab-completed').classList.toggle('active', status === 'completed');
        document.getElementById('tab-cancelled').classList.toggle('active', status === 'cancelled');

        this.renderHistoryList();
    }

    // 처리 내역 렌더링
    renderHistory() {
        // 카운트 업데이트
        const completedCount = this.projects.filter(p => p.status === 'completed').length;
        const cancelledCount = this.projects.filter(p => p.status === 'cancelled').length;

        document.getElementById('completed-count').textContent = completedCount;
        document.getElementById('cancelled-count').textContent = cancelledCount;

        this.renderHistoryList();
    }

    // 처리 내역 리스트 렌더링
    renderHistoryList() {
        const list = document.getElementById('history-list');

        // 현재 탭에 해당하는 프로젝트 필터링
        const filteredProjects = this.projects.filter(p => p.status === this.currentHistoryTab)
            .sort((a, b) => {
                const dateA = new Date(a.completedAt || a.cancelledAt);
                const dateB = new Date(b.completedAt || b.cancelledAt);
                return dateB - dateA;
            });

        if (filteredProjects.length === 0) {
            const emptyText = this.currentHistoryTab === 'completed' ? '완료된 항목이 없습니다.' : '중단된 항목이 없습니다.';
            list.innerHTML = `
                <div class="empty-state">
                    <p>${emptyText}</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filteredProjects.map(project => {
            const employee = this.employees.find(e => e.id === project.assignedTo);
            const employeeName = employee ? employee.name : '-';
            const date = project.completedAt || project.cancelledAt;
            const formattedDate = date ? this.formatDate(date) : '-';
            const isCompleted = project.status === 'completed';

            return `
                <div class="history-item">
                    <div class="history-status ${isCompleted ? 'completed' : 'cancelled'}"></div>
                    <div class="history-info">
                        <div class="history-name">${this.formatSiteName(project.siteName)}</div>
                        <div class="history-meta">${employeeName} · ${formattedDate}</div>
                    </div>
                    <span class="history-badge ${isCompleted ? 'completed' : 'cancelled'}">
                        ${isCompleted ? '완료' : '중단'}
                    </span>
                </div>
            `;
        }).join('');
    }

    // 날짜 포맷팅
    formatDate(dateString) {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    }

    // 견적 상세 팝업 표시
    async showProjectPopup(projectId) {
        const project = await DataStore.projects.getById(projectId);
        if (!project) return;

        document.getElementById('popup-title').textContent = '견적문의 알림';
        document.getElementById('popup-body').innerHTML = `
            <div class="info-item">
                <span class="info-label">현장</span>
                <span class="info-value">${project.siteName || '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">건물유형</span>
                <span class="info-value">${project.buildingType || '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">주소</span>
                <span class="info-value">${project.address || '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">단지개요</span>
                <span class="info-value">${project.units || '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">고객유형</span>
                <span class="info-value">${project.customerType || '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">연락처</span>
                <span class="info-value">${project.contact || '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">유입경로</span>
                <span class="info-value">${project.source || '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">문의내용</span>
                <span class="info-value">${project.inquiry || '-'}</span>
            </div>
            <div class="section-divider">
                <div class="memo-section-title">내부 메모</div>
                <div class="info-item">공사유형: ${project.memo?.constructionType || '-'}</div>
                <div class="info-item">예정시기: ${project.memo?.expectedDate || '-'}</div>
                <div class="info-item">특이사항: ${project.memo?.note || '-'}</div>
            </div>
        `;

        this.showPopup('project-popup');
    }

    // 프로젝트 업무 화면 열기
    async openProjectTask(projectId) {
        const project = await DataStore.projects.getById(projectId);
        if (!project) return;

        this.currentProject = project;

        // 제목 설정
        const title = `${this.formatSiteName(project.siteName)} / ${project.constructionType}`;
        document.getElementById('task-title').textContent = title;

        // 체크박스 상태 복원
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            const taskId = checkbox.dataset.taskId;
            checkbox.checked = project.checklist?.[taskId] || false;
        });

        this.navigateTo('task-screen', 'right');
    }

    // 업무 상세 화면 열기
    openTaskDetail(taskId) {
        if (!this.currentProject) return;

        this.currentTask = taskId;

        const taskNames = {
            '1': 'POUR공법 기술 서비스 제공',
            '2': 'AI 기반 하자 진단',
            '3': '교육 및 가이드 제공',
            '4': '설계도서 / 견적서 제공',
            '5': '기술연구원 관리 감독',
            '6': '전-중-후 PT 진행',
            '7': '행정 업무 지원',
            '8': '현장 설명회 진행'
        };

        document.getElementById('detail-title').textContent = this.formatSiteName(this.currentProject.siteName);
        document.getElementById('detail-task-name').textContent = taskNames[taskId];

        // 기존 데이터 복원
        const taskDetail = this.currentProject.taskDetails?.[taskId] || {};

        // 사진 미리보기 복원
        document.querySelectorAll('.photo-box').forEach((box, idx) => {
            const preview = box.querySelector('.photo-preview');
            const photoData = taskDetail.photos?.[idx];
            if (photoData) {
                preview.innerHTML = `<img src="${photoData}" alt="사진 ${idx + 1}">`;
                box.classList.add('has-photo');
            } else {
                preview.innerHTML = '';
                box.classList.remove('has-photo');
            }
        });

        // PT 파일명 복원
        document.getElementById('pt-filename').textContent = taskDetail.ptFileName || '';

        // 메모 복원
        document.getElementById('detail-memo').value = taskDetail.memo || '';

        this.navigateTo('detail-screen', 'right');
    }

    // 프로젝트 완료 처리
    async completeProject() {
        if (!this.currentProject) return;

        const checklist = {};
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checklist[checkbox.dataset.taskId] = checkbox.checked;
        });

        await DataStore.projects.complete(this.currentProject.id, checklist);

        this.showToast('완료 처리되었습니다.');
        this.navigateTo('home-screen', 'left');
        await this.renderHomeScreen();
        this.currentProject = null;
    }

    // 프로젝트 중단 처리
    async cancelProject() {
        if (!this.currentProject) return;

        const reason = document.getElementById('cancel-reason').value.trim();
        if (!reason) {
            this.showToast('중단 사유를 입력해주세요.');
            return;
        }

        await DataStore.projects.cancel(this.currentProject.id, reason);

        this.closePopup('cancel-popup');
        document.getElementById('cancel-reason').value = '';

        this.showToast('중단 처리되었습니다.');
        this.navigateTo('home-screen', 'left');
        await this.renderHomeScreen();
        this.currentProject = null;
    }

    // 업무 상세 저장
    async saveTaskDetail() {
        if (!this.currentProject || !this.currentTask) return;

        // 사진 데이터 수집
        const photos = [];
        document.querySelectorAll('.photo-preview img').forEach(img => {
            photos.push(img.src);
        });

        const detail = {
            photos: photos,
            ptFileName: document.getElementById('pt-filename').textContent,
            memo: document.getElementById('detail-memo').value
        };

        await DataStore.projects.saveTaskDetail(this.currentProject.id, this.currentTask, detail);

        this.showToast('저장되었습니다.');
        this.navigateTo('task-screen', 'left');
    }

    // 사진 업로드 처리
    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const photoBox = e.target.closest('.photo-box');
        const preview = photoBox.querySelector('.photo-preview');

        const reader = new FileReader();
        reader.onload = (event) => {
            preview.innerHTML = `<img src="${event.target.result}" alt="업로드된 사진">`;
            photoBox.classList.add('has-photo');
        };
        reader.readAsDataURL(file);
    }

    // PT 파일 업로드 처리
    handlePTUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('pt-filename').textContent = file.name;
    }

    // 자료 화면 렌더링
    renderFilesScreen() {
        // 폴더 목록 (정적)
        const folders = [
            { id: '1', name: 'POUR공법 기술 서비스', files: [] },
            { id: '2', name: 'AI 기반 하자 진단', files: [] },
            { id: '3', name: '교육 및 가이드', files: [] },
            { id: '4', name: '설계도서 / 견적서', files: [] },
            { id: '5', name: '기술연구원 관리 감독', files: [] },
            { id: '6', name: 'PT 자료', files: [] },
            { id: '7', name: '행정 업무', files: [] },
            { id: '8', name: '현장 설명회', files: [] }
        ];

        const folderList = document.getElementById('folder-list');

        folderList.innerHTML = folders.map(folder => `
            <div class="folder-item" data-folder-id="${folder.id}">
                <div class="folder-icon">
                    <svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                </div>
                <div class="folder-info">
                    <div class="folder-name">${folder.name}</div>
                    <div class="folder-count">${folder.files?.length || 0}개 파일</div>
                </div>
            </div>
        `).join('');

        // 폴더 클릭 이벤트
        folderList.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                const folderId = item.dataset.folderId;
                this.openFolder(folderId, folders.find(f => f.id === folderId));
            });
        });

        document.getElementById('folder-list').style.display = 'flex';
        document.getElementById('gallery-view').style.display = 'none';
    }

    // 폴더 열기
    openFolder(folderId, folder) {
        if (!folder) return;

        this.currentFolderId = folderId;

        document.getElementById('current-folder-name').textContent = folder.name;

        const galleryGrid = document.getElementById('gallery-grid');
        if (folder.files && folder.files.length > 0) {
            galleryGrid.innerHTML = folder.files.map(file => `
                <div class="gallery-item">
                    <img src="${file.data}" alt="${file.name}">
                </div>
            `).join('');
        } else {
            galleryGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>파일이 없습니다.</p>
                </div>
            `;
        }

        document.getElementById('folder-list').style.display = 'none';
        document.getElementById('gallery-view').style.display = 'block';
    }

    // 갤러리 사진 업로드 (추후 Supabase Storage 연동)
    handleGalleryPhotoUpload(e) {
        const files = e.target.files;
        if (!files.length) return;

        this.showToast('파일 업로드 기능은 추후 지원 예정입니다.');
        e.target.value = '';
    }

    // 팝업 표시
    showPopup(popupId) {
        document.getElementById(popupId).style.display = 'flex';
    }

    // 팝업 닫기
    closePopup(popupId) {
        document.getElementById(popupId).style.display = 'none';
    }

    // 토스트 메시지
    showToast(message) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    const app = new CRMApp();
    app.init();
});
