class AdminPanel {
    constructor() {
        this.logs = JSON.parse(localStorage.getItem('gyuni-logs') || '[]');
        this.settings = JSON.parse(localStorage.getItem('gyuni-admin-settings') || '{}');
        this.monitors = JSON.parse(localStorage.getItem('gyuni-monitors') || '[]');
        this.history = JSON.parse(localStorage.getItem('gyuni-history') || '[]');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.updateStats();
        this.startAutoRefresh();
        
        this.addLog('시스템', '관리자 패널 초기화 완료');
    }

    bindEvents() {
        // 관리자 게시판 모니터링 이벤트
        const startBtn = document.getElementById('startAdminMonitoringBtn');
        const checkBtn = document.getElementById('checkAdminBoardsBtn');
        const board1 = document.getElementById('adminBoard1');
        const board2 = document.getElementById('adminBoard2');

        if (startBtn) startBtn.addEventListener('click', () => this.toggleAdminMonitoring());
        if (checkBtn) checkBtn.addEventListener('click', () => this.checkAdminBoards());
        if (board1) board1.addEventListener('change', () => this.updateAdminBoardStatus());
        if (board2) board2.addEventListener('change', () => this.updateAdminBoardStatus());
    }

    updateStats() {
        // 활성 모니터 수
        const activeMonitors = this.monitors.filter(m => 
            m.status === 'checking' || m.status === 'changed' || m.status === 'checked'
        ).length;
        
        const activeEl = document.querySelector('#activeMonitors');
        if (activeEl) activeEl.textContent = activeMonitors;

        // 총 알림 수
        const totalEl = document.querySelector('#totalNotifications');
        if (totalEl) totalEl.textContent = this.history.length;

        // 마지막 체크 시간
        const lastCheckTimes = this.monitors
            .filter(m => m.lastCheck)
            .map(m => new Date(m.lastCheck))
            .sort((a, b) => b - a);
        
        const lastCheckEl = document.querySelector('#lastCheck');
        if (lastCheckEl && lastCheckTimes.length > 0) {
            const lastCheck = lastCheckTimes[0];
            const now = new Date();
            const diffMinutes = Math.floor((now - lastCheck) / (1000 * 60));
            
            if (diffMinutes < 1) {
                lastCheckEl.textContent = '방금';
            } else if (diffMinutes < 60) {
                lastCheckEl.textContent = `${diffMinutes}분 전`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                lastCheckEl.textContent = `${diffHours}시간 전`;
            }
        }

        // 시스템 상태
        const hasErrors = this.monitors.some(m => m.status === 'error');
        const systemStatusEl = document.querySelector('#systemStatus');
        if (systemStatusEl) {
            if (hasErrors) {
                systemStatusEl.textContent = '오류';
                systemStatusEl.className = 'text-2xl font-bold text-red-600';
            } else if (activeMonitors > 0) {
                systemStatusEl.textContent = '정상';
                systemStatusEl.className = 'text-2xl font-bold text-green-600';
            } else {
                systemStatusEl.textContent = '대기';
                systemStatusEl.className = 'text-2xl font-bold text-amber-600';
            }
        }

        this.addLog('통계', `통계 업데이트됨 - 활성 모니터: ${activeMonitors}, 총 알림: ${this.history.length}`);
    }

    addLog(category, message) {
        const timestamp = new Date().toLocaleString();
        const logEntry = {
            timestamp: timestamp,
            category: category,
            message: message
        };
        
        this.logs.unshift(logEntry);
        
        // 최대 로그 수 제한 (100개)
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(0, 100);
        }
        
