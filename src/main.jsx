import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './assets/styles/index.css'
import Main from './home/Home.jsx'
import Auth from './auth/Auth.jsx';
import Generator from './generator/Generator.jsx';
import CoursePick from './coursePick/CoursePick.jsx';
import CourseDetail from './coursePick/CourseDetail.jsx';
import Test from './coursePick/test.jsx'
import Test2 from './coursePick/test2.jsx'
import Mypage from './mypage/mypage.jsx';
import MyReview from './mypage/MyReview.jsx';



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/Auth" element={<Auth />} />
        <Route path="/Generator" element={<Generator />} />
        <Route path="/CoursePick" element={<CoursePick />} />
        <Route path="/CourseDetail/:id" element={<CourseDetail />} />
        <Route path="/test" element={<Test />} />
        <Route path="/test2" element={<Test2 />} />
        <Route path="/mypage" element={<Mypage />} />
        <Route path="/myReview/:id" element={<MyReview />} />
      </Routes>
      </BrowserRouter>
  </StrictMode >,
)