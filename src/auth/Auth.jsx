import './Auth.css';
import { useEffect, useState } from "react";

import AxiosClient, { setAuthToken } from "../AxiosClient";
import vacationImg from '/images/vacationImg.png';
import KakaoIcon from '/icons/Kakao.webp';

import Header from "../components/header";

export default function Auth() {

    const loginWithKakao = () => {
        const REST_API_KEY = "cee9b5f605698f9a2407eab0ca03c191";
        const REDIRECT_URI = "http://localhost:5173/Auth";
        const kakaoURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}`;
        window.location.href = kakaoURL;
    };

    const [nickname, setNickname] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // 카카오 로그인 리디렉션 처리
    useEffect(() => {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
            const fetchToken = async () => {
                try {
                    const res = await AxiosClient.get(`/auth/kakaoLogin?code=${code}`);
                    const accessToken = res.data.accessToken;
                    const userNickname = res.data.nickname;

                    setAuthToken(accessToken);
                    localStorage.setItem("accessToken", accessToken);

                    if (userNickname) {
                        window.location.href = "/";
                    } else {
                        setIsLoggedIn(true);
                    }
                } catch (err) {
                    console.error(err);
                }
            };

            fetchToken();
        }
    }, []);

    // 닉네임 설정
    const handleSetNickname = async () => {
        try {
            const res = await AxiosClient.post("/auth/SetNickname", { nickname });
            alert(res.data.message);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="Auth">
            <Header />
            {!isLoggedIn &&
                <div className="AuthBox">
                    <span className="AuthBox_Intro">촌캉스의 시작,</span>
                    <span className="AuthBox_Title">촌스레</span>
                    <div className="AuthBox_p">
                        도시를 잠깐 내려놓고,<br />
                        시골 어딘가로 떠나볼까요?
                    </div>
                    <img className='vacationImg' src={vacationImg} alt="휴가" />
                    <button className="AuthBox_Button" onClick={loginWithKakao}>
                        <img id='kakaoIcon' src={KakaoIcon} alt="카카오" />
                        <span>카카오로 시작하기</span>
                    </button>
                </div>
            }
            {isLoggedIn && (
                <div className="NicknameBox">
                    <input
                        type="text"
                        placeholder="닉네임을 입력하세요"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                    <button onClick={handleSetNickname}>닉네임 설정</button>
                </div>
            )}
        </div>
    )
}