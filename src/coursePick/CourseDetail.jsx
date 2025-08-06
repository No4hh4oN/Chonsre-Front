/* eslint-disable no-unused-vars */
import Header from "../components/header";
import { useState, useEffect} from 'react';
import axios from 'axios'
import './CourseDetail.css';
import { useParams } from 'react-router-dom';
import regionImg from '/images/BgImg2.png';


export default function CourseDetail() {
    // const { id } = useParams();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    return (
        <div className="CourseDetail">
            <Header />
            <img className="detail-main-img" src={regionImg} alt="지역대표이미지" />
            <div className="detail-course-info">
                <div className="detail-course-info-left">
                    <div className="detail-course-period">1박 2일</div>
                    <div className="detail-course-region">경기도 양평 코스</div>
                    <span>서울에서 가까운 양평에서, 자연과 전통이 살아 숨 쉬는 1박 2일 촌캉스를 즐겨보세요.</span>
                </div>

                <div className="detail-course-info-rightBox">
                    <div className="detail-course-day-box">
                        <span>촌캉스 일자</span>
                        <div className="detail-course-date-selected">
                            <input
                                type="text"
                                className="detail-day-selected"
                                placeholder="YY / MM / DD"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <div className="detail-day-dash">-</div>
                            <input
                                type="text"
                                className="detail-day-selected"
                                placeholder="YY / MM / DD"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <button>코스 저장하기</button>
                </div>
            </div>
            <hr style={{ border: "none",height:"2px", width: "1200px", backgroundColor: "#E7ECF1", marginTop:"30px" }} />

        </div>
    );
}
