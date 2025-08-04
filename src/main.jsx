import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './assets/styles/index.css'
import Main from './home/Home.jsx'
import Auth from './auth/Auth.jsx';
import Generator from './generator/Generator.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/Auth" element={<Auth />} />
        <Route path="/Generator" element={<Generator />} />
      </Routes>
      </BrowserRouter>
  </StrictMode >,
)