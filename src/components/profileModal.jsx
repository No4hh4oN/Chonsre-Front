/* eslint-disable no-unused-vars */
import '../assets/styles/profileModal.css';
import { useEffect, useState } from "react";
import Modal from "react-modal";
import profile from "/icons/default.png";

Modal.setAppElement('#root');

export default function ProfileEditModal({ isOpen, onClose }) {
  const [photoUrl, setPhotoUrl] = useState(profile);
  const [selectedFile, setSelectedFile] = useState(null);
  const [placeholderNick, setPlaceholderNick] = useState("김촌스");
  const [inputNick, setInputNick] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const storedImg = localStorage.getItem("profileImg");
    const storedNick = localStorage.getItem("nickname");
    if (storedImg) setPhotoUrl(storedImg);
    if (storedNick) setPlaceholderNick(storedNick);
    setInputNick("");
    setSelectedFile(null);
  }, [isOpen]);

  const openFilePicker = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setSelectedFile(file);
      setPhotoUrl(URL.createObjectURL(file)); // 미리보기
    };
    i.click();
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

const handleApply = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) { alert("로그인 토큰이 없습니다. 다시 로그인해 주세요."); return; }

  let success = true;

  // 닉네임 변경
  const newNick = inputNick.trim();
  if (newNick && newNick !== placeholderNick) {
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
  }

  // 이미지: 로컬스토리지 'profileImg'갱신
  if (selectedFile) {
    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      localStorage.setItem("profileImg", dataUrl);           
      setPhotoUrl(dataUrl);
      window.dispatchEvent(new CustomEvent("profile:updated", { detail: { profileImgUrl: dataUrl } }));
    } catch {
      success = false;
    }
  }

  alert(success ? "프로필 변경 완료!" : "변경 중 오류 발생");
};


  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="ProfileEdit-modal"
      style={{ overlay: { backgroundColor: "rgba(0,0,0,0.5)" } }}
    >
      <div className='modal-profile-edit-top'>
        프로필 수정
        <span>프로필 사진</span>
      </div>

      <div className='modal-profile-img-edit'>
        <img src={photoUrl || profile} alt="프로필 사진" />
        <div className='modal-profile-img-buttons'>
          <button type="button" onClick={openFilePicker}>사진 변경</button>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setPhotoUrl(profile);
              localStorage.removeItem("profileImg");
              window.dispatchEvent(new CustomEvent("profile:updated", { detail: { profileImgUrl: "" } }));
            }}
          >
            삭제
          </button>
        </div>
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
