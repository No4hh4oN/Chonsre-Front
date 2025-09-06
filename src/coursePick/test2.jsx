    /* eslint-disable no-unused-vars */
    //투어 데이터 필터링 테스트
    import { useEffect, useState } from "react";
    import axios from "axios";

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

    // ---------------- 데이터 조회 ----------------
    async function fetchNatureSights({ pageNo = 1, numOfRows = 120 }) {
    console.log("📡 [Nature API 요청]");
    const r = await axios.get(
        "https://apis.data.go.kr/B551011/KorService2/areaBasedList2",
        {
        params: baseParams({
            contentTypeId: 12, // 관광지
            areaCode: 38, // ✅ 전라남도
            pageNo,
            numOfRows,
        }),
        }
    );
    console.log("🔍 [Nature API 응답]:", r.data);
    return r?.data?.response?.body?.items?.item || [];
    }

    async function fetchFoodPlaces({ pageNo = 1, numOfRows = 120 }) {
    console.log("📡 [Food API 요청]");
    const r = await axios.get(
        "https://apis.data.go.kr/B551011/KorService2/areaBasedList2",
        {
        params: baseParams({
            contentTypeId: 39, // 음식점
            areaCode: 38, // ✅ 전라남도
            pageNo,
            numOfRows,
        }),
        }
    );
    console.log("🔍 [Food API 응답]:", r.data);
    return r?.data?.response?.body?.items?.item || [];
    }

    // ---------------- 숙소 조회 ----------------
    async function fetchAccommodations({ pageNo = 1, numOfRows = 120 }) {
    console.log("📡 [Accommodation API 요청]");
    const r = await axios.get(
        "https://apis.data.go.kr/B551011/KorService2/areaBasedList2",
        {
        params: baseParams({
            contentTypeId: 32, // 숙박
            areaCode: 38,      // 전라남도
            pageNo,
            numOfRows,
        }),
        }
    );
    console.log("🔍 [Accommodation API 응답]:", r.data);
    let items = r?.data?.response?.body?.items?.item || [];

    // ❌ 제외할 키워드 목록
    const EXCLUDE_KEYWORDS = ["모텔","호텔","리조트","호스텔","풀빌라","게스트","펜션","라마다"];

    // 필터 적용
    items = items.filter((it) => {
        const title = it.title || "";
        const addr = it.addr1 || "";
        return !EXCLUDE_KEYWORDS.some(
        (kw) => title.includes(kw) || addr.includes(kw)
        );
    });

    console.log("✅ [Accommodation items 필터 후]:", items);
    return items;
    }


    // ---------------- 정렬 ----------------
    function orderByImageThenTitle(list = []) {
    const sorted = [...list].sort((a, b) => {
        const ai = a.firstimage ? 0 : 1,
        bi = b.firstimage ? 0 : 1;
        if (ai !== bi) return ai - bi;
        return (a.title || "").localeCompare(b.title || "", "ko");
    });
    return sorted;
    }

    // =====================================================
    // 컴포넌트
    // =====================================================
    export default function TourNatureFoodStay() {
    const [natureItems, setNatureItems] = useState([]);
    const [foodItems, setFoodItems] = useState([]);
    const [stayItems, setStayItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const onSearch = async () => {
        console.log("▶️ [검색 시작]");
        setLoading(true);
        try {
        const [nRaw, fRaw, sRaw] = await Promise.all([
            fetchNatureSights({}),
            fetchFoodPlaces({}),
            fetchAccommodations({}),
        ]);
        setNatureItems(orderByImageThenTitle(nRaw));
        setFoodItems(orderByImageThenTitle(fRaw));
        setStayItems(orderByImageThenTitle(sRaw));
        } catch (e) {
        console.error("🚨 [조회 오류]:", e);
        } finally {
        setLoading(false);
        console.log("⏹ [검색 종료]");
        }
    };

    useEffect(() => {
        onSearch();
    }, []);

    return (
        <div style={{ padding: 20 }}>
        <h2>전라남도 관광지 + 음식점 + 숙소</h2>
        <button onClick={onSearch} disabled={loading}>
            {loading ? "불러오는 중..." : "다시 불러오기"}
        </button>

        {/* 자연 관광지 */}
        <h3 style={{ marginTop: 20 }}>자연 관광지</h3>
        {!loading && natureItems.length === 0 && <div>없음</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {natureItems.map((it, idx) => (
            <div key={it.contentid || idx} style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
                {it.firstimage ? (
                <img src={it.firstimage} alt={it.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                ) : (
                <div style={{ height: 160, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>이미지 없음</div>
                )}
                <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{it.title}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{it.addr1}</div>
                </div>
            </div>
            ))}
        </div>

        {/* 음식점 */}
        <h3 style={{ marginTop: 40 }}>음식점</h3>
        {!loading && foodItems.length === 0 && <div>없음</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {foodItems.map((it, idx) => (
            <div key={it.contentid || idx} style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
                {it.firstimage ? (
                <img src={it.firstimage} alt={it.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                ) : (
                <div style={{ height: 160, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>이미지 없음</div>
                )}
                <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{it.title}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{it.addr1}</div>
                </div>
            </div>
            ))}
        </div>

        {/* 숙소 */}
        <h3 style={{ marginTop: 40 }}>숙소</h3>
        {!loading && stayItems.length === 0 && <div>없음</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {stayItems.map((it, idx) => (
            <div key={it.contentid || idx} style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
                {it.firstimage ? (
                <img src={it.firstimage} alt={it.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                ) : (
                <div style={{ height: 160, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>이미지 없음</div>
                )}
                <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{it.title}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{it.addr1}</div>
                </div>
            </div>
            ))}
        </div>
        </div>
    );
}
