# 주택단지 입주민 연령대 대시보드

2025년 10월 현황 CSV를 단지별 연령 구간으로 집계한 대시보드입니다. 개별 입주민의 이름이나 주소는 집계 데이터에 포함되지 않습니다.

## 실행

PowerShell에서 저장소 폴더로 이동한 뒤 다음을 실행합니다. 실행 정책이 스크립트를 차단하는 Windows 환경에서는 두 번째 명령을 사용하세요.

```powershell
.\serve.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
```

브라우저에서 `http://localhost:8080/`을 엽니다. 지도는 별도 API 키가 필요 없는 OpenStreetMap 타일을 Leaflet으로 표시합니다. Leaflet CDN이나 지도 타일 연결에 실패하면 외부 서비스 없이 표시되는 오프라인 위치도로 자동 전환됩니다. 서버를 종료하려면 실행 중인 PowerShell 창에서 `Ctrl+C`를 누릅니다.

## 지도 위치 안내

원본 CSV에 위도·경도 좌표가 없어 단지 마커는 해당 시·군·구의 중심 참고 위치로 표시합니다. 지도는 OpenStreetMap 타일을 사용하고 연결할 수 없으면 로컬 SVG 위치도를 표시합니다. 단지 주소는 외부 지오코딩 서비스로 전송하지 않습니다.

## 집계 기준

- 연령은 CSV의 `세대원나이`를 사용하고, 10세 단위로 집계합니다. 70세 이상은 하나의 구간입니다.
- `data/age-summary.json`에는 단지 코드·단지명·행정구역과 연령 구간별 합계만 저장합니다.
