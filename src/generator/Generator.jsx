import { useEffect, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import AxiosClient, { setAuthToken } from "../AxiosClient";
import Header from "../components/header";
import moutainIcon from '/icons/mountain.png';
import dropdown2 from '/icons/dropdown2.png';

import './Generator.css';

// 배경이미지 랜덤 생성용 추출 이미지
const bgImages = [
    '/images/BgImg2.webp',
    '/images/BgImg3.webp',
    '/images/BgImg4.webp'
];

Modal.setAppElement('#root');

export default function Generator() {
    const navigator = useNavigate();

    // 배경 이미지 슬라이드
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % bgImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // 인원 입력 모달
    const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false);

    const [adultCount, setAdultCount] = useState(0);
    const [childCount, setChildCount] = useState(0);
    const [babyCount, setBabyCount] = useState(0);
    const [peopleSummary, setPeopleSummary] = useState("");

    // 날짜 입력 모달
    const [DateModalOpen, setDateModalOpen] = useState(false);
    const [isDateInput, setIsDateInput] = useState("");

    const [startDateInput, setStartDateInput] = useState("");
    const [endDateInput, setEndDateInput] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const handleDateInput = (value, setter) => {
        const digits = value.replace(/\D/g, ''); // 숫자만 추출
        const yy = digits.slice(0, 2);
        const mm = digits.slice(2, 4);
        const dd = digits.slice(4, 6);
        let formatted = yy;
        if (mm) formatted += ` / ${mm}`;
        if (dd) formatted += ` / ${dd}`;
        setter(formatted);
    };

    const formatDate = (input) => {
        const parts = input.split(" / ").map((p) => p.trim());
        if (parts.length !== 3) return null;
        const [yy, mm, dd] = parts;
        return {
            raw: input,
            formatted: `${yy.padStart(2, "0")}/${mm.padStart(2, "0")}/${dd.padStart(2, "0")}`,
            fullDate: `20${yy.padStart(2, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
        };
    };

    const isInvalidDate = (d, original) => {
        return (
            isNaN(d.getTime()) ||
            d.getFullYear() !== Number("20" + original.formatted.slice(0, 2)) ||
            d.getMonth() + 1 !== Number(original.formatted.slice(3, 5)) ||
            d.getDate() !== Number(original.formatted.slice(6, 8))
        );
    };

    const handleConfirmDate = () => {
        const start = formatDate(startDateInput);
        const end = formatDate(endDateInput);

        if (!start || !end) {
            alert("날짜를 정확히 입력해주세요. (예: 25 / 10 / 08)");
            return;
        }

        const startDateObj = new Date(start.fullDate);
        const endDateObj = new Date(end.fullDate);

        if (isInvalidDate(startDateObj, start) || isInvalidDate(endDateObj, end)) {
            alert("존재하지 않는 날짜입니다. (예: 13월, 32일 등)");
            return;
        }

        if (startDateObj > endDateObj) {
            alert("도착일은 가는 날보다 빠를 수 없습니다.");
            return;
        }

        setStartDate(start.formatted);
        setEndDate(end.formatted);
        setDateModalOpen(false);
        setIsDateInput(true);
    };

    // 농어촌 테마 선택
    const [selectedTema, setSelectedTema] = useState("");

    const handleTemaClick = (tema) => {
        setSelectedTema(tema);
        console.log("선택된 테마:", tema); // 디버깅용
    };


    // 지역 추천받기
    // 서버에서 원하는 형식이랑 차이가 있어서 전처리 과정후 전송해야함
    // 
    const [progress, setProgress] = useState(0);
    const [isProgressDone, setIsProgressDone] = useState(false);
    const [recommendedRegion, setRecommendedRegion] = useState("");

    const isReadyToRequest = (
        startDate && endDate && selectedTema
    );

    const formatToDashDate = (slashDate) => {
        const parts = slashDate.split("/");
        if (parts.length !== 3) return "";
        return `20${parts[0].trim()}-${parts[1].trim()}-${parts[2].trim()}`;
    };


    const getCourseRecommend = async () => {
        if (isReadyToRequest == false) {
            alert("모든 입력란을 채워주세요.")
            return (0);
        }

        // 보여질 추천값 초기화
        setRecommendedRegion("");
        setRegionModalOpen(true);

        try {
            const res = await AxiosClient.post('/recommend/group', {
                inpStartDate: formatToDashDate(startDate),
                inpEndDate: formatToDashDate(endDate),
                inpAdultCnt: adultCount,
                inpChildCnt: childCount,
                inpBabyCnt: babyCount,
                inpTema: selectedTema,
                isTemplate: false
            });

            console.log(res.data);
            localStorage.setItem("groupId", res.data.groupId);
            localStorage.setItem("inpStartDate", startDate);
            localStorage.setItem("inpEndDate", endDate);
            navigator('/CourseEditor');
        } catch (err) {
            console.error(err);
            alert("코스 추천 요청에 실패했습니다.");
        }
    }

    // 지역 추천 결과 표시 모달
    const [RegionModalOpen, setRegionModalOpen] = useState(false);
    const [nickname, setNickname] = useState('');

    useEffect(() => {
        let interval;

        if (RegionModalOpen && !recommendedRegion) {
            setProgress(0);
            setIsProgressDone(false);
            getNickname();

            interval = setInterval(() => {
                setProgress((prev) => {
                    const next = prev + 1;
                    if (next >= 100) {
                        clearInterval(interval);
                        setIsProgressDone(true);
                    }
                    return next;
                });
            }, 150);
        }

        return () => clearInterval(interval);
    }, [RegionModalOpen]);

    const getNickname = async () => {
        try {
            const res = await AxiosClient.get('/auth/me');
            setNickname(res.data.nickname);
        } catch (error) {
        }
    }

    return (
        <div className="Generator">
            <Header />
            <div className="GeneratorBox">
                {bgImages.map((src, index) => (
                    <img
                        key={index}
                        src={src}
                        alt={`bg-${index}`}
                        className={`BackgroundImage ${index === currentIndex ? 'active' : ''}`}
                    />
                ))}
                <div className="GeneratorBox_Blur">
                    <div className="GeneratorBox_Content">
                        <div className="GeneratorBox_Contentbox1">
                            <div className="GeneratorBox_Contents">
                                <span className="GeneratorBox_Contents_title">인원</span>
                                <div id="trip_people" className="GeneratorBox_Contents_input" onClick={() => setIsPeopleModalOpen(true)}>
                                    <span className={peopleSummary ? "selected" : "placeholder"}>
                                        {peopleSummary || "인원 수 입력하기"}
                                    </span>
                                    <img id="dropdown2" src={dropdown2} alt="openModal1" />
                                </div>
                            </div>

                            {/* openModal2 */}
                            <div className="GeneratorBox_Contents">
                                <span className="GeneratorBox_Contents_title">촌캉스 일자</span>
                                <div id="trip_date" className="GeneratorBox_Contents_input" onClick={() => setDateModalOpen(true)}>
                                    {isDateInput ? (
                                        <div className="date_selected">
                                            <span className="selected">{startDate}</span>
                                            <span id="date_placeholder_dash">-</span>
                                            <span className="selected">{endDate}</span>
                                        </div>
                                    ) : (
                                        <div className="date_placeholder">
                                            <span id="date_placeholder_dep">YY/MM/DD</span>
                                            <span id="date_placeholder_dash">-</span>
                                            <span id="date_placeholder_arr">YY/MM/DD</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="GeneratorBox_Contentbox2">
                            <div className="GeneratorBox_TemaIntro">
                                전남 촌캉스의 <span id="TemaHighlight">테마</span>를 선택해주세요
                            </div>
                            <div className="GeneratorBox_Temabox">
                                <div id="farm" className={`GeneratorBox_Tema ${selectedTema === "farm" ? "selected" : ""}`}
                                    onClick={() => handleTemaClick("farm")}>
                                    <div className="GeneratorBox_TemaBlur">
                                        <span className="Tema_title">농촌</span>
                                        <span className="Tema_subtitle">향수 물씬, 우리 농산물이 자라는 곳</span>
                                    </div>
                                </div>
                                <div id="fishing" className={`GeneratorBox_Tema ${selectedTema === "fishing" ? "selected" : ""}`} onClick={() => handleTemaClick("fishing")}>
                                    <div className="GeneratorBox_TemaBlur">
                                        <span className="Tema_title">어촌</span>
                                        <span className="Tema_subtitle">향수 물씬, 우리 농산물이 자라는 곳</span>
                                    </div>
                                </div>
                                <div id="etc" className={`GeneratorBox_Tema ${selectedTema === "etc" ? "selected" : ""}`} onClick={() => handleTemaClick("etc")}>
                                    <div className="GeneratorBox_TemaBlur">
                                        <span className="Tema_title">그 외</span>
                                        <span className="Tema_subtitle">자유롭게 전남의 느긋함을 즐겨요</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        className={`CourseGenerator ${isReadyToRequest ? 'active' : 'inactive'}`}
                        onClick={getCourseRecommend}
                    >
                        코스 추천받기</button>
                    <div className="EmptyBox"></div>
                </div>
            </div>

            {/* 인원 수 모달 */}
            <Modal
                isOpen={isPeopleModalOpen}
                onRequestClose={() => setIsPeopleModalOpen(false)}
                contentLabel="인원 입력 모달"
                className="CustomModal1"
                overlayClassName="CustomModalOverlay"
            >
                <div className="PeopleModal_Header">
                    <span className="PeopleModal_Title">촌캉스 인원</span>
                    <span className="PeopleModal_info">* 인원 선택 시, 숙소 추천에 반영됩니다.</span>
                </div>

                {/* 인원 선택 영역 */}
                <div className="PeopleModal_SelectBox">
                    {[
                        { label: "성인", count: adultCount, setCount: setAdultCount },
                        { label: "어린이", count: childCount, setCount: setChildCount },
                        { label: "신생아", count: babyCount, setCount: setBabyCount },
                    ].map(({ label, count, setCount }) => (
                        <div key={label} className="PeopleModal_Selector">
                            <span id="PeopleModal_label">{label}</span>
                            <div id="PeopleModal_buttons">
                                <button id="minus" onClick={() => setCount(Math.max(0, count - 1))}>-</button>
                                <span id="countValue">{count}</span>
                                <button id="plus" onClick={() => setCount(Math.min(10, count + 1))}>+</button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="PeopleModal_info">
                    * 최대 10명까지 선택 가능하며, 그 이상의 인원은 숙소로 문의하시기 바랍니다.
                </p>
                <button
                    className="CloseModalBtn"
                    onClick={() => {
                        const result = [];
                        if (adultCount > 0) result.push(`성인 ${adultCount}`);
                        if (childCount > 0) result.push(`어린이 ${childCount}`);
                        if (babyCount > 0) result.push(`신생아 ${babyCount}`);
                        setPeopleSummary(result.join(", "));
                        setIsPeopleModalOpen(false);
                    }}
                >
                    확인
                </button>
            </Modal>
            <Modal
                isOpen={DateModalOpen}
                onRequestClose={() => setDateModalOpen(false)}
                contentLabel="날짜 입력 모달"
                className="CustomModal2"
                overlayClassName="CustomModalOverlay"
            >
                <div className="DateModal_Header">
                    <span className="DateModal_Title">촌캉스 일자</span>
                </div>
                <div className="DateModal_SelectBox">
                    <div className="DateModal_Departure">
                        <span>가는 날</span>
                        <input
                            type="text"
                            placeholder="YY / MM / DD"
                            value={startDateInput}
                            onChange={(e) => handleDateInput(e.target.value, setStartDateInput)}
                        />

                    </div>
                    <span id="Date_Dash">-</span>
                    <div className="DateModal_Arrival">
                        <span>오는 날</span>
                        <input
                            type="text"
                            placeholder="YY / MM / DD"
                            value={endDateInput}
                            onChange={(e) => handleDateInput(e.target.value, setEndDateInput)}
                        />
                    </div>
                </div>
                <p className="DateModal_info">
                    * 연도를 포함한 6자리 숫자를 입력해 주세요.
                </p>
                <button className="CloseModalBtn" onClick={handleConfirmDate}>
                    확인
                </button>
            </Modal>

            {/* 여행 지역 추천 모달 */}
            <Modal
                isOpen={RegionModalOpen}
                onRequestClose={() => setRegionModalOpen(false)}
                contentLabel="여행 지역 추천 모달"
                className="CustomModal3"
                overlayClassName="CustomModalOverlay"
                shouldCloseOnOverlayClick={false}
                shouldCloseOnEsc={false}
            >
                <img className="moutainIcon" src={moutainIcon} alt="산아이콘" />
                <div className="loadingText">
                    {nickname || "사용자"}님을 위한 <span className="loadingText_highlight">전남의 촌캉스 지역</span>을 고르고 있어요…
                </div>
                <div className="RegionRecommend_ProgressBar">
                    <div className="ProgressFill" style={{ width: `${progress}%` }}></div>
                </div>
            </Modal>
        </div>
    )
}