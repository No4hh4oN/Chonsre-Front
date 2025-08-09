/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import axios from "axios";

/**
 * - 자연 관광지: contentTypeId=12 + cat1=A01
 * - 음식점(한식+전통찻집): contentTypeId=39 + cat1=A05 + (cat2=A0502|A0510)
 * - 일정 조건: 선택한 숙박수 → days 만큼 "관광지 ≥ days" AND "음식점 ≥ days" 인 시군구만 선택 가능
 * - 일정: 일자당 자연1 + 음식1 (중복 금지)
 */

const TOUR_API_KEY = import.meta.env.VITE_TOURAPI_KEY ;

// (옵션) 자연 키워드 – 필요 시 사용
const NATURE_POS_KWS = [
  "자연","산","계곡","폭포","호수","강","천","습지","갈대","억새","바다","해변","해수욕장","해안","섬",
  "오름","정원","수목원","식물원","삼림욕","숲","숲길","둘레길","트레킹","산책로","등산로",
  "국립공원","도립공원","군립공원","자연휴양림","공원","동굴","암봉","해안절경","전망대"
];

function baseParams(extra = {}) {
  return {
    serviceKey: TOUR_API_KEY,
    MobileOS: "ETC",
    MobileApp: "Chonsre",
    _type: "json",
    ...extra,
  };
}

// ---------------- 지역 코드 ----------------
async function fetchAreas() {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaCode2", { params: baseParams() });
  return r?.data?.response?.body?.items?.item || [];
}
async function fetchSigungu(areaCode) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaCode2", { params: baseParams({ areaCode }) });
  return r?.data?.response?.body?.items?.item || [];
}

// ---------------- 데이터 조회 ----------------
async function fetchNatureSights({ areaCode, pageNo = 1, numOfRows = 120 }) {
  const r = await axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2", {
    params: baseParams({
      contentTypeId: 12, cat1: "A01",
      areaCode,
      pageNo, numOfRows,
    }),
  });
  return r?.data?.response?.body?.items?.item || [];
}
async function fetchFoodPlaces({ areaCode, pageNo = 1, numOfRows = 120 }) {
  const [resKorean, resTea] = await Promise.all([
    axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2", {
      params: baseParams({ contentTypeId: 39, cat1: "A05", cat2: "A0502", areaCode, pageNo, numOfRows }),
    }),
    axios.get("https://apis.data.go.kr/B551011/KorService2/areaBasedList2", {
      params: baseParams({ contentTypeId: 39, cat1: "A05", cat2: "A0510", areaCode, pageNo, numOfRows }),
    }),
  ]);
  const korean = resKorean?.data?.response?.body?.items?.item || [];
  const tea = resTea?.data?.response?.body?.items?.item || [];
  return [...korean, ...tea].filter((v,i,arr)=>arr.findIndex(t=>t.contentid===v.contentid)===i);
}

// ---------------- 보정/정렬 ----------------
function filterNature(raw = []) { return raw; }
function orderByImageThenTitle(list = []) {
  return [...list].sort((a,b)=> {
    const ai = a.firstimage ? 0 : 1, bi = b.firstimage ? 0 : 1;
    if (ai!==bi) return ai-bi;
    return (a.title||"").localeCompare(b.title||"", "ko");
  });
}

// ---------------- 시군(구) 추출 ----------------
const SIGUNGU_SUFFIXES = ["시","군","구"];
function extractSigungu(addr = "") {
  if (!addr) return "";
  const parts = String(addr).trim().split(/\s+/);
  if (parts[0]?.includes("세종")) return "세종특별자치시";
  const first = parts[0]||"", second = parts[1]||"";
  const isMetro = /(특별자치도|특별시|광역시|특별자치시|도|시)$/.test(first);
  if (isMetro && second && SIGUNGU_SUFFIXES.some(s=>second.endsWith(s))) return second;
  const found = parts.find(w=>SIGUNGU_SUFFIXES.some(s=>w.endsWith(s)));
  return found || "";
}

