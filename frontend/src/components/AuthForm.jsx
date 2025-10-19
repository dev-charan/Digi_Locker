// import { useState } from "react";

function AuthForm({ title, onSubmit, error, success, children }) {
  return (
    <div className="form-container">
      <h2>{title}</h2>
      <form className="form" onSubmit={onSubmit}>
        {children}
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
}

export default AuthForm;
