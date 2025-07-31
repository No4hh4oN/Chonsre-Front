import Header from "../components/header";
import './Home.css';

export default function Home() {


    return (
        <div className="Home">
            <Header />
            <div className="HomeBox">
                <div className="HomeBox_Blur">
                    <div className="HomeBox_Content">
                        <span className="HomeBox_Intro">촌캉스의 시작,</span>
                        <span className="HomeBox_Title">촌스레</span>
                        <div className="HomeBox_p">
                            도시를 잠깐 내려놓고,<br />
                            시골 어딘가로 떠나볼까요?
                        </div>
                        <button className="HomeBox_Button">촌스레 시작하기</button>
                    </div>
                </div>
            </div>
        </div>
    )
}