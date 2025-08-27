const CACHE_NAME = 'gyuni-monitor-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/user-login.html',
  '/admin-login.html',
  '/js/main.js',
  '/js/admin.js',
  '/js/api-service.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Gamja+Flower&display=swap',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css'
];

// Service Worker 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 열기 성공');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('캐시 추가 실패:', error);
      })
  );
  self.skipWaiting();
});

// Service Worker 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화 중...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 네트워크 요청 가로채기 (캐시 우선 전략)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에서 발견되면 캐시된 버전 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then((response) => {
            // 유효한 응답인지 확인
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 복제하여 캐시에 저장
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 네트워크 실패 시 오프라인 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('푸시 메시지 수신:', event);
  
  const options = {
    body: event.data ? event.data.text() : '새로운 알림이 있습니다.',
    icon: '/manifest.json',
    badge: '/manifest.json',
    tag: 'gyuni-monitor-notification',
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '확인'
      },
      {
        action: 'dismiss',
        title: '닫기'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification('형균이네 정미소 모니터링', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // 이미 열린 창이 있으면 포커스
          for (const client of clientList) {
            if (client.url.includes(self.registration.scope) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // 새 창 열기
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// 백그라운드 동기화
self.addEventListener('sync', (event) => {
  console.log('백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-check') {
    event.waitUntil(performBackgroundCheck());
  }
});

// 백그라운드 체크 함수 (시뮬레이션)
async function performBackgroundCheck() {
  try {
    console.log('백그라운드 체크 수행 중...');
    
    // 실제 구현에서는 여기서 API 호출
    const hasNewContent = Math.random() < 0.1; // 10% 확률
    
    if (hasNewContent) {
      await self.registration.showNotification('형균이네 정미소 모니터링', {
        body: '새로운 글이 감지되었습니다!',
        tag: 'background-check-result',
        data: { url: '/' }
      });
    }
    
    console.log('백그라운드 체크 완료');
  } catch (error) {
    console.error('백그라운드 체크 실패:', error);
  }
}

// 메시지 수신 (메인 페이지와 통신)
self.addEventListener('message', (event) => {
  console.log('메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'MANUAL_CHECK') {
    performBackgroundCheck();
  }
});

console.log('Service Worker 로드됨');
