# Housing

## 단지별 거주자 연령 분포 지도

`web/단지별_연령대_지도.html`에서 단지별 지도, 연령대 차트, 단지명·코드 검색 및 최다 연령대 필터를 제공합니다. 화면은 `data/resident-age/`의 단지별 요약 CSV와 좌표 JSON을 사용합니다. 원본 개인 단위 CSV는 저장소에 포함하지 않습니다.

### 실행

1. 저장소 루트에서 `Copy-Item web/kakao-config.example.json web/kakao-config.json`을 실행하고, 새 파일에 발급받은 Kakao JavaScript 키를 입력합니다.
2. 저장소 루트에서 정적 HTTP 서버를 실행합니다. Windows에 Python이 설치되어 있다면 `py -m http.server 8765`를 사용할 수 있습니다.
3. 브라우저에서 `http://127.0.0.1:8765/web/단지별_연령대_지도.html`을 엽니다.

### Kakao 지도 키와 도메인

`web/kakao-config.json`은 로컬 설정 파일이며 Git에 추가하지 않습니다. Kakao JavaScript 키는 브라우저에 전달되는 공개 클라이언트 키이지 비밀번호가 아닙니다. 키를 비밀로 취급하지 말고, Kakao Developers의 앱 설정에서 JavaScript 키 사용을 활성화하고 **플랫폼 > Web > 사이트 도메인**에 실제 서비스 도메인을 등록하세요. 로컬 실행 시에는 `http://127.0.0.1:8765`를 등록해야 합니다. 배포 환경에서는 사용하는 HTTPS 도메인을 정확히 등록하고, 키를 서버 전용 REST API 키로 대체하지 마세요.

데이터는 2025년 10월 기준 동거 거주자 집계입니다. 지도 좌표는 주소 매칭 결과로 건물 입구와 다를 수 있으며, 단지 단위 집계이므로 작은 단지의 비율은 변동성이 클 수 있습니다.
