/* eslint-disable no-unused-vars */
import Header from "../components/header";
import { useState, useEffect, useRef, useMemo } from "react";
import "./CourseDetail.css";
import { useLocation, useParams } from "react-router-dom";
import regionImg from "/images/BgImg2.webp";
import placeIcon from "/images/placeIcon.png";
import axios from "axios";

/* ================== odcloud(어촌) 데이터 유틸 ================== */
const API1 =
  "https://api.odcloud.kr/api/15120316/v1/uddi:10b94f1d-182b-47a2-9e0e-b83eb87b9211";
const API1_KEY = import.meta.env.VITE_API1_KEY;

async function fetchAllOdcloud({ url, key }) {
  const res = await axios.get(url, {
    params: { page: 1, perPage: 5000, returnType: "JSON" },
    headers: { Authorization: `Infuser ${key}` },
  });
  return res.data?.data || [];
}

function getCategory(row) {
  const keys = [
    "관광지분류",
    "카테고리",
    "분류",
    "업종",
    "유형",
    "서비스유형",
    "테마",
  ];
  for (const k of keys) if (row[k]) return row[k];
  return "기타";
}

const EXCLUDE_KEYWORDS = [
  "펜션","모텔","게스트하우스","영업소","사무소","수련원","크루즈","레저",
  "기념관","미술관","전시관","터미널","주식회사","(주)","고속㈜","사업소",
  "매표소","유람선","동부연맹","휴게소","케이블카","박물관","리조트","호텔","HOTEL",
];
function excludeByKeywords(row) {
  const text = Object.values(row).join(" ");
  return !EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));
}
function extractRegion(addr = "") {
  const parts = String(addr).trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`; // 전라남도 여수시
  return addr;
}

function makePlansByRegion_OD(data) {
  const groupedByRegion = {};
  data.forEach((row) => {
    const addr =
      row["주소"] || row["소재지주소"] || row["소재지도로명주소"] || "";
    if (!addr.includes("전라남도")) return; // 전남만
    if (!excludeByKeywords(row)) return;
    const region = extractRegion(addr);
    const cat = getCategory(row);
    if (!groupedByRegion[region])
      groupedByRegion[region] = { 관광지: [], 음식점: [], 체험: [], 숙소: [] };

    if (cat.includes("관광")) groupedByRegion[region].관광지.push(row);
    else if (cat.includes("음식") || cat.includes("식당"))
      groupedByRegion[region].음식점.push(row);
    else if (cat.includes("체험")) groupedByRegion[region].체험.push(row);
    else if (cat.includes("숙박") || cat.includes("숙소"))
      groupedByRegion[region].숙소.push(row);
  });

  const plans = {};
  Object.entries(groupedByRegion).forEach(([region, cats]) => {
    plans[region] = {};

    // 당일치기
    if (cats.관광지.length >= 1 && cats.음식점.length >= 1 && cats.체험.length >= 1) {
      plans[region].daytrip = {
        관광지: cats.관광지[0],
        음식점: cats.음식점[0],
        체험: cats.체험[0],
      };
    }
    // 1박2일
    if (
      cats.관광지.length >= 2 &&
      cats.음식점.length >= 2 &&
      cats.체험.length >= 2 &&
      cats.숙소.length >= 1
    ) {
      plans[region].oneday = [
        { day: 1, 관광지: cats.관광지[0], 음식점: cats.음식점[0], 체험: cats.체험[0], 숙소: cats.숙소[0] },
        { day: 2, 관광지: cats.관광지[1], 음식점: cats.음식점[1], 체험: cats.체험[1] },
      ];
    }
    // 2박3일
    if (cats.관광지.length + cats.체험.length >= 2 && cats.음식점.length >= 2 && cats.숙소.length >= 2) {
      plans[region].twoday = [1, 2, 3].map((d, idx) => {
        const poi = cats.관광지[idx] || cats.체험[idx] || cats.관광지[0] || cats.체험[0];
        return { day: d, 장소: poi, 음식점: cats.음식점[idx] || cats.음식점[0], ...(d < 3 ? { 숙소: cats.숙소[idx] || cats.숙소[0] } : {}) };
      });
    }
    // 3박4일
    if (cats.관광지.length + cats.체험.length >= 3 && cats.음식점.length >= 3 && cats.숙소.length >= 3) {
      plans[region].threeday = [1, 2, 3, 4].map((d, idx) => {
        const poi = cats.관광지[idx] || cats.체험[idx] || cats.관광지[0] || cats.체험[0];
        return { day: d, 장소: poi, 음식점: cats.음식점[idx] || cats.음식점[0], ...(d < 4 ? { 숙소: cats.숙소[idx] || cats.숙소[0] } : {}) };
      });
    }
  });

  return plans;
}

const PERIOD_KEY_MAP = {
  당일치기: "daytrip",
  "1박 2일": "oneday",
  "1박2일": "oneday",
  "2박 3일": "twoday",
  "2박3일": "twoday",
  "3박 4일": "threeday",
  "3박4일": "threeday",
};

/* ================== TourAPI(전남 38) 소스 & 이미지 인덱스 ================== */
const TOUR_API_KEY = import.meta.env.VITE_TOURAPI_KEY;
function baseParams(extra = {}) {
  return { serviceKey: TOUR_API_KEY, MobileOS: "ETC", MobileApp: "Chonsre", _type: "json", ...extra };
}
async function fetchNatureSights({ pageNo = 1, numOfRows = 120 }) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2",
    { params: baseParams({ contentTypeId: 12, areaCode: 38, pageNo, numOfRows }) });
  return r?.data?.response?.body?.items?.item || [];
}
async function fetchFoodPlaces({ pageNo = 1, numOfRows = 120 }) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2",
    { params: baseParams({ contentTypeId: 39, areaCode: 38, pageNo, numOfRows }) });
  return r?.data?.response?.body?.items?.item || [];
}
async function fetchAccommodations({ pageNo = 1, numOfRows = 120 }) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2",
    { params: baseParams({ contentTypeId: 32, areaCode: 38, pageNo, numOfRows }) });
  let items = r?.data?.response?.body?.items?.item || [];
  const BAD = ["모텔","호텔","리조트","호스텔","풀빌라","게스트","펜션","라마다"];
  items = items.filter((it) => !BAD.some(kw => (it.title||"").includes(kw) || (it.addr1||"").includes(kw)));
  return items;
}
function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[[(].*?[\])]/g, "")
    .replace(/[^\p{Letter}\p{Number}]/gu, "");
}
function buildImageIndex(nList = [], fList = [], sList = []) {
  const idx = { byTitle: new Map(), byTitleN: new Map(), byTitleF: new Map(), byTitleS: new Map(), byAddr: new Map() };
  for (const it of nList) {
    if (it.firstimage) { idx.byTitle.set(normalize(it.title), it.firstimage); idx.byTitleN.set(normalize(it.title), it.firstimage); }
    if (it.addr1 && it.firstimage) idx.byAddr.set(normalize(it.addr1), it.firstimage);
  }
  for (const it of fList) {
    if (it.firstimage) { idx.byTitle.set(normalize(it.title), it.firstimage); idx.byTitleF.set(normalize(it.title), it.firstimage); }
    if (it.addr1 && it.firstimage) idx.byAddr.set(normalize(it.addr1), it.firstimage);
  }
  for (const it of sList) {
    if (it.firstimage) { idx.byTitle.set(normalize(it.title), it.firstimage); idx.byTitleS.set(normalize(it.title), it.firstimage); }
    if (it.addr1 && it.firstimage) idx.byAddr.set(normalize(it.addr1), it.firstimage);
  }
  return idx;
}
function getTourImageFor(item, idx) {
  if (!item) return null;
  const keyT = normalize(item.title);
  const keyA = normalize(item.address);
  const catMap = item.category === "음식점" ? idx.byTitleF : item.category === "숙소" ? idx.byTitleS : idx.byTitleN;
  if (catMap.has(keyT)) return catMap.get(keyT);
  if (idx.byTitle.has(keyT)) return idx.byTitle.get(keyT);
  if (keyA && idx.byAddr.has(keyA)) return idx.byAddr.get(keyA);
  for (const [t, url] of catMap) if (t.includes(keyT) || keyT.includes(t)) return url;
  for (const [t, url] of idx.byTitle) if (t.includes(keyT) || keyT.includes(t)) return url;
  if (keyA) { for (const [a, url] of idx.byAddr) if (a.includes(keyA) || keyA.includes(a)) return url; }
  return null;
}

/* ========= TourAPI 코스 빌드(그외): 관광지1→음식점→관광지2→(숙소) ========= */
function extractRegionFromTour(addr1 = "") {
  const parts = String(addr1).trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : (addr1 || "");
}
function makePlansByRegion_TOUR({ natureItems = [], foodItems = [], stayItems = [] }) {
  const grouped = {};
  for (const it of natureItems) {
    const region = extractRegionFromTour(it.addr1);
    if (!region.startsWith("전라남도")) continue;
    (grouped[region] ??= { 관광지: [], 음식점: [], 숙소: [] }).관광지.push(it);
  }
  for (const it of foodItems) {
    const region = extractRegionFromTour(it.addr1);
    if (!region.startsWith("전라남도")) continue;
    (grouped[region] ??= { 관광지: [], 음식점: [], 숙소: [] }).음식점.push(it);
  }
  for (const it of stayItems) {
    const region = extractRegionFromTour(it.addr1);
    if (!region.startsWith("전라남도")) continue;
    (grouped[region] ??= { 관광지: [], 음식점: [], 숙소: [] }).숙소.push(it);
  }

  const plans = {};
  Object.entries(grouped).forEach(([region, cats]) => {
    const N = cats.관광지.length, F = cats.음식점.length, S = cats.숙소.length;
    plans[region] = {};
    if (N >= 2 && F >= 1) {
      plans[region].daytrip = { 관광지1: cats.관광지[0], 음식점: cats.음식점[0], 관광지2: cats.관광지[1] };
    }
    if (N >= 4 && F >= 2 && S >= 1) {
      plans[region].oneday = [
        { day: 1, 관광지1: cats.관광지[0], 음식점: cats.음식점[0], 관광지2: cats.관광지[1], 숙소: cats.숙소[0] },
        { day: 2, 관광지1: cats.관광지[2], 음식점: cats.음식점[1], 관광지2: cats.관광지[3] },
      ];
    }
    if (N >= 6 && F >= 3 && S >= 2) {
      plans[region].twoday = [0,1,2].map((d) => ({
        day: d + 1, 관광지1: cats.관광지[2*d], 음식점: cats.음식점[d], 관광지2: cats.관광지[2*d + 1],
        ...(d < 2 ? { 숙소: cats.숙소[d] } : {}),
      }));
    }
    if (N >= 8 && F >= 4 && S >= 3) {
      plans[region].threeday = [0,1,2,3].map((d) => ({
        day: d + 1, 관광지1: cats.관광지[2*d], 음식점: cats.음식점[d], 관광지2: cats.관광지[2*d + 1],
        ...(d < 3 ? { 숙소: cats.숙소[d] } : {}),
      }));
    }
  });

  return plans;
}

/* ===== 지역 대표 이미지 선택 (TourAPI에서 지역 단위로 firstimage 선택) ===== */
function pickRegionImage(region, nList = [], fList = [], sList = []) {
  const finder = (list) =>
    list?.find?.((it) => extractRegionFromTour(it.addr1) === region && it.firstimage)?.firstimage;
  return finder(nList) || finder(fList) || finder(sList) || null;
}

/* ================== 농촌(스마트주) 유틸 ================== */
async function fetchRuralJeonnam() {
  const r = await axios.get("https://smartzoo.shop/api/jeonnam/json");
  return Array.isArray(r.data) ? r.data : [];
}
function regionFromRural(row) {
  const sigun = (row?.["시군"] || "").trim();
  return sigun ? `전라남도 ${sigun}` : "";
}
function groupTourByRegion(list = []) {
  const grouped = {};
  for (const it of list) {
    const region = extractRegionFromTour(it.addr1 || "");
    if (!region.startsWith("전라남도")) continue;
    (grouped[region] ??= []).push(it);
  }
  return grouped;
}
/** 농촌 rows(체험만) + TourAPI(음식/숙소) → 지역별 코스.
 * 규칙: 하루에 [체험1, 음식점1, 숙박1] 정확히 3개. */
function makePlansByRegion_RURAL(rows = [], foodByRegion = {}, stayByRegion = {}) {
  const onlyRural = rows.filter((r) => r?.["구분"] === "농촌" && regionFromRural(r));
  const grouped = {};
  for (const r of onlyRural) {
    const region = regionFromRural(r);
    (grouped[region] ??= []).push(r);
  }
  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => (a["장소명"]||"").localeCompare(b["장소명"]||""))
  );

  const plans = {};
  const periods = { daytrip: 1, oneday: 2, twoday: 3, threeday: 4 };

  Object.entries(grouped).forEach(([region, experiences]) => {
    const foods = foodByRegion[region] || [];
    const stays = stayByRegion[region] || [];
    const toExp = (row) => ({
      title: row?.["체험프로그램"] || row?.["장소명"] || "",
      address: row?.["주소"] || "",
      category: "체험",
    });
    const toFood = (it)  => ({ title: it?.title || "", address: it?.addr1 || "", category: "음식점" });
    const toStay = (it)  => ({ title: it?.title || "", address: it?.addr1 || "", category: "숙소" });

    plans[region] = {};
    for (const [key, daysNeeded] of Object.entries(periods)) {
      if (experiences.length >= daysNeeded && foods.length >= 1 && stays.length >= 1) {
        if (daysNeeded === 1) {
          plans[region].daytrip = {
            체험: toExp(experiences[0]),
            음식점: toFood(foods[0]),
            숙소: toStay(stays[0]),
          };
        } else {
          plans[region][key] = Array.from({ length: daysNeeded }, (_, d) => ({
            day: d + 1,
            체험: toExp(experiences[d]),
            음식점: toFood(foods[d % foods.length]),
            숙소: toStay(stays[d % stays.length]),
          })); 
        }
      }
    }
  });
  return plans;
}

/* ================== 상세 페이지 ================== */
export default function CourseDetail() {
  const location = useLocation();
  const { id } = useParams();           // /CourseDetail/:id
  const isOther = /^other-/.test(id || "");
  const isRural = /^rural-/.test(id || "");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [courseInfo, setCourseInfo] = useState({ period: "", region: "" });

  // 일정(일차별 아이템들)
  const [days, setDays] = useState([]); // [ [{title, address, category}], ... ]
  const [selectedDay, setSelectedDay] = useState(1); // 1-based
  const [selectedIdx, setSelectedIdx] = useState(0);

  // 메인 히어로 이미지 (기본값: regionImg)
  const [heroImg, setHeroImg] = useState(regionImg);

  // TourAPI 소스(이미지 매칭/그외 코스 빌드용)
  const [tourNature, setTourNature] = useState([]);
  const [tourFood, setTourFood] = useState([]);
  const [tourStay, setTourStay] = useState([]);
  const [imgIndex, setImgIndex] = useState(null);

  // 지도
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef([]);
  const cachedRowsRef = useRef(null); // 어촌 원천 캐시
  const placesRef = useRef(null);
  const ruralRowsRef = useRef(null);  // 농촌 원천 캐시

  // === 저장 진행 상태 ===
  const [saving, setSaving] = useState(false);

// ===== GPT 설명 생성 상태 =====
const OPENAI_KEY = import.meta.env.VITE_GPT_KEY;

const [placeDescs, setPlaceDescs] = useState({});
const [descLoadingKey, setDescLoadingKey] = useState(null);
const abortRef = useRef(null);

// 현재 선택된 장소
const currentPlace = useMemo(() => {
  return days?.[selectedDay - 1]?.[selectedIdx] || null;
}, [days, selectedDay, selectedIdx]);

const placeKeyOf = (it) => {
  const t = (it?.title || "").trim();
  const a = (it?.address || "").trim();
  return `${t}__${a}`;
};

const endsWithIda = (s) => /이다\.$/.test(s.trim());
const forceIdaEnding = (s) => {
  let x = s.trim().replace(/\s+/g, " ");
  if (!endsWithIda(x)) {
    x = x.replace(/([.!?]|입니다\.|죠\.|에요\.|예요\.)\s*$/u, "이다.");
    if (!endsWithIda(x)) x = (x.replace(/[.!?]?\s*$/u, "") + "이다.").trim();
  }
  return x;
};

const clampLength = (raw) => {
  return raw
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
};

async function generatePlaceDescription(it, region) {
  if (!OPENAI_KEY || !it?.title) return "";

  const title = (it.title || "").trim();
  const address = (it.address || "").trim();
  const category = (it.category || "").trim();

  if (abortRef.current) abortRef.current.abort();
  const ctrl = new AbortController();
  abortRef.current = ctrl;

  const system =
    "너는 한국 관광 전문 큐레이터이다. 답변은 반드시 한국어로 하고, 모든 문장을 '~다.' 체로 끝내라. 사실과 다른 정보나 과장 금지. 실제로 해당 장소의 핵심 정보를 구조적으로 설명하라. 설명은 한 단락만 출력하고 공백 포함 450~500자로 제한하라. 스타일: 간결·객관·정보지향. 존댓말 금지. 감탄사 금지.";


  const user = [
    `장소명: ${title}`,
    address ? `주소: ${address}` : "",
    region ? `지역 힌트: ${region}` : "",
    category ? `분류: ${category}` : "",
    "",
    "반드시 단락 1개, 공백 포함 450~500자, 모든 문장 어미는 '~다.'로 작성하라.",
    "포함 요소 예시: 대표 볼거리/특징, 자연·문화·역사적 맥락, 접근성(대략), 이용 포인트·주요 동선, 계절 포인트(있다면).",
  ].join("\n");

  

  try {
    setDescLoadingKey(placeKeyOf(it));
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      console.error("OpenAI API error:", await res.text());
      return "";
    }
    const json = await res.json();
    let text = (json?.choices?.[0]?.message?.content || "").trim();
    if (!text) return "";

    text = clampLength(text);
    setPlaceDescs((prev) => ({ ...prev, [placeKeyOf(it)]: text }));
    return text;
  } catch (e) {
    if (e?.name !== "AbortError") console.error(e);
    return "";
  } finally {
    setDescLoadingKey(null);
  }
}

// 선택 변경 시 자동 생성/로딩
useEffect(() => {
  const it = currentPlace;
  if (!it) return;
  const key = placeKeyOf(it);
  if (placeDescs[key]) return;
  generatePlaceDescription(it, courseInfo.region);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentPlace]);


  // 일수 계산
  function daysFromPeriod(period = "") {
    const s = String(period).trim();
    if (!s) return 1;
    if (/당일/.test(s)) return 1;
    const m = s.match(/(\d+)\s*박\s*(\d+)\s*일/);
    if (m) return Math.max(1, parseInt(m[2], 10));
    const m2 = s.match(/(\d+)\s*일/);
    if (m2) return Math.max(1, parseInt(m2[1], 10));
    return 1;
  }

  // === 날짜 정규화(YYYY-MM-DD) ===
  function normalizeDateInput(s) {
    if (!s) return "";
    const digits = String(s).replace(/[^\d]/g, "");
    let y, m, d;

    if (digits.length === 8) {
      y = digits.slice(0, 4); m = digits.slice(4, 6); d = digits.slice(6, 8);
    } else if (digits.length === 6) {
      y = "20" + digits.slice(0, 2); m = digits.slice(2, 4); d = digits.slice(4, 6);
    } else {
      const m2 = String(s).match(/(\d{2,4}).*?(\d{1,2}).*?(\d{1,2})/);
      if (!m2) return "";
      y = m2[1].length === 2 ? "20" + m2[1] : m2[1];
      m = m2[2].padStart(2, "0");
      d = m2[3].padStart(2, "0");
    }
    return `${y}-${m}-${d}`;
  }

  // 라우터 state/세션 → courseInfo & heroImg 복원
  useEffect(() => {
    const s = location.state;
    if (s?.region || s?.period) {
      const next = {
        region: (s.region || "").replace(/\s*코스$/, ""),
        period: s.period || "",
      };
      setCourseInfo(next);
      if (s.heroImage) setHeroImg(s.heroImage);
      sessionStorage.setItem("lastCourse", JSON.stringify({ ...next, heroImage: s?.heroImage || "" }));
      return;
    }
    const saved = sessionStorage.getItem("lastCourse");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCourseInfo({
          region: (parsed?.region || "").replace(/\s*코스$/, ""),
          period: parsed?.period || "",
        });
        if (parsed?.heroImage) setHeroImg(parsed.heroImage);
      } catch (err) {
        console.warn("lastCourse JSON 파싱 실패:", err);
        sessionStorage.removeItem("lastCourse");
      }
    }
  }, [location.state]);

  // TourAPI 소스 1회 로드(전남 전체)
  useEffect(() => {
    (async () => {
      try {
        const [n, f, s] = await Promise.all([
          fetchNatureSights({}),
          fetchFoodPlaces({}),
          fetchAccommodations({}),
        ]);
        setTourNature(n);
        setTourFood(f);
        setTourStay(s);
        setImgIndex(buildImageIndex(n, f, s));
      } catch (e) {
        console.error("TourAPI 로드 실패:", e);
      }
    })();
  }, []);

  // 주소/좌표 입력을 LatLng로
  const resolveCenter = (kakao, geocoder, input) =>
    new Promise((resolve) => {
      if (input?.type === "coords") {
        resolve(new kakao.maps.LatLng(input.coords.lat, input.coords.lng));
        return;
      }
      const query = input?.query || "서울특별시청";
      geocoder.addressSearch(query, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const { x, y } = result[0];
          resolve(new kakao.maps.LatLng(y, x));
        } else {
          resolve(new kakao.maps.LatLng(37.5665, 126.978));
        }
      });
    });

  // 초기 지도 로드 (중심은 region 기준)
  useEffect(() => {
    const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

    const init = async () => {
      window.kakao.maps.load(async () => {
        const container = document.getElementById("map");
        if (!container) return;
        const kakao = window.kakao;
        const geocoder = new kakao.maps.services.Geocoder();
        geocoderRef.current = geocoder;
        placesRef.current = new kakao.maps.services.Places();

        const region = courseInfo.region?.trim();
        const centerLatLng = await resolveCenter(
          kakao,
          geocoder,
          region ? { type: "address", query: region } : null
        );
        mapRef.current = new kakao.maps.Map(container, {
          center: centerLatLng,
          level: 7,
        });
      });
    };

    if (window.kakao?.maps) init();
    else {
      const existed = document.querySelector('script[src^="//dapi.kakao.com/v2/maps/sdk.js"]');
      if (existed) existed.addEventListener("load", init, { once: true });
      else {
        const script = document.createElement("script");
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services`;
        script.async = true;
        script.addEventListener("load", init, { once: true });
        document.head.appendChild(script);
      }
    }
  }, [courseInfo.region]);

  // 일정 불러오기: 농촌 / 그외 / 어촌 분기
  useEffect(() => {
    const load = async () => {
      const { region, period } = courseInfo;
      if (!region || !period) return;

      const key = PERIOD_KEY_MAP[period] || PERIOD_KEY_MAP[period.replace(/\s/g, "")];

      // ===== 농촌 (스마트주 JSON + TourAPI 음식/숙소) =====
      if (isRural) {
        // TourAPI 보장
        let n = tourNature, f = tourFood, s = tourStay;
        if (!n?.length || !f?.length || !s?.length) {
          try {
            const [n2, f2, s2] = await Promise.all([
              fetchNatureSights({}),
              fetchFoodPlaces({}),
              fetchAccommodations({}),
            ]);
            n = n2; f = f2; s = s2;
            setTourNature(n2); setTourFood(f2); setTourStay(s2);
            setImgIndex(buildImageIndex(n2, f2, s2));
          } catch (e) {
            console.error("TourAPI 재로드 실패:", e);
          }
        }
        const foodByRegion = groupTourByRegion(f);
        const stayByRegion = groupTourByRegion(s);

        // 농촌 JSON 캐시
        let rrows = ruralRowsRef.current;
        if (!rrows) {
          rrows = await fetchRuralJeonnam();
          ruralRowsRef.current = rrows;
        }

        const plans = makePlansByRegion_RURAL(rrows, foodByRegion, stayByRegion);
        const planSet = plans[region];
        const selected = planSet?.[key];

        let newDays = [];
        if (key === "daytrip" && selected) {
          newDays = [[selected.체험, selected.음식점, selected.숙소]];
        } else if (Array.isArray(selected)) {
          newDays = selected.map((d) => [d.체험, d.음식점, d.숙소]);
        }

        setDays(newDays);
        setSelectedDay(1);
        setSelectedIdx(0);
        return;
      }

      // ===== 그외 (TourAPI 기반, 하루 2관광지) =====
      if (isOther) {
        let n = tourNature, f = tourFood, s = tourStay;
        if (!n?.length || !f?.length || !s?.length) {
          try {
            const [n2, f2, s2] = await Promise.all([
              fetchNatureSights({}),
              fetchFoodPlaces({}),
              fetchAccommodations({}),
            ]);
            n = n2; f = f2; s = s2;
            setTourNature(n2); setTourFood(f2); setTourStay(s2);
            setImgIndex(buildImageIndex(n2, f2, s2));
          } catch (e) {
            console.error("TourAPI 재로드 실패:", e);
          }
        }

        const plans = makePlansByRegion_TOUR({ natureItems: n, foodItems: f, stayItems: s });
        const planSet = plans[region];
        const selected = planSet?.[key];

        const toTourItem = (row, category) => ({
          title: row?.title || "",
          address: row?.addr1 || "",
          category,
        });

        let newDays = [];
        if (key === "daytrip" && selected) {
          newDays = [[
            toTourItem(selected.관광지1, "관광지"),
            toTourItem(selected.음식점, "음식점"),
            toTourItem(selected.관광지2, "관광지"),
          ]];
        } else if (Array.isArray(selected)) {
          newDays = selected.map((d) => {
            const arr = [
              toTourItem(d.관광지1, "관광지"),
              toTourItem(d.음식점, "음식점"),
              toTourItem(d.관광지2, "관광지"),
            ];
            if (d.숙소) arr.push(toTourItem(d.숙소, "숙소"));
            return arr;
          });
        }

        setDays(newDays);
        setSelectedDay(1);
        setSelectedIdx(0);
        return;
      }

      // ===== 어촌 (ODcloud 기반) =====
      let rows = cachedRowsRef.current;
      if (!rows) {
        rows = await fetchAllOdcloud({ url: API1, key: API1_KEY });
        cachedRowsRef.current = rows;
      }
      const plans = makePlansByRegion_OD(rows);
      const planSet = plans[region];
      const selected = planSet?.[key];

      const toODItem = (row, category) => ({
        title: row?.["여행지명칭"] || "",
        address:
          row?.["주소"] || row?.["소재지주소"] || row?.["소재지도로명주소"] || "",
        category,
      });

      let newDays = [];
      if (key === "daytrip" && selected) {
        newDays = [[
          toODItem(selected.관광지, "관광지"),
          toODItem(selected.음식점, "음식점"),
          toODItem(selected.체험, "체험"),
        ]];
      } else if (key === "oneday" && Array.isArray(selected)) {
        newDays = selected.map((d) => {
          const arr = [
            toODItem(d.관광지 || d.체험, d.관광지 ? "관광지" : "체험"),
            toODItem(d.음식점, "음식점"),
          ];
          if (d.체험 && d.관광지) arr.splice(1, 0, toODItem(d.체험, "체험"));
          else if (d.체험 && !d.관광지) arr.splice(0, 0, toODItem(d.체험, "체험"));
          if (d.숙소) arr.push(toODItem(d.숙소, "숙소"));
          return arr;
        });
      } else if (key === "twoday" && Array.isArray(selected)) {
        newDays = selected.map((d) => {
          const arr = [toODItem(d.장소, "장소"), toODItem(d.음식점, "음식점")];
          if (d.숙소) arr.push(toODItem(d.숙소, "숙소"));
          return arr;
        });
      } else if (key === "threeday" && Array.isArray(selected)) {
        newDays = selected.map((d) => {
          const arr = [toODItem(d.장소, "장소"), toODItem(d.음식점, "음식점")];
          if (d.숙소) arr.push(toODItem(d.숙소, "숙소"));
          return arr;
        });
      }

      setDays(newDays);
      setSelectedDay(1);
      setSelectedIdx(0);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseInfo, isOther, isRural, tourNature, tourFood, tourStay]);

  // 지도 마커
  const clearMarkers = () => {
    markersRef.current.forEach((ov) => ov.setMap(null));
    markersRef.current = [];
  };

  const PIX_OFFSETS = [
    [0, 0], [14, 0], [-14, 0], [0, 14], [0, -14],
    [10, 10], [-10, 10], [10, -10], [-10, -10]
  ];

  const geocodeOne = (kakao, geocoder, places, item, regionHint) =>
    new Promise((resolve) => {
      const addr = (item.address || "").trim();
      const title = (item.title || "").trim();
      const tryKeyword = () => {
        const keyword = `${regionHint || ""} ${title}`.trim();
        if (!keyword) return resolve(null);
        places.keywordSearch(keyword, (data, status) => {
          if (status === kakao.maps.services.Status.OK && data[0]) {
            return resolve(new kakao.maps.LatLng(data[0].y, data[0].x));
          }
          resolve(null);
        }, { page: 1, size: 1 });
      };

      if (!addr) return tryKeyword();

      geocoder.addressSearch(addr, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          return resolve(new kakao.maps.LatLng(result[0].y, result[0].x));
        }
        tryKeyword();
      });
    });

  const drawMarkersForDay = async (dayIdx) => {
    if (!mapRef.current || !geocoderRef.current || !placesRef.current || !window.kakao?.maps) return;

    clearMarkers();

    const kakao = window.kakao;
    const geocoder = geocoderRef.current;
    const places = placesRef.current;

    const items = days[dayIdx] || [];
    const bounds = new kakao.maps.LatLngBounds();

    const baseStyle =
      "width:43px;height:43px;border-radius:50%;background:#fff;" +
      "border:3px solid #3AC581;display:flex;align-items:center;" +
      "justify-content:center;color:#2C2F33;font-size:20px;font-weight:500;" +
      "box-shadow:0 1px 2px rgba(0,0,0,.06)";

    const dupCount = new Map();

    for (let i = 0; i < items.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const pos = await geocodeOne(kakao, geocoder, places, items[i], courseInfo.region);
      if (!pos) continue;

      bounds.extend(pos);

      const key = `${pos.getLat().toFixed(5)},${pos.getLng().toFixed(5)}`;
      const count = (dupCount.get(key) || 0) + 1;
      dupCount.set(key, count);

      const [ox, oy] = PIX_OFFSETS[(count - 1) % PIX_OFFSETS.length];
      const content = `<div style="${baseStyle};margin-left:${ox}px;margin-top:${oy}px;">${i + 1}</div>`;

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 10 + i,
        clickable: false,
      });
      overlay.setMap(mapRef.current);
      markersRef.current.push(overlay);
    }

    if (!bounds.isEmpty()) {
      mapRef.current.setBounds(bounds);
    } else {
      const center = await new Promise((resolve) => {
        geocoder.addressSearch(courseInfo.region, (result, status) => {
          if (status === kakao.maps.services.Status.OK && result[0]) {
            resolve(new kakao.maps.LatLng(result[0].y, result[0].x));
          } else {
            resolve(new kakao.maps.LatLng(37.5665, 126.9780));
          }
        });
      });
      mapRef.current.setCenter(center);
      mapRef.current.setLevel(7);
    }
  };

  useEffect(() => {
    if (days.length > 0) drawMarkersForDay(selectedDay - 1);
    else clearMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, selectedDay]);

  // ================== 이미지 선택 로직 ==================
  const imageFor = (item) => {
    if (!item) return regionImg;
    if (imgIndex) {
      const hit = getTourImageFor(item, imgIndex);
      if (hit) return hit;
    }
    return regionImg;
  };

  // 메인 히어로 이미지
  useEffect(() => {
    if (!courseInfo.region) return;
    if (location.state?.heroImage) return;
    const img = pickRegionImage(courseInfo.region, tourNature, tourFood, tourStay);
    if (img) setHeroImg(img);
  }, [courseInfo.region, tourNature, tourFood, tourStay, location.state]);

  useEffect(() => {
    if (heroImg && heroImg !== regionImg) return;
    const first = days?.[0]?.[0];
    if (first) {
      const img = imageFor(first);
      if (img) setHeroImg(img);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, imgIndex]);

  // === 서버 페이로드 빌드 ===
  function buildPayload() {
    const inpStartDate = normalizeDateInput(startDate);
    const inpEndDate = normalizeDateInput(endDate);
    const regionProvince =
      (courseInfo.region || "").split(" ")[0] || courseInfo.region || "전라남도";

    // 일정 전체에서 첫 숙소 추출(있으면 accommodation으로 보냄)
    const firstStay = (days.flat().find((it) => it?.category === "숙소") || null);
    const accommodation = firstStay
      ? {
          name: firstStay.title || "",
          address: firstStay.address || "",
          description: "",
          imgUrl: imageFor(firstStay) || "",
        }
      : undefined;

    const courseDays = days.map((dayItems, idx) => ({
      day: idx + 1,
      places: dayItems
        .filter((it) => it && it.title)
        .map((it) => ({
          placeName: it.title || "",
          description: "", // 설명 비움
          address: it.address || "",
          imgUrl: imageFor(it) || "",
        })),
    }));

    return {
      groupInput: {
        inpStartDate,
        inpEndDate,
        inpRegion: regionProvince,
        inpAdultCnt: 2,   // 필요 시 UI 연동 가능
        inpChildCnt: 0,
        inpBabyCnt: 0,
        inpStyle: "etc",
      },
      course: {
        title: (`${courseInfo.region || "전라남도"} ${courseInfo.period || ""}`).trim() + " 코스",
        days: courseDays,
        ...(accommodation ? { accommodation } : {}),
      },
    };
  }

  // === 저장 실행 ===
  async function handleSaveCourse() {
    try {
      if (saving) return;
      const token = localStorage.getItem("accessToken");
      if (!token) {
        window.alert("로그인이 필요합니다. (토큰이 없습니다)");
        return;
      }

      const payload = buildPayload();

      if (!payload.groupInput.inpStartDate || !payload.groupInput.inpEndDate) {
        window.alert("촌캉스 일자를 정확히 입력해 주세요. 예) 2025-10-11");
        return;
      }
      if (!days?.length) {
        window.alert("저장할 코스가 없습니다.");
        return;
      }

      setSaving(true);
      const res = await axios.post(
        "https://smartzoo.shop/templates/save",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("코스 저장 성공:", res.data);
      window.alert("코스가 저장되었습니다.");
    } catch (err) {
      console.error("코스 저장 실패:", err);
      const msg = err?.response?.data?.message || err?.message || "알 수 없는 오류";
      window.alert(`저장에 실패했습니다: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="CourseDetail">
      <Header />
      <img className="detail-main-img" src={heroImg || regionImg} alt="지역대표이미지" />

      <div className="detail-course-info">
        <div className="detail-course-info-left">
          <div className="detail-course-period">{courseInfo.period || "기간 미정"}</div>
          <div className="detail-course-region">{courseInfo.region || "지역 미정"}</div>
          <span>
            {courseInfo.region
              ? `${courseInfo.region}에 맞춘 ${courseInfo.period || "맞춤"} 촌캉스를 즐겨보세요.`
              : "원하는 지역과 기간을 선택해 맞춤 코스를 구성해보세요."}
          </span>
        </div>

        <div className="detail-course-info-rightBox">
          <div className="detail-course-day-box">
            <span>촌캉스 일자</span>
            <div className="detail-course-date-selected">
              <input
                type="text"
                className="detail-day-selected"
                placeholder="YY / MM / DD"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <div className="detail-day-dash">-</div>
              <input
                type="text"
                className="detail-day-selected"
                placeholder="YY / MM / DD"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <button onClick={handleSaveCourse} disabled={saving}>
            {saving ? "저장 중..." : "코스 저장하기"}
          </button>
        </div>
      </div>

      <hr style={{ border: "none", height: "2px", width: "1200px", backgroundColor: "#E7ECF1", marginTop: "30px" }} />

      <div className="course-info-container">
        {/* 일차 탭 */}
        <div className="detail-course-period-1day">
          {Array.from(
            { length: Math.max(daysFromPeriod(courseInfo.period), days.length || 0) },
            (_, i) => (
              <span key={i}
                    className={i + 1 === selectedDay ? "active" : ""}
                    onClick={() => { setSelectedDay(i + 1); setSelectedIdx(0); }}
                    style={{ cursor: "pointer" }}>
                {i + 1}일차
              </span>
            )
          )}
        </div>

        {/* 일차별 장소 미리보기(상단 가로 카드) */}
        <div className="day-course-place-container">
          {(days[selectedDay - 1] || []).map((it, idx) => (
            <div key={`${it.title}-${idx}`}
                className={`place-title-img ${idx === selectedIdx ? "active" : ""}`}
                onClick={() => setSelectedIdx(idx)}
                style={{ cursor: "pointer" }}>
              <img src={imageFor(it)} alt="장소이미지" />
              <div className="place-title">
                <span>{idx + 1}</span>
                <div className="place-title-text">{it.title || "이름 없음"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 상세 패널 */}
        <div className="course-detail-contents-box">
          <img src={imageFor(days[selectedDay - 1]?.[selectedIdx])} alt="장소이미지" />
          <div className="course-detail-contents-text">
            <div className="course-detail-contents-top-text">
              <div className="course-detail-contents-title">
                {days[selectedDay - 1]?.[selectedIdx]?.title || ""}
              </div>
              <img src={placeIcon} alt="장소아이콘" />
              <div className="course-detail-place-address">
                {days[selectedDay - 1]?.[selectedIdx]?.address || ""}
              </div>
            </div>

            <div className="course-detail-contents-subcontents">
              {(() => {
                const it = currentPlace;
                if (!it) return null;
                const key = placeKeyOf(it);
                const txt = placeDescs[key];

                if (descLoadingKey === key && !txt) {
                  return <span style={{ opacity: 0.7 }}>설명을 생성하는 중…</span>;
                }
                if (txt) return <span>{txt}</span>;

                return (
                  <span style={{ opacity: 0.7 }}>
                    장소 정보 로딩 중입니다. 잠시만 기다려 주세요.
                  </span>
                );
              })()}
            </div>

          </div>
        </div>

        <span className="course-detail-map-title">위치 정보</span>
        <div id="map" className="course-detail-map-box" />
      </div>
    </div>
  );
}
