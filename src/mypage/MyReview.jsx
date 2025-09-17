/* eslint-disable no-unused-vars */
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import Header from "../components/header";
import './MyReview.css';
import editcourse from '/icons/editCourse.png';
import edit from '/icons/edit.png';
import coursedelete from '/icons/delete.png';
import replaceDetail from "/images/replaceDetail.png";


export default function MyReview() {
  const navigator = useNavigate();
  const { id } = useParams(); // savedId
  const location = useLocation();
  const navState = (location && location.state) || {};

  const [reviewText, setReviewText] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);

  // 리뷰 상태
  const [isSaved, setIsSaved] = useState(false);     // 서버에 리뷰가 존재하는가
  const [isEditing, setIsEditing] = useState(false); // 편집 모드 여부
  const [menuOpen, setMenuOpen] = useState(false);

  // API 상태
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // 응답 데이터
  const [savedId, setSavedId] = useState(null);
  const [course, setCourse] = useState(null);

  // 기간: 네비게이션 state 우선 사용 → 응답 내려오면 갱신
  const [svdStartDate, setSvdStartDate] = useState(navState?.svdStartDate ?? null);
  const [svdEndDate, setSvdEndDate] = useState(navState?.svdEndDate ?? null);

  const textareaRef = useRef(null);

  /* ================= 대표 이미지 선택 로직 ================= */
  const VK_IMG = /^https?:\/\/tong\.visitkorea\.or\.kr\/cms\/resource\//i;

  function isVKImage(url) {
    if (!url || typeof url !== 'string') return false;
    return VK_IMG.test(url.trim());
  }

  // 장소 타입 판별: 관광/체험(top) > 음식(food) > 숙소(stay)
  function classifyPlace(place = {}) {
    const ct = String(place?.contentTypeId ?? place?.contenttypeid ?? "").trim();
    const catRaw = `${place?.category ?? place?.type ?? place?.placeType ?? place?.label ?? ""}`;
    const nameRaw = `${place?.placeName ?? place?.title ?? ""}`;
    const hay = `${catRaw} ${nameRaw}`.toLowerCase();

    if (ct === "12") return "top";
    if (ct === "39") return "food";
    if (ct === "32") return "stay";

    if (/관광|체험|명소|attraction|experience/.test(hay)) return "top";
    if (/음식|식당|맛집|카페|restaurant|food/.test(hay)) return "food";
    if (/숙소|숙박|호텔|모텔|리조트|펜션|게스트|호스텔|풀빌라|stay|hotel|motel|resort|pension|guest/.test(hay)) return "stay";

    return "top";
  }

  function pickHeroFromCourse(c) {
    // 코스/장소가 없거나 유효 이미지가 하나도 없으면 대체 이미지로
    if (!c) return replaceDetail;

    const places = (c?.days ?? []).flatMap(d => d?.places ?? []);
    if (!places.length) return replaceDetail;

    const bucket = { top: [], food: [], stay: [] };

    for (const p of places) {
      const img = String(
        p?.imgUrl ??
        p?.image ??
        p?.firstimage ??
        p?.firstimage2 ??
        ""
      ).trim();

      // VisitKorea CMS 이미지가 아니면 스킵
      if (!isVKImage(img)) continue;

      const group = classifyPlace(p);
      if (group === "top") bucket.top.push(img);
      else if (group === "food") bucket.food.push(img);
      else if (group === "stay") bucket.stay.push(img);
    }

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (bucket.top.length) return pick(bucket.top);
    if (bucket.food.length) return pick(bucket.food);
    if (bucket.stay.length) return pick(bucket.stay);

    // 유효 이미지가 하나도 없으면 상세 대체 이미지
    return replaceDetail;
  }

  const heroImg = useMemo(() => pickHeroFromCourse(course), [course]);

  /* ================= 상세 + 리뷰 조회 ================= */
  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setErr(null);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("로그인 토큰이 없습니다.");

        // 코스 상세 (예정/기록 공용 상세 API로 교체 가능하면 교체)
        const res = await fetch(`https://smartzoo.shop/recommend/saved/upcoming/${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `상세 조회 실패 (status ${res.status})`);
        }

        const data = await res.json();

        setSavedId(data?.savedId ?? null);
        setCourse(data?.course ?? null);

        if (data?.svdStartDate) setSvdStartDate(data.svdStartDate);
        if (data?.svdEndDate) setSvdEndDate(data.svdEndDate);

        const firstDay = data?.course?.days?.[0]?.day;
        if (typeof firstDay === 'number') setSelectedDay(firstDay);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchDetail();
  }, [id]);

  // 저장된 리뷰 가져오기 (후기 작성완료로 들어온 경우 포함)
  useEffect(() => {
    async function fetchReview() {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("로그인 토큰이 없습니다.");

        const res = await fetch(`https://smartzoo.shop/reviews/saved/${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          // 리뷰 없음 → 작성 가능
          setIsSaved(false);
          setIsEditing(false);
          setReviewText("");
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `리뷰 조회 실패 (status ${res.status})`);
        }

        const data = await res.json(); // 예시 응답 형태 사용
        setReviewText(data?.content || "");
        setIsSaved(true);     // 리뷰 있음
        setIsEditing(false);  // 읽기 모드
      } catch (e) {
        // 토큰 문제 등 치명적 오류가 아니면 화면은 계속 보이게
        console.error(e);
      }
    }

    if (id) fetchReview();
  }, [id]);

  const periodText = useMemo(() => {
    if (svdStartDate && svdEndDate) return `${svdStartDate} - ${svdEndDate}`;
    return null;
  }, [svdStartDate, svdEndDate]);

  /* ================= 저장/수정/삭제 ================= */
  async function handleSaveReview() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      const isUpdate = isSaved && isEditing;
      const endpoint = `https://smartzoo.shop/reviews/saved/${id}`;
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: reviewText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `리뷰 ${isUpdate ? '수정' : '저장'} 실패 (status ${res.status})`);
      }

      alert(isUpdate ? "리뷰 수정 완료!" : "리뷰 작성 완료!");
      setIsSaved(true);
      setIsEditing(false); // 저장 후 읽기 모드
      setMenuOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  function handleStartEdit() {
    setIsEditing(true);
    setMenuOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleDeleteReview() {
    const ok = window.confirm("리뷰를 삭제하시겠습니까?");
    if (!ok) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      const res = await fetch(`https://smartzoo.shop/reviews/saved/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `리뷰 삭제 실패 (status ${res.status})`);
      }

      alert("리뷰가 삭제되었습니다.");
      setReviewText("");
      setIsSaved(false);
      setIsEditing(false);
      setMenuOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  const textareaDisabled = isSaved && !isEditing;

  return (
    <div className="myreview-page">
      <Header />
      <div className='myreview-main-container'>
        {loading && <div style={{ padding: 16 }}>불러오는 중…</div>}
        {err && <div style={{ padding: 16, color: 'red' }}>{err}</div>}

        {!loading && !err && course && (
          <>
            <div className='review-main-image'>
              <img src={replaceDetail} alt="대표 이미지" />

              {/* 저장 / 수정 저장 버튼 */}
              {(!isSaved || isEditing) ? (
                <button className="save-btn" onClick={handleSaveReview}>
                  저장
                </button>
              ) : (
                <div className="review-two-button">
                  <img
                    src={editcourse}
                    alt="편집 아이콘"
                    className="review-edit-icon"
                    onClick={() => setMenuOpen((v) => !v)}
                  />

                  {menuOpen && (
                    <div
                      className="review-menu"
                      onClick={(e) => e.stopPropagation()}
                      role="menu"
                    >
                      <button className="review-menu-edit" onClick={handleStartEdit}>
                        <img src={edit} alt='수정' />
                        수정하기
                      </button>
                      <hr style={{ height: '1px', backgroundColor: '#E7ECF1', width: '153px', border: "none" }} />
                      <button className="review-menu-delete" onClick={handleDeleteReview}>
                        <img src={coursedelete} alt='삭제' />
                        삭제하기
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="info-box">
                <div className='review-course-name'>
                  {course?.title ?? '코스'}
                </div>
                {periodText && (
                  <div className='review-course-period'>{periodText}</div>
                )}
              </div>
            </div>

            <div className='info-and-review-box'>
              {/* 코스 일자별 정보 */}
              <div className='review-course-info-box'>
                <div className='info-period-course'>
                  {(course?.days ?? []).map((day) => (
                    <span
                      key={day.day}
                      onClick={() => setSelectedDay(day.day)}
                      className={selectedDay === day.day ? 'active' : undefined}
                    >
                      {day.day}일차
                    </span>
                  ))}
                </div>

                <hr className="review-divider" />

                {(course?.days ?? [])
                  .filter((day) => day.day === selectedDay)
                  .map((day) => (
                    <div key={day.day} className="places-grid">
                      {(day.places ?? []).map((place, idx) => (
                        <div className='review-detail-course-info' key={`${place.placeName ?? place.title ?? idx}-${idx}`}>
                          <img src={place.imgUrl || place.firstimage || place.firstimage2} alt={place.placeName ?? place.title ?? '장소'} />
                          <div className='course-info-text'>
                            <span>{place.placeName ?? place.title}</span>
                            {place.address && <span>{place.address}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>

              <textarea
                ref={textareaRef}
                placeholder='해당 코스에 대한 간단한 후기를 자유롭게 작성해주세요.'
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                disabled={textareaDisabled}
                className={textareaDisabled ? 'disabled' : undefined}
              ></textarea>
            </div>
          </>
        )}
      </div>
    </div>
  );
}