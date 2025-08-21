import { useEffect, useState } from "react";
import Header from "../components/header";
import './CourseEditor.css';
import HomeIcon from '/icons/home.png';
import editIcon from '/icons/edit.png';

const dummyCourses = [
  {
    name: "A 코스",
    accommodations: [
      {
        name: "한옥마을 황토펜션",
        image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9980b3d-7bde-4379-a5ed-4c81252a83a5",
        desc: "2층 한옥으로 단체 여행객이 머물기에도 좋은 곳...",
        address: "경기도 양평군 강하면 둔촌리 789"
      },
    ],
    days: [
      {
        title: "1일차",
        places: [
          { name: "양평 두물머리", lat: 37.535984, lng: 127.302801, image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f", desc:"이른 아침에 피어나는 물안개와 일출, 황포돛배 그리고 400년이 넘은 느티나무가 어우러진 관광 명소.", },
          { name: "양수리 전통시장", address: "경기도 양평군 양서면 양수리 123", image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f", desc:"관광지와 인접한 양평의 3대 전통 시장 중 하나. 음식, 가정용품, 의류, 신발과 더불어 노래방 등의 유흥 시설도 존재.", },
        ],
      },
      {
        title: "2일차",
        places: [
          { name: "양평 두물머리", lat: 37.535984, lng: 127.302801, image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f", desc:"이른 아침에 피어나는 물안개와 일출, 황포돛배 그리고 400년이 넘은 느티나무가 어우러진 관광 명소.", },
          { name: "양수리 전통시장", address: "경기도 양평군 양서면 양수리 123", image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f", desc:"관광지와 인접한 양평의 3대 전통 시장 중 하나. 음식, 가정용품, 의류, 신발과 더불어 노래방 등의 유흥 시설도 존재.", },
        ],
      },
      {
        title: "3일차",
        places: [
          { name: "양평 두물머리", lat: 37.535984, lng: 127.302801, image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f", desc:"이른 아침에 피어나는 물안개와 일출, 황포돛배 그리고 400년이 넘은 느티나무가 어우러진 관광 명소.", },
          { name: "양수리 전통시장", address: "경기도 양평군 양서면 양수리 123", image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f", desc:"관광지와 인접한 양평의 3대 전통 시장 중 하나. 음식, 가정용품, 의류, 신발과 더불어 노래방 등의 유흥 시설도 존재.", },
        ],
      },
    ],
  },
  {
    name: "B 코스",
    accommodations: [
      {
        name: "두물머리 한옥스테이",
        image: "https://cdn.visitkorea.or.kr/img/call?cmd=VIEW&id=f9c4cb3a-6a3d-42ad-b96d-7eaecfb3b76f",
        desc: "자연과 함께하는 힐링 숙소...",
        address: "경기도 양평군 양서면 양수로 44"
      },
    ],
    days: [
      {
        title: "1일차",
        places: [
          { name: "세미원", address: "경기도 양평군 양서면 양수로 93" },
        ],
      },
    ],
  },
  {
    name: "C 코스",
    accommodations: [],
    days: [],
  },
];

export default function CourseEditor() {
  const [selectedCourse, setSelectedCourse] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const course = dummyCourses[selectedCourse];
  const selectedPlaces = course.days[selectedDay]?.places || [];

  useEffect(() => {
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=a78d10a9ff203286e5fcd09e0f663663&autoload=false&libraries=services`;
      script.async = true;
      script.onload = () => {
        window.kakao.maps.load(() => {
          loadMap();
        });
      };
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => {
        window.kakao.maps.load(() => {
          loadMap();
        });
      });
    }
  }, []);

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        loadMap();
      });
    }
  }, [selectedPlaces]);

  const loadMap = () => {
    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    const mapOption = {
      center: new window.kakao.maps.LatLng(37.543743, 127.213535),
      level: 7,
    };
    const map = new window.kakao.maps.Map(mapContainer, mapOption);
    const geocoder = new window.kakao.maps.services.Geocoder();
    const bounds = new window.kakao.maps.LatLngBounds();

    const createMarker = (position, name, index, isAccom = false) => {
      const markerImage = isAccom
        ? new window.kakao.maps.MarkerImage(
          { HomeIcon },
          new window.kakao.maps.Size(50, 50),
          { offset: new window.kakao.maps.Point(50, 50) }
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

      selectedPlaces.forEach((place, index) => {
        if (place.lat && place.lng) {
          const position = new window.kakao.maps.LatLng(place.lat, place.lng);
          createMarker(position, place.name, index);
        } else if (place.address) {
          geocoder.addressSearch(place.address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const position = new window.kakao.maps.LatLng(result[0].y, result[0].x);
              createMarker(position, place.name, index);
            }
          });
        }
      });
    };

    showAllMarkers();
  };

  return (
    <div className="CourseEditor">
      <Header />
      <div className="CousreEditor_Box">
        <div className="CourseEditor_Menu">
          <div className="CourseEditor_Header">
            <div className="CourseEditor_Header_title">
              <div className="CourseEditor_Header_courseTitle">
                <span>경기도 양평</span>
                <img src={editIcon} alt="편집아이콘" />
              </div>
              <button className="CourseEditor_Header_courseEdit">코스 편집 +</button>
            </div>
            <div className="CourseEditor_Header_date">25/10/08 ~ 25/10/11</div>
          </div>
          <div className="CourseEditor_Body">
            <div className="CourseEditor_CourseButtons">
              {dummyCourses.map((course, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedCourse(index);
                    setSelectedDay(0);
                  }}
                >
                  {course.name}
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

              <div className="CourseEditor_Attractions">
                {selectedPlaces.map((place, i) => (
                  <div className="CourseEditor_Attraction" key={i}>
                    <img id="AtractionImg" src={place.image} alt="" />
                    <div>
                      <span>{place.name}</span>
                      <div>
                        {place.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="SaveCourse">
                코스 확정하기
              </button>
            </div>
          </div>
        </div>
        <div id="map" className="CourseEditor_Map" />
      </div>
    </div>
  );
}
