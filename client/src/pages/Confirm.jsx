// client/src/pages/Confirm.jsx
import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { t } from "../lib/i18n"

export default function Confirm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [status, setStatus] = useState("loading")
  const [msg, setMsg] = useState(t("confirm_processing"))

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMsg(t("confirm_no_token"))
      return
    }

    api
      .post("/auth/confirm", { token })
      .then((res) => {
        setStatus("success")
        setMsg(t("confirm_success"))

        if (res.data.token) {
          localStorage.setItem("auth_token", res.data.token)
        }

        setTimeout(() => navigate("/profile"), 1200)
      })
      .catch((err) => {
        console.error("Confirmation Error:", err)
        setStatus("error")
        setMsg(err?.response?.data?.error || t("confirm_failed"))
      })
  }, [token, navigate])

  return (
    <div className="page" style={{ textAlign: "center", padding: "50px" }}>
      <h2 className="headline">{t("confirm_email_title")}</h2>

      {status === "loading" && (
        <p style={{ fontSize: "1.2rem", color: "gray" }}>⏳ {msg}</p>
      )}

      {status === "success" && (
        <div style={{ color: "green" }}>
          <h1 style={{ fontSize: "3rem" }}>✅</h1>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{msg}</p>
        </div>
      )}

      {status === "error" && (
        <div style={{ color: "red" }}>
          <h1 style={{ fontSize: "3rem" }}>❌</h1>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{msg}</p>
          <button
            onClick={() => navigate("/home")}
            className="btn outline"
            style={{ marginTop: "20px" }}
          >
            {t("go_home")}
          </button>
        </div>
      )}
    </div>
  )
}
