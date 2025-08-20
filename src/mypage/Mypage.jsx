import { useNavigate } from 'react-router-dom';
import Header from "../components/header";
import './Mypage.css';

export default function Mypage() {
    const navigator = useNavigate();

    return (
        <div className="Mypage">
            <Header />
            <div className="">

            </div>
        </div>
    )
}