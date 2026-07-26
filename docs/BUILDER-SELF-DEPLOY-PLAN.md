# 빌더 셀프 배포 개발 계획

## 목표

일반 사용자가 빌더에서 만든 디자인을 운영자에게 파일 전달하지 않고 직접 그누보드 사이트에 적용한다.

현재 수동 흐름:

```text
빌더 제작 -> 운영자가 ZIP/파일 수령 -> Cursor/프로젝트에서 그누보드용 패키지 변환 -> 홈페이지 업데이트 URL에 업로드 -> 사이트 적용
```

목표 흐름:

```text
빌더 제작 -> 사용자가 [그누보드에 배포] 클릭 -> iCRM에 사이트별 배포 릴리스 생성 -> 사이트 관리자에서 [적용] 또는 자동 적용
```

## 핵심 원칙

- 빌더 결과물을 사이트에 직접 덮어쓰지 않는다.
- 기존 `g5-update`의 manifest, checksum, 백업, dry-run, 파일 다운로드 구조를 재사용한다.
- 공용 iCRM 기능 업데이트와 사용자 디자인 배포를 분리한다.
- 일반 사용자는 FTP, SSH, Cursor, 압축 재가공을 몰라도 되게 한다.
- 배포 전에는 반드시 파일 경로, 확장자, 용량, checksum, 적용 대상 사이트를 검증한다.

## 아키텍처

```text
Builder UI
  -> Builder Deploy API
    -> iCRM Builder Release Storage
      -> /api/builder-deploy/manifest
      -> /api/builder-deploy/file
        -> Customer G5 Site
          -> iCRM 업데이트 클라이언트
          -> onoff-builder-bridge 또는 파일 패키지 적용
```

## 배포 유형

### 1. 랜딩/메인 독립 페이지 배포 (MVP)

빌더 dist ZIP을 `plugin/onoff-builder-bridge/imports/{project_id}/`에 설치한다.

적용 결과:

```text
/plugin/onoff-builder-bridge/page.php?id={project_id}
```

장점:

- 그누보드 core, head.php, tail.php, 게시판을 건드리지 않는다.
- 실패해도 기존 사이트가 깨질 가능성이 낮다.
- 현재 `onoff-builder-bridge` 플러그인을 그대로 확장할 수 있다.

### 2. 홈 연결 배포

사이트 설정에 `home_builder_bridge_id` 또는 유사 설정을 추가하고, 루트 홈에서 해당 빌더 페이지를 보여준다.

적용 결과:

```text
/  -> builder page
/bbs/board.php?... -> 기존 게시판 유지
```

### 3. 완전 통합 배포 (후속)

빌더 결과물을 `section/*.php`, `css/custom.css`, `js/custom.js`, `img/*`로 변환해 그누보드 테마에 통합한다.

이 단계는 자동화 난도가 높으므로 MVP 이후 진행한다.

## 1차 MVP 범위

### iCRM 서버

- `api/builder-deploy/manifest` 추가
- `api/builder-deploy/file` 추가
- 사이트별 릴리스 저장소 추가

권장 저장 구조:

```text
data/builder-deploy/
  sites/
    {site_id_or_domain}/
      releases/
        {release_id}/
          manifest.json
          files/
            plugin/onoff-builder-bridge/imports/{project_id}/index.html
            plugin/onoff-builder-bridge/imports/{project_id}/assets/...
            plugin/onoff-builder-bridge/data/imports/{project_id}.json
```

### Builder/iCRM 관리자

- 빌더 결과물 업로드 또는 빌드 산출물 등록
- 적용 사이트 선택
- 프로젝트 ID 입력
- 릴리스 생성
- 릴리스 상태 확인

### 고객 그누보드 사이트

- `builder-bridge` 패키지를 `icrm-full`에 포함
- 기존 iCRM 업데이트로 플러그인 설치
- 이후 `builder-deploy` 업데이트를 별도 버튼으로 적용

관리 화면 예시:

```text
환경설정 -> iCRM 업데이트
  [기능 업데이트]
  [빌더 디자인 업데이트]
```

## 릴리스 manifest 예시

