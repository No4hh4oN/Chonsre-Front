import { useEffect, useState, useRef } from "react";
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

export default function Generator() {

    // 배경 이미지 슬라이드
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % bgImages.length);
        }, 4000); // 4초마다 변경
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
                                <div className="GeneratorBox_Contents_input">
                                    <span className={selectedRegion ? "selected" : "placeholder"}>
                                        {"성인 2, 어린이 1" || "인원 수 입력하기"}
                                    </span>
                                    <img id="dropdown2" src={dropdown2} alt="드롭다운버튼" />
                                </div>
                            </div>
                        </div>
                        <div className="GeneratorBox_Contentbox">
                            <div className="GeneratorBox_Contents">
                                <span className="GeneratorBox_Contents_title">촌캉스 일자</span>
                                <div className="GeneratorBox_Contents_input">
                                    <span className={selectedRegion ? "selected" : "placeholder"}>
                                        {"25/10/08 - 25/10/11" || "YY/MM/DD - YY/MM/DD"}
                                    </span>
                                </div>
                            </div>
                            <div className="GeneratorBox_Contents">
                                <span className="GeneratorBox_Contents_title">촌캉스 스타일</span>
                                <div className="GeneratorBox_Contents_input">

                                </div>
                            </div>
                        </div>
                    </div>
                    <button className="CourseGenerator">코스 추천받기</button>
                    <div className="EmptyBox"></div>
                </div>
            </div>
        </div>
    )
}