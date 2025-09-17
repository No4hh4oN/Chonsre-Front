import '../assets/styles/header.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import defaultProfile from '/icons/default.png';
import dropdown from '/icons/dropdown1.png';
import AxiosClient, { setAuthToken } from "../AxiosClient";

export default function Header() {
  const navigator = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState('');
  const [profileImg, setProfileImg] = useState(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setAuthToken(accessToken);

    const fetchUser = async () => {
      try {
        const res = await AxiosClient.get('/auth/me');
        setNickname(res.data.nickname);

        // 우선순위: /auth/me.profileImg > localStorage.profileImg > null
        let img = res.data.profileImg || localStorage.getItem('profileImg') || null;
        if (img && img.startsWith('http://')) {
          img = img.replace('http://', 'https://'); // 혼합콘텐츠 방지
        }
        setProfileImg(img);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('유저 정보 불러오기 실패:', error);
        setIsLoggedIn(false);
      }
    };

    fetchUser();
  }, []);

  // 사용자 정보 표출 드롭다운
  const [isDropdowned, setIsDropdowned] = useState(false);
  const dropdownRef = useRef(null);
  const userInfoRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        userInfoRef.current &&
        !userInfoRef.current.contains(event.target)
      ) {
        setIsDropdowned(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdowned(false);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('profileImg');
    setAuthToken(null);
    setIsLoggedIn(false);
    setNickname('');
    setProfileImg(null);
    navigator('/');
  };

  return (
    <div className='Header'>
      <div className='Header_Box'>
        <div className='Header_Title' onClick={() => navigator('/')}>촌스레</div>
        <div className='Header_Category'>
          <div id='create' className='Header_NavItem' onClick={() => navigator('/Generator')}>코스 만들기</div>
          <div id='recommand' className='Header_NavItem' onClick={() => navigator('/CoursePick')}>추천 코스</div>

          {isLoggedIn ? (
            <div
              id='userInfo'
              className='Header_NavItem'
              onClick={() => setIsDropdowned(prev => !prev)}
              ref={userInfoRef}
            >
              <img
                className='profileImg1'
                src={profileImg || defaultProfile}
                alt="프로필"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = defaultProfile;
                }}
              />
              <span className='userNickname'>{nickname}</span>
              <img className='dropdown1' src={dropdown} alt="드롭다운 아이콘" />
            </div>
          ) : (
            <div id='auth' className='Header_NavItem' onClick={() => navigator('/Auth')}>
              로그인 / 회원가입
            </div>
          )}
        </div>
      </div>

      {isDropdowned && (
        <div className='Header_UserMenu' ref={dropdownRef}>
          <div className='Header_UserMenuBox'>
            <div className='Header_UserMenu_UserInfo'>
              <img
                className='profileImg2'
                src={profileImg || defaultProfile}
                alt="프로필"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = defaultProfile;
                }}
              />
              <div className='userNickname_Email'>
                <span className='userNickname'>{nickname}</span>
                <span className='userEmail'>카카오 계정으로 로그인 중</span>
              </div>
            </div>
            <div className='Header_UserMenu_NavBox'>
              <button id='EditProfile' className='Header_UserMenu_NavItems'>프로필 수정</button>
              <button id='MyPage' className='Header_UserMenu_NavItems' onClick={() => navigator('/Mypage')}>마이페이지</button>
              <button id='Logout' className='Header_UserMenu_NavItems' onClick={handleLogout}>로그아웃</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}