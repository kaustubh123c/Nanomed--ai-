import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * "Continue with Google" button (Google Identity Services).
 * Sends the returned ID token to POST /api/auth/google, then routes to the dashboard.
 */
export default function GoogleButton({ onError, text = "continue_with" }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const holder = useRef(null);
  const [ready, setReady] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let timer;
    let tries = 0;
    const render = () => {
      const gsi = window.google?.accounts?.id;
      if (!gsi || !holder.current) return false;
      gsi.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: "popup",
        auto_select: false,
        callback: async (response) => {
          onError?.("");
          try {
            await loginWithGoogle(response.credential);
            navigate("/dashboard");
          } catch (err) {
            onError?.(err.response?.data?.detail || "Google sign-in failed. Please try again.");
          }
        },
      });
      holder.current.innerHTML = "";
      const width = Math.min(holder.current.parentElement?.clientWidth || 360, 400);
      gsi.renderButton(holder.current, {
        theme: "outline", size: "large", width, text, shape: "pill", logo_alignment: "left",
      });
      setReady(true);
      return true;
    };
    if (!render()) {
      timer = window.setInterval(() => {
        tries += 1;
        if (render() || tries > 50) window.clearInterval(timer);
      }, 300);
    }
    return () => timer && window.clearInterval(timer);
  }, [loginWithGoogle, navigate, onError, text]);

  if (!GOOGLE_CLIENT_ID) {
    return <p className="text-center text-xs text-ink/50">Google sign-in is not configured (set VITE_GOOGLE_CLIENT_ID).</p>;
  }
  return (
    <div className="w-full">
      <div id={id} ref={holder} className="flex min-h-[44px] justify-center" />
      {!ready && <p className="mt-1 text-center text-xs text-ink/45">Loading Google sign-in…</p>}
    </div>
  );
}
