/* eslint-disable no-unused-vars */
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import Header from "../components/header";
import './MyReview.css';
import regionImg from "/images/BgImg3.png";
import editcourse from '/icons/editCourse.png';
import edit from '/icons/edit.png';
import coursedelete from '/icons/delete.png';

export default function MyReview(){
    const navigator = useNavigate();
    const { id } = useParams(); // URL 파라미터에서 코스 ID 가져오기

    const [reviewText, setReviewText] = useState("");
    const [selectedDay, setSelectedDay] = useState(1); // 기본 1일차 선택

    const [isSaved, setIsSaved] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const dummyCourse = {
        id: 1,
        title: "경기도 양평 코스",
        period: "2025년 7월 12일 - 2025년 7월 13일",
        days: [
            {
                day: 1,
                places: [
                    { id: 101, name: "양평 두물머리", category: "관광지", image: regionImg },
                    { id: 102, name: "양수리 전통시장", category: "쇼핑", image: regionImg },
                    { id: 103, name: "양평 두물머리", category: "관광지", image: regionImg },
                    { id: 104, name: "양수리 전통시장", category: "숙소", image: regionImg },
                ]
            },
            {
                day: 2,
                places: [
                    { id: 201, name: "용문산", category: "관광지", image: regionImg },
                    { id: 202, name: "세미원", category: "공원", image: regionImg },
                ]
            }
        ]
    };

    return (
        <div className="myreview-page">
            <Header />
            <div className='myreview-main-container'>                
                <div className='review-main-image'>
                    <img src={regionImg} alt="" />
                    {!isSaved ? (
                    <button 
                        className="save-btn"
                        onClick={() => setIsSaved(true)}
                    >
                        저장
                    </button>
                    ) : (
                    <div className="review-two-button">
                        <img 
                            src={editcourse} 
                            alt="편집 아이콘" 
                            className="review-edit-icon"
                            onClick={() => setMenuOpen(menuOpen === true ? false : true)} 
                        />

                        {/* 드롭다운 메뉴 */}
                        {menuOpen && (
                            <div
                                className="review-menu"
                                onClick={(e) => e.stopPropagation()} /* 내부 클릭 시 닫힘 방지 */
                                role="menu"
                            >
                                <div className="review-menu-edit">
                                    <img src={edit} alt='수정'/>
                                    수정하기
                                </div>
                                <hr style={{
                                    height: '1px',
                                    backgroundColor:'#E7ECF1',
                                    width:'153px',
                                    border:"none"
                                }} />    
                                <div className="review-menu-delete">
                                    <img src={coursedelete} alt='삭제'/>
                                    삭제하기
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                    <div className="info-box">
                        <div className='review-course-name'>{dummyCourse.title}</div>
                        <div className='review-course-period'>{dummyCourse.period}</div>
                    </div>
                </div>

                <div className='info-and-review-box'>                
                    {/* 코스 일자별 정보 */}
                    <div className='review-course-info-box'>
                        <div className='info-period-course'>
                            {dummyCourse.days.map((day) => (
                                <span 
                                    key={day.day} 
                                    onClick={() => setSelectedDay(day.day)}
                                >
                                    {day.day}일차
                                </span>
                            ))}
                        </div>
                        <hr  className="review-divider"/>
                        {/* 선택된 일차만 보여주기 */}
                        {dummyCourse.days
                            .filter((day) => day.day === selectedDay)
                            .map((day) => (
                                <div key={day.day} className="places-grid">
                                    {day.places.map((place) => (
                                        <div className='review-detail-course-info' key={place.id}>
                                            <img src={place.image} alt={place.name} />
                                            <div className='course-info-text'>
                                                <span>{place.name}</span>
                                                <span>{place.category}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                    </div>
                    <textarea 
                        placeholder='해당 코스에 대한 간단한 후기를 자유롭게 작성해주세요.'
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                    ></textarea>
                </div>
            </div>
        </div>
    );
}