// =====================================================
// 컴포넌트
// =====================================================
export default function TourNatureAndFood() {
  const [areas, setAreas] = useState([]);
  const [sigungu, setSigungu] = useState([]); // 원본 시군구 목록(이름/코드)
  const [areaCode, setAreaCode] = useState("");
  const [sigunguCode, setSigunguCode] = useState(""); // 선택된 시군구(조건 통과 중 하나 또는 전체)

  // 원본(전체) 데이터: 재필터링을 위해 유지
  const [rawNature, setRawNature] = useState([]);
  const [rawFood, setRawFood] = useState([]);

  // 화면에 보여줄(조건 통과) 데이터
  const [natureItems, setNatureItems] = useState([]);
  const [foodItems, setFoodItems] = useState([]);

  // 조건 충족 시군구 이름 목록 (드롭다운에만 표시)
  const [eligibleSigunguNames, setEligibleSigunguNames] = useState([]);

  const [loading, setLoading] = useState(false);

  // 일정
  const [nights, setNights] = useState(2); // 2박3일
  const days = nights + 1;
  const [planBySigungu, setPlanBySigungu] = useState({});

  // 초기 로딩
  useEffect(() => {
    (async () => {
      try { setLoading(true); setAreas(await fetchAreas()); }
      catch(e){ console.error(e); alert("초기 로딩 오류"); }
      finally{ setLoading(false); }
    })();
  }, []);

  // 광역 변경 시 시군구 로딩
  useEffect(() => {
    (async () => {
      setSigunguCode("");
      setRawNature([]); setRawFood([]);
      setNatureItems([]); setFoodItems([]);
      setPlanBySigungu({});
      setEligibleSigunguNames([]);

      if (!areaCode) { setSigungu([]); return; }
      try { setSigungu(await fetchSigungu(areaCode)); }
      catch(e){ console.error(e); alert("시군구 로딩 오류"); }
    })();
  }, [areaCode]);

  // 검색 (광역 전체 조회 → 조건 충족 시군구만 반영)
  const onSearch = async () => {
    if (!areaCode) return alert("광역(도/시)을 선택하세요.");
    setLoading(true);
    try {
      const [nRaw, fRaw] = await Promise.all([
        fetchNatureSights({ areaCode }),
        fetchFoodPlaces({ areaCode }),
      ]);
      const nSorted = orderByImageThenTitle(filterNature(nRaw));
      const fSorted = orderByImageThenTitle(fRaw);

      setRawNature(nSorted);
      setRawFood(fSorted);

      // 현재 nights 기준으로 조건 적용
      applyDayConstraint({ nSorted, fSorted, forceSigunguCode: "" });
    } catch (e) {
      console.error(e);
      alert("조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // nights 변경 시, 이미 로드된 데이터가 있으면 즉시 재필터
  useEffect(() => {
    if (rawNature.length || rawFood.length) {
      applyDayConstraint({ nSorted: rawNature, fSorted: rawFood, forceSigunguCode: sigunguCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nights]);

  // 조건 적용 함수: days 충족 시군구만 남기고, 드롭다운/목록/선택 동기화
  const applyDayConstraint = ({ nSorted, fSorted, forceSigunguCode = "" }) => {
    const toSg = (it)=>extractSigungu(it?.addr1||it?.addr2||"");

    // 시군구별 개수 집계
    const countMap = {}; // { sgName: { nature, food } }
    for (const it of nSorted) {
      const sg = toSg(it); if (!sg) continue;
      (countMap[sg] ??= { nature:0, food:0 }).nature++;
    }
    for (const it of fSorted) {
      const sg = toSg(it); if (!sg) continue;
      (countMap[sg] ??= { nature:0, food:0 }).food++;
    }

    // ✅ 조건: nature ≥ days AND food ≥ days
    const eligible = Object.entries(countMap)
      .filter(([, v]) => v.nature >= days && v.food >= days)
      .map(([k]) => k);

    setEligibleSigunguNames(eligible);

    // 현재 선택값 유지 가능 여부 판단
    const nextSigunguCode = forceSigunguCode && eligible.includes(codeToName(forceSigunguCode))
      ? forceSigunguCode
      : (eligible.length ? "" : ""); // 조건 불만족이면 전체로 리셋(전체=빈 문자열)

    setSigunguCode(nextSigunguCode);

    // 화면용 목록 필터
    const selectedName = codeToName(nextSigunguCode); // "" 이면 전체
    const filterByEligible = (arr) =>
      arr.filter(it => {
        const sg = toSg(it);
        if (!sg) return false;
        if (!eligible.includes(sg)) return false;
        if (selectedName && sg !== selectedName) return false; // 특정 시군구만
        return true;
      });

    setNatureItems(filterByEligible(nSorted));
    setFoodItems(filterByEligible(fSorted));

    // 일정 초기화
    setPlanBySigungu({});
  };

  // 코드→이름, 이름→코드 헬퍼
  const codeToName = (code) => {
    if (!code) return "";
    const found = sigungu.find(s => String(s.code) === String(code));
    return found?.name || "";
  };
  const nameToCode = (name) => {
    if (!name) return "";
    const found = sigungu.find(s => s.name === name);
    return found ? String(found.code) : "";
  };

  // 일정 생성 (조건 충족 시군구만, 혹은 사용자가 선택한 1개 시군구만)
  const makePlan = () => {
    if (!natureItems.length || !foodItems.length) {
      return alert("조건을 만족하는 시군구가 없거나 데이터가 부족합니다. (광역/숙박 수를 조정해보세요)");
    }

    const toSg = (it)=>extractSigungu(it?.addr1||it?.addr2||"");
    const selectedName = codeToName(sigunguCode); // ""면 전체

    // 시군구별 묶기
    const bySgNature = {};
    const bySgFood = {};
    for (const it of natureItems) {
      const sg = toSg(it); if (!sg) continue;
      if (selectedName && sg !== selectedName) continue;
      (bySgNature[sg] ??= []).push(it);
    }
    for (const it of foodItems) {
      const sg = toSg(it); if (!sg) continue;
      if (selectedName && sg !== selectedName) continue;
      (bySgFood[sg] ??= []).push(it);
    }

    const allSg = Array.from(new Set([...Object.keys(bySgNature), ...Object.keys(bySgFood)])).sort();
    if (!allSg.length) return alert("선택한 조건에 맞는 시군구가 없습니다.");

    const plan = {};
    for (const sg of allSg) {
      const ns = bySgNature[sg] || [];
      const fs = bySgFood[sg] || [];
      // 안전망: 조건상 ns.length, fs.length 둘 다 ≥ days 이어야 함
      if (ns.length < days || fs.length < days) continue;

      const usedN = new Set();
      const usedF = new Set();
      let ni = 0, fi = 0;
      const daysArr = [];

      for (let d = 1; d <= days; d++) {
        let nature = null, food = null;
        // 자연 1
        while (ni < ns.length && !nature) {
          const c = ns[ni++];
          if (!usedN.has(c.contentid)) { usedN.add(c.contentid); nature = c; }
        }
        // 음식 1
        while (fi < fs.length && !food) {
          const c = fs[fi++];
          if (!usedF.has(c.contentid)) { usedF.add(c.contentid); food = c; }
        }
        daysArr.push({ day: d, nature, food });
      }

      // 완전히 채운 시군구만 포함
      if (daysArr.every(s => s.nature && s.food)) {
        plan[sg] = daysArr;
      }
    }

    if (!Object.keys(plan).length) {
      alert("해당 조건으로 완전한 일정을 만들 수 없습니다. 숙박 수를 줄이거나 광역을 바꿔보세요.");
      setPlanBySigungu({});
      return;
    }

    setPlanBySigungu(plan);
  };

  // 드롭다운에 표시할 시군구(조건 충족만)
  const eligibleSigunguOptions = sigungu.filter(s => eligibleSigunguNames.includes(s.name));

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h2>자연 관광지 + 음식점 검색 → 조건 충족 시군구만 선택 → 일정 생성</h2>

      {/* 컨트롤 */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#666" }}>광역(도/시)</div>
          <select value={areaCode} onChange={(e)=>setAreaCode(e.target.value)} style={{ minWidth: 220, padding: 6 }}>
            <option value="">선택하세요</option>
            {areas.map((a)=>(<option key={a.code} value={a.code}>{a.name}</option>))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#666" }}>
            시군구(조건 충족만 표시) — 필요 수량: 관광지 {days}개, 음식점 {days}개
          </div>
          <select
            value={sigunguCode}
            onChange={(e)=>applyDayConstraint({ nSorted: rawNature, fSorted: rawFood, forceSigunguCode: e.target.value })}
            style={{ minWidth: 280, padding: 6 }}
            disabled={!eligibleSigunguOptions.length}
          >
            <option value="">전체(조건 충족 시군구)</option>
            {eligibleSigunguOptions.map((s)=>(
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          {!eligibleSigunguOptions.length && (rawNature.length || rawFood.length) && (
            <div style={{ fontSize: 12, color: "#c00", marginTop: 6 }}>
              조건을 만족하는 시군구가 없습니다. 숙박 수를 줄이거나 다른 광역을 선택해보세요.
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#666" }}>여행 기간</div>
          <select value={nights} onChange={(e)=>setNights(Number(e.target.value))} style={{ minWidth: 160, padding: 6 }}>
            <option value={0}>당일치기 (0박1일)</option>
            <option value={1}>1박2일</option>
            <option value={2}>2박3일</option>
            <option value={3}>3박4일</option>
            <option value={4}>4박5일</option>
          </select>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>일차 수: <b>{days}일</b></div>
        </div>

        <button onClick={onSearch} disabled={!areaCode || loading} style={{ padding: "6px 12px" }}>
          {loading ? "불러오는 중..." : "검색"}
        </button>

        <button
          onClick={makePlan}
          disabled={loading || !eligibleSigunguOptions.length || !(natureItems.length && foodItems.length)}
          style={{ padding: "6px 12px" }}
        >
          일정 생성
        </button>
      </div>

      {/* 자연 관광지 */}
      <h3 style={{ marginTop: 20 }}>자연 관광지 (조건 충족 시군구만 표시)</h3>
      {!loading && natureItems.length === 0 && <div style={{ color: "#888" }}>없음</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {natureItems.map((it, idx) => (
          <div key={`nature-${it.contentid || idx}`} style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
            {it.firstimage ? (
              <img src={it.firstimage} alt={it.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
            ) : (
              <div style={{ height: 160, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>이미지 없음</div>
            )}
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{it.title}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>{it.addr1}</div>
              {it.overview && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                  {String(it.overview).replace(/<[^>]+>/g, "").slice(0, 140)}{String(it.overview).length > 140 ? "…" : ""}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 음식점 */}
      <h3 style={{ marginTop: 40 }}>음식점 (조건 충족 시군구만 표시)</h3>
      {!loading && foodItems.length === 0 && <div style={{ color: "#888" }}>없음</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {foodItems.map((it, idx) => (
          <div key={`food-${it.contentid || idx}`} style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
            {it.firstimage ? (
              <img src={it.firstimage} alt={it.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
            ) : (
              <div style={{ height: 160, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>이미지 없음</div>
            )}
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{it.title}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>{it.addr1}</div>
              {it.cat2 && (
                <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
                  {it.cat2 === "A0502" ? "한식" : it.cat2 === "A0510" ? "전통찻집" : ""}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 시군구별 일정 (완전 채워짐만) */}
      {Object.keys(planBySigungu).length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3>시군구별 일정 (총 {days}일 · 각 일자 자연+음식 1개씩)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Object.keys(planBySigungu).map((sg) => (
              <div key={sg} style={{ border: "1px solid #eaeaea", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>{sg}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                  {planBySigungu[sg].map((d) => (
                    <div key={`${sg}-day-${d.day}`} style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "8px 12px", fontWeight: 700 }}>Day {d.day}</div>
                      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr" }}>
                        {/* 자연 */}
                        <div style={{ borderTop: "1px solid #f0f0f0", padding: 10, minHeight: 180 }}>
                          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>자연 관광지</div>
                          <>
                            {d.nature.firstimage ? (
                              <img src={d.nature.firstimage} alt={d.nature.title} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }} />
                            ) : (
                              <div style={{ height: 120, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", borderRadius: 6 }}>이미지 없음</div>
                            )}
                            <div style={{ fontWeight: 600, marginTop: 6 }}>{d.nature.title}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>{d.nature.addr1}</div>
                          </>
                        </div>
                        {/* 음식 */}
                        <div style={{ borderTop: "1px solid #f0f0f0", padding: 10, minHeight: 180 }}>
                          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>음식점</div>
                          <>
                            {d.food.firstimage ? (
                              <img src={d.food.firstimage} alt={d.food.title} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }} />
                            ) : (
                              <div style={{ height: 120, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", borderRadius: 6 }}>이미지 없음</div>
                            )}
                            <div style={{ fontWeight: 600, marginTop: 6 }}>{d.food.title}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>{d.food.addr1}</div>
                          </>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
