/**
 * API 서비스 - 실제 API 연동을 위한 서비스 레이어
 * 현재는 가상 데이터를 사용하지만, 실제 API 연동 시 이 파일만 수정하면 됩니다.
 */

class ApiService {
    constructor() {
        // API 베이스 URL - 실제 API 서버로 변경 필요
        this.baseURL = 'https://api.gyuni-jungmiso.com';
        this.authToken = localStorage.getItem('authToken');
        
        // 개발 모드 플래그 - 실제 API 연동 시 false로 변경
        this.isDevelopmentMode = true;
    }

    /**
     * 실제 API 연동을 위한 설정
     * 실제 서버 연동 시 이 메서드를 호출하여 개발 모드를 비활성화
     */
    enableProductionMode(apiBaseUrl) {
        this.isDevelopmentMode = false;
        this.baseURL = apiBaseUrl;
        console.log('✅ Production API mode enabled:', apiBaseUrl);
    }

    /**
     * HTTP 요청을 위한 공통 헤더 생성
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }

    /**
     * API 요청 래퍼 함수
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        };

        if (!this.isDevelopmentMode) {
            // 실제 API 호출
            try {
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('API Request failed:', error);
                throw error;
            }
        } else {
            // 개발 모드 - 가상 응답 반환
            return this.getMockResponse(endpoint, options);
        }
    }

    /**
     * 사용자 로그인
     */
    async login(username, password) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });

        if (response.token) {
            this.authToken = response.token;
            localStorage.setItem('authToken', response.token);
        }

        return response;
    }

    /**
     * 사용자 로그아웃
     */
    async logout() {
        await this.request('/api/auth/logout', {
            method: 'POST',
        });

        this.authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
    }

    /**
     * 현재 사용자 정보 조회
     */
    async getCurrentUser() {
        return await this.request('/api/auth/me');
    }

    /**
     * 게시판 글 목록 조회
     */
    async getBoardPosts(boardId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/boards/${boardId}/posts${queryString ? '?' + queryString : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * 새 게시글 확인 (모니터링용)
     */
    async getNewPosts(boardId, lastCheckTime) {
        return await this.getBoardPosts(boardId, {
            since: lastCheckTime,
            sort: 'created_at',
            order: 'desc'
        });
    }

    /**
     * 쪽지함 조회
     */
    async getMessages(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/messages${queryString ? '?' + queryString : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * 새 쪽지 확인
     */
    async getNewMessages(lastCheckTime) {
        return await this.getMessages({
            since: lastCheckTime,
            unread: true
        });
    }

    /**
     * 알림 목록 조회
     */
    async getNotifications(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/notifications${queryString ? '?' + queryString : ''}`;
        
        return await this.request(endpoint);
    }

    /**
     * 개발용 가상 데이터 (실제 API 연동 시 제거 가능)
     */
    getMockResponse(endpoint, options) {
        // 가상 사용자 데이터
        const mockUsers = {
            '조형균': {
                id: 1,
                username: '조형균',
                name: '조형균',
                avatar: 'images/hyungkyun.jpg',
                role: 'owner',
                favoriteBoards: ['ab-1040', 'ab-msg_recv', 'ab-notice'],
                settings: {
                    commentNotifications: true,
                    soundAlert: true,
                    desktopAlert: true,
                    checkInterval: 5
                }
            }
        };

        // 로그인 API 모킹
        if (endpoint === '/api/auth/login' && options.method === 'POST') {
            const { username, password } = JSON.parse(options.body);
            
            if (mockUsers[username] && password === '1234') {
                const user = mockUsers[username];
                return {
                    success: true,
                    token: 'mock_jwt_token_' + Date.now(),
                    user: user
                };
            } else {
                throw new Error('Invalid credentials');
            }
        }

        // 사용자 정보 조회 API 모킹
        if (endpoint === '/api/auth/me') {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return {
                success: true,
                user: currentUser
            };
        }

        // 게시판 데이터 API 모킹
        if (endpoint.startsWith('/api/boards/')) {
            return {
                success: true,
                posts: [
                    {
                        id: 1,
                        title: '가상 게시글 제목',
                        author: '작성자',
                        created_at: new Date().toISOString(),
                        content: '가상 게시글 내용입니다.'
                    }
                ],
                total: 1,
                page: 1
            };
        }

        // 쪽지함 API 모킹
        if (endpoint === '/api/messages') {
            return {
                success: true,
                messages: [
                    {
                        id: 1,
                        from: '발신자',
                        subject: '가상 쪽지 제목',
                        content: '가상 쪽지 내용입니다.',
                        created_at: new Date().toISOString(),
                        is_read: false
                    }
                ],
                total: 1
            };
        }

        // 기본 응답
        return {
            success: true,
            message: 'Mock response'
        };
    }
}

// API 서비스 인스턴스 생성 및 전역 사용
const apiService = new ApiService();

// 실제 API 연동 방법 (주석)
/*
실제 API 서버와 연동하려면:

1. API 서버 준비:
   - gyuni-jungmiso.com 백엔드 API 서버 구축
   - CORS 설정으로 PWA 도메인 허용
   - 필요한 엔드포인트 구현

2. 이 파일에서 설정 변경:
   ```javascript
   // 개발 완료 후 이 코드 추가
   apiService.enableProductionMode('https://api.gyuni-jungmiso.com');
