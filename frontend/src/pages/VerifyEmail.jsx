import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function VerifyEmail() {
  const [msg, setMsg] = useState("Verifying…");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return setMsg("Invalid link");

    api
      .get(`/auth/verify?token=${token}`)
      .then(({ data }) => {
        setMsg(data.message);
        setTimeout(() => navigate("/login"), 2000);
      })
      .catch((err) =>
        setMsg(err.response?.data?.error || "Verification failed")
      );
  }, [searchParams, navigate]);

  return (
    <div className="form-container">
      <h2>Email verification</h2>
      <p>{msg}</p>
    </div>
  );
}
