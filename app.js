const KAKAO_JAVASCRIPT_KEY = "41d96178231fd72f57df81ef7c2af5d5";
const AGE_LABELS = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+"];
const REGION_COORDINATES = {
  "경기도|과천시": [37.4292, 126.9876],
  "경기도|광명시": [37.4786, 126.8644],
  "경기도|군포시": [37.3617, 126.9352],
  "경기도|성남시 분당구": [37.3827, 127.1189],
  "경기도|성남시 수정구": [37.4503, 127.1455],
  "경기도|성남시 중원구": [37.4325, 127.1377],
  "경기도|수원시 권선구": [37.257, 126.971],
  "경기도|수원시 영통구": [37.259, 127.057],
  "경기도|수원시 장안구": [37.303, 127.01],
  "경기도|수원시 팔달구": [37.28, 127.019],
  "경기도|시흥시": [37.38, 126.803],
  "경기도|안산시 단원구": [37.321, 126.815],
  "경기도|안산시 상록구": [37.316, 126.846],
  "경기도|안성시": [37.008, 127.279],
  "경기도|안양시 동안구": [37.392, 126.951],
  "경기도|안양시 만안구": [37.396, 126.911],
  "경기도|여주시": [37.298, 127.637],
  "경기도|오산시": [37.149, 127.077],
  "경기도|용인시 기흥구": [37.275, 127.115],
  "경기도|용인시 수지구": [37.322, 127.096],
  "경기도|용인시 처인구": [37.234, 127.201],
  "경기도|의왕시": [37.345, 126.968],
  "경기도|이천시": [37.272, 127.435],
  "경기도|평택시": [36.992, 127.112],
  "경기도|화성시": [37.199, 126.831],
  "서울특별시|금천구": [37.456, 126.895],
};

const elements = {
  totalComplexes: document.querySelector("#total-complexes"),
  districtCount: document.querySelector("#district-count"),
  totalResidents: document.querySelector("#total-residents"),
  seniorShare: document.querySelector("#senior-share"),
  seniorCount: document.querySelector("#senior-count"),
  largestAgeGroup: document.querySelector("#largest-age-group"),
  largestAgeShare: document.querySelector("#largest-age-share"),
  snapshotLabel: document.querySelector("#snapshot-label"),
  mapMessage: document.querySelector("#map-message"),
  complexList: document.querySelector("#complex-list"),
  listTitle: document.querySelector("#list-title"),
  listCount: document.querySelector("#list-count"),
  detailTitle: document.querySelector("#detail-title"),
  detailRegion: document.querySelector("#detail-region"),
  detailContent: document.querySelector("#detail-content"),
  search: document.querySelector("#complex-search"),
  sort: document.querySelector("#sort-select"),
};

let complexes = [];
let selectedComplexCode = null;
let selectedRegionKey = null;
let map;
let regionOverlays = [];
let numberFormatter = new Intl.NumberFormat("ko-KR");

function regionKey(complex) {
  if (!complex.province || !complex.district) return null;
  return `${complex.province}|${complex.district}`;
}

function sumAges(complex) {
  return AGE_LABELS.reduce((sum, label) => sum + (complex.ages[label] || 0), 0);
}

function seniorCount(complex) {
  return (complex.ages["60-69"] || 0) + (complex.ages["70+"] || 0);
}

