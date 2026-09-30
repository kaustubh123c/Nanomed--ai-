import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, AlertCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    let timer;
    const renderGoogle = () => {
      if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return false;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setServerError("");
          try {
            await loginWithGoogle(response.credential);
            navigate("/dashboard");
          } catch (err) {
            setServerError(err.response?.data?.detail || "Google sign-in failed. Please try again.");
          }
        },
        ux_mode: "popup",
        auto_select: false,
      });
      const el = document.getElementById("google-login-button");
      if (el) {
        el.innerHTML = "";
        window.google.accounts.id.renderButton(el, {
          theme: "outline", size: "large", width: 420, text: "continue_with", shape: "rectangular", logo_alignment: "left"
        });
      }
      setGoogleReady(true);
      return true;
    };
    if (!renderGoogle()) timer = window.setInterval(() => { if (renderGoogle()) window.clearInterval(timer); }, 300);
    return () => timer && window.clearInterval(timer);
  }, [loginWithGoogle, navigate]);

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError(""); setSubmitting(true);
    try { await login(form.email, form.password); navigate("/dashboard"); }
    catch (err) { setServerError(err.response?.data?.detail || "Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <AuthShell eyebrow="Sign in" title="Welcome back" subtitle="Sign in with your researcher or admin account." footer={<>Don&apos;t have an account? <Link to="/register" className="text-beam hover:underline">Create one</Link></>}>
      <div className="space-y-5">
        {serverError && <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3"><AlertCircle size={16} />{serverError}</div>}
        <div id="google-login-button" className="flex justify-center min-h-[44px]" />
        {!GOOGLE_CLIENT_ID && <p className="text-xs text-white/40 text-center">Google Login is not configured. Add VITE_GOOGLE_CLIENT_ID to frontend/.env.</p>}
        <div className="flex items-center gap-3 text-xs text-white/30"><span className="h-px flex-1 bg-white/10" /><span>OR</span><span className="h-px flex-1 bg-white/10" /></div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div><label className="block text-sm text-white/70 mb-1.5">Email</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-beam transition" placeholder="you@institution.edu" /></div>
          <div><label className="block text-sm text-white/70 mb-1.5">Password</label><input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-beam transition" placeholder="••••••••" /></div>
          <button type="submit" disabled={submitting} className="btn-primary w-full"><LogIn size={18} />{submitting ? "Signing in..." : "Sign In"}</button>
        </form>
      </div>
    </AuthShell>
  );
}
