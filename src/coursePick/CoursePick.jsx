/* eslint-disable no-unused-vars */
import Header from "../components/header";
import carrier from "/images/carrier.png";
import pickdrop from "/images/dropdown-up.png";
import pickdowndrop from "/images/dropdown-down.png";
import regionImg from "/images/BgImg2.webp";
import backarrow from "/images/arrow-back.png";
import nextarrow from "/images/arrow-next.png";
import { useState } from "react";
import "./CoursePick.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/* ================== 어촌 데이터(odcloud) 설정 ================== */
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
  const keys = ["관광지분류", "카테고리", "분류", "업종", "유형", "서비스유형", "테마"];
  for (const k of keys) {
    if (row[k]) return row[k];
  }
  return "기타";
}

const EXCLUDE_KEYWORDS = [
  "펜션","모텔","게스트하우스","영업소","사무소","수련원","크루즈","레저",
  "기념관","미술관","전시관","터미널","주식회사","(주)","고속㈜","사업소",
  "매표소","유람선","동부연맹","휴게소","케이블카","박물관","리조트","호텔","HOTEL"
];

function excludeByKeywords(row) {
  const text = Object.values(row).join(" ");
  return !EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));
}

function extractRegion(addr = "") {
  const parts = String(addr).trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`; // 예: 전라남도 여수시
  return addr;
}

/** 어촌(ODcloud) → 지역별 코스 빌드 */
function makePlansByRegion_OD(data) {
  const groupedByRegion = {};
  data.forEach((row) => {
    const addr = row["주소"] || row["소재지주소"] || row["소재지도로명주소"] || "";
    if (!addr.includes("전라남도")) return;       // 전남만
    if (!excludeByKeywords(row)) return;

    const region = extractRegion(addr);            // "전라남도 여수시"
    const cat = getCategory(row);

    if (!groupedByRegion[region])
      groupedByRegion[region] = { 관광지: [], 음식점: [], 체험: [], 숙소: [] };

    if (cat.includes("관광")) groupedByRegion[region].관광지.push(row);
    else if (cat.includes("음식") || cat.includes("식당")) groupedByRegion[region].음식점.push(row);
    else if (cat.includes("체험")) groupedByRegion[region].체험.push(row);
    else if (cat.includes("숙박") || cat.includes("숙소")) groupedByRegion[region].숙소.push(row);
  });

  const plans = {};
  Object.entries(groupedByRegion).forEach(([region, cats]) => {
    plans[region] = {};

    // 당일치기 (관광/음식/체험 각각 1개)
    if (cats.관광지.length >= 1 && cats.음식점.length >= 1 && cats.체험.length >= 1) {
      plans[region].daytrip = {
        관광지: cats.관광지[0],
        음식점: cats.음식점[0],
        체험: cats.체험[0],
      };
    }

    // 1박2일 (각 2개 + 숙소 1개)
    if (cats.관광지.length >= 2 && cats.음식점.length >= 2 && cats.체험.length >= 2 && cats.숙소.length >= 1) {
      plans[region].oneday = [
        {
          day: 1,
          관광지: cats.관광지[0],
          음식점: cats.음식점[0],
          체험: cats.체험[0],
          숙소: cats.숙소[0],
        },
        {
          day: 2,
          관광지: cats.관광지[1],
          음식점: cats.음식점[1],
          체험: cats.체험[1],
        },
      ];
    }

    // 2박3일 (관광지 or 체험만 있어도 허용)
    if (
      (cats.관광지.length + cats.체험.length) >= 2 &&
      cats.음식점.length >= 2 &&
      cats.숙소.length >= 2
    ) {
      plans[region].twoday = [1, 2, 3].map((d, idx) => {
        const poi = cats.관광지[idx] || cats.체험[idx] || cats.관광지[0] || cats.체험[0];
        return {
          day: d,
          장소: poi,
          음식점: cats.음식점[idx] || cats.음식점[0],
          ...(d < 3 ? { 숙소: cats.숙소[idx] || cats.숙소[0] } : {}),
        };
      });
    }

    // 3박4일 (관광지 or 체험만 있어도 허용)
    if (
      (cats.관광지.length + cats.체험.length) >= 3 &&
      cats.음식점.length >= 3 &&
      cats.숙소.length >= 3
    ) {
      plans[region].threeday = [1, 2, 3, 4].map((d, idx) => {
        const poi = cats.관광지[idx] || cats.체험[idx] || cats.관광지[0] || cats.체험[0];
        return {
          day: d,
          장소: poi,
          음식점: cats.음식점[idx] || cats.음식점[0],
          ...(d < 4 ? { 숙소: cats.숙소[idx] || cats.숙소[0] } : {}),
        };
      });
    }
  });

  return plans;
}

/* ================== 그외(=TourAPI 전남) 설정 ================== */
const TOUR_API_KEY = import.meta.env.VITE_TOURAPI_KEY;

function baseParams(extra = {}) {
  return {
    serviceKey: TOUR_API_KEY,
    MobileOS: "ETC",
    MobileApp: "Chonsre",
    _type: "json",
    ...extra,
  };
}

async function fetchNatureSights({ pageNo = 1, numOfRows = 120 }) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2", {
    params: baseParams({ contentTypeId: 12, areaCode: 38, pageNo, numOfRows }), // 관광지
  });
  return r?.data?.response?.body?.items?.item || [];
}
async function fetchFoodPlaces({ pageNo = 1, numOfRows = 120 }) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2", {
    params: baseParams({ contentTypeId: 39, areaCode: 38, pageNo, numOfRows }), // 음식점
  });
  return r?.data?.response?.body?.items?.item || [];
}
async function fetchAccommodations({ pageNo = 1, numOfRows = 120 }) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2", {
    params: baseParams({ contentTypeId: 32, areaCode: 38, pageNo, numOfRows }), // 숙소
  });
  let items = r?.data?.response?.body?.items?.item || [];
  const BAD = ["모텔","호텔","리조트","호스텔","풀빌라","게스트","펜션","라마다"];
  items = items.filter((it) => !BAD.some(kw => (it.title||"").includes(kw) || (it.addr1||"").includes(kw)));
  return items;
}

function extractRegionFromTour(addr1 = "") {
  const parts = String(addr1).trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`; // 전라남도 여수시
  return addr1 || "";
}

