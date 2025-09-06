// PlanGeneratorAll.jsx
// 어촌 데이터 필터링 테스트
import { useState } from "react";
import axios from "axios";

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
  const keys = ["관광지분류","카테고리","분류","업종","유형","서비스유형","테마"];
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
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
  return addr;
}

function makePlansByRegion(data) {
  const groupedByRegion = {};
  data.forEach((row) => {
    const addr = row["주소"] || row["소재지주소"] || row["소재지도로명주소"] || "";
    if (!addr.includes("전라남도")) return;
    if (!excludeByKeywords(row)) return;

    const region = extractRegion(addr);
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

    // ✅ 당일치기
    if (cats.관광지.length >= 1 && cats.음식점.length >= 1 && cats.체험.length >= 1) {
      plans[region].daytrip = {
        관광지: cats.관광지[0],
        음식점: cats.음식점[0],
        체험: cats.체험[0],
      };
    }

    // ✅ 1박2일
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

    // ✅ 2박3일 (관광지 or 체험 하나만 있어도 허용)
    if (
      (cats.관광지.length + cats.체험.length) >= 2 && // 최소 2일차분
      cats.음식점.length >= 2 &&
      cats.숙소.length >= 2
    ) {
      plans[region].twoday = [1,2,3].map((d, idx) => {
        const poi = cats.관광지[idx] || cats.체험[idx] || cats.관광지[0] || cats.체험[0];
        return {
          day: d,
          장소: poi,
          음식점: cats.음식점[idx] || cats.음식점[0],
          ...(d < 3 ? { 숙소: cats.숙소[idx] || cats.숙소[0] } : {}), // 마지막날 숙소 제외
        };
      });
    }

    // ✅ 3박4일 (관광지 or 체험 하나만 있어도 허용)
    if (
      (cats.관광지.length + cats.체험.length) >= 3 && // 최소 3일차분
      cats.음식점.length >= 3 &&
      cats.숙소.length >= 3
    ) {
      plans[region].threeday = [1,2,3,4].map((d, idx) => {
        const poi = cats.관광지[idx] || cats.체험[idx] || cats.관광지[0] || cats.체험[0];
        return {
          day: d,
          장소: poi,
          음식점: cats.음식점[idx] || cats.음식점[0],
          ...(d < 4 ? { 숙소: cats.숙소[idx] || cats.숙소[0] } : {}), // 마지막날 숙소 제외
        };
      });
    }
  });

  return plans;
}

export default function PlanGeneratorAll() {
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllOdcloud({ url: API1, key: API1_KEY });
      const result = makePlansByRegion(rows);
      setPlans(result);
    } catch (e) {
      console.error("🚨 오류:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🌊 전라남도 어촌 일정 (0박1일~3박4일)</h2>
      <button onClick={generate} disabled={loading}>
        {loading ? "생성 중..." : "일정 생성"}
      </button>

      {Object.entries(plans).map(([region, planSet]) => (
        <div key={region} style={{ marginTop: 20, border: "1px solid #ccc", padding: 12 }}>
          <h3>{region}</h3>

          {/* 당일치기 */}
          {planSet.daytrip && (
            <div>
              <h4>🚗 당일치기</h4>
              <ul>
                <li>관광지: {planSet.daytrip.관광지?.["여행지명칭"]} 📍 {planSet.daytrip.관광지?.["주소"]}</li>
                <li>음식점: {planSet.daytrip.음식점?.["여행지명칭"]} 📍 {planSet.daytrip.음식점?.["주소"]}</li>
                <li>체험: {planSet.daytrip.체험?.["여행지명칭"]} 📍 {planSet.daytrip.체험?.["주소"]}</li>
              </ul>
            </div>
          )}

          {/* 1박2일 */}
          {planSet.oneday && (
            <div>
              <h4>🏨 1박2일</h4>
              {planSet.oneday.map((d) => (
                <div key={d.day}>
                  <h5>Day {d.day}</h5>
                  <ul>
                    <li>관광지: {d.관광지?.["여행지명칭"]} 📍 {d.관광지?.["주소"]}</li>
                    <li>음식점: {d.음식점?.["여행지명칭"]} 📍 {d.음식점?.["주소"]}</li>
                    <li>체험: {d.체험?.["여행지명칭"]} 📍 {d.체험?.["주소"]}</li>
                    {d.숙소 && <li>숙소: {d.숙소?.["여행지명칭"]} 📍 {d.숙소?.["주소"]}</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* 2박3일 */}
          {planSet.twoday && (
            <div>
              <h4>🏖 2박3일</h4>
              {planSet.twoday.map((d) => (
                <div key={d.day}>
                  <h5>Day {d.day}</h5>
                  <ul>
                    <li>{d.장소?.["여행지명칭"]} 📍 {d.장소?.["주소"]}</li>
                    <li>음식점: {d.음식점?.["여행지명칭"]} 📍 {d.음식점?.["주소"]}</li>
                    {d.숙소 && <li>숙소: {d.숙소?.["여행지명칭"]} 📍 {d.숙소?.["주소"]}</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* 3박4일 */}
          {planSet.threeday && (
            <div>
              <h4>🌴 3박4일</h4>
              {planSet.threeday.map((d) => (
                <div key={d.day}>
                  <h5>Day {d.day}</h5>
                  <ul>
                    <li>{d.장소?.["여행지명칭"]} 📍 {d.장소?.["주소"]}</li>
                    <li>음식점: {d.음식점?.["여행지명칭"]} 📍 {d.음식점?.["주소"]}</li>
                    {d.숙소 && <li>숙소: {d.숙소?.["여행지명칭"]} 📍 {d.숙소?.["주소"]}</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
