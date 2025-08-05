import { useEffect, useState, useRef } from "react";
import Modal from 'react-modal';
import AxiosClient, { setAuthToken } from "../AxiosClient";
import Header from "../components/header";
import dropdown2 from '/icons/dropdown2.png';
import scope from '/icons/scope.png';

import './Generator.css';

// 배경이미지 랜덤 생성용 추출 이미지
const bgImages = [
    '/images/BgImg1.png',
    '/images/BgImg2.png',
    '/images/BgImg3.png',
    '/images/BgImg4.png'
];

// 지역 선택을 위한 지역명
const REGION_TYPES = ["특별시", "광역시", "특별자치시", "도", "특별자치도"];
const REGION_OPTIONS = {
    특별시: ["서울특별시"],
    광역시: ["부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시"],
    특별자치시: ["세종특별자치시"],
    도: ["경기도", "강원도", "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도"],
    특별자치도: ["제주특별자치도"]
};

Modal.setAppElement('#root');

export default function Generator() {

    // 배경 이미지 슬라이드
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % bgImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // 지역 선택 로직
    const [selectedRegion, setSelectedRegion] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("광역시");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 지역 검색
    const [searchTerm, setSearchTerm] = useState("");


    useEffect(() => {
        if (searchTerm) {
            const matchedCategory = REGION_TYPES.find((category) =>
                REGION_OPTIONS[category].some(region => region.includes(searchTerm))
            );
            if (matchedCategory) {
                setSelectedCategory(matchedCategory);
            }
        }
    }, [searchTerm]);

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

    // 여행 스타일 단일 선택
    const [selectedStyle, setSelectedStyle] = useState("");

    const handleStyleClick = (label) => {
        setSelectedStyle(label);
    };

    // 코스 추천받기
    // 서버에서 원하는 형식이랑 차이가 있어서 전처리 과정후 전송해야함
    const isReadyToRequest = (
        startDate && endDate &&
        selectedRegion &&
        selectedStyle
    );

    const formatToDashDate = (slashDate) => {
        const parts = slashDate.split("/");
        if (parts.length !== 3) return "";
        return `20${parts[0].trim()}-${parts[1].trim()}-${parts[2].trim()}`;
    };


    const getCourseRecommend = async () => {
        try {
            const res = await AxiosClient.post('/recommend/region-first', {
                inpStartDate: formatToDashDate(startDate),
                inpEndDate: formatToDashDate(endDate),
                inpRegion: selectedRegion,
                inpStyle: selectedStyle.replace(/\s/g, ""),
                inpAdultCnt: adultCount,
                inpChildCnt: childCount,
                inpBabyCnt: babyCount,
            });
            console.log("추천 결과:", res.data.recommendedRegion);
            
        } catch(err) {
            console.error(err);
            alert("코스 추천 요청에 실패했습니다.");
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
                        <div className="GeneratorBox_Contentbox">
                            <div className="GeneratorBox_Contents">
                                <span className="GeneratorBox_Contents_title">촌캉스 지역</span>
                                <div
                                    id="trip_area"
                                    className="GeneratorBox_Contents_input"
                                    onClick={() => setIsDropdownOpen(prev => !prev)}
                                >
                                    <span className={selectedRegion ? "selected" : "placeholder"}>
                                        {selectedRegion || "지역 찾아보기"}
                                    </span>
                                    <img id="dropdown2" src={dropdown2} alt="드롭다운버튼" />

                                    {isDropdownOpen && (
                                        <div className="region-dropdown">
                                            <div className="searchBox">
                                                <input className="search-bar"
                                                    placeholder="어디든 떠나요!"
                                                    value={searchTerm}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                                <img id="scope" src={scope} alt="돋보기" />
                                            </div>
                                            <div className="region-dropdown-content">
                                                <div className="region-categories">
                                                    {REGION_TYPES.map((type) => (
                                                        <span
                                                            key={type}
                                                            className={type === selectedCategory ? "selected" : ""}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedCategory(type);
                                                                setSearchTerm("");
                                                            }}
                                                        >
                                                            {type}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="region-list">
                                                    {(searchTerm
                                                        ? REGION_OPTIONS[selectedCategory].filter(region =>
                                                            region.includes(searchTerm)
                                                        )
                                                        : REGION_OPTIONS[selectedCategory]
                                                    ).map((region) => (
                                                        <span
                                                            key={region}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedRegion(region);
                                                                setIsDropdownOpen(false);
                                                                setSearchTerm("");
                                                            }}
                                                        >
                                                            {region}
                                                        </span>
                                                    ))}
                                                    {searchTerm &&
                                                        REGION_OPTIONS[selectedCategory].filter(region =>
                                                            region.includes(searchTerm)
                                                        ).length === 0 && (
                                                            <span id="NoResult">검색 결과가 없습니다.</span>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="GeneratorBox_Contents">
                                <span className="GeneratorBox_Contents_title">인원</span>
                                <div id="trip_people" className="GeneratorBox_Contents_input" onClick={() => setIsPeopleModalOpen(true)}>
                                    <span className={peopleSummary ? "selected" : "placeholder"}>
                                        {peopleSummary || "인원 수 입력하기"}
                                    </span>
                                    <img id="dropdown2" src={dropdown2} alt="openModal1" />
                                </div>
                            </div>
                        </div>
                        <div className="GeneratorBox_Contentbox">
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
                            <div className="GeneratorBox_Contents">
                                <span className="GeneratorBox_Contents_title">촌캉스 스타일</span>
                                <div id="trip_style" className="GeneratorBox_Contents_input">
                                    {[
                                        { label: "가족 여행" },
                                        { label: "힐링" },
                                        { label: "우정 여행" },
                                        { label: "뚜벅이" },
                                        { label: "데이트" },
                                        { label: "그 외" },
                                    ].map(({ label }) => (
                                        <div
                                            key={label}
                                            className={`Style_Items ${selectedStyle === label ? "selected" : ""}`}
                                            onClick={() => handleStyleClick(label)}
                                        >
                                            <span id="Style_Items_label">{label}</span>
                                        </div>
                                    ))}
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
                                <button id="plus" onClick={() => setCount(Math.min(100, count + 1))}>+</button>
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

        </div>
    )
}