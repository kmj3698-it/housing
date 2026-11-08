const ages = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90+"];
const colors = age => age < 40 ? "#2b8a6e" : age < 60 ? "#4478d1" : age < 70 ? "#e39a32" : "#ab5a86";
const fmt = n => new Intl.NumberFormat("ko-KR").format(n);
const mapStatus = document.getElementById("mapStatus");

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

const chartRows = (data, max, countMode) => data.map(([label, count, share]) =>
  `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar" style="width:${Math.max(share > 0 ? 1 : 0, share / max * 100)}%"></div></div><span class="value">${countMode ? fmt(count) : share.toFixed(1) + "%"}</span></div>`
).join("");

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSV의 따옴표가 닫히지 않았습니다.");
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some(value => value !== "")) rows.push(row);
  }

  const headers = rows.shift();
  if (!headers) throw new Error("연령 요약 CSV가 비어 있습니다.");
  return rows.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`연령 요약 CSV ${index + 2}행의 열 개수가 올바르지 않습니다.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

async function loadComplexes() {
  const [csvResponse, coordinateResponse] = await Promise.all([
    fetch("../data/resident-age/단지별_거주자연령대_분석.csv"),
    fetch("../data/resident-age/complex-coordinates.json")
  ]);
  if (!csvResponse.ok) throw new Error(`연령 요약 CSV 요청 실패 (${csvResponse.status}).`);
  if (!coordinateResponse.ok) throw new Error(`단지 좌표 요청 실패 (${coordinateResponse.status}).`);

  const [csvText, coordinateRows] = await Promise.all([
    csvResponse.text(),
    coordinateResponse.json()
  ]);
  const coordinatesByCode = new Map(coordinateRows.map(complex => [complex.code, complex]));
  if (coordinatesByCode.size !== coordinateRows.length) {
    throw new Error("단지 좌표 파일에 중복 단지 코드가 있습니다.");
  }

  const summaries = parseCSV(csvText);
  const codes = new Set();
  return summaries.map(row => {
    const code = row["단지코드"];
    if (codes.has(code)) throw new Error(`연령 요약 CSV에 중복 단지 코드가 있습니다: ${code}`);
    codes.add(code);
    const coordinate = coordinatesByCode.get(code);
    if (!coordinate) throw new Error(`좌표 파일에 단지 코드가 없습니다: ${code}`);

    const count = Number(row["동거인원(명)"]);
    const avg = Number(row["평균연령(세)"]);
    const bands = Object.fromEntries(ages.map(age => [age, Number(row[`${age}세_인원`])]));
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(avg) ||
        ages.some(age => !Number.isFinite(bands[age]) || bands[age] < 0)) {
      throw new Error(`연령 요약 CSV의 숫자 값이 올바르지 않습니다: ${code}`);
    }
    const topAge = ages.reduce((top, age) => bands[age] > bands[top] ? age : top, ages[0]);
    return {
      ...coordinate,
      code,
      name: row["단지명"],
      city: row["시군구"],
      count,
      avg,
      topAge,
      topShare: bands[topAge] / count * 100,
      bands
    };
  });
}

function showDetail(complex) {
  const rows = ages.map(age => [age, complex.bands[age], complex.bands[age] / complex.count * 100]);
  document.getElementById("detail").innerHTML =
    `<h2>단지별 연령대</h2><div class="selected-name">${escapeHTML(complex.name)}</div>` +
    `<div class="selected-meta">${escapeHTML(complex.code)} · ${escapeHTML(complex.city)} · 집계 ${fmt(complex.count)}명 · 평균 ${complex.avg.toFixed(1)}세<br>${escapeHTML(complex.address)}</div>` +
    `<div class="chart">${chartRows(rows, 100, false)}</div>`;
}

function renderSummary(complexes) {
  const total = complexes.reduce((sum, complex) => sum + complex.count, 0);
  const weightedMean = complexes.reduce((sum, complex) => sum + complex.avg * complex.count, 0) / total;
  document.getElementById("stats").innerHTML =
    `<div class="stat"><small>단지</small><strong>${fmt(complexes.length)}</strong></div>` +
    `<div class="stat"><small>집계 거주자</small><strong>${fmt(total)}</strong></div>` +
    `<div class="stat"><small>평균 연령</small><strong>${weightedMean.toFixed(1)}세</strong></div>`;
  const totalsByAge = ages.map(age => complexes.reduce((sum, complex) => sum + complex.bands[age], 0));
  document.getElementById("overallChart").innerHTML = chartRows(
    ages.map((age, index) => [age, totalsByAge[index], totalsByAge[index] / total * 100]), 100, true
  );
}

async function loadKakaoMaps(appKey) {
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=clusterer&autoload=false`;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Kakao 지도 SDK를 불러오지 못했습니다."));
    document.head.append(script);
  });
  if (!window.kakao?.maps?.load) throw new Error("Kakao 지도 SDK를 사용할 수 없습니다. JavaScript 키와 Web 도메인 등록을 확인해 주세요.");
  await new Promise(resolve => kakao.maps.load(resolve));
}