```json
{
  "release_id": "builder-2026.06.08.001",
  "type": "builder-page",
  "site_domain": "example.com",
  "project_id": "clinic-main",
  "project_name": "클리닉 메인",
  "packages": {
    "builder-page-clinic-main": {
      "id": "builder-page-clinic-main",
      "version": "2026.06.08.001",
      "title": "클리닉 메인 빌더 페이지",
      "description": "빌더 dist ZIP 배포",
      "depends": ["builder-bridge"],
      "files": [
        "plugin/onoff-builder-bridge/imports/clinic-main/index.html",
        "plugin/onoff-builder-bridge/imports/clinic-main/assets/index.js",
        "plugin/onoff-builder-bridge/imports/clinic-main/assets/index.css",
        "plugin/onoff-builder-bridge/data/imports/clinic-main.json"
      ],
      "patches": [],
      "config_keys": {}
    }
  },
  "bundles": {
    "builder-deploy": {
      "id": "builder-deploy",
      "title": "빌더 디자인 배포",
      "packages": ["builder-page-clinic-main"]
    }
  },
  "files": {
    "plugin/onoff-builder-bridge/imports/clinic-main/index.html": {
      "sha256": "...",
      "size": 12345
    }
  }
}
```

## 보안 검증

업로드 ZIP 거부 조건:

- `.php`, `.phtml`, `.phar`, `.cgi`, `.pl`, `.sh`, `.exe`
- `.htaccess`, `web.config`
- `.env`, `config.json` 중 secret 의심 파일
- `../` 또는 숨김 경로
- `node_modules`, `.git`, `vendor`
- 허용 용량 초과

허용 배포 경로:

- `plugin/onoff-builder-bridge/imports/{project_id}/...`
- `plugin/onoff-builder-bridge/data/imports/{project_id}.json`

MVP에서는 위 두 경로 밖으로는 쓰지 않는다.

## 개발 단계

### Phase 1 — 기반 설치

- `builder-bridge`를 `icrm-full` 업데이트 패키지에 포함
- 모든 고객 사이트가 iCRM 업데이트만으로 빌더 페이지 플러그인을 설치 가능하게 한다.

완료 기준:

- `2026.xx.xx` 릴리스 적용 후 `/plugin/onoff-builder-bridge/admin/` 접근 가능
- dist ZIP 수동 업로드 시 `page.php?id=` 출력 가능

### Phase 2 — 중앙 릴리스 저장소

- iCRM에 `builder-deploy` API 추가
- 사이트별 builder manifest/file 응답 추가
- 빌더 업로드 ZIP을 manifest/files 구조로 변환하는 패키저 추가

완료 기준:

- iCRM에 릴리스 생성
- `curl /api/builder-deploy/manifest` 응답
- `curl /api/builder-deploy/file` 파일 다운로드 가능

### Phase 3 — 사이트 클라이언트 UI

- `plugin/icrm_update`에 "빌더 디자인 업데이트" 탭 추가
- 현재 적용된 builder release 표시
- dry-run / 적용 / 백업 경로 표시

완료 기준:

- 사이트 관리자가 FTP 없이 빌더 디자인 적용 가능

### Phase 4 — 빌더에서 바로 배포

- 빌더 UI에 "그누보드에 배포" 버튼 추가
- 내 사이트 목록 표시
- 프로젝트 ID, 이름, 홈 연결 여부 선택
- 배포 생성 후 사이트 관리자 적용 안내 또는 자동 pull 호출

완료 기준:

- 일반 사용자가 빌더 화면에서 사이트 선택 후 배포 생성
- 사이트에서 클릭 한 번으로 반영

### Phase 5 — 홈 연결/롤백

- `home_builder_bridge_id` 설정 추가
- 이전 릴리스로 롤백
- 적용 전 미리보기 URL 제공

완료 기준:

- 새 디자인 적용 후 문제 시 이전 디자인으로 복구 가능

## 사용자 화면 흐름

### 빌더

```text
1. 디자인 완성
2. [그누보드에 배포] 클릭
3. 사이트 선택
4. 프로젝트 ID/이름 입력
5. [배포 생성]
6. "사이트 관리자에서 적용하세요" 안내
```

### 그누보드 관리자

```text
1. 환경설정 -> iCRM 업데이트
2. 빌더 디자인 업데이트 탭
3. 새 디자인 확인
4. [미리보기] 또는 [적용]
5. 적용 완료 후 URL 확인
```

## 주의할 점

- 자동 적용은 1차에서는 하지 않는다. 일반 사용자 실수를 막기 위해 관리자 확인 버튼을 둔다.
- 사이트 루트 `index.php` 교체는 MVP에서 제외한다.
- 빌더 페이지는 독립 페이지로 먼저 안정화한다.
- 완전 통합 변환은 AI/Cursor 자동화가 필요하므로 별도 Phase로 둔다.
