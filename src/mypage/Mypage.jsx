/* eslint-disable no-unused-vars */ 
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from "../components/header";
import './Mypage.css';
import editProfile from "/icons/editProfile.png";
import profile from '/icons/default.png';
import editcourse from '/icons/editCourse.png';
import edit from '/icons/edit.png';
import coursedelete from '/icons/delete.png';
import Modal from "react-modal";
import ProfileEditModal from "../components/profileModal"; 

Modal.setAppElement('#root');

export default function Mypage() {
  const navigator = useNavigate();

  // 탭: 코스 기록 / 예정된 코스 / 회원탈퇴
  const [activeTab, setActiveTab] = useState(null); // 'records' | 'scheduled' | 'withdraw' | null
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

  // ===== Utils =====
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
  // 시작일이 오늘(로컬 자정)보다 이전이면 과거로 간주
  function isPastByStartDate(svdStartDateStr) {
    if (!svdStartDateStr) return false;
    const [y, m, d] = svdStartDateStr.split("-").map(Number);
    if (!y || !m || !d) return false;

    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0,0,0,0).getTime();
    const startMid = new Date(y, m - 1, d, 0,0,0,0).getTime();

    // “그 전이면” → 오늘과 같으면 제외, 이전만 포함
    return startMid < todayMid;
  }


  // 오늘(로컬, 서울 기준 브라우저) 00:00과 svdStartDate 자정의 일수 차이를 D-day로 계산
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
    // 로컬 타임존 자정으로 파싱
    const tripLocalMidnight = new Date(y, (m - 1), d, 0, 0, 0, 0).getTime();

    const diff = tripLocalMidnight - todayLocalMidnight;
    const days = Math.ceil(diff / msPerDay); // 오늘=0, 내일=1 ...
    return days < 0 ? 0 : days; // upcoming만 오지만 혹시 모를 음수는 0으로 보정
  }
  

