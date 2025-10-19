import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function ProtectedRoute({ children }) {
  const [isAuth, setIsAuth] = useState(null); // null = loading

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return setIsAuth(false);

    api
      .get("/auth/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => setIsAuth(true))
      .catch(() => {
        localStorage.removeItem("accessToken");
        setIsAuth(false);
      });
  }, []);

  if (isAuth === null) return <div>Loading…</div>;
  return isAuth ? children : <Navigate to="/login" replace />;
}
