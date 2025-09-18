import '../assets/styles/profileModal.css';
import { useEffect, useState } from "react";
import Modal from "react-modal";
import profile from "/icons/default.png";

Modal.setAppElement('#root');

export default function ProfileEditModal({ isOpen, onClose }) {
  const [photoUrl, setPhotoUrl] = useState(profile);
  const [placeholderNick, setPlaceholderNick] = useState("김촌스");
  const [inputNick, setInputNick] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const storedImg = localStorage.getItem("profileImg");
    const storedNick = localStorage.getItem("nickname");
    if (storedImg) setPhotoUrl(storedImg);
    if (storedNick) setPlaceholderNick(storedNick);
    setInputNick("");
  }, [isOpen]);

  const handleApply = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) { 
      alert("로그인 토큰이 없습니다. 다시 로그인해 주세요."); 
      return; 
    }

    let success = true;

    const newNick = inputNick.trim();
    if (newNick && newNick !== placeholderNick) {
      try {
        const r1 = await fetch("https://smartzoo.shop/auth/SetNickname", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ nickname: newNick }),
        });
        if (r1.ok) {
          localStorage.setItem("nickname", newNick);
          setPlaceholderNick(newNick);
          setInputNick("");
          window.dispatchEvent(new CustomEvent("profile:updated", { detail: { nickname: newNick } }));
        } else {
          success = false;
        }
      } catch {
        success = false;
      }
    }

    if (success) {
      onClose();
    } else {
      alert("변경 중 오류 발생");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="ProfileEdit-modal"
      style={{ overlay: { backgroundColor: "rgba(0,0,0,0.5)" } }}
    >
      <div className='modal-profile-edit-top'>프로필 수정</div>

      <div className='modal-profile-img-edit'>
        <img src={photoUrl || profile} alt="프로필 사진" />
      </div>

      <hr style={{ border: "2px solid #E7ECF1" }} />

      <div className='modal-nickname-box'>
        <span>닉네임</span>
        <input
          type="text"
          placeholder={placeholderNick || '김촌스'}
          value={inputNick}
          onChange={(e) => setInputNick(e.target.value)}
        />
      </div>

      <div className='modal-edit-finish-buttons'>
        <button onClick={onClose}>취소</button>
        <button onClick={handleApply}>적용</button>
      </div>
    </Modal>
  );
}