async function fetchUpcoming() {
  setUpcomingLoading(true);
  setUpcomingError(null);
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("로그인 토큰이 없습니다.");

    const res = await fetch("https://smartzoo.shop/recommend/saved/upcoming", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("[fetchUpcoming] status:", res.status, res.ok);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      console.error("[fetchUpcoming] 오류 바디:", data);
      throw new Error(data?.message || `예정 코스 조회 실패 (status ${res.status})`);
    }

    const list = await res.json(); // 서버가 배열 JSON을 내려줌
    console.log("[fetchUpcoming] 원본 응답 배열:", list);

    // 디버그: 전역으로 노출해 콘솔에서 확인 가능
    window.__lastUpcoming = list;

    setUpcoming(Array.isArray(list) ? list : []);
    console.log("[fetchUpcoming] setUpcoming 완료. length=", Array.isArray(list) ? list.length : 0);
  } catch (e) {
    console.error("[fetchUpcoming] catch:", e);
    setUpcomingError(e instanceof Error ? e.message : "알 수 없는 오류");
    setUpcoming([]);
  } finally {
    setUpcomingLoading(false);
    console.log("[fetchUpcoming] 완료");
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

    console.log("[fetchPastRecords] status:", res.status, res.ok);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      console.error("[fetchPastRecords] 오류 바디:", data);
      throw new Error(data?.message || `코스 기록 조회 실패 (status ${res.status})`);
    }
    const list = await res.json();
    console.log("[fetchPastRecords] 원본 응답 배열:", list);

    // 콘솔에서 바로 확인할 수 있게 전역에 보관 (디버그용)
    window.__lastPast = list;

    setRecords(Array.isArray(list) ? list : []);
    console.log("[fetchPastRecords] setRecords 완료. length=", Array.isArray(list) ? list.length : 0);
  } catch (e) {
    console.error("[fetchPastRecords] catch:", e);
    setRecordsError(e instanceof Error ? e.message : "알 수 없는 오류");
    setRecords([]);
  } finally {
    setRecordsLoading(false);
    console.log("[fetchPastRecords] 완료");
  }
}


  useEffect(() => {
    loadProfileFromStorage();
  }, []);

  // 다른 탭에서 로컬스토리지 변경 시 반영
  useEffect(() => {
    const onStorage = () => loadProfileFromStorage();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 프로필 수정 모달이 닫힐 때 재로딩(모달 내부에서 저장 후 반영용)
  useEffect(() => {
    if (!isProfileModalOpen) {
      loadProfileFromStorage();
    }
  }, [isProfileModalOpen]);

  // 탭 진입 시마다 최신 데이터 조회
  useEffect(() => {
    if (activeTab === 'scheduled') {
      fetchUpcoming();
    } else if (activeTab === 'records') {
      fetchPastRecords();
    }
  }, [activeTab]);

  // ===== 회원탈퇴 =====
  const handleDelCancel = () => {
    setIsDelAccountModalOpen(false);
    setDelStep("confirm");
  };

  const handleDelConfirm = async () => {
    if (unlinkLoading) return;
    setUnlinkError(null);
    setUnlinkLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      const res = await fetch("https://smartzoo.shop/auth/unlink", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, 
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || `요청 실패 (status ${res.status})`);
      }
      setDelStep("done");
    } catch (e) {
      setUnlinkError(e instanceof Error ? e.message : "알 수 없는 오류 발생");
    } finally {
      setUnlinkLoading(false);
    }
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
          <span style={{ cursor: 'pointer' }} onClick={() => {setIsDelAccountModalOpen(true)}}>
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
                const title = item.title || '코스';
                const labelPrefix = item.courseLabel ? `[${item.courseLabel}] ` : '';
                const imgUrl = item.accommodationImgUrl || '';
                const canReview = !!item.canReview;
                const hasReview = !!item.hasReview;
                // const canDelete = !!item.canDelete;

                const reviewBtnText = hasReview ? '후기 보러가기' : '후기 작성하기';

                return (
                  <div key={item.savedId} className='record-box'>
                    {imgUrl
                      ? <img src={imgUrl} alt="코스 대표사진" />
                      : <div style={{ width: '160px', height: '120px', background: '#F3F5F7' }} />
                    }

                    <div className='record-course-info'>
                      <span className='record-course-name'>
                        {labelPrefix}{title}
                      </span>
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
                        className='record-write-review'
                        disabled={!canReview && !hasReview}
                        onClick={() => {
                          navigator(`/myReview/${item.savedId}`, {
                            state: {
                              svdStartDate: item.svdStartDate,
                              svdEndDate: item.svdEndDate,
                              title: item.title,
                              accommodationName: item.accommodationName,
                              accommodationImgUrl: item.accommodationImgUrl,
                              hasReview,
                            },
                          });
                        }}
                      >
                        {reviewBtnText}
                      </button>

                      <button
                        className='record-course-detail'
                        onClick={() => {
                          navigator(`/CourseEditor`);
                        }}
                      >
                        코스 자세히 보기
                      </button>
                    </div>

                    {/* 드롭다운 메뉴 */}
                    {openMenuId === item.savedId && (
                      <div
                        className="record-menu"
                        onClick={(e) => e.stopPropagation()}
                        role="menu"
                      >
                        <div className="record-menu-delete" >
                          <img src={coursedelete} alt="삭제" />
                          삭제하기
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'scheduled' && (
            <>
              {upcomingLoading && (
                <div style={{ padding: 16 }}>불러오는 중…</div>
              )}
              {upcomingError && (
                <div style={{ padding: 16, color: 'red' }}>{upcomingError}</div>
              )}
              {!upcomingLoading && !upcomingError && upcoming.length === 0 && (
                <div style={{ padding: 16, color: '#666' }}>예정된 코스가 없습니다.</div>
              )}

              {upcoming.map((item) => {
                const dday = calcDDay(item.svdStartDate);
                const period = `${item.svdStartDate} - ${item.svdEndDate}`;
                const title = item.title || '코스';
                const imgUrl = item.accommodationImgUrl || '';

                return (
                  <div key={item.savedId} className='record-box'>
                    {imgUrl
                      ? <img src={imgUrl} alt="코스 대표사진" />
                      : <div style={{ width: '160px', height: '120px', background: '#F3F5F7' }} />
                    }

                    <div className='record-course-info'>
                      <span className='record-course-name'>
                        {item.courseLabel ? `[${item.courseLabel}] ${title}` : title}
                      </span>
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
                          navigator(`/myReview/${item.savedId}`, {
                            state: {
                              svdStartDate: item.svdStartDate,
                              svdEndDate: item.svdEndDate,
                              title: item.title,
                              accommodationName: item.accommodationName,
                              accommodationImgUrl: item.accommodationImgUrl,
                            },
                          });
                        }}
                      >
                        코스 자세히 보기
                      </button>
                    </div>

                    {/* 드롭다운 메뉴 */}
                    {openMenuId === item.savedId && (
                      <div
                        className="record-menu"
                        onClick={(e) => e.stopPropagation()}
                        role="menu"
                      > 
                        <div className="record-menu-delete" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                          <img src={coursedelete} alt='삭제'/>
                          삭제하기
                        </div>
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
                <button onClick={handleDelCancel} disabled={unlinkLoading}>
                  취소
                </button>
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
