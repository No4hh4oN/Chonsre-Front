/* eslint-disable no-unused-vars */
import Header from "../components/header";
import carrier from "/images/carrier.png";
import pickdrop from "/images/dropdown-up.png";
import pickdowndrop from "/images/dropdown-down.png";
import regionImg from "/images/BgImg2.png";
import backarrow from "/images/arrow-back.png";
import nextarrow from "/images/arrow-next.png";
import { useState } from "react";
import axios from "axios";
import "./CoursePick.css";
import { useNavigate } from "react-router-dom";

// ====== [추가] API1 설정 및 유틸 ======
const API1 ="https://api.odcloud.kr/api/15120316/v1/uddi:10b94f1d-182b-47a2-9e0e-b83eb87b9211";

const API1_KEY = import.meta.env.VITE_API1_KEY;



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
        if (v !== undefined && v !== null && String(v).trim() !== "")
        return String(v).trim();
    }
    return "";
};

// API1 전용: '체험'만 걸러내기
function isExperienceApi1(row) {
    const categoryHints = [
        "관광지분류",
        "카테고리",
        "분류",
        "업종",
        "유형",
        "서비스유형",
        "테마",
        "program",
        "프로그램",
        "체험프로그램",
        "체험종류",
        "체험유형",
        "체험카테고리",
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

// API1 → { name, address }
function mapApi1Row(row) {
    const name = pickFirst(row, [
        "여행지명칭",
        "명칭",
        "관광지명",
        "여행지 명칭",
        "title",
    ]);
    const addr = pickFirst(row, [
        "주소",
        "소재지주소",
        "소재지도로명주소",
        "지번주소",
        "addr",
        "address",
    ]);
    return { source: "API1", name, address: addr };
}

// [마을]…체험 형식 필터
function isVillageExperienceFormat(name) {
    return /^\[[^\]]+\].*체험/.test(name);
}

// 제외 키워드
const EXCLUDE_KEYWORDS = [
    "펜션",
    "콘도",
    "민박",
    "도자기",
    "고구마",
    "홈스테이",
    "역사",
    "마늘",
];
function excludeByKeywords(name) {
    return !EXCLUDE_KEYWORDS.some((kw) => name?.includes(kw));
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

// 주소 → region/town 파싱: "전라남도 강진군 마량면 …"
function toRegionTown(address, fallbackName = "") {
    if (!address) {
        return { region: fallbackName || "지역 미상", town: "" };
    }
    const parts = address.split(/\s+/).filter(Boolean);
    const province = parts[0] || "";
    const cityGun = parts[1] || ""; // ex) 강진군, 순천시 등
    const region = province && cityGun ? `${province} ${cityGun} 코스` : address;
    const town = cityGun || "";
    return { region, town };
}

// ====== 컴포넌트 시작 ======
export default function CoursePick() {
    const navigate = useNavigate();

    const Course_TYPES = ["농촌", "어촌", "그외"];
    const Course_Period = [
        "당일치기",
        "1박 2일",
        "2박 3일",
        "3박 4일",
        "4박 5일",
        "5박 6일",
    ];

    // 선택 값
    const [selectedType, setSelectedType] = useState("");
    const [selectedStyle, setSelectedStyle] = useState(""); // 현재 UI에는 스타일 드롭이 없지만 구조 유지
    const [selectedPeriod, setSelectedPeriod] = useState("");

    // 드롭다운
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);

    const toggleTypeDropdown = () => setIsTypeDropdownOpen((prev) => !prev);
    const toggleStyleDropdown = () => setIsStyleDropdownOpen((prev) => !prev);
    const togglePeriodDropdown = () => setIsPeriodDropdownOpen((prev) => !prev);

    // ====== [변경] 결과 데이터(더미 제거, API 결과로 대체) ======
    const [courses, setCourses] = useState([]);

    // 찾기 클릭 → API1 호출 후 카드 데이터로 매핑
    const handleSearchClick = async () => {
    try {
        if (selectedType && selectedType !== "어촌") {
        setCourses([]);
        return;
        }

        if (!API1_KEY) {
        alert("VITE_ODCLOUD_KEY_API1가 설정되지 않았습니다.");
        return;
        }

        const raw = await fetchOdcloud({ url: API1, key: API1_KEY, page: 1, perPage: 5000 });

        const expOnly = raw.filter(isExperienceApi1).map(mapApi1Row);

        // 전남만
        const onlyJeonnam = (it) =>
        it.address && (it.address.includes("전라남도") || it.address.includes("전남"));

        let list = dedupe(
        expOnly
            .filter(it => onlyJeonnam(it))
            .filter(it => isVillageExperienceFormat(it.name))
            .filter(it => excludeByKeywords(it.name))
        );

        const periodLabel = selectedPeriod || "당일치기";
        const mapped = list.map((it, idx) => {
        const { region, town } = toRegionTown(it.address, it.name);
        return {
            id: idx + 1,
            period: periodLabel,
            region,
            town,
            image: regionImg,
            rawName: it.name,
            rawAddress: it.address
        };
    });

            setCurrentPage(1);
            setCourses(mapped);
        } catch (error) {
            console.error("검색 요청 실패:", error);
            alert("검색 요청 실패. 콘솔을 확인하세요.");
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
                    {Course_TYPES.map((type) => (
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
                        {Course_Period.map((period) => (
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

            <button onClick={handleSearchClick}>찾기</button>
        </div>

        <div className="pick-course-contents">
            {currentData.map((course) => (
            <div
            key={course.id}
            className="course-card"
            onClick={() => {
                // 새로고침 대비: 마지막 선택 코스 저장 (주소/이름까지 저장하면 복구도 쉬움)
                sessionStorage.setItem(
                "lastCourse",
                JSON.stringify({
                    region: course.region.replace(/\s*코스$/, ""),
                    period: course.period,
                    address: course.rawAddress,
                    placeName: course.rawName,
                })
                );

                // ✅ 주소/이름을 함께 state로 넘기기
                navigate(`/CourseDetail/${course.id}`, {
                state: {
                    region: course.region.replace(/\s*코스$/, ""),
                    period: course.period,
                    address: course.rawAddress,  // ★ CourseDetail에서 지오코딩해서 초기 중심으로 사용
                    placeName: course.rawName,   // (옵션) 상세에서 제목 등에 활용 가능
                    // center: { lat, lng }       // (선택) 나중에 좌표까지 미리 구하면 여기로 넘기면 됨
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
            {courses.length === 0 && (
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
                            className={`pagination-button ${
                            currentPage === page ? "active" : ""
                            }`}
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </button>
                        );
                    })}
                </div>
                <button
                    className="pagination-arrow"
                    onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    >
                    <img src={nextarrow} alt="다음" />
                </button>
            </div>
        </div>
    );
}
