import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/header";
import "./CourseEditor.css";
import scope from "/icons/scope.png";
import HomeIcon from "/icons/home.png";
import editIcon from "/icons/edit.png";

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

const dummyCourses = [
  {
    name: "A 코스",
    accommodations: [
      {
        name: "한옥마을 황토펜션",
        image:
          "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9980b3d-7bde-4379-a5ed-4c81252a83a5",
        desc: "2층 한옥으로 단체 여행객이 머물기에도 좋은 곳...",
        address: "경기도 수원시 영통구 영통로 154번길 56",
      },
    ],
    days: [
      {
        title: "1일차",
        places: [
          {
            name: "양평 두물머리",
            lat: 37.535984,
            lng: 127.302801,
            image:
              "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
            desc: "이른 아침에 피어나는 물안개와 일출, 황포돛배 그리고 400년이 넘은 느티나무가 어우러진 관광 명소.",
          },
          {
            name: "양수리 전통시장",
            address: "경기도 양평군 양서면 양수리 123",
            image:
              "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
            desc: "관광지와 인접한 양평의 3대 전통 시장 중 하나. 음식, 가정용품, 의류, 신발과 더불어 노래방 등의 유흥 시설도 존재.",
          },
          {
            name: "한영홈타운",
            address: "서울특별시 강북구 도봉로 76가길 18",
            image:
              "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
            desc: "관광지와 인접한 양평의 3대 전통 시장 중 하나. 음식, 가정용품, 의류, 신발과 더불어 노래방 등의 유흥 시설도 존재.",
          },
        ],
      },
      {
        title: "2일차",
        places: [
          {
            name: "양평 두물머리",
            lat: 37.535984,
            lng: 127.302801,
            image:
              "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
            desc: "이른 아침에 피어나는 물안개와 일출, 황포돛배 그리고 400년이 넘은 느티나무가 어우러진 관광 명소.",
          },
          {
            name: "양수리 전통시장",
            address: "경기도 양평군 양서면 양수리 123",
            image:
              "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
            desc: "관광지와 인접한 양평의 3대 전통 시장 중 하나. 음식, 가정용품, 의류, 신발과 더불어 노래방 등의 유흥 시설도 존재.",
          },
        ],
      },
      {
        title: "3일차",
        places: [
          {
            name: "양평 두물머리",
            lat: 37.535984,
            lng: 127.302801,
            image:
              "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
            desc: "이른 아침에 피어나는 물안개와 일출, 황포돛배 그리고 400년이 넘은 느티나무가 어우러진 관광 명소.",
          },
          {
            name: "양수리 전통시장",
            address: "경기도 양평군 양서면 양수리 123",
            image:
              "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
            desc: "관광지와 인접한 양평의 3대 전통 시장 중 하나. 음식, 가정용품, 의류, 신발과 더불어 노래방 등의 유흥 시설도 존재.",
          },
        ],
      },
    ],
  },
  {
    name: "B 코스",
    accommodations: [
      {
        name: "두물머리 한옥스테이",
        image:
          "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
        desc: "자연과 함께하는 힐링 숙소...",
        address: "경기도 양평군 양서면 양수로 44",
      },
    ],
    days: [
      {
        title: "1일차",
        places: [{ name: "세미원", address: "경기도 양평군 양서면 양수로 93" }],
      },
    ],
  },
  { name: "C 코스", accommodations: [], days: [] },
];

