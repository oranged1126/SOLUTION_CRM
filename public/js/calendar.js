// POUR 솔루션 CRM - Calendar Module (Vercel + Supabase)

class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.schedules = [];
        this.employees = [];
    }

    async init() {
        this.renderCalendar();
        await this.loadSchedules();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('prev-month').addEventListener('click', async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
            await this.loadSchedules();
        });

        document.getElementById('next-month').addEventListener('click', async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
            await this.loadSchedules();
        });
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // 헤더 업데이트
        document.getElementById('calendar-month').textContent =
            `${year}년 ${month + 1}월`;

        // 첫째 날과 마지막 날 계산
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();

        // 이전 달의 마지막 날
        const prevLastDay = new Date(year, month, 0);
        const prevLastDate = prevLastDay.getDate();

        // 캘린더 날짜 생성
        const calendarDays = document.getElementById('calendar-days');
        calendarDays.innerHTML = '';

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        // 이전 달 날짜
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = document.createElement('div');
            day.className = 'calendar-day other-month';
            day.textContent = prevLastDate - i;
            calendarDays.appendChild(day);
        }

        // 현재 달 날짜
        for (let date = 1; date <= lastDate; date++) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            day.textContent = date;
            day.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

            // 오늘 표시
            if (isCurrentMonth && date === today.getDate()) {
                day.classList.add('today');
            }

            // 일정 있는 날 표시
            const dateString = day.dataset.date;
            if (this.hasSchedule(dateString)) {
                day.classList.add('has-schedule');
            }

            // 클릭 이벤트
            day.addEventListener('click', () => {
                this.selectDate(dateString);
            });

            calendarDays.appendChild(day);
        }

        // 다음 달 날짜
        const totalDays = firstDayOfWeek + lastDate;
        const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
        for (let date = 1; date <= remainingDays; date++) {
            const day = document.createElement('div');
            day.className = 'calendar-day other-month';
            day.textContent = date;
            calendarDays.appendChild(day);
        }
    }

    async loadSchedules() {
        // 배정된 프로젝트를 일정으로 변환
        const projects = await DataStore.projects.getAll();
        this.employees = await DataStore.employees.getAll();

        this.schedules = projects
            .filter(p => p.assignedTo && p.status === 'assigned')
            .map(p => {
                const employee = this.employees.find(e => e.id === p.assignedTo);
                return {
                    id: p.id,
                    title: p.siteName,
                    constructionType: p.constructionType,
                    employeeName: employee ? employee.name : '미정',
                    date: p.assignedAt ? p.assignedAt.split('T')[0] : new Date().toISOString().split('T')[0]
                };
            });

        this.renderScheduleList();

        // 캘린더 날짜에 일정 표시 업데이트
        document.querySelectorAll('.calendar-day').forEach(day => {
            if (day.dataset.date && this.hasSchedule(day.dataset.date)) {
                day.classList.add('has-schedule');
            }
        });
    }

    hasSchedule(dateString) {
        return this.schedules.some(s => s.date === dateString);
    }

    selectDate(dateString) {
        this.selectedDate = new Date(dateString);

        // 선택 표시 업데이트
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
            if (day.dataset.date === dateString) {
                day.classList.add('selected');
            }
        });

        this.renderScheduleList(dateString);
    }

    renderScheduleList(dateString = null) {
        const scheduleItems = document.getElementById('schedule-items');
        const schedulesToShow = dateString
            ? this.schedules.filter(s => s.date === dateString)
            : this.schedules;

        const title = document.querySelector('.schedule-list h4');
        if (dateString) {
            const date = new Date(dateString);
            title.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 일정`;
        } else {
            title.textContent = '전체 일정';
        }

        if (schedulesToShow.length === 0) {
            scheduleItems.innerHTML = `
                <div class="empty-state">
                    <p>일정이 없습니다.</p>
                </div>
            `;
            return;
        }

        scheduleItems.innerHTML = schedulesToShow.map(schedule => `
            <div class="schedule-item" data-project-id="${schedule.id}">
                <div class="schedule-title">${schedule.title}</div>
                <div class="schedule-type">${schedule.constructionType}</div>
                <div class="schedule-employee">${schedule.employeeName}</div>
            </div>
        `).join('');

        // 일정 클릭 이벤트
        scheduleItems.querySelectorAll('.schedule-item').forEach(item => {
            item.addEventListener('click', () => {
                const projectId = item.dataset.projectId;
                // 프로젝트 상세 화면으로 이동
                const event = new CustomEvent('openProject', {
                    detail: { projectId }
                });
                document.dispatchEvent(event);
            });
        });
    }
}

// 전역 인스턴스 생성
const calendarManager = new CalendarManager();
