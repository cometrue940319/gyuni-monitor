// api-service.js - API 서비스 및 데이터 관리
class ApiService {
    constructor() {
        this.baseUrl = 'https://gyuni-jungmiso.com';
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/';
        this.useCorsProxy = false; // CORS 문제로 인해 시뮬레이션 모드 사용
        
        // 게시판 설정
        this.boardConfig = {
            '공지사항': { url: '/bbs/board.php?bo_table=notice', hasSubCategory: false },
            '자유게시판': { url: '/bbs/board.php?bo_table=free', hasSubCategory: false },
            '단관/행사': { url: '/bbs/board.php?bo_table=event', hasSubCategory: true, subCategories: ['단관', '행사'] },
            '양도': { url: '/bbs/board.php?bo_table=transfer', hasSubCategory: true, subCategories: ['양도', '구함'] },
            '한줄인사': { url: '/bbs/board.php?bo_table=greeting', hasSubCategory: false, specialSettings: true },
            '질문/답변': { url: '/bbs/board.php?bo_table=qna', hasSubCategory: false },
            '정보공유': { url: '/bbs/board.php?bo_table=info', hasSubCategory: false }
        };

        // 관리자 전용 게시판
        this.adminBoards = {
            '관리자게시판': { url: '/bbs/board.php?bo_table=admin', password: '1025' },
            '운영진전용': { url: '/bbs/board.php?bo_table=staff', password: '1025' }
        };

        this.messageBoxUrl = '/ab-msg_recv';
        
        // 시뮬레이션 데이터
        this.simulationData = this.initializeSimulationData();
        
        // 요청 캐시
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5분
    }

    initializeSimulationData() {
        return {
            posts: [
                {
                    id: 'post_001',
                    board: '공지사항',
                    title: '[중요] 규니정미소 이용 안내사항',
                    author: '관리자',
                    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    content: '안녕하세요. 규니정미소 운영진입니다...',
                    comments: 15,
                    views: 234
                },
                {
                    id: 'post_002',
                    board: '자유게시판',
                    title: '오늘 날씨가 참 좋네요~',
                    author: '햇살좋은날',
                    date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    content: '산책하기 딱 좋은 날씨입니다!',
                    comments: 5,
                    views: 45
                },
                {
                    id: 'post_003',
                    board: '단관/행사',
                    subCategory: '단관',
                    title: '이번 주말 단관 모임 안내',
                    author: '모임지기',
                    date: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
                    content: '이번 주말 단관 모임을 진행합니다...',
                    comments: 12,
                    views: 87
                },
                {
                    id: 'post_004',
                    board: '양도',
                    subCategory: '양도',
                    title: '책상 양도합니다 (거의 새 것)',
                    author: '깔끔이',
                    date: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                    content: '이사 관계로 책상을 양도합니다...',
                    comments: 3,
                    views: 28
                },
                {
                    id: 'post_005',
                    board: '한줄인사',
                    title: '안녕하세요! 새로 가입했습니다',
                    author: '신입회원',
                    date: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                    content: '잘 부탁드립니다!',
                    comments: 0,
                    views: 12
                }
            ],
            comments: [
                {
                    id: 'comment_001',
                    postId: 'post_001',
                    board: '공지사항',
                    author: '회원A',
                    content: '감사합니다. 잘 읽었어요!',
                    date: new Date(Date.now() - 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'comment_002',
                    postId: 'post_002',
                    board: '자유게시판',
                    author: '산책러버',
                    content: '정말 좋은 날씨네요~ 저도 산책 나가야겠어요',
                    date: new Date(Date.now() - 20 * 60 * 1000).toISOString()
                }
            ],
            messages: [
                {
                    id: 'msg_001',
                    from: '관리자',
                    subject: '환영합니다!',
                    content: '규니정미소에 오신 것을 환영합니다.',
                    date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                    read: false
                }
            ]
        };
    }

    // 실제 API 호출 (CORS 제한으로 현재 비활성화)
    async fetchWithCors(url, options = {}) {
        const fullUrl = this.useCorsProxy ? this.corsProxy + this.baseUrl + url : this.baseUrl + url;
        
        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (compatible; GyuniMonitor/1.0)',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            console.warn('CORS fetch failed:', error);
            throw error;
        }
    }

