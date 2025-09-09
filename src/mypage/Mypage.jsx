/* eslint-disable no-unused-vars */
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from "../components/header";
import './Mypage.css';
import regionImg from "/images/BgImg3.png";
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

  // 프로필(로컬스토리지에서 불러오기)
  const [nickname, setNickname] = useState("홍길동");
  const [photoUrl, setPhotoUrl] = useState(profile);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDelAccountModalOpen, setIsDelAccountModalOpen] = useState(false);

  //탈퇴 여부
  const [delStep, setDelStep] = useState('confirm');
  const handleDelCancel = () => {
    setIsDelAccountModalOpen(false);
    setDelStep('confirm'); // 닫힐 때 초기화
  };
  const handleDelConfirm = () => {
    setDelStep('done'); // 글자 변경
  };

  // ── 로컬스토리지에서 프로필 로드 (여러 키 시도 + JSON 파싱 폴백) ──
  function loadProfileFromStorage() {
    try {
      // 닉네임 후보 키
      const nicknameKeys = [
        "nickname",
        "nickName",
        "userNickname",
        "kakaoNickname",
        "profile_nickname",
        "user" // JSON 안에 있을 수 있음
      ];
      // 프로필 이미지 후보 키
      const photoKeys = [
        "profileImage",
        "profileImageUrl",
        "profileImg",
        "avatar",
        "kakaoProfileImage",
        "profile_photo",
        "user" // JSON 안에 있을 수 있음
      ];

      let nickHit = "";
      let photoHit = "";

      for (const k of nicknameKeys) {
        const v = localStorage.getItem(k);
        if (!v) continue;
        if (k === "user") {
          // JSON 안에서 nickname 유추
          try {
            const obj = JSON.parse(v);
            nickHit =
              obj?.nickname ||
              obj?.nickName ||
              obj?.userNickname ||
              obj?.kakaoNickname ||
              "";
          } catch {
            /* noop */
          }
        } else {
          nickHit = v;
        }
        if (nickHit) break;
      }

      for (const k of photoKeys) {
        const v = localStorage.getItem(k);
        if (!v) continue;
        if (k === "user") {
          // JSON 안에서 사진 URL 유추
          try {
            const obj = JSON.parse(v);
            photoHit =
              obj?.profileImage ||
              obj?.profileImageUrl ||
              obj?.profileImg ||
              obj?.avatar ||
              obj?.kakaoProfileImage ||
              obj?.profile_photo ||
              "";
          } catch {
            /* noop */
          }
        } else {
          photoHit = v;
        }
        if (photoHit) break;
      }

      setNickname(nickHit || "홍길동");
      setPhotoUrl(photoHit || profile);
    } catch {
      setNickname("홍길동");
      setPhotoUrl(profile);
    }
  }

  // 마운트 시 1회 로드
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

  const dummyRecords = [
    { id: 1, name: "경기도 양평 코스", period: "2025년 7월 12일 - 2025년 7월 13일", image: regionImg },
    { id: 2, name: "강원도 속초 코스", period: "2025년 8월 1일 - 2025년 8월 3일", image: regionImg },
    { id: 3, name: "전라남도 여수 코스", period: "2025년 9월 10일 - 2025년 9월 12일", image: regionImg },
    { id: 4, name: "제주도 코스", period: "2025년 10월 5일 - 2025년 10월 8일", image: regionImg },
    { id: 5, name: "부산 해운대 코스", period: "2025년 11월 2일 - 2025년 11월 4일", image: regionImg },
    { id: 6, name: "경상북도 경주 코스", period: "2025년 12월 20일 - 2025년 12월 22일", image: regionImg }
  ];

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

          {/* 이메일 자리는 고정 문구로 변경 */}
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
              {dummyRecords.map((record) => (
                <div key={record.id} className='record-box'>
                  <img src={record.image} alt="코스 대표사진" />
                  <div className='record-course-info'>
                    <span className='record-course-name'>{record.name}</span>
                    <span className='record-course-period'>{record.period}</span>
                  </div>
                  <div className='record-two-button'>
                    <button 
                      className='record-write-review'
                      onClick={() => navigator(`/myReview/${record.id}`)}
                    >
                      후기 작성하기
                    </button>
                    <button className='record-course-detail'>코스 자세히 보기</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'scheduled' && (
            <>
              {dummyRecords.map((record) => (
                <div key={record.id} className='record-box'>
                  <img src={record.image} alt="코스 대표사진" />
                  <div className='record-course-info'>
                    <span className='record-course-name'>{record.name}</span>
                    <span className='record-course-period'>{record.period}</span>
                  </div>
                  <div className='record-two-button'>
                    <img 
                      src={editcourse} 
                      alt="더보기" 
                      className="record-menu-trigger"
                      onClick={(e) => {
                        e.stopPropagation(); // 바깥 onClick 전파 방지
                        setOpenMenuId(openMenuId === record.id ? null : record.id);
                      }}                                        
                    />
                    <button className='scheduled-d-day'>
                      <span>촌캉스까지</span>
                      <span>D-35</span>
                    </button>
                    <button className='record-course-detail-2'>코스 자세히 보기</button>
                  </div>
                  {/* 드롭다운 메뉴 */}
                  {openMenuId === record.id && (
                    <div
                      className="record-menu"
                      onClick={(e) => e.stopPropagation()} /* 메뉴 내부 클릭도 닫히지 않게 */
                      role="menu"
                    >
                      <div className="record-menu-edit">
                        <img src={edit} alt='수정'/>
                        수정하기
                      </div>
                      <hr style={{
                        height: '1px',
                        backgroundColor:'#E7ECF1',
                        width:'153px',
                        border:"none"
                      }} />    
                      <div className="record-menu-delete">
                        <img src={coursedelete} alt='삭제'/>
                        삭제하기
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
        onAfterClose={() => setDelStep('confirm')}
        className="DelAccount-modal"
        style={{ overlay: { backgroundColor: "rgba(0,0,0,0.5)" } }}
      >
        <div className='modal-del-account-box'>
          {delStep === 'confirm' ? (
            <>
              <span>회원 탈퇴</span>
              <span>
                회원 탈퇴시, 해당 계정의 모든 콘텐츠가 삭제됩니다. <br />
                삭제된 정보는 복원할 수 없습니다.
              </span>
              <div className='modal-del-account-buttons'>
                <button onClick={handleDelCancel}>취소</button>
                <button onClick={handleDelConfirm}>확인</button>
              </div>
            </>
          ) : (
            <>
              <span>탈퇴 완료</span>
              <span>회원 탈퇴가 완료되었습니다.</span>
              <div className='modal-del-account-buttons'>
                <button onClick={handleDelCancel}>홈 화면으로</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
