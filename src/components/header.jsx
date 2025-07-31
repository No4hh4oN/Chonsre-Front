import '../assets/styles/header.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
    const [isLogin, setIsLogin] = useState(false);
    const navigator = useNavigate();

    return(
        <div className='Header'>
            <div className='Header_Box'>
            <div className='Header_Title' onClick={() => navigator('/')}>촌스레</div>
            <div className='Header_Category'>
                <div id='create' className='Header_NavItem'>코스 만들기</div>
                <div id='recommand' className='Header_NavItem'>추천 코스</div>
                {isLogin ? (
                    <div id='userInfo' className='Header_NavItem'>
                        <img src="" alt="프로필" />
                        <span>김촌스</span>
                    </div>
                ) : (
                    <div id='auth' className='Header_NavItem' onClick={() => navigator('/Auth')}>
                        로그인 / 회원가입
                    </div>
                )}
                
            </div>
            </div>
        </div>
    )
}