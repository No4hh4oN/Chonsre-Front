/* eslint-disable no-unused-vars */
import Header from "../components/header";
import carrier from '/images/carrier.png';
import pickdrop from '/images/dropdown-up.png';
import pickdowndrop from '/images/dropdown-down.png';
import regionImg from '/images/BgImg2.png';
import backarrow from '/images/arrow-back.png';
import nextarrow from '/images/arrow-next.png';
import { useState, useEffect} from 'react';
import axios from 'axios'
import './CoursePick.css';
import { useNavigate } from 'react-router-dom';


export default function CoursePick(){
    const navigate = useNavigate();


    // css배치용 더미 데이터
    const dummyCourses = [
        { id: 1, period: "1박 2일", region: "경기도 양평 코스", town: "양평군", image: regionImg },
        { id: 2, period: "2박 3일", region: "강원도 평창 코스", town: "평창군", image: regionImg },
        { id: 3, period: "1박 2일", region: "전라남도 담양 코스", town: "담양군", image: regionImg },
        { id: 4, period: "3박 4일", region: "경상북도 안동 코스", town: "안동시", image: regionImg },
        { id: 5, period: "2박 3일", region: "충청남도 태안 코스", town: "태안군", image: regionImg },
        { id: 6, period: "1박 2일", region: "전라북도 고창 코스", town: "고창군", image: regionImg },
        { id: 7, period: "3박 4일", region: "경상남도 하동 코스", town: "하동군", image: regionImg },
        { id: 8, period: "2박 3일", region: "강원도 인제 코스", town: "인제군", image: regionImg },
        { id: 9, period: "1박 2일", region: "충청북도 제천 코스", town: "제천시", image: regionImg },
        { id: 10, period: "4박 5일", region: "경기도 가평 코스", town: "가평군", image: regionImg },
        { id: 11, period: "2박 3일", region: "전라남도 순천 코스", town: "순천시", image: regionImg },
        { id: 12, period: "1박 2일", region: "경상북도 영주 코스", town: "영주시", image: regionImg },
        { id: 13, period: "5박 6일", region: "강원도 정선 코스", town: "정선군", image: regionImg },
        { id: 14, period: "2박 3일", region: "충청남도 보령 코스", town: "보령시", image: regionImg }
    ];

    const Course_TYPES = ["산촌", "농촌", "어촌"];
    const Course_Style = ["가족과", "친구와", "연인과","반려견과","혼자"];
    const Course_Period = ["당일치기","1박 2일","2박 3일","3박 4일","4박 5일","5박 6일"];

    // 선택된 내용 저장, 서버 전송에 이용
    const [selectedType, setSelectedType] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState("");
    // 드롭다운 
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);

    const toggleTypeDropdown = () => {
        setIsTypeDropdownOpen((prev) => !prev);
    };
    const toggleStyleDropdown = () =>{
        setIsStyleDropdownOpen((prev)=>!prev);
    }
    const togglePeriodDropdown = () =>{
        setIsPeriodDropdownOpen((prev)=>!prev);
    }

    // 추천코스 요청 
    const handleSearchClick = async ()=>{
        try{
            const requestBody ={
                type: selectedType || null,
                style : selectedStyle || null,
                period : selectedPeriod || null
            };
            const response = await axios.post("/api", requestBody);
            console.log(response)
        } catch (error) {
            console.error("검색 요청 실패:", error);
        }
    }

    // 하단 숫자 바
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    const totalPages = Math.ceil(dummyCourses.length / ITEMS_PER_PAGE);
    const currentData = dummyCourses.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );


    return(
        <div className="CoursePick">
            <Header />
            <div className="pick-title-container">
                <div className="pick-title">
                    촌스레가 준비한 <br />
                    <span>촌캉스 추천 코스</span>
                </div>
                <img src={carrier} alt="캐리어 이미지" />
            </div>

            <div className="pick-dropdown">
                <div className="pick-dropdown-box">
                    촌캉스 타입
                    <div className="pick-type-dropdown" >
                        <div className="pick-type-dropdown-menu-top" onClick={toggleTypeDropdown}>
                            {selectedType || "전체"}
                            <img className="dropdown-arrow" src={isTypeDropdownOpen ? pickdowndrop : pickdrop} alt="드롭다운 화살표" />
                        </div>
                        {isTypeDropdownOpen && (
                            <div className="pick-dropdown-menu">
                                <div
                                    className="pick-dropdown-item-whole"
                                    onClick={() => {
                                        setSelectedType("");
                                        setIsTypeDropdownOpen(false);
                                    }}
                                >
                                    전체
                                </div>
                                {Course_TYPES.map((type) => (
                                    <div
                                        key={type}
                                        className="pick-dropdown-item"
                                        onClick={() => {
                                            setSelectedType(type);
                                            setIsTypeDropdownOpen(false);
                                        }}
                                    >
                                        {type}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="pick-dropdown-box">
                    스타일
                    <div className="pick-style-dropdown" >
                        <div className="pick-type-dropdown-menu-top" onClick={toggleStyleDropdown}>
                            {selectedStyle || "전체"}
                            <img className="dropdown-arrow" src={isStyleDropdownOpen ? pickdowndrop : pickdrop} alt="드롭다운 화살표" />                         
                        </div>                        
                        {isStyleDropdownOpen && (
                            <div className="pick-dropdown-menu">
                                <div 
                                    className="pick-dropdown-item-whole"
                                    onClick={()=>{
                                        setSelectedStyle("");
                                        setIsStyleDropdownOpen(false);
                                    }}
                                >
                                    전체
                                </div>
                                {Course_Style.map((style)=>(
                                    <div 
                                        className="pick-dropdown-item"
                                        onClick={()=>{
                                            setSelectedStyle(style);
                                            setIsStyleDropdownOpen(false);
                                        }}
                                    >
                                        {style}
                                    </div>   
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="pick-dropdown-box">
                    기간
                    <div className="pick-period-dropdown" >
                        <div className="pick-type-dropdown-menu-top" onClick={togglePeriodDropdown}>
                            <span>{selectedPeriod || "전체"}</span>
                            <img className="dropdown-arrow" src={isPeriodDropdownOpen ? pickdowndrop : pickdrop} alt="드롭다운 화살표" />
                        </div>
                        {isPeriodDropdownOpen && (
                            <div className="pick-dropdown-menu">
                                <div 
                                    className="pick-dropdown-whole"
                                    onClick={()=>{
                                        setSelectedPeriod("");
                                        setIsPeriodDropdownOpen(false);
                                    }}
                                >
                                    전체
                                </div>
                                {Course_Period.map((period)=>(
                                    <div 
                                        className="pick-dropdown-item"
                                        onClick={()=>{
                                            setSelectedPeriod(period);
                                            setIsPeriodDropdownOpen(false);
                                        }}
                                    >
                                        {period}
                                    </div>   
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={handleSearchClick}>찾기</button>
            </div>

            <div className="pick-course-contents">
                {currentData.map((course) => (
                    <div 
                        key={course.id} 
                        className="course-card"
                        onClick={() => navigate(`/CourseDetail/${course.id}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img src={course.image} alt="지역 이미지" />
                        <div className="course-period">{course.period}</div>
                        <div className="course-region">{course.region}</div>
                        <span>{course.town}</span>
                    </div>
                ))}
            </div>

            <div className="pagination">
                <button
                    className="pagination-arrow"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    <img src={backarrow} alt="이전" />
                </button>
                <div className="pagination-numbers">
                    {[...Array(totalPages)].map((_, index) => {
                        const page = index + 1;
                        return (
                        <button
                            key={page}
                            className={`pagination-button ${currentPage === page ? "active" : ""}`}
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </button>
                        );
                    })}
                </div>
                <button
                    className="pagination-arrow"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    <img src={nextarrow} alt="다음" />
                </button>
            </div>
        </div>
    )
}