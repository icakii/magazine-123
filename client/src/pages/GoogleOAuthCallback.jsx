import { useEffect } from "react"

export default function GoogleOAuthCallback() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.substring(1))
    const idToken = hash.get("id_token")
    const error = hash.get("error")

    const bc = new BroadcastChannel("google-oauth")
    bc.postMessage({ idToken, error })
    bc.close()

    setTimeout(() => window.close(), 300)
  }, [])

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p>Processing Google sign-in...</p>
    </div>
  )
}