    // 시뮬레이션 모드 - 게시판 데이터 가져오기
    async getBoardPosts(boardName, subCategory = null, lastCheckTime = null) {
        // 실제 환경에서는 fetchWithCors를 사용하여 실제 데이터를 가져옴
        // 현재는 시뮬레이션 데이터 반환
        
        await this.simulateDelay(500, 1500); // 네트워크 지연 시뮬레이션

        let posts = this.simulationData.posts.filter(post => {
            if (post.board !== boardName) return false;
            if (subCategory && post.subCategory !== subCategory) return false;
            if (lastCheckTime && new Date(post.date) <= new Date(lastCheckTime)) return false;
            return true;
        });

        // 가끔 새로운 게시글 시뮬레이션
        if (Math.random() < 0.1) { // 10% 확률
            const newPost = this.generateRandomPost(boardName, subCategory);
            this.simulationData.posts.push(newPost);
            posts.push(newPost);
        }

        return {
            success: true,
            data: posts,
            total: posts.length,
            board: boardName,
            subCategory: subCategory,
            timestamp: new Date().toISOString()
        };
    }

    // 시뮬레이션 모드 - 댓글 데이터 가져오기
    async getBoardComments(boardName, lastCheckTime = null) {
        await this.simulateDelay(300, 1000);

        let comments = this.simulationData.comments.filter(comment => {
            if (comment.board !== boardName) return false;
            if (lastCheckTime && new Date(comment.date) <= new Date(lastCheckTime)) return false;
            return true;
        });

        // 가끔 새로운 댓글 시뮬레이션
        if (Math.random() < 0.15) { // 15% 확률
            const newComment = this.generateRandomComment(boardName);
            if (newComment) {
                this.simulationData.comments.push(newComment);
                comments.push(newComment);
            }
        }

        return {
            success: true,
            data: comments,
            total: comments.length,
            board: boardName,
            timestamp: new Date().toISOString()
        };
    }

    // 시뮬레이션 모드 - 메시지 확인
    async checkMessages(lastCheckTime = null) {
        await this.simulateDelay(400, 800);

        let messages = this.simulationData.messages.filter(message => {
            if (lastCheckTime && new Date(message.date) <= new Date(lastCheckTime)) return false;
            return true;
        });

        // 가끔 새로운 메시지 시뮬레이션
        if (Math.random() < 0.05) { // 5% 확률
            const newMessage = this.generateRandomMessage();
            this.simulationData.messages.push(newMessage);
            messages.push(newMessage);
        }

        return {
            success: true,
            data: messages,
            total: messages.length,
            unreadCount: messages.filter(msg => !msg.read).length,
            timestamp: new Date().toISOString()
        };
    }

    // 관리자 게시판 접근 (비밀번호 확인)
    async accessAdminBoard(boardName, password) {
        await this.simulateDelay(200, 500);

        const adminBoard = this.adminBoards[boardName];
        if (!adminBoard) {
            return { success: false, error: '존재하지 않는 관리자 게시판입니다.' };
        }

        if (password !== adminBoard.password) {
            return { success: false, error: '비밀번호가 올바르지 않습니다.' };
        }

        // 관리자 게시판 데이터 시뮬레이션
        const adminPosts = [
            {
                id: 'admin_001',
                board: boardName,
                title: '[관리자] 시스템 점검 안내',
                author: '시스템관리자',
                date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                content: '정기 시스템 점검을 실시합니다...',
                comments: 2,
                views: 15,
                isAdmin: true
            }
        ];

        return {
            success: true,
            data: adminPosts,
            board: boardName,
            isAdminBoard: true,
            timestamp: new Date().toISOString()
        };
    }

    // 유틸리티 메서드들
    generateRandomPost(boardName, subCategory = null) {
        const titles = [
            '새로운 공지사항입니다',
            '안녕하세요 반갑습니다',
            '질문이 있어요',
            '정보 공유드립니다',
            '도움이 필요해요',
            '감사 인사드립니다'
        ];

        const authors = ['회원A', '회원B', '회원C', '새회원', '열정회원', '정보통'];

        return {
            id: `post_${Date.now()}`,
            board: boardName,
            subCategory: subCategory,
            title: titles[Math.floor(Math.random() * titles.length)],
            author: authors[Math.floor(Math.random() * authors.length)],
            date: new Date().toISOString(),
            content: '새로운 내용입니다...',
            comments: Math.floor(Math.random() * 10),
            views: Math.floor(Math.random() * 100) + 1
        };
    }

    generateRandomComment(boardName) {
        const posts = this.simulationData.posts.filter(post => post.board === boardName);
        if (posts.length === 0) return null;

        const post = posts[Math.floor(Math.random() * posts.length)];
        const authors = ['댓글러A', '댓글러B', '댓글러C', '새댓글러'];
        const contents = [
            '좋은 정보 감사합니다!',
            '동감이에요~',
            '저도 그렇게 생각해요',
            '도움이 되었습니다',
            '궁금한 게 있어요'
        ];

        return {
            id: `comment_${Date.now()}`,
            postId: post.id,
            board: boardName,
            author: authors[Math.floor(Math.random() * authors.length)],
            content: contents[Math.floor(Math.random() * contents.length)],
            date: new Date().toISOString()
        };
    }

