import { useNavigate } from "react-router-dom";
import api from "../api";
import DocumentManager from "../components/DocumentManager";

export default function Dashboard() {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("accessToken");
      navigate("/login");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="form-container">
      <h2>Dashboard</h2>
      <DocumentManager/>
      <p>You are logged in!</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
