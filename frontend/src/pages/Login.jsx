import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, AlertCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

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
        {serverError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-500/30 rounded-lg px-4 py-3"><AlertCircle size={16} />{serverError}</div>}
        <GoogleButton onError={setServerError} />
        <div className="flex items-center gap-3 text-xs text-ink/45"><span className="h-px flex-1 bg-white" /><span>OR</span><span className="h-px flex-1 bg-white" /></div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div><label className="block text-sm text-ink/70 mb-1.5">Email</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full rounded-xl bg-white border border-ink/10 px-4 py-3 text-sm outline-none focus:border-beam transition" placeholder="you@institution.edu" /></div>
          <div><label className="block text-sm text-ink/70 mb-1.5">Password</label><input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="w-full rounded-xl bg-white border border-ink/10 px-4 py-3 text-sm outline-none focus:border-beam transition" placeholder="••••••••" /></div>
          <button type="submit" disabled={submitting} className="btn-primary w-full"><LogIn size={18} />{submitting ? "Signing in..." : "Sign In"}</button>
        </form>
      </div>
    </AuthShell>
  );
}
