/* eslint-disable no-constant-binary-expression */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */

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
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // API 상태
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // 응답 데이터
  const [savedId, setSavedId] = useState(null);
  const [course, setCourse] = useState(null);

  // 기간: 네비게이션 state 우선 → 응답 내려오면 갱신
  const [svdStartDate, setSvdStartDate] = useState(navState?.svdStartDate ?? null);
  const [svdEndDate, setSvdEndDate] = useState(navState?.svdEndDate ?? null);

  const textareaRef = useRef(null);

  /* ================= 유틸/이미지 ================= */
  const VK_IMG = /^https?:\/\/tong\.visitkorea\.or\.kr\/cms\/resource\//i;
  const isVKImage = (url) => !!(url && typeof url === 'string' && VK_IMG.test(url.trim()));
  const isPlaceholder = (u) => ["/images/place.png", "/images/food.png", "/images/sleep.png"].includes((u || "").trim());

  // 숙소를 각 일차의 마지막 장소로 강제 배치
  function appendAccommodationToDays(courseData, accom) {
    if (!courseData) return courseData;
    const days = Array.isArray(courseData.days) ? courseData.days : [];
    if (!days.length || !accom?.name) return courseData;

    const accomImg = accom.imgUrl || accom.image || "";
    const accomPlace = {
      placeName: accom.name,
      title: accom.name,
      address: accom.address || "",
      imgUrl: accomImg,
      description: "숙소",
      contentTypeId: "32",
    };

    const mappedDays = days.map((d) => {
      const places = Array.isArray(d.places) ? [...d.places] : [];
      // 이미 마지막이 숙소면 중복 추가 방지
      const last = places[places.length - 1];
      const lastName = (last?.placeName || last?.title || "").trim();
      if (!lastName || !/숙|호텔|모텔|리조트|펜션|게스트|호스텔|hotel|motel|resort|pension|guest/i.test(lastName)) {
        places.push(accomPlace);
      }
      return { ...d, places };
    });

    return { ...courseData, days: mappedDays };
  }

  // 히어로 이미지: 네비에서 받은 courseImgUrl(VK) > 코스 내 유효 이미지 > 대체
  function pickHeroFromCourse(c, navImg) {
    if (isVKImage(navImg)) return navImg;
    if (!c) return replaceDetail;
    const places = (c.days || []).flatMap(d => d.places || []);
    for (const p of places) {
      const img = (p?.imgUrl || p?.image || p?.firstimage || p?.firstimage2 || "").trim();
      if (isVKImage(img) && !isPlaceholder(img)) return img;
    }
    return replaceDetail;
  }

  const heroImg = useMemo(
    () => pickHeroFromCourse(course, navState?.courseImgUrl),
    [course, navState?.courseImgUrl]
  );

  /* ================= 상세 + 리뷰 조회 ================= */
  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setErr(null);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("로그인 토큰이 없습니다.");

        const label = (navState?.courseLabel ?? "").trim();
        const isLabeled = /^[ABC]$/.test(label);
        const courseId = isLabeled ? navState?.courseId : null;
        let detail = null;

        // 1) courseId 우선 조회 (요청사항)
        if (courseId && isLabeled) {
          let res = await fetch(`https://smartzoo.shop/recommend/course/${courseId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            detail = await res.json();
          }
        }

        // 2) 폴백: savedId 기반 상세 (upcoming → past)
        if (!detail) {
          let res = await fetch(`https://smartzoo.shop/recommend/saved/upcoming/${id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            res = await fetch(`https://smartzoo.shop/recommend/saved/past/${id}`, {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.message || `상세 조회 실패 (status ${res.status})`);
          }
          detail = await res.json();
        }

        // detail 표준화 가정
        // course, savedId, svdStartDate, svdEndDate, accommodation 포함 가능
        const courseData = detail?.course ?? detail?.data ?? detail;
        let finalCourse = courseData;
        if (isLabeled) {
          const accom = courseData?.accommodation ?? {
            name: navState?.accommodationName || "",
            imgUrl: navState?.accommodationImgUrl || "",
          };
          finalCourse = appendAccommodationToDays(courseData, accom);
        }

        setSavedId(detail?.savedId ?? Number(id) ?? null);
        setCourse(finalCourse);

        if (detail?.svdStartDate) setSvdStartDate(detail.svdStartDate);
        if (detail?.svdEndDate) setSvdEndDate(detail.svdEndDate);
        if (finalCourse?.days?.[0]?.day) setSelectedDay(finalCourse.days[0].day);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchDetail();
  }, [id]);

  // 저장된 리뷰 가져오기
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
          setIsSaved(false);
          setIsEditing(false);
          setReviewText("");
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `리뷰 조회 실패 (status ${res.status})`);
        }

        const data = await res.json();
        setReviewText(data?.content || "");
        setIsSaved(true);
        setIsEditing(false);
      } catch (e) {
        // console.error(e);
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
      setIsEditing(false);
      setMenuOpen(false);
    } catch (e) {
      // alert(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
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
      // alert(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
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
              <img src={heroImg} alt="대표 이미지" />

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
                    <div className="review-menu" onClick={(e) => e.stopPropagation()} role="menu">
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
                <div className='review-course-name'>{course?.title ?? '코스'}</div>
                {periodText && <div className='review-course-period'>{periodText}</div>}
              </div>
            </div>

            <div className='info-and-review-box'>
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
                          <img
                            src={(place.imgUrl || place.firstimage || place.firstimage2 || "").trim() || replaceDetail}
                            alt={place.placeName ?? place.title ?? '장소'}
                          />
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