/* eslint-disable no-unused-vars */
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Header from "../components/header";
import './MyReview.css';
import regionImg from "/images/BgImg3.webp";
import editcourse from '/icons/editCourse.png';
import edit from '/icons/edit.png';
import coursedelete from '/icons/delete.png';

export default function MyReview() {
  const navigator = useNavigate();
  const { id } = useParams(); // savedId

  const [reviewText, setReviewText] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // API 상태
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // 응답 데이터
  const [savedId, setSavedId] = useState(null);
  const [course, setCourse] = useState(null);
  const [svdStartDate, setSvdStartDate] = useState(null);
  const [svdEndDate, setSvdEndDate] = useState(null);

  // 대표 이미지 선택: 숙소 > 첫 장소 > 기본
  const heroImg = useMemo(() => {
    const a = course?.accommodation?.imgUrl;
    const p = course?.days?.[0]?.places?.[0]?.imgUrl;
    return a || p || regionImg;
  }, [course]);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setErr(null);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("로그인 토큰이 없습니다.");

        const res = await fetch(`https://smartzoo.shop/recommend/saved/upcoming/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `상세 조회 실패 (status ${res.status})`);
        }

        const data = await res.json();
        // 예시 응답엔 svdStartDate/EndDate가 없지만, 내려오면 사용
        setSavedId(data?.savedId ?? null);
        setCourse(data?.course ?? null);
        setSvdStartDate(data?.svdStartDate ?? null);
        setSvdEndDate(data?.svdEndDate ?? null);

        // 일차 초기 선택값 보정
        const firstDay = data?.course?.days?.[0]?.day;
        if (typeof firstDay === 'number') setSelectedDay(firstDay);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  const periodText = useMemo(() => {
    if (svdStartDate && svdEndDate) return `${svdStartDate} - ${svdEndDate}`;
    return null; // 명세에 없으면 표시 생략
  }, [svdStartDate, svdEndDate]);

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

              {!isSaved ? (
                <button
                  className="save-btn"
                  onClick={() => setIsSaved(true)}
                >
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
                      <div className="review-menu-edit">
                        <img src={edit} alt='수정' />
                        수정하기
                      </div>
                      <hr style={{
                        height: '1px',
                        backgroundColor: '#E7ECF1',
                        width: '153px',
                        border: "none"
                      }} />
                      <div className="review-menu-delete">
                        <img src={coursedelete} alt='삭제' />
                        삭제하기
                      </div>
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
                {course?.accommodation?.name && (
                  <div className='review-course-period'>
                    숙소: {course.accommodation.name}
                  </div>
                )}
              </div>
            </div>

            <div className='info-and-review-box'>
              {/* 코스 일자별 정보 */}
              <div className='review-course-info-box'>
                <div className='info-period-course'>
                  {(course.days ?? []).map((day) => (
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

                {(course.days ?? [])
                  .filter((day) => day.day === selectedDay)
                  .map((day) => (
                    <div key={day.day} className="places-grid">
                      {(day.places ?? []).map((place, idx) => (
                        <div className='review-detail-course-info' key={`${place.placeName}-${idx}`}>
                          <img src={place.imgUrl || regionImg} alt={place.placeName} />
                          <div className='course-info-text'>
                            <span>{place.placeName}</span>
                            {place.address && (
                              <span>
                                {place.address}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>

              <textarea
                placeholder='해당 코스에 대한 간단한 후기를 자유롭게 작성해주세요.'
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              ></textarea>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
