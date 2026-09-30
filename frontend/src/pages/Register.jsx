import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { UserPlus, AlertCircle } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: "researcher" } });

  const role = watch("role");

  const onSubmit = async (data) => {
    setServerError("");
    try {
      await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
        organization: data.organization || null,
      });
      navigate("/dashboard");
    } catch (err) {
      setServerError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Set up your lab account"
      subtitle="Register as a researcher or an admin for your organization."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-beam hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            <AlertCircle size={16} />
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-sm text-white/70 mb-1.5">Full name</label>
          <input
            className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-beam transition"
            placeholder="Dr. Asha Rao"
            {...register("full_name", { required: "Full name is required" })}
          />
          {errors.full_name && (
            <p className="text-red-300 text-xs mt-1">{errors.full_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1.5">Email</label>
          <input
            type="email"
            className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-beam transition"
            placeholder="you@institution.edu"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && (
            <p className="text-red-300 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1.5">Organization</label>
          <input
            className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-beam transition"
            placeholder="University / Lab name (optional)"
            {...register("organization")}
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1.5">Password</label>
          <input
            type="password"
            className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-beam transition"
            placeholder="At least 8 characters"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Use at least 8 characters" },
            })}
          />
          {errors.password && (
            <p className="text-red-300 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">Account type</label>
          <div className="grid grid-cols-2 gap-3">
            {["researcher", "admin"].map((r) => (
              <label
                key={r}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-sm text-center capitalize transition ${
                  role === r
                    ? "border-beam bg-beam/10 text-white"
                    : "border-white/15 text-white/60 hover:border-white/30"
                }`}
              >
                <input type="radio" value={r} className="hidden" {...register("role")} />
                {r}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          <UserPlus size={18} />
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </AuthShell>
  );
}
