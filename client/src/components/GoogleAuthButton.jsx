import { useState } from "react"

const GOOGLE_CLIENT_ID = "601194951892-idgf92otjutba0cfirtmr36lhk5rljti.apps.googleusercontent.com"

export default function GoogleAuthButton({ onSuccess, onError, loading: externalLoading }) {
  const [loading, setLoading] = useState(false)
  const busy = loading || externalLoading

  function handleClick() {
    if (busy) return

    const redirectUri = `${window.location.origin}/auth/google/callback`
    const nonce = Math.random().toString(36).substring(2)

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
      prompt: "select_account",
    })

    const width = 500
    const height = 600
    const left = Math.round((window.screen.width - width) / 2)
    const top = Math.round((window.screen.height - height) / 2)

    window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "google-signin",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )

    setLoading(true)

    const bc = new BroadcastChannel("google-oauth")
    bc.onmessage = (event) => {
      bc.close()
      setLoading(false)
      if (event.data?.error) {
        onError?.(event.data.error)
      } else if (event.data?.idToken) {
        onSuccess?.(event.data.idToken)
      } else {
        onError?.("No token received")
      }
    }
  }

  return (
    <button type="button" className="google-auth-btn" onClick={handleClick} disabled={busy}>
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      {busy ? "Connecting..." : "Continue with Google"}
    </button>
  )
}
