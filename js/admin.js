// admin.js - 관리자 페이지 기능
class AdminManager {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('gyuni_users') || '[]');
        this.monitoringLogs = JSON.parse(localStorage.getItem('gyuni_monitoring_logs') || '[]');
        this.init();
    }

    init() {
        this.renderUserList();
        this.renderMonitoringLogs();
        this.setupEventListeners();
        this.updateStats();
    }

    setupEventListeners() {
        // 사용자 추가 폼
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => this.handleAddUser(e));
        }

        // 로그 초기화 버튼
        const clearLogsBtn = document.getElementById('clearLogs');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }

        // 사용자 데이터 초기화 버튼
        const clearUsersBtn = document.getElementById('clearUsers');
        if (clearUsersBtn) {
            clearUsersBtn.addEventListener('click', () => this.clearUsers());
        }

        // 테스트 알림 버튼
        const testNotificationBtn = document.getElementById('testNotification');
        if (testNotificationBtn) {
            testNotificationBtn.addEventListener('click', () => this.sendTestNotification());
        }

        // 로그아웃 버튼
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    handleAddUser(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const role = formData.get('role');

        if (!username || !email) {
            this.showAlert('사용자명과 이메일을 모두 입력해주세요.', 'error');
            return;
        }

        // 중복 확인
        if (this.users.find(user => user.username === username || user.email === email)) {
            this.showAlert('이미 존재하는 사용자명 또는 이메일입니다.', 'error');
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            role,
            createdAt: new Date().toISOString(),
            lastActive: null,
            isActive: true
        };

        this.users.push(newUser);
        this.saveUsers();
        this.renderUserList();
        this.updateStats();
        
        e.target.reset();
        this.showAlert('사용자가 성공적으로 추가되었습니다.', 'success');
    }

    renderUserList() {
        const userList = document.getElementById('userList');
        if (!userList) return;

        if (this.users.length === 0) {
            userList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-users text-4xl mb-4"></i>
                    <p>등록된 사용자가 없습니다.</p>
                </div>
            `;
            return;
        }

        userList.innerHTML = this.users.map(user => `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="font-semibold text-gray-900">${user.username}</h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }">
                                ${user.role === 'admin' ? '관리자' : '사용자'}
                            </span>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }">
                                ${user.isActive ? '활성' : '비활성'}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 mb-1">
                            <i class="fas fa-envelope mr-1"></i>
                            ${user.email}
                        </p>
                        <p class="text-xs text-gray-500">
                            <i class="fas fa-calendar mr-1"></i>
                            가입: ${new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                        ${user.lastActive ? `
                            <p class="text-xs text-gray-500">
                                <i class="fas fa-clock mr-1"></i>
                                마지막 활동: ${new Date(user.lastActive).toLocaleDateString('ko-KR')}
                            </p>
                        ` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="adminManager.toggleUserStatus('${user.id}')" 
                                class="px-3 py-1 text-xs font-medium rounded-md ${
                                    user.isActive 
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }">
                            ${user.isActive ? '비활성화' : '활성화'}
                        </button>
                        <button onclick="adminManager.deleteUser('${user.id}')" 
                                class="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100">
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderMonitoringLogs() {
        const logsList = document.getElementById('logsList');
        if (!logsList) return;

        if (this.monitoringLogs.length === 0) {
            logsList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-file-alt text-4xl mb-4"></i>
                    <p>모니터링 로그가 없습니다.</p>
                </div>
            `;
            return;
        }

        // 최신 로그 50개만 표시
        const recentLogs = this.monitoringLogs.slice(-50).reverse();

        logsList.innerHTML = recentLogs.map(log => `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                log.type === 'new_post' ? 'bg-blue-100 text-blue-800' :
                                log.type === 'new_comment' ? 'bg-green-100 text-green-800' :
                                log.type === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }">
                                ${
                                    log.type === 'new_post' ? '새 게시물' :
                                    log.type === 'new_comment' ? '새 댓글' :
                                    log.type === 'error' ? '오류' :
                                    log.type
                                }
                            </span>
                            <span class="text-xs text-gray-500">
                                ${log.board || '알 수 없음'}
                            </span>
                        </div>
                        <p class="text-sm text-gray-900 mb-1">${log.message}</p>
                        <p class="text-xs text-gray-500">
                            <i class="fas fa-user mr-1"></i>
                            ${log.username || '시스템'}
                            <i class="fas fa-clock ml-3 mr-1"></i>
                            ${new Date(log.timestamp).toLocaleString('ko-KR')}
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        // 총 사용자 수
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) {
            totalUsersEl.textContent = this.users.length;
        }

        // 활성 사용자 수
        const activeUsersEl = document.getElementById('activeUsers');
        if (activeUsersEl) {
            const activeCount = this.users.filter(user => user.isActive).length;
            activeUsersEl.textContent = activeCount;
        }

        // 총 로그 수
        const totalLogsEl = document.getElementById('totalLogs');
        if (totalLogsEl) {
            totalLogsEl.textContent = this.monitoringLogs.length;
        }

        // 오늘 로그 수
        const todayLogsEl = document.getElementById('todayLogs');
        if (todayLogsEl) {
            const today = new Date().toDateString();
            const todayCount = this.monitoringLogs.filter(log => 
                new Date(log.timestamp).toDateString() === today
            ).length;
            todayLogsEl.textContent = todayCount;
        }
    }

    toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.isActive = !user.isActive;
            this.saveUsers();
            this.renderUserList();
            this.updateStats();
            
            this.showAlert(
                `${user.username} 사용자가 ${user.isActive ? '활성화' : '비활성화'}되었습니다.`,
                'success'
            );
        }
    }

    deleteUser(userId) {
        if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                const deletedUser = this.users.splice(userIndex, 1)[0];
                this.saveUsers();
                this.renderUserList();
                this.updateStats();
                
                this.showAlert(`${deletedUser.username} 사용자가 삭제되었습니다.`, 'success');
            }
        }
    }

    clearLogs() {
        if (confirm('정말로 모든 모니터링 로그를 삭제하시겠습니까?')) {
            this.monitoringLogs = [];
            localStorage.removeItem('gyuni_monitoring_logs');
            this.renderMonitoringLogs();
            this.updateStats();
            this.showAlert('모든 로그가 삭제되었습니다.', 'success');
        }
    }

    clearUsers() {
        if (confirm('정말로 모든 사용자 데이터를 삭제하시겠습니까? (관리자 계정 제외)')) {
            this.users = this.users.filter(user => user.role === 'admin');
            this.saveUsers();
            this.renderUserList();
            this.updateStats();
            this.showAlert('일반 사용자 데이터가 모두 삭제되었습니다.', 'success');
        }
    }

    sendTestNotification() {
        // 테스트 알림 생성
        const testLog = {
            id: Date.now().toString(),
            type: 'test',
            message: '테스트 알림입니다. 시스템이 정상적으로 작동하고 있습니다.',
            board: '테스트',
            username: 'admin',
            timestamp: new Date().toISOString()
        };

        this.monitoringLogs.push(testLog);
        this.saveMonitoringLogs();
        this.renderMonitoringLogs();
        this.updateStats();

        // 브라우저 알림 (권한이 있는 경우)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('규니정미소 모니터링', {
                body: '테스트 알림이 성공적으로 전송되었습니다.',
                icon: '/favicon.ico'
            });
        }

        this.showAlert('테스트 알림이 전송되었습니다.', 'success');
    }

    logout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('admin_logged_in');
            window.location.href = 'admin-login.html';
        }
    }

    showAlert(message, type = 'info') {
        // 기존 알림 제거
        const existingAlert = document.querySelector('.admin-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // 새 알림 생성
        const alert = document.createElement('div');
        alert.className = `admin-alert fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
        }`;
        
        alert.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-triangle' :
                    'fa-info-circle'
                }"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-lg leading-none">×</button>
            </div>
        `;

        document.body.appendChild(alert);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    saveUsers() {
        localStorage.setItem('gyuni_users', JSON.stringify(this.users));
    }

    saveMonitoringLogs() {
        localStorage.setItem('gyuni_monitoring_logs', JSON.stringify(this.monitoringLogs));
    }

    // 실시간 업데이트를 위한 메서드들
    addMonitoringLog(log) {
        this.monitoringLogs.push({
            ...log,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        });
        this.saveMonitoringLogs();
        this.renderMonitoringLogs();
        this.updateStats();
    }

    getUserByUsername(username) {
        return this.users.find(user => user.username === username);
    }

    updateUserActivity(username) {
        const user = this.getUserByUsername(username);
        if (user) {
            user.lastActive = new Date().toISOString();
            this.saveUsers();
            this.renderUserList();
        }
    }
}

// 페이지 로드 시 초기화
let adminManager;

document.addEventListener('DOMContentLoaded', function() {
    // 관리자 로그인 확인
    if (!localStorage.getItem('admin_logged_in')) {
        window.location.href = 'admin-login.html';
        return;
    }

    // AdminManager 초기화
    adminManager = new AdminManager();

    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // 페이지 가시성 변경 시 실시간 업데이트
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && adminManager) {
            adminManager.renderMonitoringLogs();
            adminManager.updateStats();
        }
    });

    // 5분마다 자동 업데이트
    setInterval(() => {
        if (adminManager) {
            adminManager.renderMonitoringLogs();
            adminManager.updateStats();
        }
    }, 5 * 60 * 1000);
});

// 전역 함수들 (HTML에서 직접 호출용)
function exportData() {
    if (!adminManager) return;

    const data = {
        users: adminManager.users,
        logs: adminManager.monitoringLogs,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gyuni-monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    adminManager.showAlert('데이터가 성공적으로 내보내졌습니다.', 'success');
}

function importData() {
    if (!adminManager) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('데이터를 가져오면 기존 데이터가 덮어쓰여집니다. 계속하시겠습니까?')) {
                    adminManager.users = data.users || [];
                    adminManager.monitoringLogs = data.logs || [];
                    
                    adminManager.saveUsers();
                    adminManager.saveMonitoringLogs();
                    adminManager.renderUserList();
                    adminManager.renderMonitoringLogs();
                    adminManager.updateStats();
                    
                    adminManager.showAlert('데이터가 성공적으로 가져와졌습니다.', 'success');
                }
            } catch (error) {
                adminManager.showAlert('잘못된 파일 형식입니다.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
