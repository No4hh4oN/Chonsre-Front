import '../assets/styles/profileModal.css';

import Modal from "react-modal";
import profile from "/icons/default.png";

Modal.setAppElement('#root');

export default function ProfileEditModal({ isOpen, onClose }) {
  let storedImg = null;
  let storedNick = null;
  try {
    storedImg = localStorage.getItem('profileImg');
    storedNick = localStorage.getItem('nickname');
  } catch {
    //무시
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="ProfileEdit-modal"
      style={{
        overlay: { backgroundColor: "rgba(0,0,0,0.5)" },
      }}
    >
      <div className='modal-profile-edit-top'>
        프로필 수정
        <span>프로필 사진</span>
      </div>
      <div className='modal-profile-img-edit'>
        <img src={storedImg || profile} alt="프로필 사진" />
        <div className='modal-profile-img-buttons'>
          <button>사진 변경</button>
          <button>삭제</button>
        </div>
      </div>
      <hr style={{ border: "2px solid #E7ECF1"}} />
      <div className='modal-nickname-box'>
        <span>닉네임</span>
        <input type="text" placeholder={storedNick || '김촌스'} />
      </div>
      <div className='modal-edit-finish-buttons'>
        <button onClick={onClose}>취소</button>
        <button onClick={onClose}>적용</button>
      </div>
    </Modal>
  );
}
