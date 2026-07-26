# SOCKET_EVENTS

Transport: Socket.IO (`VITE_WS_URL`, 기본 서버 origin)  
Handshake: JWT access token (auth / query / header)

프론트 타입: `src/types/socket.ts`

## 매칭 (1:1 / 300P 전략)

| Direction | Event | 설명 |
|-----------|-------|------|
| C→S | `MATCH_QUEUE_JOIN` | 큐 참가 `{ stake }` |
| C→S | `MATCH_QUEUE_LEAVE` | 큐 취소 |
| S→C | `MATCH_SEARCH_STARTED` | 검색 시작 |
| S→C | `MATCH_QUEUE_JOIN_ACK` | 큐 등록 확인 |
| S→C | `MATCH_FOUND` | 상대 매칭 |
| S→C | `MATCH_READY` | 시작 카운트 |
| S→C | `ROUND_STARTED` | 선택 타이머 |
| C→S | `CHOICE_SUBMIT` | 손 제출 |
| S→C | `CHOICE_ACCEPTED` / `CHOICE_LOCKED` | 수락·잠금 |
| S→C | `ROUND_RESULT` | 라운드 결과 |
| S→C | `MATCH_RESULT` / `MATCH_FINISHED` | 매치 종료 |
| S→C | `MATCH_CANCELLED` | 취소 |
| S→C | `OPPONENT_DISCONNECTED` / `RECONNECTED` | 연결 |
| C→S | `STRATEGY_CHOICES_SUBMIT` | 300P 3선택 |
| S→C | `STRATEGY_*` | 전략전 전용 이벤트 |
| S→C | `WALLET_UPDATED` | 잔액 푸시 |

## 토너먼트

| Direction | Event | 설명 |
|-----------|-------|------|
| C→S | `TOURNAMENT_SUBSCRIBE` | 방 구독 |
| S→C | `TOURNAMENT_UPDATED` / `PARTICIPANT_JOINED` | 상태 |
| S→C | `TOURNAMENT_COUNTDOWN` / `TOURNAMENT_STARTED` | 시작 |
| S→C | `QUALIFIER_*` | 예선 |
| S→C | `BRACKET_*` / `TOURNAMENT_MATCH_READY` | 본선 |
| S→C | `PLAYER_ELIMINATED` / `FINAL_STARTED` | 진출 |
| S→C | `TOURNAMENT_COMPLETED` / `FINISHED` | 종료 |

## 관전

| Direction | Event | 설명 |
|-----------|-------|------|
| C→S | `WATCH_SUBSCRIBE` / `UNSUBSCRIBE` | 구독 |
| C→S | `WATCH_REACTION` | 리액션 |
| S→C | `WATCH_STATE` / `VIEWER_COUNT` / `REVEAL` / … | 중계 |

## 공통

- `ping` / `pong`
- `error_event` `{ code, message }`

서버 권위: 선택 위·변조·중복 제출은 거부. 상세 정책은 `server/src/modules/match/policy.ts`.
