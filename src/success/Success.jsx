import './Success.css';
import { useNavigate } from 'react-router-dom';
import Header from "../components/header";
import successCarrier from "/images/successCarrier.png";

export default function Success() {
    const navigator = useNavigate();
    const navMypage = () => {
        navigator('/Mypage');
    }
    const navGenerator = () => {
        navigator('/Generator');
    }

    return (
        <div className="GenerateSuccess">
            <Header />
            <div className="GenerateSuccessBox">
                <img className='successCarrier' src={successCarrier} alt="생성성공" />
                <div className='successMention'>
                    촌캉스 준비가 모두 끝났어요!<br />
                    설레는 마음으로 촌캉스 준비하러 가볼까요?</div>
                <div className='afterSuccess'>
                    <button onClick={navMypage}>마이페이지에서 확인하기</button>
                    <button onClick={navGenerator}>코스 다시 만들기</button>
                </div>
                <div className="EmptyBox"></div>
            </div>
        </div>
    )
}
