// POUR 솔루션 CRM - Drag & Drop Module (Vercel + Supabase)

class DragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedElement = null;
        this.dragPreview = null;
        this.startX = 0;
        this.startY = 0;
        this.projectId = null;
    }

    init() {
        this.setupDragEvents();
    }

    setupDragEvents() {
        // 터치 이벤트
        document.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleDragEnd(e));

        // 마우스 이벤트
        document.addEventListener('mousedown', (e) => this.handleDragStart(e));
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
    }

    handleDragStart(e) {
        const projectBtn = e.target.closest('.project-btn');
        if (!projectBtn) return;

        const touch = e.touches ? e.touches[0] : e;
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.draggedElement = projectBtn;
        this.projectId = projectBtn.dataset.projectId;

        // 길게 누르기 감지
        this.longPressTimer = setTimeout(() => {
            this.startDragging(touch);
        }, 200);
    }

    startDragging(touch) {
        if (!this.draggedElement) return;

        this.isDragging = true;
        this.draggedElement.classList.add('dragging');

        // 드래그 프리뷰 생성
        this.createDragPreview(touch);

        // 드롭 영역 하이라이트
        document.querySelectorAll('.employee-card').forEach(card => {
            card.classList.add('drop-target');
        });
    }

    createDragPreview(touch) {
        const rect = this.draggedElement.getBoundingClientRect();

        this.dragPreview = this.draggedElement.cloneNode(true);
        this.dragPreview.classList.add('drag-preview');
        this.dragPreview.style.width = rect.width + 'px';
        this.dragPreview.style.height = rect.height + 'px';
        this.dragPreview.style.left = touch.clientX - rect.width / 2 + 'px';
        this.dragPreview.style.top = touch.clientY - rect.height / 2 + 'px';

        document.body.appendChild(this.dragPreview);
    }

    handleDragMove(e) {
        if (!this.isDragging) {
            // 드래그 시작 전 움직임 감지
            if (this.draggedElement) {
                const touch = e.touches ? e.touches[0] : e;
                const moveX = Math.abs(touch.clientX - this.startX);
                const moveY = Math.abs(touch.clientY - this.startY);

                if (moveX > 10 || moveY > 10) {
                    clearTimeout(this.longPressTimer);
                }
            }
            return;
        }

        e.preventDefault();

        const touch = e.touches ? e.touches[0] : e;

        // 프리뷰 위치 업데이트
        if (this.dragPreview) {
            const rect = this.draggedElement.getBoundingClientRect();
            this.dragPreview.style.left = touch.clientX - rect.width / 2 + 'px';
            this.dragPreview.style.top = touch.clientY - rect.height / 2 + 'px';
        }

        // 드롭 대상 하이라이트
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const employeeCard = elementUnder?.closest('.employee-card');

        document.querySelectorAll('.employee-card').forEach(card => {
            card.classList.remove('drag-over');
        });

        if (employeeCard) {
            employeeCard.classList.add('drag-over');
        }
    }

    async handleDragEnd(e) {
        clearTimeout(this.longPressTimer);

        if (!this.isDragging) {
            this.draggedElement = null;
            return;
        }

        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const employeeCard = elementUnder?.closest('.employee-card');

        // 담당자에게 드롭된 경우
        if (employeeCard && this.projectId) {
            const employeeId = employeeCard.dataset.employeeId;
            await this.assignProject(this.projectId, employeeId);
        }

        // 정리
        this.cleanup();
    }

    async assignProject(projectId, employeeId) {
        try {
            await DataStore.projects.assign(projectId, employeeId);

            // 화면 업데이트 이벤트 발생
            document.dispatchEvent(new CustomEvent('projectAssigned', {
                detail: { projectId, employeeId }
            }));

            this.showToast('담당자가 배정되었습니다.');
        } catch (error) {
            console.error('담당자 배정 실패:', error);
            this.showToast('배정에 실패했습니다.');
        }
    }

    cleanup() {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }

        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }

        document.querySelectorAll('.employee-card').forEach(card => {
            card.classList.remove('drop-target', 'drag-over');
        });

        this.isDragging = false;
        this.draggedElement = null;
        this.projectId = null;
    }

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

const dragDropManager = new DragDropManager();
