import axios from "axios";

let authToken = "";
export const setAuthToken = (token) => {
  authToken = token;
};

// Bearer 토큰이 필요 없는 예외 URL 리스트
const EXCLUDE_AUTH_URLS = [
    
];

// Axios 인스턴스 생성
const AxiosClient = axios.create({
  baseURL: "http://13.125.221.236:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

AxiosClient.interceptors.request.use((config) => {
  const isExcluded = EXCLUDE_AUTH_URLS.includes(config.url);

  if (!isExcluded && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

export default AxiosClient;