function percent(part, whole) {
  return whole ? `${Math.round((part / whole) * 1000) / 10}%` : "0%";
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function renderMetrics() {
  const total = complexes.reduce((sum, complex) => sum + sumAges(complex), 0);
  const seniors = complexes.reduce((sum, complex) => sum + seniorCount(complex), 0);
  const districtTotal = new Set(complexes.map(regionKey).filter(Boolean)).size;
  const ageTotals = Object.fromEntries(AGE_LABELS.map((label) => [label, 0]));

  for (const complex of complexes) {
    for (const label of AGE_LABELS) {
      ageTotals[label] += complex.ages[label] || 0;
    }
  }

  const largest = AGE_LABELS.reduce((best, label) =>
    ageTotals[label] > ageTotals[best] ? label : best, AGE_LABELS[0]);

  elements.totalComplexes.textContent = formatNumber(complexes.length);
  elements.districtCount.textContent = formatNumber(districtTotal);
  elements.totalResidents.textContent = formatNumber(total);
  elements.seniorShare.textContent = percent(seniors, total);
  elements.seniorCount.textContent = formatNumber(seniors);
  elements.largestAgeGroup.textContent = `${largest}세`;
  elements.largestAgeShare.textContent = percent(ageTotals[largest], total);
}

function renderDetail(complex) {
  if (!complex) {
    elements.detailTitle.textContent = "단지를 선택하세요";
    elements.detailRegion.textContent = selectedRegionKey ? selectedRegionKey.split("|")[1] : "전체";
    elements.detailContent.innerHTML = '<div class="empty-detail"><span class="empty-icon" aria-hidden="true">⌂</span><p>지도 마커를 누르거나<br>아래 목록에서 단지를 선택하세요.</p></div>';
    return;
  }

  const total = sumAges(complex);
  const seniors = seniorCount(complex);
  const maximum = Math.max(1, ...AGE_LABELS.map((label) => complex.ages[label] || 0));
  elements.detailTitle.textContent = complex.name || "이름 없는 단지";
  elements.detailRegion.textContent = `${complex.province} ${complex.district}`;

  const rows = AGE_LABELS.map((label) => {
    const count = complex.ages[label] || 0;
    const width = Math.max(count > 0 ? 1 : 0, (count / maximum) * 100);
    return `<div class="age-row"><span class="age-label">${label}세</span><div class="age-track"><div class="age-fill" style="width:${width}%"></div></div><span class="age-value">${formatNumber(count)}명</span></div>`;
  }).join("");

  elements.detailContent.innerHTML = `
    <div class="selected-summary">
      <span class="selected-total"><strong>${formatNumber(total)}</strong>명</span>
      <span class="selected-senior">60세 이상 <strong>${formatNumber(seniors)}명 · ${percent(seniors, total)}</strong></span>
    </div>
    <div class="age-bars">${rows}</div>
  `;
}

function filteredComplexes() {
  const query = elements.search.value.trim().toLocaleLowerCase("ko-KR");
  let visible = complexes.filter((complex) => {
    const matchesRegion = !selectedRegionKey || regionKey(complex) === selectedRegionKey;
    const matchesQuery = !query || `${complex.name} ${complex.province} ${complex.district}`.toLocaleLowerCase("ko-KR").includes(query);
    return matchesRegion && matchesQuery;
  });

  if (elements.sort.value === "residents") {
    visible = [...visible].sort((a, b) => sumAges(b) - sumAges(a));
  } else if (elements.sort.value === "senior") {
    visible = [...visible].sort((a, b) => {
      const aTotal = sumAges(a);
      const bTotal = sumAges(b);
      return (bTotal ? seniorCount(b) / bTotal : 0) - (aTotal ? seniorCount(a) / aTotal : 0);
    });
  } else {
    visible = [...visible].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  return visible;
}

function renderList() {
  const visible = filteredComplexes();
  elements.listTitle.textContent = selectedRegionKey ? selectedRegionKey.split("|")[1] : "단지 목록";
  elements.listCount.textContent = `${formatNumber(visible.length)}개 단지`;
  if (selectedRegionKey) {
    const total = visible.reduce((sum, complex) => sum + sumAges(complex), 0);
    elements.detailRegion.textContent = `${selectedRegionKey.split("|")[1]} · ${formatNumber(total)}명`;
  }

  if (!visible.length) {
    elements.complexList.innerHTML = '<div class="no-results">조건에 맞는 단지가 없습니다.</div>';
    return;
  }

  elements.complexList.innerHTML = visible.map((complex) => {
    const selected = complex.code === selectedComplexCode ? " selected" : "";
    return `<button class="complex-row${selected}" type="button" role="listitem" data-code="${escapeAttribute(complex.code)}"><span class="row-indicator"></span><span class="complex-name" title="${escapeAttribute(complex.name)}">${escapeHTML(complex.name)}</span><span class="complex-residents">${formatNumber(sumAges(complex))}명</span></button>`;
  }).join("");

  for (const button of elements.complexList.querySelectorAll("[data-code]")) {
    button.addEventListener("click", () => selectComplex(button.dataset.code));
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function selectComplex(code) {
  const complex = complexes.find((item) => item.code === code);
  if (!complex) return;
  selectedComplexCode = code;
  selectedRegionKey = regionKey(complex);
  renderDetail(complex);
  renderList();
  updateOverlayStyles();
  const point = REGION_COORDINATES[selectedRegionKey];
  if (point && map) {
    map.panTo(new kakao.maps.LatLng(point[0], point[1]));
  }
}

function selectRegion(key) {
  selectedRegionKey = selectedRegionKey === key ? null : key;
  const visible = filteredComplexes();
  selectedComplexCode = visible[0]?.code || null;
  renderDetail(complexes.find((complex) => complex.code === selectedComplexCode));
  renderList();
  updateOverlayStyles();
}

function updateOverlayStyles() {
  for (const overlay of regionOverlays) {
    const button = overlay.element;
    if (!button) continue;
    button.classList.toggle("selected", button.dataset.region === selectedRegionKey);
  }
}

function renderMap() {
  const mapElement = document.querySelector("#map");
  map = new kakao.maps.Map(mapElement, {
    center: new kakao.maps.LatLng(37.32, 127.06),
    level: 8,
  });

  const regions = new Map();
  for (const complex of complexes) {
    const key = regionKey(complex);
    const point = REGION_COORDINATES[key];
    if (!point) continue;
    if (!regions.has(key)) {
      regions.set(key, { key, province: complex.province, district: complex.district, complexes: [] });
    }
    regions.get(key).complexes.push(complex);
  }

  const bounds = new kakao.maps.LatLngBounds();
  for (const region of regions.values()) {
    const [lat, lng] = REGION_COORDINATES[region.key];
    const position = new kakao.maps.LatLng(lat, lng);
    bounds.extend(position);
    const button = document.createElement("button");
    button.className = "kakao-region-marker";
    button.type = "button";
    button.dataset.region = region.key;
    button.innerHTML = `<strong>${escapeHTML(region.district.replace(/시|구$/, ""))}</strong><span>${region.complexes.length}</span>`;
    button.title = `${region.province} ${region.district} · ${region.complexes.length}개 단지`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      selectRegion(region.key);
    });
    const overlay = new kakao.maps.CustomOverlay({
      map,
      position,
      content: button,
      yAnchor: 1,
      clickable: true,
    });
    regionOverlays.push({ overlay, element: button });
  }

  if (!bounds.isEmpty()) {
    map.setBounds(bounds, 55, 55, 55, 55);
  }
  window.setTimeout(() => map.relayout(), 0);
  elements.mapMessage.classList.add("hidden");
}

function showMapError(message) {
  elements.mapMessage.classList.remove("hidden");
  elements.mapMessage.classList.add("error");
  elements.mapMessage.textContent = message;
}

function loadKakaoMap() {
  const script = document.createElement("script");
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JAVASCRIPT_KEY)}`;
  script.async = true;
  script.onload = () => {
    if (!window.kakao?.maps) {
      showMapError("카카오맵 SDK를 사용할 수 없습니다. Kakao Developers의 JavaScript 도메인 설정을 확인해 주세요.");
      return;
    }
    kakao.maps.load(renderMap);
  };
  script.onerror = () => showMapError("카카오맵을 불러오지 못했습니다. 인터넷 연결과 Kakao Developers 도메인 설정을 확인해 주세요.");
  document.head.appendChild(script);
}

async function loadData() {
  const response = await fetch("./data/age-summary.json");
  if (!response.ok) {
    throw new Error(`집계 데이터를 불러오지 못했습니다 (${response.status}).`);
  }
  const data = await response.json();
  if (!Array.isArray(data.complexes) || !data.complexes.length) {
    throw new Error("집계 데이터에 표시할 단지가 없습니다.");
  }
  complexes = data.complexes;
  elements.snapshotLabel.textContent = `${data.snapshot.slice(0, 4)}년 ${Number(data.snapshot.slice(5, 7))}월 기준`;
  renderMetrics();
  renderDetail(null);
  renderList();
}

elements.search.addEventListener("input", renderList);
elements.sort.addEventListener("change", renderList);
document.querySelector("#reset-map").addEventListener("click", () => {
  selectedRegionKey = null;
  selectedComplexCode = null;
  renderDetail(null);
  renderList();
  updateOverlayStyles();
  if (map) map.setBounds(getMapBounds(), 55, 55, 55, 55);
});

function getMapBounds() {
  const bounds = new kakao.maps.LatLngBounds();
  for (const complex of complexes) {
    const point = REGION_COORDINATES[regionKey(complex)];
    if (point) bounds.extend(new kakao.maps.LatLng(point[0], point[1]));
  }
  return bounds;
}

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.search.focus();
  }
});

loadData()
  .then(loadKakaoMap)
  .catch((error) => {
    elements.mapMessage.classList.add("error");
    elements.mapMessage.textContent = error.message;
    elements.listCount.textContent = "데이터 오류";
  });
