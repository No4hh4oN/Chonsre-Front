import './Auth.css';
import { useEffect, useState } from "react";

import AxiosClient, { setAuthToken } from "../AxiosClient";
import vacationImg from '/images/vacationImg.png';
import KakaoIcon from '/icons/Kakao.webp';
import Header from "../components/header";

export default function Auth() {
    return (
        <div className="Auth">
            <Header />
            <div className="AuthBox">
                <span className="AuthBox_Intro">촌캉스의 시작,</span>
                <span className="AuthBox_Title">촌스레</span>
                <div className="AuthBox_p">
                    도시를 잠깐 내려놓고,<br />
                    시골 어딘가로 떠나볼까요?
                </div>
                <img className='vacationImg' src={vacationImg} alt="휴가" />
                <button className="AuthBox_Button">
                    <img id='kakaoIcon' src={KakaoIcon} alt="카카오" />
                    <span>카카오로 시작하기</span>
                </button>
            </div>
        </div>
    )
}