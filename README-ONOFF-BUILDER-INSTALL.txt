온오프빌더 그누보드 포함 전체 설치파일

구성:
- GNUBoard 기본 파일
- 온오프빌더 회원/디자인 배포/사이트 업데이트/포인트/월간 리포트 기능
- 최신 업데이트 릴리스: 2026.06.30.9

설치:
1. 압축을 풀어 서버 웹루트에 업로드합니다.
2. 브라우저에서 /install/ 을 실행해 그누보드 설치를 진행합니다.
3. 설치 후 /icrm-update-install.php 에 접속해 온오프빌더 라이선스를 입력합니다.
4. /onoff-builder-install-check.php 로 설치 상태를 점검합니다.
5. 설치 완료 후 보안을 위해 /install/ 폴더와 icrm-update-install.php 삭제를 권장합니다.

주의:
- data/dbconfig.php, 실제 업로드 파일, 세션/캐시/로그는 포함하지 않았습니다.
- data/onoff-builder.config.sample.php 를 참고해 필요 시 data/onoff-builder.config.php 를 생성합니다.
