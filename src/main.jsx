import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './assets/styles/index.css'
import Main from './home/Home.jsx'
import Auth from './auth/Auth.jsx';
import Generator from './generator/Generator.jsx';
import CoursePick from './coursePick/CoursePick.jsx';
import CourseEditor from './courseEditor/CourseEditor.jsx';
import Success from './success/Success.jsx';
import CourseDetail from './coursePick/CourseDetail.jsx';
import Mypage from './mypage/Mypage.jsx';
import MyReview from './mypage/MyReview.jsx';
import DetailSaveCourse from "./mypage/DetailSaveCourse.jsx"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/Auth" element={<Auth />} />
        <Route path="/Generator" element={<Generator />} />
        <Route path="/CoursePick" element={<CoursePick />} />
        <Route path="/CourseDetail/:id" element={<CourseDetail />} />
        <Route path="/CourseEditor" element={<CourseEditor />} />
        <Route path="/Success" element={<Success />} />
        <Route path="/mypage" element={<Mypage />} />
        <Route path="/myReview/:id" element={<MyReview />} />
        <Route path="/DetailSaveCourse/:id" element={<DetailSaveCourse />} />
      </Routes>
    </BrowserRouter>
  </StrictMode >,
)