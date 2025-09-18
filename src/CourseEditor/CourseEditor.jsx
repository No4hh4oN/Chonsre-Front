/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import AxiosClient, { setAuthToken } from "../AxiosClient";
import Modal from 'react-modal';
import Header from "../components/header";
import "./CourseEditor.css";
import scope from "/icons/scope.png";
import DragIcon from "/icons/DragIcon.png";
import HomeIcon from "/icons/home.png";
import editIcon from "/icons/edit.png";
import CancelEditIcon from "/icons/CancelEditIcon.png";
import closeModal from "/icons/CloseModal.png";
import defaultImg from "/images/place.png";
import defaultAccom from "/images/sleep.png";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Item (Drag Handle 전용)
function SortablePlace({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return children({ setNodeRef, style, attributes, listeners, isDragging });
}

Modal.setAppElement('#root');
export default function CourseEditor() {
  const navigator = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const inpStartDate = localStorage.getItem("inpStartDate");
  const inpEndDate = localStorage.getItem("inpEndDate");

  // Kakao Map 관련 ref들
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const idToLatLngRef = useRef(new Map()); // {id -> kakao.maps.LatLng}
  const infoRef = useRef(null); // 단일 InfoWindow 재사용

  useEffect(() => {

    const groupId = localStorage.getItem("groupId");
    const token = localStorage.getItem("accessToken");

    if (!groupId || !token) {
      alert("비정상적인 접근입니다.");
      navigator(-1); // 한 단계만 뒤로
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await AxiosClient.get(`/recommend/group/${groupId}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        const raw = Array.isArray(res.data) ? res.data : [];
        const formatted = raw.map((course) => ({
          courseId: course.courseId,
          courseTitle: course.title || "여행지",
          name: `${course.courseLabel} 코스`,
          accommodations: course.accommodation
            ? [{
              name: course.accommodation.name,
              address: course.accommodation.address,
              desc: course.accommodation.description,
              image: course.accommodation.imgUrl || defaultAccom,
              lat: course.accommodation.lat,
              lng: course.accommodation.lng,
            }]
            : [],
          days: (course.days || []).map((dayData) => ({
            title: `${dayData.day}일차`,
            dayNumber: dayData.day,
            places: (dayData.places || []).map((p, idx) => ({
              name: p.placeName,
              address: p.address,
              desc: p.description || "관광지",
              image: p.imgUrl || defaultImg,
              lat: p.lat,
              lng: p.lng,
              __id: `${course.courseLabel}-${dayData.day}-${idx}-${p.placeName}`,
            })),
          })),
        }));

        setCourses(formatted);
      } catch (err) {
        console.error("코스 정보 조회 실패:", err);
        alert("코스 정보를 불러오는 데 실패했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  const [selectedCourse, setSelectedCourse] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [editDay, setEditDay] = useState(0);
  const course = courses[selectedCourse] || { days: [], accommodations: [] };
  const selectedPlaces = course.days[selectedDay]?.places || [];

  const [isEditing, setIsEditing] = useState(false);
  const [draftPlaces, setDraftPlaces] = useState([]);
  const [saving, setSaving] = useState(false);


  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef(null);

  useEffect(() => {
    setIsEditingTitle(false);
  }, [selectedCourse]);

  const startEditTitle = () => {
    setTitleDraft(course.courseTitle || "");
    setIsEditingTitle(true);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  };

  const commitTitle = () => {
    setCourses(prev => {
      const next = structuredClone(prev);
      const v = (titleDraft || "").trim();
      if (next[selectedCourse]) next[selectedCourse].courseTitle = v || "여행지";
      return next;
    });
    setIsEditingTitle(false);
  };

  const cancelTitleEdit = () => {
    setIsEditingTitle(false);
    setTitleDraft("");
  };


  const openEdit = () => {
    const start = selectedDay;
    setEditDay(start);
    const base = course.days[start]?.places || [];
    setDraftPlaces(base.map((p) => ({ ...p })));
    setIsEditing(true);
    setTimeout(() => {
      if (window.kakao?.maps && mapRef.current) mapRef.current.relayout?.();
    }, 180);
  };

  const cancelEdit = () => setIsEditing(false);

  const buildCoursePayload = (c) => ({
    title: c.courseTitle || c.name || "여행지",
    days: (c.days || []).map((d) => ({
      day: d.dayNumber ?? (parseInt((d.title || "1일차"), 10) || 1),
      places: (d.places || []).map((p) => ({
        placeName: p.name,
        description: p.desc || "",
        address: p.address || "",
        imgUrl: p.image || defaultImg,
      })),
    })),
    accommodation:
      (c.accommodations && c.accommodations[0])
        ? {
          name: c.accommodations[0].name || "",
          address: c.accommodations[0].address || "",
          description: c.accommodations[0].desc || "",
          imgUrl: c.accommodations[0].image || defaultAccom,
        }
        : null,
  });


  // 전체 수정 저장
  const saveEdit = async () => {
    try {
      setSaving(true);

      const token = localStorage.getItem("accessToken");
      if (token) setAuthToken(token);

      const currentCourse = courses[selectedCourse];
      if (!currentCourse?.courseId) {
        alert("courseId가 없어 저장할 수 없습니다. (코스 상세를 먼저 불러오세요)");
        setSaving(false);
        return;
      }

      // 편집 내용을 적용한 스냅샷 생성
      const nextCourse = structuredClone(currentCourse);
      if (nextCourse?.days?.[editDay]) {
        nextCourse.days[editDay].places = draftPlaces.map((p) => ({ ...p }));
      }

      // 페이로드 구성
      const payload = buildCoursePayload(nextCourse);

      // PUT
      await AxiosClient.put(`/recommend/courses/${nextCourse.courseId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 전역 상태 반영
      setCourses((prev) => {
        const next = structuredClone(prev);
        next[selectedCourse] = nextCourse;
        return next;
      });

      alert("변경 사항이 저장되었습니다.");
      setIsEditing(false);
    } catch (err) {
      alert("코스 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  // 제목만 수정
  const saveTitleEdit = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) setAuthToken(token);

      const currentCourse = structuredClone(courses[selectedCourse]);
      if (!currentCourse?.courseId) return;

      currentCourse.courseTitle = (titleDraft || "").trim() || "여행지";

      const payload = buildCoursePayload(currentCourse);
      await AxiosClient.put(`/recommend/courses/${currentCourse.courseId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses((prev) => {
        const next = structuredClone(prev);
        next[selectedCourse] = currentCourse;
        return next;
      });

      setIsEditingTitle(false);
      alert("제목이 저장되었습니다.");
    } catch (err) {
      alert("제목 저장에 실패했습니다.");
    }
  };



  // Kakao 스크립트 로더
  useEffect(() => {
    const existing = document.querySelector('script[src*="dapi.kakao.com"]');
    const onReady = () => window.kakao.maps.load(loadMap);

    if (!existing) {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_JS_KEY}&autoload=false&libraries=services`;
      script.async = true;
      script.onload = onReady;
      document.head.appendChild(script);
    } else {
      if (typeof window.kakao?.maps?.load === "function") onReady();
      else existing.addEventListener("load", onReady, { once: true });
    }
  }, []);

  // 코스/일자 변경 시 지도 갱신
  useEffect(() => {
    if (window.kakao?.maps) window.kakao.maps.load(loadMap);
    // 좌표 캐시/인포윈도우 초기화(선택 변경 시 다시 계산)
    idToLatLngRef.current = new Map();
    if (infoRef.current) {
      try { infoRef.current.close(); } catch (e) { }
      infoRef.current = null;
    }
  }, [selectedCourse, selectedDay, courses]);

  // 지도 구성 (숙소 포함 중심잡기 + 클릭 포커스 대비 캐시)
  const loadMap = () => {
    const container = document.getElementById("map");
    if (!container || !window.kakao?.maps) return;

    const mapOption = { center: new window.kakao.maps.LatLng(37.543743, 127.213535), level: 10 };
    const map = new window.kakao.maps.Map(container, mapOption);
    mapRef.current = map;

    geocoderRef.current = new window.kakao.maps.services.Geocoder();
    const bounds = new window.kakao.maps.LatLngBounds();

    const createMarker = (position, name, index, isAccom = false, id) => {
      if (isAccom) {
        const markerImage = new window.kakao.maps.MarkerImage(
          HomeIcon,
          new window.kakao.maps.Size(50, 50),
          { offset: new window.kakao.maps.Point(25, 25) }
        );
        const marker = new window.kakao.maps.Marker({ position, map, image: markerImage });
        const iw = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:5px;font-size:14px;">${name}</div>`,
        });
        window.kakao.maps.event.addListener(marker, "click", () => iw.open(map, marker));
      } else {
        const el = document.createElement("div");
        el.className = "CourseEditor_Marker";
        el.innerHTML = `<span>${index + 1}</span>`;
        el.style.cursor = "pointer";
        const overlay = new window.kakao.maps.CustomOverlay({ position, content: el, yAnchor: 0.5 });
        overlay.setMap(map);

        const iw = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:5px;font-size:14px;">${name}</div>`,
          removable: false,
        });
        el.addEventListener("click", () => {
          iw.setPosition(position);
          iw.open(map);
        });
      }

      if (id) idToLatLngRef.current.set(id, position);
      bounds.extend(position);
    };

    // 숙소 좌표
    const accomPromises = (course.accommodations || []).map((a, i) => {
      const id = `acc-${i}`;
      if (a.lat != null && a.lng != null) {
        const pos = new window.kakao.maps.LatLng(a.lat, a.lng);
        createMarker(pos, a.name, 0, true, id);
        return Promise.resolve(pos);
      }
      if (a.address) {
        return new Promise((resolve) => {
          geocoderRef.current.addressSearch(a.address, (res, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const pos = new window.kakao.maps.LatLng(Number(res[0].y), Number(res[0].x));
              createMarker(pos, a.name, 0, true, id);
              resolve(pos);
            } else resolve(null);
          });
        });
      }
      return Promise.resolve(null);
    });

    // 장소 좌표
    const placePromises = (selectedPlaces || []).map((p, i) => {
      const id = p.__id;
      if (p.lat != null && p.lng != null) {
        const pos = new window.kakao.maps.LatLng(p.lat, p.lng);
        createMarker(pos, p.name, i, false, id);
        return Promise.resolve(pos);
      }
      if (p.address) {
        return new Promise((resolve) => {
          geocoderRef.current.addressSearch(p.address, (res, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const pos = new window.kakao.maps.LatLng(Number(res[0].y), Number(res[0].x));
              createMarker(pos, p.name, i, false, id);
              resolve(pos);
            } else resolve(null);
          });
        });
      }
      return Promise.resolve(null);
    });

    // 모두 완료 후 중심/경로 처리
    Promise.all([...accomPromises, ...placePromises]).then((coords) => {
      const all = coords.filter(Boolean);
      if (all.length > 0) {
        all.forEach((pos) => bounds.extend(pos));
        if (!bounds.isEmpty()) map.setBounds(bounds);
      }

      // 경로선: 숙소 제외 장소만 연결
      const placeCoords = coords.slice(accomPromises.length).filter(Boolean);
      if (placeCoords.length >= 2) {
        const polyline = new window.kakao.maps.Polyline({
          path: placeCoords,
          strokeWeight: 4,
          strokeColor: "#3AC581",
          strokeOpacity: 1.0,
          strokeStyle: "solid",
        });
        polyline.setMap(map);
      }
    });
  };

  // 지도 포커스
  const resolveLatLng = ({ lat, lng, address }) =>
    new Promise((resolve) => {
      if (lat != null && lng != null) {
        resolve(new window.kakao.maps.LatLng(lat, lng));
        return;
      }
      if (!address || !geocoderRef.current) return resolve(null);
      geocoderRef.current.addressSearch(address, (res, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          resolve(new window.kakao.maps.LatLng(Number(res[0].y), Number(res[0].x)));
        } else resolve(null);
      });
    });

  const focusPlace = async ({ id, name, lat, lng, address }) => {
    const map = mapRef.current;
    if (!map) return;

    let pos = idToLatLngRef.current.get(id);
    if (!pos) {
      pos = await resolveLatLng({ lat, lng, address });
      if (!pos) return;
      idToLatLngRef.current.set(id, pos);
    }

    map.panTo(pos);
    map.setLevel(4);

    if (!infoRef.current) {
      infoRef.current = new window.kakao.maps.InfoWindow({ removable: false });
    }
    infoRef.current.setContent(`<div style="padding:5px;font-size:14px;">${name}</div>`);
    infoRef.current.setPosition(pos);
    infoRef.current.open(map);
  };

  // 코스 확정
  // 저장(확정) 진행 중 상태
  const [finalizing, setFinalizing] = useState(false);
  const confirmCourse = async () => {
    if (isEditing) {
      alert("편집 중에는 코스를 확정할 수 없습니다. 먼저 변경 저장 또는 취소를 해주세요.");
      return;
    }

    try {
      setFinalizing(true);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        alert("로그인이 필요합니다.");
        setFinalizing(false);
        return;
      }
      setAuthToken(token);

      const currentCourse = courses[selectedCourse];
      if (!currentCourse?.courseId) {
        alert("courseId가 없어 확정할 수 없습니다. 코스 정보를 다시 불러와 주세요.");
        setFinalizing(false);
        return;
      }
      
      const payload = buildCoursePayload(currentCourse);
      
      await AxiosClient.put(`/recommend/courses/${currentCourse.courseId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await AxiosClient.post(
        `/recommend/courses/${currentCourse.courseId}/save`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { savedId, courseId, groupId } = res.data || {};
      navigator('/Success');
    } catch (err) {
      alert("코스 확정에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setFinalizing(false);
    }
  };


  // 코스 편집 드래그 기능
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = draftPlaces.findIndex((p) => p.__id === active.id);
    const newIndex = draftPlaces.findIndex((p) => p.__id === over.id);
    setDraftPlaces((arr) => arrayMove(arr, oldIndex, newIndex));
  };

  const placeIds = useMemo(
    () => (isEditing ? draftPlaces : selectedPlaces).map((p) => p.__id),
    [isEditing, draftPlaces, selectedPlaces]
  );

  const removeDraftPlace = (id) => {
    setDraftPlaces((prev) => prev.filter((p) => p.__id !== id));
  };


  // 코스 검색 기능
  // 검색 모달 상태
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCounty, setSearchCounty] = useState("");
  const [searchLimit, setSearchLimit] = useState(100);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const addPlaceFromSearch = (item) => {
    const __id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${item.placeName}`;
    const next = {
      __id,
      name: item.placeName,
      desc: item.description || "관광지",
      address: item.address || "",
      image: item.imgUrl || defaultImg,
      lat: undefined,
      lng: undefined,
    };
    setDraftPlaces(prev => {
      const exists = prev.some(p => p.name === next.name && p.address === next.address);
      return exists ? prev : [...prev, next];
    });
  };

  const doSearch = async (_keyword, _county, _limit) => {
    const keyword = (_keyword ?? searchKeyword).trim();
    const county = (_county ?? searchCounty).trim();
    const limit = Number.isFinite(_limit) ? _limit : searchLimit;

    console.log('[doSearch] start', { keyword, county, limit });


    if (!keyword) {
      setSearchError("검색어를 입력해 주세요.");
      setSearchResults([]);
      setSearchOpen(true);
      return;
    }
    try {
      setSearchOpen(true);
      setSearchLoading(true);
      setSearchError("");

      const token = localStorage.getItem("accessToken");
      if (!token) {
        setSearchLoading(false);
        setSearchError("로그인이 필요합니다.");
        setSearchOpen(true);
        return;
      }

      const res = await AxiosClient.get("/recommend/places/search", {
        headers: { Authorization: `Bearer ${token}` },
        params: { keyword, ...(county ? { county } : {}), ...(limit ? { limit } : {}) },
      });

      const list = Array.isArray(res?.data?.results) ? res.data.results : [];
      setSearchResults(list);
    } catch (e) {
      console.error(e);
      setSearchError("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setSearchResults([]);
      setSearchOpen(true);
    } finally {
      setSearchLoading(false);
    }
  };


  return (
    <div className="CourseEditor">
      <Header />
      <div className={`CousreEditor_Box ${isEditing ? "editing" : ""}`}>
        <div className="CourseEditor_Menu">
          <div className="CourseEditor_Header">
            <div className="CourseEditor_Header_title">
              <div className="CourseEditor_Header_courseTitle">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    className="CourseEditor_Header_courseTitleInput"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitTitle(); saveTitleEdit(); }
                      else if (e.key === "Escape") { e.preventDefault(); cancelTitleEdit(); }
                    }}
                    onBlur={commitTitle}
                    maxLength={40}
                    placeholder="코스 제목을 입력하세요"
                  />
                ) : (
                  <>
                    <span>{course.courseTitle}</span>
                    <img
                      src={editIcon}
                      alt="제목 편집"
                      role="button"
                      tabIndex={0}
                      onClick={startEditTitle}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") startEditTitle(); }}
                      style={{ cursor: "pointer" }}
                    />
                  </>
                )}
              </div>
              <button
                className="CourseEditor_Header_courseEdit"
                onClick={() => (isEditing ? cancelEdit() : openEdit())}
              >
                {isEditing ? "편집 취소 -" : "코스 편집 +"}
              </button>
            </div>
            <div className="CourseEditor_Header_date">{inpStartDate} ~ {inpEndDate}</div>
          </div>

          <div className="CourseEditor_Body">
            <div className="CourseEditor_CourseButtons">
              {courses.map((c, index) => (
                <button
                  key={index}
                  className={`CourseEditor_CourseBtn ${selectedCourse === index ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCourse(index);
                    setSelectedDay(0);
                  }}
                  aria-pressed={selectedCourse === index}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="CourseEditor_CourseBox">
              <span className="CourseEditor_Accommodations">숙소</span>
              {course.accommodations.map((accom, i) => (
                <div
                  className="CourseEditor_AccommodationsList"
                  key={i}
                  onClick={() =>
                    focusPlace({
                      id: `acc-${i}`,
                      name: accom.name,
                      lat: accom.lat,
                      lng: accom.lng,
                      address: accom.address,
                    })
                  }
                  style={{ cursor: "pointer" }}
                >

                  <img id="AccommodationImg" src={accom.image} alt={accom.name} />
                  <div className="CourseEditor_Accommodation_desc">
                    <span id="AccommodationName">{accom.name}</span>
                    <div id="AccommodationDesk">{accom.desc}</div>
                  </div>
                </div>
              ))}

              <div className="CourseEditor_Dates">
                {course.days.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`CourseEditor_Date ${selectedDay === index ? "active" : ""}`}
                    onClick={() => setSelectedDay(index)}
                    aria-pressed={selectedDay === index}
                  >
                    {day.title}
                  </button>
                ))}
              </div>

              {/* 왼쪽: 확정본(읽기 전용) */}
              <div className="CourseEditor_Attractions">
                {selectedPlaces.map((place) => (
                  <div
                    className="CourseEditor_Attraction"
                    key={place.__id}
                    onClick={() =>
                      focusPlace({
                        id: place.__id,
                        name: place.name,
                        lat: place.lat,
                        lng: place.lng,
                        address: place.address,
                      })
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <img id="AtractionImg" src={place.image} alt="" />
                    <div className="AtractionBox">
                      <span id="AtractionName">{place.name}</span>
                      <div id="AtractionDesc">{place.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="SaveCourse"
                onClick={confirmCourse}
                disabled={isEditing || finalizing}
                title={isEditing ? "편집 중에는 코스를 확정할 수 없습니다" : "코스 확정하기"}
              >{finalizing ? "저장 중..." : "코스 확정하기"}</button>
            </div>
          </div>
        </div>

        {/* 카카오맵 */}
        <div className="CourseEditor_MapWrap">
          {isEditing &&
            <div className="CourseEditor_MapMask" />
          }
          <div id="map" className="CourseEditor_Map" />
        </div>

        {/* 오른쪽 편집 패널 */}
        {isEditing && (
          <aside className="CourseEditor_EditPane">
            <div className="CourseEditor_EditPane_Header">
              <input
                className="CourseEditor_EditPane_SearchBar"
                type="text"
                placeholder="가고 싶은 명소를 검색해 볼까요?"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); doSearch(searchKeyword, searchCounty, searchLimit); }
                  if (e.key === "Escape") setSearchOpen(false);
                }}
              />
              <img
                className="CourseEditor_EditPane_Scope"
                src={scope}
                alt="검색"
                role="button"
                tabIndex={0}
                onClick={() => doSearch(searchKeyword, searchCounty, searchLimit)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") doSearch(searchKeyword, searchCounty, searchLimit); }}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div className="CourseEditor_EditActions">
              <button className="CancelEdit" onClick={cancelEdit}>
                <img src={CancelEditIcon} alt="편집바 닫기" />
              </button>
            </div>

            {/* 편집 패널 전용 날짜별 선택 탭 */}
            <div className="CourseEditor_EditPane_Dates">
              {(course.days || []).map((day, di) => (
                <button
                  key={di}
                  className={`CourseEditor_EditPane_Date ${editDay === di ? "active" : ""}`}
                  onClick={() => {
                    setEditDay(di);
                    const base = course.days[di]?.places || [];
                    setDraftPlaces(base.map((p) => ({ ...p })));
                  }}
                >
                  {day.title}
                </button>
              ))}
            </div>


            {/* 드래그 핸들만 활성화 */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={placeIds} strategy={verticalListSortingStrategy}>
                <div className="CourseEditor_EditPane_Attractions">
                  {draftPlaces.map((place) => (
                    <SortablePlace key={place.__id} id={place.__id}>
                      {({ setNodeRef, style, attributes, listeners }) => (
                        <div
                          ref={setNodeRef}
                          style={style}
                          className="CourseEditor_EditPane_Attraction_Box"
                        >
                          <button
                            className="DragHandle"
                            title="드래그로 순서 변경"
                            {...attributes}
                            {...listeners}
                          >
                            <img src={DragIcon} alt="드래그아이콘" />
                          </button>
                          <div className="CourseEditor_EditPane_Attraction">
                            <img id="AtractionImg" src={place.image} alt="" />
                            <div className="AtractionBox">
                              <span id="AtractionName">{place.name}</span>
                              <div id="AtractionDesc">{place.desc}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="RemovePlace"
                            aria-label={`${place.name} 삭제`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDraftPlace(place.__id);
                            }}
                          >
                            -
                          </button>
                        </div>
                      )}
                    </SortablePlace>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button className="SaveChange" onClick={saveEdit}>
              변경 저장
            </button>
          </aside>
        )}
      </div>
      <Modal
        isOpen={searchOpen}
        onRequestClose={() => setSearchOpen(false)}
        contentLabel="관광지 검색 결과"
        className="CustomModal4"
        overlayClassName="CustomModal4Overlay"
      >
        <div className="SearchModal_Header">
          <div className="SearchModal_Header_Label">검색 결과 {!searchLoading && !searchError && (
            <span id="SearchModal_Header_Value">{searchResults.length > 0 ? `${searchResults.length}건` : ""}</span>
          )}</div>
          <img className="closeModalIcon" src={closeModal} alt="close" onClick={() => setSearchOpen(false)} />
        </div>
        {searchLoading && <span>검색 중...</span>}
        {!searchLoading && searchError && <span>{searchError}</span>}
        {!searchLoading && !searchError && (
          <div className="SearchModal_Results">
            {searchResults.length > 0 ?
              <>
                {searchResults.map((r, idx) => (
                  <div className="SearchedTourlist" key={`${r.placeName}-${idx}`}>
                    <div className="SearchedTourInfo">
                      <img
                        className="tourlistImg"
                        src={r.imgUrl || defaultImg}
                        alt={r.placeName}
                      />
                      <div className="tourlistText">
                        <div id="placeName">{r.placeName}</div>
                        <div id="description">{r.description || "관광지"}</div>
                      </div>
                    </div>

                    {/* <button
                  variant="outline"
                  size="sm"
                  onClick={() => focusPlace({
                    id: `${r.placeName}-${idx}`,
                    name: r.placeName,
                    lat: r.lat, lng: r.lng, address: r.address
                  })}
                >
                  미리보기
                </button> */}
                    <button className="addTourlist" onClick={() => addPlaceFromSearch(r)}>
                      +
                    </button>
                  </div>
                ))}
              </>
              :
              "결과가 없습니다."}
          </div>
        )}


      </Modal>

    </div>

  );
}