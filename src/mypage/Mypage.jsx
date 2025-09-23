/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from "../components/header";
import './Mypage.css';
import editProfile from "/icons/editProfile.png";
import profile from '/icons/default.png';
import editcourse from '/icons/editCourse.png';
import replaceCourse from "/images/replaceCourse.png";
import coursedelete from '/icons/delete.png';
import Modal from "react-modal";
import ProfileEditModal from "../components/profileModal";

Modal.setAppElement('#root');

export default function Mypage() {
  const navigator = useNavigate();

  // 탭: 코스 기록 / 예정된 코스 / 회원탈퇴
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'scheduled' | 'withdraw' | null
  const [openMenuId, setOpenMenuId] = useState(null);

  const [nickname, setNickname] = useState(" ");
  const [photoUrl, setPhotoUrl] = useState(profile);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDelAccountModalOpen, setIsDelAccountModalOpen] = useState(false);

  // 탈퇴 여부
  const [delStep, setDelStep] = useState("confirm");
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState(null);

  // 예정 코스 상태
  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState(null);

  // 과거 코스(코스 기록) 상태
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(null);

  // 특정 도메인(VisitKorea CMS) 이미지만 허용, 로컬 플레이스홀더는 차단
  const ALLOWED_IMG_HOST = /^https?:\/\/tong\.visitkorea\.or\.kr\/cms\/resource\//i;
  const BLOCKED_LOCAL_IMAGES = new Set([
    "/images/BgImg2.png",
    "/images/sleep.png",
    "/images/food.png",
    "/images/place.png",
  ]);

  // 대표 이미지 선택 로직
  function pickDisplayImage(url) {
    if (!url || typeof url !== "string") return replaceCourse;
    const u = url.trim();
    if (BLOCKED_LOCAL_IMAGES.has(u)) return replaceCourse;
    if (ALLOWED_IMG_HOST.test(u)) return u;
    return replaceCourse;
  }

  // 여행기간 → "당일치기 코스" 또는 "N박M일 코스"로 변환
  function calcStayText(startStr, endStr) {
    if (!startStr || !endStr) return "코스";
    const [sy, sm, sd] = startStr.split("-").map(Number);
    const [ey, em, ed] = endStr.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
    const end = new Date(ey, em - 1, ed, 0, 0, 0, 0).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((end - start) / dayMs) + 1);
    const nights = Math.max(0, days - 1);
    return nights === 0 ? "당일치기 코스" : `${nights}박${days}일 코스`;
  }

  // 제목 가공
  function formatCourseTitle(item = {}) {
    const raw = String(item.title || "").trim();
    const labelField = String(item.courseLabel || "").trim();
    const stayText = calcStayText(item.svdStartDate, item.svdEndDate);

    const mBracketCity = raw.match(/^\s*\[([A-C])\]\s*([^\s]+?(?:시|군|구))\s*$/);
    if (mBracketCity) {
      const letter = mBracketCity[1];
      const city = mBracketCity[2];
      return `[${letter}]전라남도 ${city} ${stayText}`;
    }

    if (/^[A-C]$/.test(labelField)) {
      const mCityOnly = raw.match(/^\s*([^\s]+?(?:시|군|구))\s*$/);
      if (mCityOnly) {
        const city = mCityOnly[1];
        return `[${labelField}]전라남도 ${city} ${stayText}`;
      }
      if (!/^\s*\[[A-C]\]/.test(raw)) {
        return `[${labelField}] ${raw || "코스"}`;
      }
    }
    return raw || "코스";
  }

  function loadProfileFromStorage() {
    try {
      const nick = localStorage.getItem("nickname") || "";
      const img = localStorage.getItem("profileImg") || profile;
      setNickname(nick);
      setPhotoUrl(img || profile);
    } catch {
      setNickname("");
      setPhotoUrl(profile);
    }
  }

  useEffect(() => {
    const onProfileUpdated = (e) => {
      const { nickname: nn, profileImgUrl: pu } = e.detail || {};
      if (typeof nn === "string") setNickname(nn);
      if (typeof pu === "string") setPhotoUrl(pu || profile);
    };
    window.addEventListener("profile:updated", onProfileUpdated);
    return () => window.removeEventListener("profile:updated", onProfileUpdated);
  }, []);

  // 리뷰 작성여부 갱신
  useEffect(() => {
    const onFocusOrVisible = () => {
      if (activeTab === 'records') {
        fetchPastRecords();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [activeTab]);

  // 오늘(로컬) 00:00과 svdStartDate 자정의 일수 차이
  function calcDDay(svdStartDateStr) {
    if (!svdStartDateStr) return null;
    const msPerDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    const todayLocalMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0, 0
    ).getTime();
    const [y, m, d] = svdStartDateStr.split('-').map(Number);
    const tripLocalMidnight = new Date(y, (m - 1), d, 0, 0, 0, 0).getTime();
    const diff = tripLocalMidnight - todayLocalMidnight;
    const days = Math.ceil(diff / msPerDay);
    return days < 0 ? 0 : days;
  }

  async function fetchUpcoming() {
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      const res = await fetch("https://smartzoo.shop/recommend/saved/upcoming", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `예정 코스 조회 실패 (status ${res.status})`);
      }
      const list = await res.json();
      
      window.__lastUpcoming = list;
      setUpcoming(Array.isArray(list) ? list : []);
    } catch (e) {
      setUpcomingError(e instanceof Error ? e.message : "알 수 없는 오류");
      setUpcoming([]);
    } finally {
      setUpcomingLoading(false);
    }
  }

  async function fetchPastRecords() {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      const res = await fetch("https://smartzoo.shop/recommend/saved/past", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `코스 기록 조회 실패 (status ${res.status})`);
      }
      const list = await res.json();
      
      window.__lastPast = list;
      setRecords(Array.isArray(list) ? list : []);
    } catch (e) {
      setRecordsError(e instanceof Error ? e.message : "알 수 없는 오류");
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }

  // 프로필/탭 진입 시 로딩
  useEffect(() => {
    loadProfileFromStorage();
  }, []);

  useEffect(() => {
    const onStorage = () => loadProfileFromStorage();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!isProfileModalOpen) {
      loadProfileFromStorage();
    }
  }, [isProfileModalOpen]);

  useEffect(() => {
    if (activeTab === 'scheduled') {
      fetchUpcoming();
    } else if (activeTab === 'records') {
      fetchPastRecords();
    }
  }, [activeTab]);

  // 코스 삭제
  async function handleDeleteSaved(savedId) {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      // 1) 리뷰 선삭제 (404는 무시)
      try {
        const delReview = await fetch(`https://smartzoo.shop/reviews/saved/${savedId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!delReview.ok && delReview.status !== 404) {
          const msg = await delReview.text().catch(() => "");
        }
      } catch (e) {

      }

      // 2) 코스 삭제
      const res = await fetch(`https://smartzoo.shop/recommend/saved/${savedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `코스 삭제 실패 (status ${res.status})`);
      }

      if (activeTab === 'records') {
        setRecords((prev) => prev.filter((x) => x.savedId !== savedId));
      } else if (activeTab === 'scheduled') {
        setUpcoming((prev) => prev.filter((x) => x.savedId !== savedId));
      }

      setOpenMenuId(null);
      alert("코스가 삭제되었습니다.");
    } catch (e) {
      // alert(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  // 회원탈퇴
  const handleDelCancel = () => {
    setIsDelAccountModalOpen(false);
    setDelStep("confirm");
  };

  const handleDelConfirm = async () => {
    if (unlinkLoading) return;
    setUnlinkError(null);
    setUnlinkLoading(true);

    try {
      let token = localStorage.getItem("accessToken")?.trim();
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      // 혹시 'Bearer '로 시작하면 제거
      if (token.startsWith("Bearer ")) {
        token = token.replace(/^Bearer\s+/, "");
      }

      const res = await fetch("https://smartzoo.shop/auth/unlink", {
        method: "GET",
        headers: {
          Authorization: token, // Bearer 없이 순수 토큰만
        },
      });

      alert("회원 탈퇴가 성공적으로 처리되었습니다.");
      localStorage.clear();
      setDelStep("done");
      navigator("/", { replace: true });
    } catch (e) {

    } finally {
      setUnlinkLoading(false);
      setIsDelAccountModalOpen(false);
    }
  };

  const buildNavState = (item) => {
    const label = (item.courseLabel ?? "").trim();
    const isLabeled = /^[ABC]$/.test(label);
    // 공통
    const base = {
      svdStartDate: item.svdStartDate,
      svdEndDate: item.svdEndDate,
      title: item.title,
      courseImgUrl: item.courseImgUrl,
      hasReview: !!item.hasReview,
    };
    // 라벨이 A/B/C일 때만 추가 정보 포함
    if (isLabeled) {
      base.courseId = item.courseId;
      base.courseLabel = label;
      base.accommodationName = item.accommodationName || "";
      base.accommodationImgUrl = item.courseImgUrl || "";
    }
    return base;
  };

  return (
    <div className="Mypage">
      <Header />
      <div className='mypage-contents-box'>
        <div className="mypage-left-box" data-active={activeTab}>
          <img className='mypage-profile-img' src={photoUrl || profile} alt="프로필사진" />
          <div className='mypage-profile-name'>
            <span>{nickname || "닉네임"}</span>
            <img
              src={editProfile}
              alt="프로필수정"
              style={{ cursor: 'pointer' }}
              onClick={() => setIsProfileModalOpen(true)}
            />
          </div>

          <div className='mypage-email'>카카오 계정으로 로그인 중</div>

          <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('records')}>코스 기록</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('scheduled')}>예정된 코스</span>
          <span style={{ cursor: 'pointer' }} onClick={() => { setIsDelAccountModalOpen(true) }}>
            회원탈퇴
          </span>
        </div>

        <div className='mypage-right-gray-box'>
          {activeTab === 'records' && (
            <>
              {recordsLoading && <div style={{ padding: 16 }}>불러오는 중…</div>}
              {recordsError && <div style={{ padding: 16, color: 'red' }}>{recordsError}</div>}
              {!recordsLoading && !recordsError && records.length === 0 && (
                <div style={{ padding: 16, color: '#666' }}>코스 기록이 없습니다.</div>
              )}
              {records.map((item) => {
                const period = `${item.svdStartDate} - ${item.svdEndDate}`;
                const displayTitle = formatCourseTitle(item);
                const imgUrl = pickDisplayImage(item.courseImgUrl || '');
                const reviewed = !!item.hasReview;
                const canReview = !!item.canReview;
                const navState = buildNavState(item);

                return (
                  <div key={item.savedId} className='record-box'>
                    {imgUrl
                      ? <img src={imgUrl} alt="코스 대표사진" />
                      : <div style={{ width: '160px', height: '120px', background: '#F3F5F7' }} />
                    }

                    <div className='record-course-info'>
                      <span className='record-course-name'>{displayTitle}</span>
                      <span className='record-course-period'>{period}</span>
                    </div>

                    <div className='record-two-button'>
                      <img
                        src={editcourse}
                        alt="더보기"
                        className="record-menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.savedId ? null : item.savedId);
                        }}
                      />

                      <button
                        className={`record-write-review ${reviewed ? 'reviewed' : ''}`}
                        disabled={reviewed ? false : !canReview}
                        onClick={() => {
                          navigator(`/myReview/${item.savedId}`, { state: navState });
                        }}
                      >
                        {reviewed ? '후기 작성완료' : '후기 작성하기'}
                      </button>

                      <button
                        className='record-course-detail'
                        onClick={() => {
                          navigator(`/DetailSaveCourse/${item.savedId}`, { state: navState });
                        }}
                      >
                        코스 자세히 보기
                      </button>
                    </div>

                    {openMenuId === item.savedId && (
                      <div className="record-menu" onClick={(e) => e.stopPropagation()} role="menu">
                        <button
                          className="record-menu-delete"
                          onClick={() => handleDeleteSaved(item.savedId)}
                        >
                          <img src={coursedelete} alt="삭제" />
                          삭제하기
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'scheduled' && (
            <>
              {upcomingLoading && <div style={{ padding: 16 }}>불러오는 중…</div>}
              {upcomingError && <div style={{ padding: 16, color: 'red' }}>{upcomingError}</div>}
              {!upcomingLoading && !upcomingError && upcoming.length === 0 && (
                <div style={{ padding: 16, color: '#666' }}>예정된 코스가 없습니다.</div>
              )}

              {upcoming.map((item) => {
                const dday = calcDDay(item.svdStartDate);
                const period = `${item.svdStartDate} - ${item.svdEndDate}`;
                const displayTitle = formatCourseTitle(item);
                const imgUrl = pickDisplayImage(item.courseImgUrl || '');
                const navState = buildNavState(item);

                return (
                  <div key={item.savedId} className='record-box'>
                    {imgUrl
                      ? <img src={imgUrl} alt="코스 대표사진" />
                      : <div style={{ width: '160px', height: '120px', background: '#F3F5F7' }} />
                    }

                    <div className='record-course-info'>
                      <span className='record-course-name'>{displayTitle}</span>
                      <span className='record-course-period'>{period}</span>
                    </div>

                    <div className='record-two-button'>
                      <img
                        src={editcourse}
                        alt="더보기"
                        className="record-menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.savedId ? null : item.savedId);
                        }}
                      />
                      <button className='scheduled-d-day'>
                        <span>촌캉스까지</span>
                        <span>{typeof dday === 'number' ? `D-${dday}` : '-'}</span>
                      </button>
                      <button
                        className='record-course-detail-2'
                        onClick={() => {
                          navigator(`/DetailSaveCourse/${item.savedId}`, { state: navState });
                        }}
                      >
                        코스 자세히 보기
                      </button>
                    </div>

                    {openMenuId === item.savedId && (
                      <div className="record-menu" onClick={(e) => e.stopPropagation()} role="menu">
                        <button
                          className="record-menu-delete"
                          onClick={() => handleDeleteSaved(item.savedId)}
                        >
                          <img src={coursedelete} alt="삭제" />
                          삭제하기
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <Modal
        isOpen={isDelAccountModalOpen}
        onRequestClose={handleDelCancel}
        onAfterClose={() => setDelStep("confirm")}
        className="DelAccount-modal"
        style={{ overlay: { backgroundColor: "rgba(0,0,0,0.5)" } }}
      >
        <div className="modal-del-account-box">
          {delStep === "confirm" ? (
            <>
              <span>회원 탈퇴</span>
              <span>
                회원 탈퇴시, 해당 계정의 모든 콘텐츠가 삭제됩니다. <br />
                삭제된 정보는 복원할 수 없습니다.
              </span>

              {unlinkError && (
                <div style={{ color: "red", marginTop: "8px" }}>{unlinkError}</div>
              )}

              <div className="modal-del-account-buttons">
                <button onClick={handleDelCancel} disabled={unlinkLoading}>취소</button>
                <button onClick={handleDelConfirm} disabled={unlinkLoading}>
                  {unlinkLoading ? "처리 중…" : "확인"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span>탈퇴 완료</span>
              <span>회원 탈퇴가 완료되었습니다.</span>
              <div className="modal-del-account-buttons">
                <button onClick={handleDelCancel}>홈 화면으로</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}