    generateRandomMessage() {
        const subjects = ['새 메시지', '안내사항', '환영메시지', '알림'];
        const senders = ['관리자', '운영진', '시스템'];

        return {
            id: `msg_${Date.now()}`,
            from: senders[Math.floor(Math.random() * senders.length)],
            subject: subjects[Math.floor(Math.random() * subjects.length)],
            content: '새로운 메시지 내용입니다.',
            date: new Date().toISOString(),
            read: false
        };
    }

    async simulateDelay(min = 200, max = 1000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    // 캐시 관리
    getCacheKey(method, params) {
        return `${method}_${JSON.stringify(params)}`;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clearCache() {
        this.cache.clear();
    }

    // 통계 및 분석
    getMonitoringStats() {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentPosts = this.simulationData.posts.filter(post => 
            new Date(post.date) > oneDayAgo
        );

        const recentComments = this.simulationData.comments.filter(comment => 
            new Date(comment.date) > oneDayAgo
        );

        const weeklyPosts = this.simulationData.posts.filter(post => 
            new Date(post.date) > oneWeekAgo
        );

        return {
            totalPosts: this.simulationData.posts.length,
            totalComments: this.simulationData.comments.length,
            totalMessages: this.simulationData.messages.length,
            recentPosts: recentPosts.length,
            recentComments: recentComments.length,
            weeklyPosts: weeklyPosts.length,
            boardStats: this.getBoardStats(),
            timestamp: new Date().toISOString()
        };
    }

    getBoardStats() {
        const stats = {};
        
        Object.keys(this.boardConfig).forEach(boardName => {
            const posts = this.simulationData.posts.filter(post => post.board === boardName);
            const comments = this.simulationData.comments.filter(comment => comment.board === boardName);
            
            stats[boardName] = {
                posts: posts.length,
                comments: comments.length,
                lastActivity: posts.length > 0 ? 
                    Math.max(...posts.map(post => new Date(post.date).getTime())) : null
            };
        });

        return stats;
    }

    // 실제 웹사이트 파싱 메서드 (CORS 해결 시 사용)
    async parsePostsFromHtml(html, boardName) {
        // 실제 규니정미소 웹사이트의 HTML 구조를 파싱하는 로직
        // DOMParser를 사용하여 HTML 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const posts = [];
        // 실제 웹사이트 구조에 맞게 셀렉터 수정 필요
        const postElements = doc.querySelectorAll('.board-list tr');
        
        postElements.forEach(element => {
            // 실제 파싱 로직 구현
            // 이 부분은 실제 웹사이트 구조를 분석한 후 구현
        });

        return posts;
    }

    async parseCommentsFromHtml(html, boardName) {
        // 실제 댓글 파싱 로직
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const comments = [];
        // 실제 웹사이트 구조에 맞게 구현
        
        return comments;
    }

    // 에러 처리
    handleError(error, context = '') {
        console.error(`API Error ${context}:`, error);
        
        return {
            success: false,
            error: error.message || '알 수 없는 오류가 발생했습니다.',
            context,
            timestamp: new Date().toISOString()
        };
    }

    // 헬스 체크
    async healthCheck() {
        try {
            await this.simulateDelay(100, 300);
            return {
                success: true,
                status: 'healthy',
                mode: this.useCorsProxy ? 'cors-proxy' : 'simulation',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return this.handleError(error, 'health-check');
        }
    }
}

// 전역 API 서비스 인스턴스
window.apiService = new ApiService();

// API 서비스 이벤트 시스템
class ApiEventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

// 전역 이벤트 에미터
window.apiEvents = new ApiEventEmitter();

// 로깅 시스템
class ApiLogger {
    constructor() {
        this.logs = JSON.parse(localStorage.getItem('api_logs') || '[]');
        this.maxLogs = 1000;
    }

    log(level, message, data = null) {
        const logEntry = {
            id: Date.now().toString(),
            level,
            message,
            data,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        this.logs.unshift(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        localStorage.setItem('api_logs', JSON.stringify(this.logs));

        // 이벤트 발생
        window.apiEvents.emit('log', logEntry);

        // 콘솔 출력
        console[level] ? console[level](message, data) : console.log(message, data);
    }

    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    debug(message, data) { this.log('debug', message, data); }

    getLogs(level = null, limit = 100) {
        let filteredLogs = this.logs;
        
        if (level) {
            filteredLogs = this.logs.filter(log => log.level === level);
        }

        return filteredLogs.slice(0, limit);
    }

    clearLogs() {
        this.logs = [];
        localStorage.removeItem('api_logs');
    }
}

// 전역 로거
window.apiLogger = new ApiLogger();
