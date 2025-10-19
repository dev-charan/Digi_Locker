import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Interceptor to attach both CSRF token and JWT access token
api.interceptors.request.use(
  async (config) => {
    try {
      // FIRST: Attach JWT Access Token from localStorage
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        config.headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // SECOND: Handle CSRF token
      if (!window._csrfToken) {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/csrf-token`,
          {
            withCredentials: true,
          }
        );
        window._csrfToken = data.csrfToken;
      }

      config.headers["X-CSRF-Token"] = window._csrfToken;

      return config;
    } catch (error) {
      console.error("Interceptor error:", error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
