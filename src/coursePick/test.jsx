// TwoSeaApisMinimal.jsx
import { useState } from "react";
import axios from "axios";

// ✅ 해양수산부_여행지 정보(API1)만 사용
const API1 =
  "https://api.odcloud.kr/api/15120316/v1/uddi:10b94f1d-182b-47a2-9e0e-b83eb87b9211";
const API1_KEY = "aYAgtkcw4xIezKCHqhWw3qRxU4rF2jdWzHf4ktVwIGIORyP7L9jBpTBKivbQrzrFF4Z0UUWmFND4Gu8sueoxmQ==";

// 공통 호출 (ODcloud 규격)
async function fetchOdcloud({ url, key, page = 1, perPage = 5000 }) {
  const res = await axios.get(url, {
    params: { page, perPage, returnType: "JSON" },
    headers: { Authorization: `Infuser ${key}` },
  });
  return res.data?.data ?? [];
}

// 값 추출 유틸
const pickFirst = (obj, keys = []) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

// ✅ API1 전용: '체험'만 걸러내는 헬퍼
function isExperienceApi1(row) {
  const categoryHints = [
    "관광지분류","카테고리","분류","업종","유형","서비스유형","테마",
    "program","프로그램","체험프로그램","체험종류","체험유형","체험카테고리"
  ];
  for (const k of categoryHints) {
    const v = row?.[k];
    if (v && String(v).includes("체험")) return true;
  }
  for (const v of Object.values(row || {})) {
    if (v && String(v).includes("체험")) return true;
  }
  return false;
}

// API1 → {name, address}
function mapApi1Row(row) {
  const name = pickFirst(row, ["여행지명칭", "명칭", "관광지명", "여행지 명칭", "title"]);
  const addr = pickFirst(row, ["주소", "소재지주소", "소재지도로명주소", "지번주소", "addr", "address"]);
  return { source: "API1", name, address: addr };
}

// 중복 제거(이름+주소)
function dedupe(list) {
  const seen = new Set();
  return list.filter((x) => {
    const key = `${x.name}|${x.address}`;
    if (!x.name) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function TwoSeaApisMinimal() {
  const [loading, setLoading] = useState(false);
  const [page1, setPage1] = useState(1);
  const [perPage1, setPerPage1] = useState(5000);
  const [items, setItems] = useState([]);

  // [마을이름]체험이름 형식
  function isVillageExperienceFormat(name) {
    return /^\[[^\]]+\].*체험/.test(name);
  }

  // 제외할 키워드
  const EXCLUDE_KEYWORDS = ["펜션","콘도","민박","도자기","고구마","홈스테이","역사","마늘"];
  function excludeByKeywords(name) {
    return !EXCLUDE_KEYWORDS.some(kw => name.includes(kw));
  }

  const fetchAll = async () => {
    if (!API1_KEY) {
      alert("환경변수에 VITE_ODCLOUD_KEY_API1를 설정하세요.");
      return;
    }
    setLoading(true);
    try {
      // ✅ API1만 호출
      const r1 = await fetchOdcloud({
        url: API1,
        key: API1_KEY,
        page: page1,
        perPage: perPage1,
      });

      // 1) API1: 체험만 남기고 매핑
      const list1OnlyExp = r1.filter(isExperienceApi1).map(mapApi1Row);

      // 2) 전라남도만
      const onlyJeonnam = (it) =>
        it.address && (it.address.includes("전라남도") || it.address.includes("전남"));
      const filtered1 = list1OnlyExp.filter(onlyJeonnam);

      // 3) 중복 제거
      let merged = dedupe(filtered1);

      // 4) [마을]...체험 + 제외 키워드 필터
      merged = merged
        .filter(it => isVillageExperienceFormat(it.name))
        .filter(it => excludeByKeywords(it.name));

      setItems(merged);
    } catch (e) {
      console.error(e);
      alert("조회 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>해양수산부 여행지(체험) 간단 조회 — 전라남도 / [마을]…체험 / 제외키워드 적용</h3>

      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>API1: 해양수산부_여행지 정보</div>
        <label>page </label>
        <input
          value={page1}
          onChange={(e) => setPage1(Number(e.target.value) || 1)}
          style={{ width: 80 }}
        />
        <label style={{ marginLeft: 8 }}>perPage </label>
        <input
          value={perPage1}
          onChange={(e) => setPerPage1(Number(e.target.value) || 5000)}
          style={{ width: 80 }}
        />
      </div>

      <button onClick={fetchAll} disabled={loading}>
        {loading ? "불러오는 중..." : "API1 조회"}
      </button>

      <ul style={{ marginTop: 16, lineHeight: 1.6 }}>
        {items.map((it, idx) => (
          <li key={idx}>
            <strong>[{it.source}] {it.name}</strong>
            {it.address && <div style={{ color: "#555" }}>{it.address}</div>}
          </li>
        ))}
        {!loading && items.length === 0 && <div style={{ color: "#888" }}>결과가 없습니다.</div>}
      </ul>
    </div>
  );
}
