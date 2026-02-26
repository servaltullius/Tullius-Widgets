# 2026-02-26 런타임 검증 체크리스트

## 목적

이번 패치의 핵심 변경점(브리지 계약 메타, stats 순서 보장, settings 저장 ACK, 브리지 핸들러 idempotent 등록)을
Windows/MSVC 환경에서 재현 가능하게 검증한다.

검증 대상:

- `updateStats` payload의 `schemaVersion`/`seq` 처리
- `updateSettings` payload의 `schemaVersion`/`rev` tolerant parsing
- 이벤트 + heartbeat 하이브리드 동기화에서 전송 단일화(coalesce/single-flight)
- settings 저장 성공/실패 ACK(`onSettingsSyncResult`) UI 표면화

---

## 사전 조건

- Skyrim SE/AE + SKSE 설치 완료
- Address Library 설치 완료
- Windows + Visual Studio Build Tools 설치 완료
- PrismaUI 설치 완료
- SKSE 로그 확인 가능 (`skse64.log`)

---

## 빌드/배포 준비

자동 실행(권장):

```powershell
pwsh -File .\scripts\verify-runtime-windows.ps1 -CreateLocalPackage
```

수동 실행:

1. 네이티브 빌드

```bash
xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
xmake build
```

2. 프론트 검증

```bash
cd view
npm run lint
npm test -- --run
npm run build
```

3. 로컬 릴리즈 패키지 생성

```powershell
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

4. 배포 산출물 구조 확인

- `dist/SKSE/Plugins/TulliusWidgets.dll`
- `dist/PrismaUI/views/TulliusWidgets/index.html`

---

## 시나리오 체크리스트

### RV-01 부팅/초기화 스모크

절차:

1. 게임 실행 후 세이브 로드
2. 위젯이 정상 렌더링되는지 확인

기대 결과:

- 크래시/프리징 없음
- 위젯/설정 패널 동작 정상

증거:

- `skse64.log`에 플러그인 로드 및 view 초기화 로그

---

### RV-02 settings 저장 성공 ACK

절차:

1. `Insert`로 설정 패널 열기
2. 임의 설정(예: opacity) 변경
3. 1~2초 대기

기대 결과:

- 상단 저장 실패 경고 배너가 나타나지 않음
- `Data/SKSE/Plugins/TulliusWidgets.json` 수정 시간이 갱신됨

증거:

- 파일 timestamp 변경
- `skse64.log`에 settings 저장 실패 로그가 없어야 함

---

### RV-03 settings 저장 실패 ACK(선택, 권장)

주의: 테스트용 프로파일에서만 수행.

절차(예시):

1. `Data/SKSE/Plugins` 쓰기 권한을 임시로 제한
2. 게임에서 설정 값을 변경
3. 테스트 후 권한 복구

기대 결과:

- 상단에 "설정 저장에 실패했습니다. 경로/권한을 확인해 주세요." 배너 노출
- `skse64.log`에 `Failed to save settings from JS listener` 경고

복구:

- 권한 원복 후 동일 설정 변경 시 경고 배너가 사라져야 함

---

### RV-04 stats 하이브리드 동기화 안정성

절차:

1. 전투 진입/이탈 반복
2. 장비 교체 반복
3. 메뉴(인벤토리/맵 등) 열고 닫기 반복
4. `F11`로 전체 표시 토글 반복

기대 결과:

- 스탯이 과도하게 튀거나 과거 값으로 되돌아가지 않음
- 위젯 깜빡임/장시간 멈춤 없음
- 메뉴 복귀 후 강제 동기화가 자연스럽게 반영됨

---

### RV-05 시퀀스 역전 방어(브리지 레벨)

이 항목은 재현성이 높은 브리지 레벨 검증으로 수행.

절차:

1. `view` 개발 서버 실행 후 페이지에서 콘솔 열기
2. 아래 순서로 수동 주입

```js
window.updateStats?.(JSON.stringify({ schemaVersion: 1, seq: 100, playerInfo: { level: 88 } }));
window.updateStats?.(JSON.stringify({ schemaVersion: 1, seq: 99, playerInfo: { level: 1 } }));
```

기대 결과:

- 레벨 표시가 `88` 유지(낮은 `seq` payload 무시)

---

### RV-06 settings revision 역전 방어(브리지 레벨)

절차:

```js
window.updateSettings?.(JSON.stringify({ schemaVersion: 1, rev: 5, general: { opacity: 77 } }));
window.updateSettings?.(JSON.stringify({ schemaVersion: 1, rev: 3, general: { opacity: 22 } }));
```

기대 결과:

- opacity가 `77` 유지(낮은 `rev` payload 무시)

---

## 합격 기준 (Release Gate)

아래를 모두 만족해야 합격:

- `view` lint/test/build 전부 성공
- RV-01 ~ RV-04 수동 런타임 검증 통과
- RV-05, RV-06 브리지 레벨 역전 방어 확인
- 저장 실패 시 경고 배너 노출 및 복구 후 정상 해제 확인

---

## 이슈 템플릿(재현 보고)

- 빌드 SHA/브랜치:
- 런타임(SE/AE 버전, SKSE 버전):
- 시나리오 ID(RV-xx):
- 실제 결과:
- 기대 결과:
- 첨부: `skse64.log`, 스크린샷/짧은 영상
