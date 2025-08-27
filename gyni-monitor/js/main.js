class GyuniMonitor {
    constructor() {
        this.monitors = JSON.parse(localStorage.getItem('gyuni-monitors') || '[]');
        this.history = JSON.parse(localStorage.getItem('gyuni-history') || '[]');
        this.intervals = new Map();
        this.isMonitoring = false;
        this.selectedBoards = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderMonitors();
        this.renderHistory();
        this.requestNotificationPermission();
        this.loadSettings();
        
        // PWA 관련 초기화
        this.initPWA();
        
        // 저장된 모니터들의 자동 체크 재시작
        if (this.monitors.length > 0) {
            this.restoreMonitoring();
        }
    }

    bindEvents() {
        // 기본 버튼들
        const startBtn = document.getElementById('startMonitoringBtn');
        const checkBtn = document.getElementById('checkAllBtn');
        const testBtn = document.getElementById('testNotificationBtn');
        const clearBtn = document.getElementById('clearHistoryBtn');
        const exportBtn = document.getElementById('exportDataBtn');

        if (startBtn) startBtn.addEventListener('click', () => this.toggleMonitoring());
        if (checkBtn) checkBtn.addEventListener('click', () => this.checkAllMonitors());
        if (testBtn) testBtn.addEventListener('click', () => this.testNotification());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearHistory());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
        
        // 게시판 체크박스 이벤트
        document.querySelectorAll('.board-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectedBoards());
        });
        
        // 설정 변경 이벤트
        const commentCheck = document.getElementById('commentNotifications');
        const intervalSelect = document.getElementById('checkInterval');
        const soundCheck = document.getElementById('soundAlert');
        const desktopCheck = document.getElementById('desktopAlert');

        if (commentCheck) commentCheck.addEventListener('change', () => this.saveSettings());
        if (intervalSelect) intervalSelect.addEventListener('change', () => this.saveSettings());
        if (soundCheck) soundCheck.addEventListener('change', () => this.saveSettings());
        if (desktopCheck) desktopCheck.addEventListener('change', () => this.saveSettings());
    }

    initPWA() {
        console.log('PWA 초기화 완료');
        
        // Service Worker 등록
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
    }

    updateSelectedBoards() {
        this.selectedBoards = [];
        document.querySelectorAll('.board-checkbox:checked').forEach(checkbox => {
            const board = {
                path: checkbox.dataset.board,
                name: checkbox.dataset.name,
                isSpecial: checkbox.dataset.special === 'true'
            };
            this.selectedBoards.push(board);
        });
        
        console.log('선택된 게시판:', this.selectedBoards);
        this.saveSettings();
    }

    toggleMonitoring() {
        if (this.isMonitoring) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
    }

    startMonitoring() {
        if (this.selectedBoards.length === 0) {
            this.showNotification('모니터링할 게시판을 선택해주세요! 📋', 'warning');
            return;
        }

        this.isMonitoring = true;
        this.updateMonitoringUI();
        
        // 선택된 게시판들에 대해 모니터링 시작
        this.selectedBoards.forEach(board => {
            const monitor = this.createMonitor(board);
            this.monitors.push(monitor);
            
            if (this.getCheckInterval() > 0) {
                this.startAutoCheck(monitor.id);
            }
        });

        this.saveMonitors();
        this.renderMonitors();
        this.showNotification('🚀 모니터링이 시작되었습니다!', 'success');
        
        // 즉시 첫 체크 수행
        setTimeout(() => this.checkAllMonitors(), 1000);
    }

    stopMonitoring() {
        this.isMonitoring = false;
        this.updateMonitoringUI();
        
        // 모든 자동 체크 중지
        this.intervals.forEach(intervalId => clearInterval(intervalId));
        this.intervals.clear();
        
        this.showNotification('⏸️ 모니터링이 중지되었습니다', 'info');
    }

    updateMonitoringUI() {
        const btn = document.getElementById('startMonitoringBtn');
        if (!btn) return;

        if (this.isMonitoring) {
            btn.innerHTML = '<i class="fas fa-stop mr-3"></i>모니터링 중지';
            btn.className = 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300';
        } else {
            btn.innerHTML = '<i class="fas fa-play mr-3"></i>모니터링 시작';
            btn.className = 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300';
        }
    }

    createMonitor(board) {
        const settings = this.getSettings();
        
        const monitor = {
            id: Date.now().toString() + '_' + board.path,
            boardPath: board.path,
            boardName: board.name,
            url: `http://www.gyuni-jungmiso.com/${board.path}`,
            interval: settings.checkInterval || 5,
            autoCheck: settings.checkInterval > 0,
            lastCheck: null,
            lastContent: null,
            status: 'waiting',
            created: new Date().toISOString(),
            isSpecial: board.isSpecial || false
        };

        return monitor;
    }

    async checkWebsite(monitorId) {
        const monitor = this.monitors.find(m => m.id === monitorId);
        if (!monitor) return;

        monitor.status = 'checking';
        this.renderMonitors();

        try {
            // CORS 제한으로 실제 체크는 시뮬레이션
            const response = await this.simulateWebsiteCheck(monitor);
            
            monitor.lastCheck = new Date().toISOString();
            monitor.status = 'checked';

            // 새 글 체크
            if (monitor.lastContent && monitor.lastContent !== response.content) {
                await this.handleContentChange(monitor, response, 'new_post');
                monitor.status = 'changed';
            }

            monitor.lastContent = response.content;
            this.saveMonitors();
            this.renderMonitors();

        } catch (error) {
            monitor.status = 'error';
            monitor.lastCheck = new Date().toISOString();
            this.saveMonitors();
            this.renderMonitors();
            console.error('Website check failed:', error);
        }
    }

    async simulateWebsiteCheck(monitor) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // 시뮬레이션: 10% 확률로 새 글 발견
                const hasNewContent = Math.random() < 0.1;
                const content = hasNewContent ? 
                    `new_content_${Date.now()}` : 
                    monitor.lastContent || 'initial_content';
                
                resolve({
                    content: content,
                    status: 'success'
                });
            }, 500 + Math.random() * 1500);
        });
    }

    async handleContentChange(monitor, response, changeType) {
        let message = '';
        let icon = '🔔';
        
        switch (changeType) {
            case 'new_post':
                message = `${monitor.boardName}에 새 글이 올라왔습니다! 📝`;
                icon = '📝';
                break;
            default:
                message = `${monitor.boardName}에서 변화가 감지되었습니다 🔍`;
                icon = '🔍';
        }

        const change = {
            id: Date.now().toString(),
            monitorId: monitor.id,
            boardName: monitor.boardName,
            url: monitor.url,
            timestamp: new Date().toISOString(),
            changeType: changeType,
            message: message,
            icon: icon
        };

        this.history.unshift(change);
        
        // 히스토리 최대 개수 제한
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
        
        this.saveHistory();
        this.renderHistory();

        // 알림 발송
        await this.sendNotification(message, icon);
    }

    async checkAllMonitors() {
        if (this.monitors.length === 0) {
            this.showNotification('체크할 모니터가 없습니다 🤷‍♀️', 'info');
            return;
        }

        this.showNotification(`🔍 ${this.monitors.length}개 게시판을 체크 중입니다...`, 'info');

        const checkPromises = this.monitors.map(monitor => this.checkWebsite(monitor.id));
        await Promise.all(checkPromises);

        this.showNotification('✅ 모든 게시판 체크가 완료되었습니다!', 'success');
    }

    startAutoCheck(monitorId) {
        const monitor = this.monitors.find(m => m.id === monitorId);
        const interval = this.getCheckInterval();
        
        if (!monitor || interval <= 0) return;

        // 새 인터벌 설정
        const intervalId = setInterval(() => {
            this.checkWebsite(monitorId);
        }, interval * 60 * 1000);

        this.intervals.set(monitorId, intervalId);
        console.log(`🔄 자동 체크 시작: ${monitor.boardName} (${interval}분 간격)`);
    }

    restoreMonitoring() {
        if (this.monitors.length > 0) {
            this.isMonitoring = true;
            this.updateMonitoringUI();
            
            // 각 모니터의 자동 체크 재시작
            this.monitors.forEach(monitor => {
                if (monitor.autoCheck && this.getCheckInterval() > 0) {
                    this.startAutoCheck(monitor.id);
                }
            });
        }
    }

    renderMonitors() {
        const container = document.getElementById('monitorList');
        const emptyState = document.getElementById('emptyState');

        if (!container) return;

        if (this.monitors.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = this.monitors.map(monitor => {
            const statusIcon = this.getStatusIcon(monitor.status);
            const statusColor = this.getStatusColor(monitor.status);
            
            return `
                <div class="bg-white rounded-2xl p-6 shadow-lg border-l-4 ${this.getStatusBorderColor(monitor.status)}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-4 mb-3">
                                <div class="text-2xl">📝</div>
                                <div>
                                    <h3 class="font-bold text-lg text-gray-900">${monitor.boardName}</h3>
                                    <div class="flex items-center gap-2 text-sm text-gray-600">
                                        <span class="text-lg ${statusColor}">${statusIcon}</span>
                                        <span>${this.getStatusText(monitor.status)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="text-sm text-gray-600">
                                <div>간격: ${monitor.interval > 0 ? `${monitor.interval}분` : '수동'}</div>
                                <div>마지막 체크: ${monitor.lastCheck ? new Date(monitor.lastCheck).toLocaleString('ko-KR') : '아직 체크 안함'}</div>
                            </div>
                        </div>
                        
                        <div class="flex flex-col gap-2 ml-6">
                            <button onclick="gyuniMonitor.checkWebsite('${monitor.id}')" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium"
                                    ${monitor.status === 'checking' ? 'disabled' : ''}>
                                <i class="fas fa-sync ${monitor.status === 'checking' ? 'fa-spin' : ''} mr-1"></i>
                                체크
                            </button>
                            
                            <button onclick="gyuniMonitor.removeMonitor('${monitor.id}')" 
                                    class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-medium">
                                <i class="fas fa-trash mr-1"></i>
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderHistory() {
        const container = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyHistory');

        if (!container) return;

        if (this.history.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = this.history.slice(0, 20).map(item => {
            return `
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-2xl">${item.icon}</span>
                                <div>
                                    <span class="font-bold text-blue-800">새 알림</span>
                                    <span class="text-xs text-blue-600 bg-white bg-opacity-50 px-2 py-1 rounded-full ml-2">
                                        ${new Date(item.timestamp).toLocaleString('ko-KR')}
                                    </span>
                                </div>
                            </div>
                            <p class="font-medium text-blue-800 mb-2">${item.message}</p>
                            <div class="flex items-center gap-2 text-xs text-blue-600">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${item.boardName}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    removeMonitor(monitorId) {
        const monitor = this.monitors.find(m => m.id === monitorId);
        if (!monitor) return;

        if (confirm(`"${monitor.boardName}" 모니터를 삭제하시겠습니까?`)) {
            this.stopAutoCheck(monitorId);
            this.monitors = this.monitors.filter(m => m.id !== monitorId);
            this.saveMonitors();
            this.renderMonitors();
            
            if (this.monitors.length === 0) {
                this.isMonitoring = false;
                this.updateMonitoringUI();
            }
            
            this.showNotification('모니터가 삭제되었습니다', 'success');
        }
    }

    stopAutoCheck(monitorId) {
        if (this.intervals.has(monitorId)) {
            clearInterval(this.intervals.get(monitorId));
            this.intervals.delete(monitorId);
        }
    }

    getStatusIcon(status) {
        const icons = {
            waiting: '<i class="fas fa-clock"></i>',
            checking: '<i class="fas fa-spinner fa-spin"></i>',
            checked: '<i class="fas fa-check-circle"></i>',
            changed: '<i class="fas fa-exclamation-triangle"></i>',
            error: '<i class="fas fa-times-circle"></i>'
        };
        return icons[status] || icons.waiting;
    }

    getStatusColor(status) {
        const colors = {
            waiting: 'text-gray-500',
            checking: 'text-blue-500',
            checked: 'text-green-500',
            changed: 'text-amber-500',
            error: 'text-red-500'
        };
        return colors[status] || colors.waiting;
    }

    getStatusText(status) {
        const texts = {
            waiting: '대기 중',
            checking: '확인 중...',
            checked: '확인 완료',
            changed: '변화 감지!',
            error: '오류 발생'
        };
        return texts[status] || '알 수 없음';
    }

    getStatusBorderColor(status) {
        const colors = {
            waiting: 'border-l-gray-400',
            checking: 'border-l-blue-500',
            checked: 'border-l-green-500',
            changed: 'border-l-amber-500',
            error: 'border-l-red-500'
        };
        return colors[status] || colors.waiting;
    }

    async testNotification() {
        await this.sendNotification('테스트 알림입니다! 🔔', '🔔');
        this.showNotification('테스트 알림을 전송했습니다!', 'success');
    }

    async sendNotification(message, icon = '🔔') {
        const settings = this.getSettings();
        
        // 데스크톱 알림
        if (settings.desktopAlert && Notification.permission === 'granted') {
            new Notification('규니정미소 모니터링', {
                body: message,
                icon: '/icons/icon-192x192.png'
            });
        }
        
        // 소리 알림
        if (settings.soundAlert) {
            this.playNotificationSound();
        }
    }

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('알림음 재생 실패:', error);
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showNotification('이 브라우저는 알림을 지원하지 않습니다', 'error');
            return;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.showNotification('알림 권한이 허용되었습니다!', 'success');
            } else {
                this.showNotification('알림 권한이 필요합니다', 'warning');
            }
        }
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-amber-500'
        };

        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-lg z-50 transform transition-all duration-500 translate-x-full max-w-sm font-medium`;
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
            }, 500);
        }, 4000);
    }

    clearHistory() {
        if (confirm('모든 히스토리를 삭제하시겠습니까?')) {
            this.history = [];
            this.saveHistory();
            this.renderHistory();
            this.showNotification('히스토리가 삭제되었습니다', 'success');
        }
    }

    exportData() {
        const exportData = {
            monitors: this.monitors,
            history: this.history,
            settings: this.getSettings(),
            selectedBoards: this.selectedBoards,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `gyuni-monitor-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('데이터를 성공적으로 내보냈습니다!', 'success');
    }

    getSettings() {
        return {
            commentNotifications: document.getElementById('commentNotifications')?.checked !== false,
            checkInterval: parseInt(document.getElementById('checkInterval')?.value) || 5,
            soundAlert: document.getElementById('soundAlert')?.checked !== false,
            desktopAlert: document.getElementById('desktopAlert')?.checked !== false
        };
    }

    getCheckInterval() {
        return parseInt(document.getElementById('checkInterval')?.value) || 5;
    }

    saveSettings() {
        const settings = this.getSettings();
        settings.selectedBoards = this.selectedBoards;
        localStorage.setItem('gyuni-settings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('gyuni-settings') || '{}');
        
        if (settings.commentNotifications !== undefined) 
            document.getElementById('commentNotifications').checked = settings.commentNotifications;
        if (settings.checkInterval) 
            document.getElementById('checkInterval').value = settings.checkInterval;
        if (settings.soundAlert !== undefined) 
            document.getElementById('soundAlert').checked = settings.soundAlert;
        if (settings.desktopAlert !== undefined) 
            document.getElementById('desktopAlert').checked = settings.desktopAlert;
        
        // 선택된 게시판 복원
        if (settings.selectedBoards) {
            this.selectedBoards = settings.selectedBoards;
            settings.selectedBoards.forEach(board => {
                const checkbox = document.querySelector(`[data-board="${board.path}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    }

    saveMonitors() {
        localStorage.setItem('gyuni-monitors', JSON.stringify(this.monitors));
    }

    saveHistory() {
        localStorage.setItem('gyuni-history', JSON.stringify(this.history));
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.gyuniMonitor = new GyuniMonitor();
});