/**
 * TourAPI → 지역별 코스 빌드(체험 없음)
 * 하루 순서: 관광지1 → 음식점 → 관광지2 → (숙소, 마지막 날 제외)
 */
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
      plans[region].daytrip = {
        관광지1: cats.관광지[0],
        음식점:  cats.음식점[0],
        관광지2: cats.관광지[1],
      };
    }
    if (N >= 4 && F >= 2 && S >= 1) {
      plans[region].oneday = [
        { day: 1, 관광지1: cats.관광지[0], 음식점: cats.음식점[0], 관광지2: cats.관광지[1], 숙소: cats.숙소[0] },
        { day: 2, 관광지1: cats.관광지[2], 음식점: cats.음식점[1], 관광지2: cats.관광지[3] },
      ];
    }
    if (N >= 6 && F >= 3 && S >= 2) {
      plans[region].twoday = [0,1,2].map((d) => ({
        day: d + 1,
        관광지1: cats.관광지[2*d],
        음식점:  cats.음식점[d],
        관광지2: cats.관광지[2*d + 1],
        ...(d < 2 ? { 숙소: cats.숙소[d] } : {}),
      }));
    }
    if (N >= 8 && F >= 4 && S >= 3) {
      plans[region].threeday = [0,1,2,3].map((d) => ({
        day: d + 1,
        관광지1: cats.관광지[2*d],
        음식점:  cats.음식점[d],
        관광지2: cats.관광지[2*d + 1],
        ...(d < 3 ? { 숙소: cats.숙소[d] } : {}),
      }));
    }
  });

  return plans;
}

/* ============== 지역 대표 이미지 선택(있으면 사용, 없으면 기본) ============== */
function pickRegionImage(region, nList = [], fList = [], sList = []) {
  const finder = (list) => list?.find?.(
    (it) => extractRegionFromTour(it.addr1) === region && it.firstimage
  )?.firstimage;
  return finder(nList) || finder(fList) || finder(sList) || null;
}

/* ================== 농촌(스마트주) ================== */
/** 농촌 원본 로드 — 반드시 "농촌 + 기간"일 때만 호출 */
async function fetchRuralJeonnam() {
  const r = await axios.get("https://smartzoo.shop/api/jeonnam/json");
  return Array.isArray(r.data) ? r.data : [];
}
/** "전라남도 {시군}" 형태로 지역 문자열 생성 */
function regionFromRural(row) {
  const sigun = (row?.["시군"] || "").trim();
  return sigun ? `전라남도 ${sigun}` : "";
}
/** TourAPI 리스트를 지역별로 그룹 */
function groupTourByRegion(list = []) {
  const grouped = {};
  for (const it of list) {
    const region = extractRegionFromTour(it.addr1 || "");
    if (!region.startsWith("전라남도")) continue;
    (grouped[region] ??= []).push(it);
  }
  return grouped;
}
/**
 * 농촌 rows(체험만) + TourAPI(음식점,숙소) → 지역별 코스 빌드
 * 규칙: 하루에 [체험1, 음식점1, 숙박1] 정확히 3개.
 * D일 일정이면 체험 D개 필요. 음식/숙소는 1개 이상 있으면 순환 사용.
 */
