import { useEffect, useMemo, useState } from "react";
import AxiosClient from "../AxiosClient";
import Header from "../components/header";
import defaultImg from "/images/defaultImg.png";
import "./Mypage.css";

const SAVED_LIST_URL = "/recommend/saved";

export default function Mypage() {
  const token = useMemo(() => localStorage.getItem("accessToken"), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [list, setList] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        if (!token) throw new Error("로그인이 필요합니다.");

        const res = await AxiosClient.get(SAVED_LIST_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // 응답: 배열 또는 { results: [...] } 둘 다 허용
        const data = res?.data;
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : null;

        if (!Array.isArray(arr)) {
          throw new Error("목록 응답 형식이 올바르지 않습니다.");
        }

        // 안전한 정규화(필드명이 달라도 최대한 맞춰줌)
        const normalized = arr
          .map((it) => {
            const savedId = it.savedId ?? it.id ?? it.saved_id ?? null;
            const course = it.course ?? it.courseInfo ?? null;
            const title = course?.title ?? it.title ?? "(제목 없음)";
            const label = course?.courseLabel ?? it.courseLabel ?? "";
            // 썸네일(가능하면 첫 장소 이미지 사용), 없으면 기본 이미지
            const firstImg =
              course?.days?.[0]?.places?.[0]?.imgUrl || it.thumbUrl || null;

            return {
              savedId,
              title,
              label,
              thumb: firstImg || defaultImg,
            };
          })
          .filter((x) => x.savedId != null);

        if (!cancelled) setList(normalized);
      } catch (e) {
        if (!cancelled) setError(e?.message || "목록 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="Mypage">
      <Header />
      <div className="Mypage_Container">
        <h2 className="Mypage_Title">내가 저장한 코스</h2>

        {loading && <div className="Mypage_Status muted">불러오는 중…</div>}
        {!loading && error && <div className="Mypage_Status error">{error}</div>}

        {!loading && !error && (
          <>
            {list.length === 0 ? (
              <div className="Mypage_Status muted">저장된 코스가 없습니다.</div>
            ) : (
              <ul className="SavedGrid">
                {list.map((item) => (
                  <li key={item.savedId} className="SavedCard">
                    <img
                      src={item.thumb}
                      alt={item.title}
                      onError={(e) => {
                        e.currentTarget.src = defaultImg;
                      }}
                    />
                    <div className="SavedCard_Body">
                      <div className="SavedCard_Title">
                        {item.label ? `[${item.label}] ` : ""}
                        {item.title}
                      </div>
                      <div className="SavedCard_Meta">savedId: {item.savedId}</div>
                      {/* 상세 페이지가 준비되면 아래 링크/버튼 연결 */}
                      {/* <button onClick={() => navigate(`/mypage/saved/${item.savedId}`)}>자세히 보기</button> */}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
