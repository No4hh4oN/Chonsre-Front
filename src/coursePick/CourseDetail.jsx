/* eslint-disable no-unused-vars */
import Header from "../components/header";
import { useState, useEffect, useRef } from "react";
import "./CourseDetail.css";
import { useLocation } from "react-router-dom";
import regionImg from "/images/BgImg2.png";
import placeIcon from "/images/placeIcon.png";

export default function CourseDetail() {
    const location = useLocation();

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // 전달/복원된 코스 정보
    const [courseInfo, setCourseInfo] = useState({ period: "", region: "" });

    // 지도 & 지오코더 레퍼런스
    const mapRef = useRef(null);
    const geocoderRef = useRef(null);

    // ✅ 우선순위에 따라 초기 중심을 결정하는 헬퍼
    const pickBestCenterInput = () => {
        const s = location.state || {};
        // 1) center: { lat, lng } (CoursePick에서 직접 넘겨줄 수 있음)
        if (s.center && typeof s.center.lat === "number" && typeof s.center.lng === "number") {
            return { type: "coords", coords: s.center };
        }
        // 2) address: "경기도 양평군 양서면 ..." 같은 풀주소
        if (s.address && typeof s.address === "string" && s.address.trim()) {
            return { type: "address", query: s.address.trim() };
        }
        // 3) region: "경기도 양평군" 같은 행정명
        const region = (s.region || courseInfo.region || "").trim();
        if (region) return { type: "address", query: region };

        // 4) 없으면 서울시청 좌표 fallback
        return { type: "coords", coords: { lat: 37.5665, lng: 126.9780 } };
    };

    // "n박 m일" → 일수 계산
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

    // 라우터 state/세션 → courseInfo 복원
    useEffect(() => {
        const s = location.state;
        if (s?.region || s?.period) {
            const next = { region: s.region || "", period: s.period || "" };
            setCourseInfo(next);
            sessionStorage.setItem("lastCourse", JSON.stringify(next));
            return;
        }
        const saved = sessionStorage.getItem("lastCourse");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCourseInfo({
                    region: parsed.region || "",
                    period: parsed.period || "",
                });
            } catch (error) {
                console.error(error);
            }
        }
    }, [location.state]);

    // ✅ 주소/좌표 입력을 LatLng로 바꿔주는 비동기 함수
    const resolveCenter = (kakao, geocoder, input) =>
        new Promise((resolve) => {
            if (input.type === "coords") {
                resolve(new kakao.maps.LatLng(input.coords.lat, input.coords.lng));
                return;
            }
            // type === "address"
            geocoder.addressSearch(input.query, (result, status) => {
                if (status === kakao.maps.services.Status.OK && result[0]) {
                    const { x, y } = result[0];
                    resolve(new kakao.maps.LatLng(y, x));
                } else {
                    // 지오코딩 실패 시 서울시청으로 폴백
                    resolve(new kakao.maps.LatLng(37.5665, 126.9780));
                }
            });
        });

    // ✅ SDK 로드 + 지도 "초기 중심"을 선택값으로 생성
    useEffect(() => {
        const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

        const init = async () => {
            window.kakao.maps.load(async () => {
                const container = document.getElementById("map");
                if (!container) return;

                const kakao = window.kakao;
                const geocoder = new kakao.maps.services.Geocoder();
                geocoderRef.current = geocoder;

                // 선택값(중심 입력) 결정 → LatLng 해석
                const input = pickBestCenterInput();
                const centerLatLng = await resolveCenter(kakao, geocoder, input);

                // ✅ 처음부터 선택한 좌표로 지도를 생성
                mapRef.current = new kakao.maps.Map(container, {
                    center: centerLatLng,
                    level: 7,
                });
            });
        };

        if (window.kakao?.maps) {
            init();
            return;
        }

        const existed = document.querySelector('script[src^="//dapi.kakao.com/v2/maps/sdk.js"]');
        if (existed) {
            existed.addEventListener("load", init, { once: true });
        } else {
            const script = document.createElement("script");
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services`;
            script.async = true;
            script.addEventListener("load", init, { once: true });
            document.head.appendChild(script);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    // ✅ 선택값이 바뀌면(다른 지역/주소로 들어온 경우) 지도 중심 즉시 갱신
    useEffect(() => {
        if (!mapRef.current || !geocoderRef.current || !window.kakao?.maps) return;
        (async () => {
            const kakao = window.kakao;
            const input = pickBestCenterInput();
            const centerLatLng = await resolveCenter(kakao, geocoderRef.current, input);
            mapRef.current.setCenter(centerLatLng);
        })();
    }, [courseInfo.region, location.state]);

    return (
        <div className="CourseDetail">
            <Header />
            <img className="detail-main-img" src={regionImg} alt="지역대표이미지" />

            <div className="detail-course-info">
                <div className="detail-course-info-left">
                    <div className="detail-course-period">
                        {courseInfo.period || "기간 미정"}
                    </div>
                    <div className="detail-course-region">
                        {courseInfo.region || "지역 미정"}
                    </div>
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
                    <button>코스 저장하기</button>
                </div>
            </div>

            <hr
                style={{
                    border: "none",
                    height: "2px",
                    width: "1200px",
                    backgroundColor: "#E7ECF1",
                    marginTop: "30px",
                }}
            />

            <div className="detail-course-period-1day">
                {Array.from({ length: daysFromPeriod(courseInfo.period) }, (_, i) => (
                    <span key={i}>{i + 1}일차</span>
                ))}
            </div>

            <div className="day-course-place-container">
                <div className="place-title-img">
                    <img src={regionImg} alt="장소이미지" />
                    <div className="place-title">
                        <span>1</span>
                        <div className="place-title-text">양평 두물머리</div>
                    </div>
                </div>
            </div>

            <div className="course-detail-contents-box">
                <img src={regionImg} alt="장소이미지" />
                <div className="course-detail-contents-text">
                    <div className="course-detail-contents-top-text">
                        <div className="course-detail-contents-title">양평 두물머리</div>
                        <img src={placeIcon} alt="장소아이콘" />
                        <div className="course-detail-place-address">
                            경기도 양평군 양서면 두물머리길 145
                        </div>
                    </div>
                    <div className="course-detail-contents-subcontents">
                        {/* 설명 */}
                    </div>
                </div>
            </div>

            <span className="course-detail-map-title">위치 정보</span>
            <div id="map" className="course-detail-map-box" />
        </div>
    );
}