function makePlansByRegion_RURAL(rows = [], foodByRegion = {}, stayByRegion = {}) {
  const onlyRural = rows.filter((r) => r?.["구분"] === "농촌" && regionFromRural(r));
  const grouped = {};
  for (const r of onlyRural) {
    const region = regionFromRural(r);
    (grouped[region] ??= []).push(r);
  }

  // 체험 정렬(안정적)
  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => (a["장소명"]||"").localeCompare(b["장소명"]||""))
  );

  const plans = {};
  const periods = {
    daytrip: 1,
    oneday: 2,
    twoday: 3,
    threeday: 4,
  };

  Object.entries(grouped).forEach(([region, experiences]) => {
    const foods = foodByRegion[region] || [];
    const stays = stayByRegion[region] || [];

    // 표시용 아이템 변환기
    const toExp = (row) => ({ title: row?.["장소명"] || "", address: row?.["주소"] || "", category: "체험" });
    const toFood = (it) => ({ title: it?.title || "", address: it?.addr1 || "", category: "음식점" });
    const toStay = (it) => ({ title: it?.title || "", address: it?.addr1 || "", category: "숙소" });

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

/* ================== 화면 컴포넌트 ================== */
export default function CoursePick() {
  const navigate = useNavigate();

  const Course_TYPES = ["농촌", "어촌", "그외"];
  const Course_Period = ["당일치기", "1박 2일", "2박 3일", "3박 4일"];

  // 선택 값
  const [selectedType, setSelectedType] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");

  // 드롭다운
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const toggleTypeDropdown = () => setIsTypeDropdownOpen((prev) => !prev);
  const togglePeriodDropdown = () => setIsPeriodDropdownOpen((prev) => !prev);

  // 결과 데이터 / 로딩
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cachedRows, setCachedRows] = useState(null);           // 어촌 캐시
  const [tourCache, setTourCache] = useState({ n: null, f: null, s: null }); // 그외/대표이미지 캐시
  const [ruralRows, setRuralRows] = useState(null);             // 농촌 캐시

  const PERIOD_KEY_MAP = {
    "당일치기": "daytrip",
    "1박 2일": "oneday",
    "2박 3일": "twoday",
    "3박 4일": "threeday",
  };

  // 찾기 클릭 → 타입/기간에 따른 데이터 소스 선택
  const handleSearchClick = async () => {
    try {
      setLoading(true);

      if (!selectedPeriod) {
        setCourses([]);
        setCurrentPage(1);
        return;
      }

      const periodKey = PERIOD_KEY_MAP[selectedPeriod];
      const periodTag = selectedPeriod.replace(/\s/g, ""); // "2박 3일" → "2박3일"

      // TourAPI(카드 이미지/음식/숙소용)는 공통 캐시
      let { n, f, s } = tourCache;
      if (!n || !f || !s) {
        const [nRaw, fRaw, sRaw] = await Promise.all([
          fetchNatureSights({}),
          fetchFoodPlaces({}),
          fetchAccommodations({}),
        ]);
        n = nRaw; f = fRaw; s = sRaw;
        setTourCache({ n, f, s });
      }
      // 지역별 음식/숙소 그룹(농촌 코스 조합용)
      const foodByRegion = groupTourByRegion(f);
      const stayByRegion = groupTourByRegion(s);

      // ================= 농촌 =================
      if (selectedType === "농촌") {
        // ⚠️ 이 시점에만 농촌 JSON 호출
        let rows = ruralRows;
        if (!rows) {
          rows = await fetchRuralJeonnam();
          setRuralRows(rows);
        }
        const plans = makePlansByRegion_RURAL(rows, foodByRegion, stayByRegion);

        const list = Object.entries(plans)
          .filter(([, planSet]) => Boolean(planSet[periodKey]))
          .map(([region, planSet], idx) => {
            const town = (region.split(/\s+/)[1]) || region;

            // 첫째 날 기준 요약(체험 우선)
            let rawName = "", rawAddress = "";
            if (periodKey === "daytrip") {
              rawName = planSet.daytrip?.체험?.title || "";
              rawAddress = planSet.daytrip?.체험?.address || "";
            } else if (Array.isArray(planSet[periodKey])) {
              const d1 = planSet[periodKey][0]?.체험;
              rawName = d1?.title || "";
              rawAddress = d1?.address || "";
            }

            // 지역 대표 이미지 (TourAPI)
            const anyImg = pickRegionImage(region, n, f, s) || regionImg;

            return {
              id: `rural-${periodKey}-${region}-${idx}`,
              image: anyImg,
              period: periodTag,
              region: `${region} 코스`,
              town,
              rawAddress,
              rawName,
            };
          });

        setCourses(list);
        setCurrentPage(1);
        return;
      }

      // ================= 어촌 =================
      if (selectedType === "어촌") {
        let rows = cachedRows;
        if (!rows) {
          rows = await fetchAllOdcloud({ url: API1, key: API1_KEY });
          setCachedRows(rows);
        }
        const plans = makePlansByRegion_OD(rows);

        const list = Object.entries(plans)
          .filter(([, planSet]) => Boolean(planSet[periodKey]))
          .map(([region, planSet], idx) => {
            const town = (region.split(/\s+/)[1]) || region;

            // 첫째 날 기준 요약
            let rawName = ""; let rawAddress = "";
            if (periodKey === "daytrip") {
              const base = planSet.daytrip?.관광지 || planSet.daytrip?.체험 || planSet.daytrip?.음식점;
              rawName = base?.["여행지명칭"] || "";
              rawAddress = base?.["주소"] || base?.["소재지주소"] || base?.["소재지도로명주소"] || "";
            } else if (periodKey === "oneday") {
              const d1 = planSet.oneday?.[0]?.관광지 || planSet.oneday?.[0]?.체험 || planSet.oneday?.[0]?.음식점;
              rawName = d1?.["여행지명칭"] || "";
              rawAddress = d1?.["주소"] || d1?.["소재지주소"] || d1?.["소재지도로명주소"] || "";
            } else if (periodKey === "twoday") {
              const d1 = planSet.twoday?.[0]?.장소 || planSet.twoday?.[0]?.음식점;
              rawName = d1?.["여행지명칭"] || "";
              rawAddress = d1?.["주소"] || d1?.["소재지주소"] || d1?.["소재지도로명주소"] || "";
            } else if (periodKey === "threeday") {
              const d1 = planSet.threeday?.[0]?.장소 || planSet.threeday?.[0]?.음식점;
              rawName = d1?.["여행지명칭"] || "";
              rawAddress = d1?.["주소"] || d1?.["소재지주소"] || d1?.["소재지도로명주소"] || "";
            }

            // 지역 대표 이미지 (TourAPI)
            const anyImg = pickRegionImage(region, n, f, s) || regionImg;

            return {
              id: `fishing-${periodKey}-${region}-${idx}`,
              image: anyImg,
              period: periodTag,
              region: `${region} 코스`,
              town,
              rawAddress,
              rawName,
            };
          });

        setCourses(list);
        setCurrentPage(1);
        return;
      }

      // ================= 그외( TourAPI ) =================
      if (selectedType === "그외") {
        const plans = makePlansByRegion_TOUR({ natureItems: n, foodItems: f, stayItems: s });

        const list = Object.entries(plans)
          .filter(([, planSet]) => Boolean(planSet[periodKey]))
          .map(([region, planSet], idx) => {
            const town = (region.split(/\s+/)[1]) || region;

            // 첫째 날 기준 요약 (관광지1 우선 → 음식점)
            let rawName = "", rawAddress = "";
            if (periodKey === "daytrip") {
              const base = planSet.daytrip?.관광지1 || planSet.daytrip?.음식점;
              rawName = base?.title || "";
              rawAddress = base?.addr1 || "";
            } else if (periodKey === "oneday") {
              const d1 = planSet.oneday?.[0]?.관광지1 || planSet.oneday?.[0]?.음식점;
              rawName = d1?.title || "";
              rawAddress = d1?.addr1 || "";
            } else if (periodKey === "twoday") {
              const d1 = planSet.twoday?.[0]?.관광지1 || planSet.twoday?.[0]?.음식점;
              rawName = d1?.title || "";
              rawAddress = d1?.addr1 || "";
            } else if (periodKey === "threeday") {
              const d1 = planSet.threeday?.[0]?.관광지1 || planSet.threeday?.[0]?.음식점;
              rawName = d1?.title || "";
              rawAddress = d1?.addr1 || "";
            }

            // 지역 대표 이미지 (TourAPI)
            const anyImg = pickRegionImage(region, n, f, s) || regionImg;

            return {
              id: `other-${periodKey}-${region}-${idx}`,
              image: anyImg,
              period: periodTag,
              region: `${region} 코스`,
              town,
              rawAddress,
              rawName,
            };
          });

        setCourses(list);
        setCurrentPage(1);
        return;
      }

      // 그 외 타입(미구현)은 빈 목록
      setCourses([]);
      setCurrentPage(1);
    } catch (error) {
      console.error("검색 요청 실패:", error);
      alert("검색 요청 실패. 콘솔을 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(courses.length / ITEMS_PER_PAGE) || 1;
  const currentData = courses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="CoursePick">
      <Header />
      <div className="pick-title-container">
        <div className="pick-title">
          촌스레가 준비한 <br />
          <span>촌캉스 추천 코스</span>
        </div>
        <img src={carrier} alt="캐리어 이미지" />
      </div>

      <div className="pick-dropdown">
        <div className="pick-dropdown-box">
          촌캉스 타입
          <div className="pick-type-dropdown">
            <div
              className="pick-type-dropdown-menu-top"
              onClick={toggleTypeDropdown}
            >
              {selectedType || "전체"}
              <img
                className="dropdown-arrow"
                src={isTypeDropdownOpen ? pickdowndrop : pickdrop}
                alt="드롭다운 화살표"
              />
            </div>
            {isTypeDropdownOpen && (
              <div className="pick-dropdown-menu">
                <div
                  className="pick-dropdown-item-whole"
                  onClick={() => {
                    setSelectedType("");
                    setIsTypeDropdownOpen(false);
                  }}
                >
                  전체
                </div>
                {["농촌","어촌","그외"].map((type) => (
                  <div
                    key={type}
                    className="pick-dropdown-item"
                    onClick={() => {
                      setSelectedType(type);
                      setIsTypeDropdownOpen(false);
                    }}
                  >
                    {type}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pick-dropdown-box">
          기간
          <div className="pick-period-dropdown">
            <div
              className="pick-type-dropdown-menu-top"
              onClick={togglePeriodDropdown}
            >
              <span>{selectedPeriod || "전체"}</span>
              <img
                className="dropdown-arrow"
                src={isPeriodDropdownOpen ? pickdowndrop : pickdrop}
                alt="드롭다운 화살표"
              />
            </div>
            {isPeriodDropdownOpen && (
              <div className="pick-dropdown-menu">
                <div
                  className="pick-dropdown-whole"
                  onClick={() => {
                    setSelectedPeriod("");
                    setIsPeriodDropdownOpen(false);
                  }}
                >
                  전체
                </div>
                {["당일치기","1박 2일","2박 3일","3박 4일"].map((period) => (
                  <div
                    key={period}
                    className="pick-dropdown-item"
                    onClick={() => {
                      setSelectedPeriod(period);
                      setIsPeriodDropdownOpen(false);
                    }}
                  >
                    {period}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSearchClick} disabled={loading}>
          {loading ? "검색 중..." : "찾기"}
        </button>
      </div>

      <div className="pick-course-contents">
        {currentData.map((course) => (
          <div
            key={course.id}
            className="course-card"
            onClick={() => {
              sessionStorage.setItem(
                "lastCourse",
                JSON.stringify({
                  region: course.region.replace(/\s*코스$/, ""),
                  period: course.period,
                  address: course.rawAddress,
                  placeName: course.rawName,
                })
              );

              navigate(`/CourseDetail/${course.id}`, {
                state: {
                  region: course.region.replace(/\s*코스$/, ""),
                  period: course.period,
                  address: course.rawAddress,
                  placeName: course.rawName,
                },
              });
            }}
            style={{ cursor: "pointer" }}
          >
            <img src={course.image} alt="지역 이미지" />
            <div className="course-period">{course.period}</div>
            <div className="course-region">{course.region}</div>
            <span>{course.town}</span>
          </div>
        ))}

        {courses.length === 0 && !loading && (
          <div style={{ color: "#888", padding: "24px 0" }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      <div className="pagination">
        <button
          className="pagination-arrow"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <img src={backarrow} alt="이전" />
        </button>
        <div className="pagination-numbers">
          {[...Array(totalPages)].map((_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                className={`pagination-button ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            );
          })}
        </div>
        <button
          className="pagination-arrow"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <img src={nextarrow} alt="다음" />
        </button>
      </div>
    </div>
  );
}
