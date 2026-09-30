import { useState } from "react";
import { Settings as SettingsIcon, User, Lock } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [organization, setOrganization] = useState(user?.organization || "");
  const [profileStatus, setProfileStatus] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileStatus("saving");
    await api.put("/auth/me", { full_name: fullName, organization });
    await refreshUser?.();
    setProfileStatus("saved");
    setTimeout(() => setProfileStatus(""), 2000);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordStatus("saving");
    try {
      await api.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      setPasswordStatus("saved");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordStatus(""), 2000);
    } catch (e) {
      setPasswordError(e.response?.data?.detail || "Could not update password");
      setPasswordStatus("");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
          <SettingsIcon className="text-beam" size={24} />
          Settings
        </h1>
        <p className="text-ink/50 text-sm mt-1">Manage your researcher profile and account security.</p>
      </div>

      <form onSubmit={saveProfile} className="glass-panel-light p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-beam" />
          <p className="label-eyebrow text-ink/50">Profile</p>
        </div>
        <Field label="Full Name" value={fullName} onChange={setFullName} />
        <Field label="Organization" value={organization} onChange={setOrganization} />
        <Field label="Email" value={user?.email} disabled />
        <Field label="Role" value={user?.role} disabled />
        <button type="submit" className="btn-primary">
          {profileStatus === "saving" ? "Saving…" : profileStatus === "saved" ? "Saved ✓" : "Save Profile"}
        </button>
      </form>

      <form onSubmit={savePassword} className="glass-panel-light p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-beam" />
          <p className="label-eyebrow text-ink/50">Password</p>
        </div>
        <Field label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} required />
        <Field label="New Password" type="password" value={newPassword} onChange={setNewPassword} required />
        {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
        <button type="submit" className="btn-primary">
          {passwordStatus === "saving" ? "Updating…" : passwordStatus === "saved" ? "Updated ✓" : "Change Password"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled, ...rest }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</label>
      <input
        type={type}
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        {...rest}
      />
    </div>
  );
}