        this.saveLogs();
        console.log(`[${category}] ${message}`);
    }

    loadSettings() {
        const defaultSettings = {
            maxHistory: 100,
            backgroundInterval: 5,
            debugMode: false,
            notificationDuration: 8,
            requireInteraction: true,
            groupNotifications: false
        };

        this.settings = { ...defaultSettings, ...this.settings };
    }

    // 관리자 게시판 모니터링 기능
    toggleAdminMonitoring() {
        const board1Checked = document.getElementById('adminBoard1')?.checked;
        const board2Checked = document.getElementById('adminBoard2')?.checked;
        
        if (!board1Checked && !board2Checked) {
            this.showNotification('모니터링할 관리자 게시판을 선택해주세요.', 'warning');
            return;
        }
        
        this.addLog('관리자', '관리자 게시판 모니터링 시작됨');
        this.showNotification('관리자 게시판 모니터링이 시작되었습니다!', 'success');
        this.updateAdminBoardStatus();
    }

    checkAdminBoards() {
        const board1Checked = document.getElementById('adminBoard1')?.checked;
        const board2Checked = document.getElementById('adminBoard2')?.checked;
        
        if (!board1Checked && !board2Checked) {
            this.showNotification('체크할 관리자 게시판이 없습니다.', 'info');
            return;
        }
        
        this.addLog('관리자', '관리자 게시판 체크 수행 중...');
        
        // 시뮬레이션: 관리자 게시판 체크
        setTimeout(() => {
            if (board1Checked) {
                const board1LastCheck = document.getElementById('adminBoard1LastCheck');
                if (board1LastCheck) {
                    board1LastCheck.textContent = new Date().toLocaleString('ko-KR');
                }
                
                const hasNewContent = Math.random() < 0.1;
                if (hasNewContent) {
                    this.addLog('관리자', '첫인사게시판에 새 등업 신청이 있습니다!');
                    this.showNotification('첫인사게시판에 새 등업 신청이 있습니다!', 'warning');
                }
            }
            
            if (board2Checked) {
                const board2LastCheck = document.getElementById('adminBoard2LastCheck');
                if (board2LastCheck) {
                    board2LastCheck.textContent = new Date().toLocaleString('ko-KR');
                }
                
                const hasNewContent = Math.random() < 0.1;
                if (hasNewContent) {
                    this.addLog('관리자', 'Gyuni Live 승인에 새 신청이 있습니다!');
                    this.showNotification('Gyuni Live 승인에 새 신청이 있습니다!', 'warning');
                }
            }
            
            this.addLog('관리자', '관리자 게시판 체크 완료');
            this.showNotification('관리자 게시판 체크가 완료되었습니다!', 'success');
        }, 1000);
    }

    updateAdminBoardStatus() {
        const board1Checked = document.getElementById('adminBoard1')?.checked;
        const board2Checked = document.getElementById('adminBoard2')?.checked;
        
        const board1Status = document.getElementById('adminBoard1Status');
        const board2Status = document.getElementById('adminBoard2Status');
        
        if (board1Status) {
            board1Status.textContent = board1Checked ? '활성' : '비활성';
            board1Status.className = board1Checked ? 'text-green-600 font-medium' : 'text-gray-500';
        }
        
        if (board2Status) {
            board2Status.textContent = board2Checked ? '활성' : '비활성';
            board2Status.className = board2Checked ? 'text-green-600 font-medium' : 'text-gray-500';
        }
    }

    startAutoRefresh() {
        // 30초마다 통계 업데이트
        setInterval(() => {
            // localStorage에서 최신 데이터 다시 로드
            this.monitors = JSON.parse(localStorage.getItem('gyuni-monitors') || '[]');
            this.history = JSON.parse(localStorage.getItem('gyuni-history') || '[]');
            
            this.updateStats();
        }, 30000);

        this.addLog('시스템', '자동 새로고침이 시작되었습니다 (30초 간격)');
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-amber-500'
        };

        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full max-w-sm`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    saveLogs() {
        localStorage.setItem('gyuni-logs', JSON.stringify(this.logs));
    }
}

// 관리자 패널 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 관리자 인증 체크
    if (localStorage.getItem('admin-auth') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }
    
    window.adminPanel = new AdminPanel();
});