function renderMap(complexes) {
  const map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(36.45, 127.75),
    level: 11
  });
  const bounds = new kakao.maps.LatLngBounds();
  const markerByCode = new Map();
  const clusterer = new kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    minLevel: 8,
    calculator: [10, 30, 50],
    styles: [{
      width: "42px",
      height: "42px",
      background: "rgba(68, 120, 209, 0.88)",
      borderRadius: "21px",
      color: "#fff",
      textAlign: "center",
      lineHeight: "42px",
      fontSize: "13px",
      fontWeight: "700"
    }]
  });
  const infoWindow = new kakao.maps.InfoWindow({ removable: true });

  complexes.forEach(complex => {
    const position = new kakao.maps.LatLng(complex.lat, complex.lon);
    const diameter = Math.max(12, Math.min(26, 8 + Math.sqrt(complex.count)));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}"><circle cx="${diameter / 2}" cy="${diameter / 2}" r="${diameter / 2 - 1}" fill="${colors(complex.avg)}" stroke="white" stroke-width="2"/></svg>`;
    const image = new kakao.maps.MarkerImage(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      new kakao.maps.Size(diameter, diameter),
      { offset: new kakao.maps.Point(diameter / 2, diameter / 2) }
    );
    const marker = new kakao.maps.Marker({
      position,
      image,
      title: `${complex.name} · ${fmt(complex.count)}명 · 평균 ${complex.avg.toFixed(1)}세`
    });
    kakao.maps.event.addListener(marker, "click", () => {
      showDetail(complex);
      infoWindow.setContent(
        `<div style="padding:8px 24px 8px 10px;min-width:190px;line-height:1.55">` +
        `<strong>${escapeHTML(complex.name)}</strong><br>${escapeHTML(complex.city)} · ${fmt(complex.count)}명` +
        `<br>평균 ${complex.avg.toFixed(1)}세 · 최다 ${escapeHTML(complex.topAge)} (${complex.topShare.toFixed(1)}%)</div>`
      );
      infoWindow.open(map, marker);
    });
    markerByCode.set(complex.code, marker);
    bounds.extend(position);
  });
  clusterer.addMarkers([...markerByCode.values()]);
  if (complexes.length) map.setBounds(bounds);

  function applyFilters() {
    const query = document.getElementById("search").value.trim().toLocaleLowerCase();
    const age = document.getElementById("ageFilter").value;
    const visible = complexes.filter(complex => {
      const matchesText = !query || `${complex.name} ${complex.code} ${complex.city}`.toLocaleLowerCase().includes(query);
      return matchesText && (!age || complex.topAge === age);
    });
    clusterer.clear();
    clusterer.addMarkers(visible.map(complex => markerByCode.get(complex.code)));
    if (visible.length === 1) {
      map.setLevel(3);
      map.panTo(markerByCode.get(visible[0].code).getPosition());
    } else if (!query && !age && complexes.length) {
      map.setBounds(bounds);
    }
  }
  document.getElementById("search").addEventListener("input", applyFilters);
  document.getElementById("ageFilter").addEventListener("change", applyFilters);
}

async function initializeDashboard() {
  let summaryLoaded = false;
  try {
    const complexes = await loadComplexes();
    if (complexes.length === 0) throw new Error("표시할 단지 데이터가 없습니다.");
    renderSummary(complexes);
    summaryLoaded = true;

    const configResponse = await fetch("./kakao-config.json");
    if (!configResponse.ok) {
      if (configResponse.status === 404) {
        throw new Error("web/kakao-config.example.json을 복사해 web/kakao-config.json을 만들고 Kakao JavaScript 키를 입력해 주세요.");
      }
      throw new Error(`Kakao 설정 파일 요청 실패 (${configResponse.status}).`);
    }
    const config = await configResponse.json();
    if (!config.javascriptKey || config.javascriptKey === "YOUR_KAKAO_JAVASCRIPT_KEY") {
      throw new Error("web/kakao-config.json에 Kakao JavaScript 키를 입력해 주세요.");
    }

    await loadKakaoMaps(config.javascriptKey);
    renderMap(complexes);
    mapStatus.remove();
  } catch (error) {
    mapStatus.textContent = `${summaryLoaded ? "지도 연결" : "대시보드"} 실패: ${error.message}`;
    mapStatus.style.color = "#a33";
  }
}

initializeDashboard();
