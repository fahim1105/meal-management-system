import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Query Keys ───────────────────────────────────────────
export const queryKeys = {
  group:    () => ['group'],
  meal:     (month) => ['meal', month],
  finance:  (month) => ['finance', month],
  summary:  (month) => ['summary', month],
  schedule: (month) => ['schedule', month],
  history:  () => ['history'],
  joinRequests: (status) => ['joinRequests', status],
  myRequestStatus: (groupCode) => ['myRequestStatus', groupCode],
};

// ─── Fetchers ─────────────────────────────────────────────
export const fetchGroup = async (getAuthHeaders) => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/group/my-group`, { headers });
  return res.data.group;
};

export const fetchMeal = async (getAuthHeaders, month) => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/meal/${month}`, { headers });
  return res.data.mealSheet;
};

export const fetchFinance = async (getAuthHeaders, month) => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/finance/${month}`, { headers });
  return res.data.finance;
};

export const fetchSummary = async (getAuthHeaders, month) => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/finance/summary/${month}`, { headers });
  return res.data;
};

export const fetchSchedule = async (getAuthHeaders, month) => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/bazar-schedule/${month}`, { headers });
  return res.data.schedule;
};

export const fetchHistory = async (getAuthHeaders) => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/finance/my-history`, { headers });
  return res.data.history || [];
};

export const fetchGroupTrend = async (getAuthHeaders, months) => {
  const headers = await getAuthHeaders();
  const results = await Promise.allSettled(
    months.map(month => axios.get(`${API_URL}/finance/summary/${month}`, { headers }))
  );
  return months.map((month, i) => ({
    month,
    mealRate: results[i].status === 'fulfilled' ? results[i].value.data.mealRate : 0,
    totalBazar: results[i].status === 'fulfilled' ? results[i].value.data.totalBazar : 0,
    totalMeals: results[i].status === 'fulfilled' ? results[i].value.data.totalMeals : 0,
  }));
};

// ─── Join Request Fetchers ────────────────────────────────
export const fetchJoinRequests = async (getAuthHeaders, status = 'pending') => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/group/join-requests?status=${status}`, { headers });
  return res.data;
};

export const fetchMyRequestStatus = async (getAuthHeaders, groupCode) => {
  const headers = await getAuthHeaders();
  const url = groupCode 
    ? `${API_URL}/group/my-request-status?groupCode=${groupCode}`
    : `${API_URL}/group/my-request-status`;
  const res = await axios.get(url, { headers });
  return res.data;
};
