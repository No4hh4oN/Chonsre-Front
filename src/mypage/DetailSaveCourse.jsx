/* eslint-disable no-unused-vars */
import Header from "../components/header";
import { useState, useEffect, useRef, useMemo } from "react";
import "./DetailSaveCourse.css";
import { useLocation, useParams } from "react-router-dom";
import placeIcon from "/images/placeIcon.png";
import replaceDetail from "/images/replaceDetail.png";

export default function DetailSaveCourse() {
  const { id } = useParams(); // /DetailSaveCourse/:id (savedId)
  const location = useLocation();
  const navState = (location && location.state) || {};

  // 상단 정보
  const [startDate, setStartDate] = useState(navState?.svdStartDate || "");
  const [endDate, setEndDate] = useState(navState?.svdEndDate || "");
  const [courseInfo, setCourseInfo] = useState({
    period: calcPeriodText(navState?.svdStartDate, navState?.svdEndDate) || "",
    region: navState?.title || "",
  });

  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // 대표 이미지
  const [heroImg, setHeroImg] = useState(navState?.courseImgUrl || replaceDetail);

  // Kakao 지도
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const placesRef = useRef(null);
  const markersRef = useRef([]);

  // ===== GPT 설명 생성 상태 (원래 코드 유지) =====
  const OPENAI_KEY = import.meta.env.VITE_GPT_KEY;
  const [placeDescs, setPlaceDescs] = useState({});
  const [descLoadingKey, setDescLoadingKey] = useState(null);
  const abortRef = useRef(null);

  // 현재 선택된 장소
  const currentPlace = useMemo(() => {
    return days?.[selectedDay - 1]?.[selectedIdx] || null;
  }, [days, selectedDay, selectedIdx]);

  /* ============ 유틸 ============ */
  const PLACEHOLDER_LOCAL_SET = new Set([
    "/images/place.png",
    "/images/food.png",
    "/images/sleep.png",
  ]);
  const isBadForHero = (url) => {
    const u = (url || "").trim();
    if (!u) return true;
    return PLACEHOLDER_LOCAL_SET.has(u);
  };
  const VK_IMG = /^https?:\/\/tong\.visitkorea\.or\.kr\/cms\/resource\//i;
  const isVKImage = (u) => !!(u && typeof u === 'string' && VK_IMG.test(u.trim()));

  const placeKeyOf = (it) => {
    const t = (it?.title || "").trim();
    const a = (it?.address || "").trim();
    return `${t}__${a}`;
  };

  const clampLength = (raw) =>
    raw.replace(/\n+/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);

  /* ============ GPT 설명 생성 (원본 로직 유지) ============ */
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

  // 선택 변경 시 자동 설명 생성
  useEffect(() => {
    const it = currentPlace;
    if (!it) return;
    const key = placeKeyOf(it);
    if (placeDescs[key]) return;
    generatePlaceDescription(it, courseInfo.region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlace]);

  /* ===== 저장된/코스 상세 불러오기 ===== */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("로그인 토큰이 없습니다.");

        const label = (navState?.courseLabel ?? "").trim();
        const isLabeled = /^[ABC]$/.test(label);
        const courseId = isLabeled ? navState?.courseId : null;
        let detail = null;

        // 1) courseId 우선 조회
        if (courseId && isLabeled) {
          let res = await fetch(
            `https://smartzoo.shop/recommend/course/${courseId}`,
            { method: "GET", headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) detail = await res.json();
        }

        // 2) 폴백: saved 상세 (upcoming → past)
        if (!detail) {
          let res = await fetch(
            `https://smartzoo.shop/recommend/saved/upcoming/${id}`,
            { method: "GET", headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) {
            res = await fetch(
              `https://smartzoo.shop/recommend/saved/past/${id}`,
              { method: "GET", headers: { Authorization: `Bearer ${token}` } }
            );
          }
          if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(msg || `코스 상세 조회 실패 (status ${res.status})`);
          }
          detail = await res.json();
        }

        const courseData = detail?.course ?? detail?.data ?? detail;

        // 상단 정보
        setCourseInfo((prev) => ({
          region: courseData?.title || navState?.title || prev.region || "",
          period:
            calcPeriodText(navState?.svdStartDate, navState?.svdEndDate) ||
            prev.period || "",
        }));


        // 일정 + 숙소를 각 일차 마지막으로
        const mappedDays = (courseData?.days || []).map((d) => {
          const basePlaces = (d?.places || []).map((p) => ({
            title: p?.placeName || p?.title || "",
            address: p?.address || "",
            imgUrl: (p?.imgUrl || p?.image || p?.firstimage || p?.firstimage2 || "").trim(),
            category: p?.description || "",
          }));

          // 숙소 자동 추가는 A/B/C 라벨일 때만 동작
          if (!isLabeled) return basePlaces;
          const accom = courseData?.accommodation ?? {
            name: navState?.accommodationName || "",
            imgUrl: navState?.accommodationImgUrl || "",
            address: "",
          };
          const last = basePlaces[basePlaces.length - 1];
          const lastName = (last?.title || "").trim();
          const needAppend =
            accom?.name &&
            (!lastName ||
              !/숙|호텔|모텔|리조트|펜션|게스트|호스텔|hotel|motel|resort|pension|guest/i.test(lastName));
          return needAppend
            ? [...basePlaces, { title: accom.name, address: accom.address || "", imgUrl: accom.imgUrl || "", category: "숙소" }]
            : basePlaces;
        });

        setDays(mappedDays);
        setSelectedDay(1);
        setSelectedIdx(0);

        // 대표 이미지: 네비 VK 이미지 > 코스 내 유효 이미지 > (A/B/C일 때만) 숙소 이미지 > 대체
        const navImg = (navState?.courseImgUrl || "").trim();

        if (isVKImage(navImg)) {
          setHeroImg(navImg);
        } else {
          const firstNonPlaceholder =
            mappedDays
              .flat()
              .map((it) => (it?.imgUrl || "").trim())
              .find((u) => u && !isBadForHero(u)) || "";

          // 라벨이 A/B/C인 경우에만 숙소 이미지를 후보에 포함
          const accomImg = isLabeled
            ? (
                (courseData?.accommodation?.imgUrl ||
                  navState?.accommodationImgUrl ||
                  "")
              ).trim()
            : "";

          const firstValidHero =
            firstNonPlaceholder ||
            (accomImg && !isBadForHero(accomImg) ? accomImg : "");

          setHeroImg(firstValidHero || replaceDetail);
        }

        // 상단 날짜 (라우터 state 우선)
        if (!startDate && navState?.svdStartDate) setStartDate(navState.svdStartDate);
        if (!endDate && navState?.svdEndDate) setEndDate(navState.svdEndDate);
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ===== 유틸 ===== */
  function calcPeriodText(start, end) {
    if (!start || !end) return "";
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
    const e = new Date(ey, em - 1, ed, 0, 0, 0, 0).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((e - s) / dayMs) + 1);
    const nights = Math.max(0, days - 1);
    return nights === 0 ? "당일치기" : `${nights}박 ${days}일`;
  }

  function daysLengthFromPeriod(period = "") {
    const s = String(period).trim();
    if (!s) return 1;
    if (/당일/.test(s)) return 1;
    const m = s.match(/(\d+)\s*박\s*(\d+)\s*일/);
    if (m) return Math.max(1, parseInt(m[2], 10));
    const m2 = s.match(/(\d+)\s*일/);
    if (m2) return Math.max(1, parseInt(m2[1], 10));
    return 1;
  }

  // Kakao 지도 관련 (원본 로직 유지)
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

        const region = (courseInfo.region || "").trim();
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
      const existed = document.querySelector(
        'script[src^="//dapi.kakao.com/v2/maps/sdk.js"]'
      );
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

  const clearMarkers = () => {
    markersRef.current.forEach((ov) => ov.setMap(null));
    markersRef.current = [];
  };

  const PIX_OFFSETS = [
    [0, 0], [14, 0], [-14, 0], [0, 14], [0, -14],
    [10, 10], [-10, 10], [10, -10], [-10, -10],
  ];

  const geocodeOne = (kakao, geocoder, places, item, regionHint) =>
    new Promise((resolve) => {
      const addr = (item.address || "").trim();
      const title = (item.title || "").trim();
      const tryKeyword = () => {
        const keyword = `${regionHint || ""} ${title}`.trim();
        if (!keyword) return resolve(null);
        places.keywordSearch(
          keyword,
          (data, status) => {
            if (status === kakao.maps.services.Status.OK && data[0]) {
              return resolve(new kakao.maps.LatLng(data[0].y, data[0].x));
            }
            resolve(null);
          },
          { page: 1, size: 1 }
        );
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
      const pos = await geocodeOne(
        kakao,
        geocoder,
        places,
        items[i],
        courseInfo.region
      );
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
    }
  };

  useEffect(() => {
    if (days.length > 0) drawMarkersForDay(selectedDay - 1);
    else clearMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, selectedDay]);

  const imageFor = (item) => (item?.imgUrl || "").trim() || replaceDetail;

  return (
    <div className="CourseDetail">
      <Header />
      <img className="save-detail-main-img" src={isVKImage(heroImg) ? heroImg : replaceDetail} alt="지역대표이미지" />

      <div className="save-detail-course-info">
        <div className="save-detail-course-info-left">
          <div className="save-detail-course-period">{courseInfo.period || "기간 미정"}</div>
          <div className="save-detail-course-region">{courseInfo.region || "지역 미정"}</div>
          <span>
            {courseInfo.region
              ? `${courseInfo.region}에 맞춘 ${courseInfo.period || "맞춤"} 촌캉스를 즐겨보세요.`
              : "원하는 지역과 기간을 선택해 맞춤 코스를 구성해보세요."}
          </span>
        </div>

        <div className="save-detail-course-info-rightBox">
          <div className="save-detail-course-day-box">
            <span>촌캉스 일자</span>
            <div className="save-detail-course-date-selected">
              <input
                type="text"
                className="save-detail-day-selected"
                placeholder="YY / MM / DD"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <div className="save-detail-day-dash">-</div>
              <input
                type="text"
                className="save-detail-day-selected"
                placeholder="YY / MM / DD"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
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

      <div className="course-info-container">
        <div className="save-detail-course-period-1day">
          {Array.from(
            { length: Math.max(daysLengthFromPeriod(courseInfo.period), days.length || 0) },
            (_, i) => (
              <span
                key={i}
                className={i + 1 === selectedDay ? "active" : ""}
                onClick={() => {
                  setSelectedDay(i + 1);
                  setSelectedIdx(0);
                }}
                style={{ cursor: "pointer" }}
              >
                {i + 1}일차
              </span>
            )
          )}
        </div>

        {/* 일차별 장소 미리보기(상단 가로 카드) */}
        <div className="day-course-place-container">
          {(days[selectedDay - 1] || []).map((it, idx) => (
            <div
              key={`${it.title}-${idx}`}
              className={`place-title-img ${idx === selectedIdx ? "active" : ""}`}
              onClick={() => setSelectedIdx(idx)}
              style={{ cursor: "pointer" }}
            >
              <img src={imageFor(it)} alt="장소이미지" />
              <div className="place-title">
                <span>{idx + 1}</span>
                <div className="place-title-text">{it.title || "이름 없음"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 상세 패널 */}
        <div className="course-save-detail-contents-box">
          <img src={imageFor(days[selectedDay - 1]?.[selectedIdx])} alt="장소이미지" />
          <div className="course-save-detail-contents-text">
            <div className="course-save-detail-contents-top-text">
              <div className="course-save-detail-contents-title">
                {days[selectedDay - 1]?.[selectedIdx]?.title || ""}
              </div>
              <img src={placeIcon} alt="장소아이콘" />
              <div className="course-save-detail-place-address">
                {days[selectedDay - 1]?.[selectedIdx]?.address || ""}
              </div>
            </div>

            <div className="course-save-detail-contents-subcontents">
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

        <span className="course-save-detail-map-title">위치 정보</span>
        <div id="map" className="course-save-detail-map-box" />
      </div>
    </div>
  );
}