// Sortable 아이템(핸들 전용) — render-prop으로 handle에 listeners/attributes 전달
function SortablePlace({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  // children을 함수로 받아 내부에서 handle에만 {...listeners}를 붙일 수 있게 함
  return children({ setNodeRef, style, attributes, listeners, isDragging });
}

export default function CourseEditor() {
  // 확정 데이터: __id 심어서 상태로 관리
  const [courses, setCourses] = useState(() =>
    dummyCourses.map((c, ci) => ({
      ...c,
      days: (c.days || []).map((d, di) => ({
        ...d,
        places: (d.places || []).map((p, pi) => ({
          ...p,
          __id: `${ci}-${di}-${pi}-${p.name}`, // 고유 id
        })),
      })),
    }))
  );

  const [selectedCourse, setSelectedCourse] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const course = courses[selectedCourse];
  const selectedPlaces = course.days[selectedDay]?.places || [];

  // 편집 모드 & 드래프트 
  const [isEditing, setIsEditing] = useState(false);
  const [draftPlaces, setDraftPlaces] = useState([]);

  const openEdit = () => {
    // 깊은 복사
    setDraftPlaces(selectedPlaces.map((p) => ({ ...p })));
    setIsEditing(true);
    // 지도 relayout 약간의 지연 후
    setTimeout(() => {
      if (window.kakao?.maps && mapRef.current) mapRef.current.relayout();
    }, 180);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = () => {
    setCourses((prev) => {
      const next = structuredClone(prev);
      next[selectedCourse].days[selectedDay].places = draftPlaces;
      return next;
    });
    setIsEditing(false);
  };

  // 맵에 반영할 소스(편집 중이면 드래프트)
  const placesForMap = isEditing ? draftPlaces : selectedPlaces;

  // Kakao Map 
  const mapRef = useRef(null);

  useEffect(() => {
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src =
        "//dapi.kakao.com/v2/maps/sdk.js?appkey=a78d10a9ff203286e5fcd09e0f663663&autoload=false&libraries=services";
      script.async = true;
      script.onload = () => window.kakao.maps.load(loadMap);
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () =>
        window.kakao.maps.load(loadMap)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 맵 갱신: 코스/일차/편집/순서변경 시
  useEffect(() => {
    if (window.kakao?.maps) window.kakao.maps.load(loadMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, selectedDay, isEditing, draftPlaces, selectedPlaces]);

  const loadMap = () => {
    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    const mapOption = {
      center: new window.kakao.maps.LatLng(37.543743, 127.213535),
      level: 7,
    };
    const map = new window.kakao.maps.Map(mapContainer, mapOption);
    mapRef.current = map;

    const geocoder = new window.kakao.maps.services.Geocoder();
    const bounds = new window.kakao.maps.LatLngBounds();

    const createMarker = (position, name, index, isAccom = false) => {
      const markerImage = isAccom
        ? new window.kakao.maps.MarkerImage(
          HomeIcon,
          new window.kakao.maps.Size(50, 50),
          { offset: new window.kakao.maps.Point(25, 25) }
        )
        : null;

      const marker = new window.kakao.maps.Marker({
        position,
        map,
        image: markerImage || undefined,
      });

      if (!isAccom) {
        const overlay = new window.kakao.maps.CustomOverlay({
          position,
          content: `<div class="CourseEditor_Marker"><span>${index + 1}</span></div>`,
          yAnchor: 1,
        });
        overlay.setMap(map);
      }

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px;font-size:14px;">${name}</div>`,
      });
      window.kakao.maps.event.addListener(marker, "click", () => {
        infowindow.open(map, marker);
      });

      bounds.extend(position);
      map.setBounds(bounds);
    };

    const showAllMarkers = () => {
      // 숙소(집 아이콘)
      course.accommodations.forEach((accom) => {
        if (accom.lat && accom.lng) {
          const pos = new window.kakao.maps.LatLng(accom.lat, accom.lng);
          createMarker(pos, accom.name, 0, true);
        } else if (accom.address) {
          geocoder.addressSearch(accom.address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const pos = new window.kakao.maps.LatLng(result[0].y, result[0].x);
              createMarker(pos, accom.name, 0, true);
            }
          });
        }
      });

      // 관광지(번호 오버레이) — 편집 여부에 따라 드래프트/확정본 사용
      placesForMap.forEach((place, index) => {
        const add = (lat, lng) => {
          const position = new window.kakao.maps.LatLng(lat, lng);
          createMarker(position, place.name, index);
        };
        if (place.lat && place.lng) add(place.lat, place.lng);
        else if (place.address) {
          geocoder.addressSearch(place.address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              add(Number(result[0].y), Number(result[0].x));
            }
          });
        }
      });
    };

    showAllMarkers();
  };

  // DnD
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

  return (
    <div className="CourseEditor">
      <Header />
      <div className={`CousreEditor_Box ${isEditing ? "editing" : ""}`}>
        <div className="CourseEditor_Menu">
          <div className="CourseEditor_Header">
            <div className="CourseEditor_Header_title">
              <div className="CourseEditor_Header_courseTitle">
                <span>경기도 양평</span>
                <img src={editIcon} alt="편집아이콘" />
              </div>
              <button
                className="CourseEditor_Header_courseEdit"
                onClick={() => (isEditing ? cancelEdit() : openEdit())}
              >
                {isEditing ? "편집 닫기" : "코스 편집 +"}
              </button>
            </div>
            <div className="CourseEditor_Header_date">25/10/08 ~ 25/10/11</div>
          </div>

          <div className="CourseEditor_Body">
            <div className="CourseEditor_CourseButtons">
              {courses.map((c, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedCourse(index);
                    setSelectedDay(0);
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="CourseEditor_CourseBox">
              <span className="CourseEditor_Accommodations">숙소</span>
              {course.accommodations.map((accom, i) => (
                <div className="CourseEditor_AccommodationsList" key={i}>
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
                    className="CourseEditor_Date"
                    key={index}
                    onClick={() => setSelectedDay(index)}
                  >
                    {day.title}
                  </button>
                ))}
              </div>

              {/* 왼쪽: 확정본(읽기 전용) */}
              <div className="CourseEditor_Attractions">
                {selectedPlaces.map((place) => (
                  <div className="CourseEditor_Attraction" key={place.__id}>
                    <img id="AtractionImg" src={place.image} alt="" />
                    <div className="AtractionBox">
                      <span id="AtractionName">{place.name}</span>
                      <div id="AtractionDesc">{place.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="SaveCourse">코스 확정하기</button>
            </div>
          </div>
        </div>

        {/* 지도 */}
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
              <input type="text" />
              <img src={scope} alt="" />
            </div>
            <div className="CourseEditor_EditActions">
              <button onClick={cancelEdit}></button>
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
                            ≡
                          </button>
                          <div className="CourseEditor_EditPane_Attraction">
                            <img id="AtractionImg" src={place.image} alt="" />
                            <div className="AtractionBox">
                              <span id="AtractionName">{place.name}</span>
                              <div id="AtractionDesc">{place.desc}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </SortablePlace>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button className="SaveCourse" onClick={saveEdit}>
              변경 저장
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
