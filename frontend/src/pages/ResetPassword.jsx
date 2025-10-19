import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import api from "../api";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = searchParams.get("token");
    if (!token) return setError("Missing token");

    setError("");
    setSuccess("");
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setSuccess("Password updated – redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed");
    }
  };

  return (
    <AuthForm
      title="Reset Password"
      onSubmit={handleSubmit}
      error={error}
      success={success}
    >
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Update Password</button>
    </AuthForm>
  );
}
