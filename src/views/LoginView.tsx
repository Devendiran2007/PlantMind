import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import GlassCard from '../components/GlassCard';

interface LoginViewProps {
  setToken: (token: string | null) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all security fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Authentication handshake rejected.");
      }

      const data = await res.json();
      localStorage.setItem("plantmind_auth_token", data.access_token);
      setToken(data.access_token);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to reach security services. Verify backend status.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
    
    // Auto-trigger submit
    setTimeout(() => {
      const btn = document.getElementById("auth-submit-btn");
      if (btn) btn.click();
    }, 100);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background blueprint-grid p-4 text-white">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-primary/20 shadow-glow-orange bg-card">
          <img src="/logo.jpg" alt="PlantMind Logo" className="w-full h-full object-cover scale-110" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-widest font-heading uppercase text-white hud-glow-orange">
            PlantMind
          </h1>
          <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase">
            Industrial Knowledge OS
          </p>
        </div>
      </div>

      <div className="w-full max-w-[480px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard glow="cyan" className="p-8 border border-border/80" hoverEffect={false}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-heading tracking-wide text-white flex items-center justify-center gap-2">
                <ShieldCheck className="w-6 h-6 text-secondary" />
                Security Gateway
              </h2>
              <p className="text-xs text-text-secondary mt-1.5 leading-normal">
                Credentials handshake required to access system terminals.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex gap-3 items-start text-danger text-xs leading-normal"
              >
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-mono">
                  Operator Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-secondary transition-colors">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@plantmind.com"
                    className="w-full pl-11 pr-4 py-3 bg-card-secondary border border-border rounded-xl focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20 transition-all duration-200 text-sm placeholder:text-text-muted/60"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-mono">
                  Access Key Passcode
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-secondary transition-colors">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-card-secondary border border-border rounded-xl focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20 transition-all duration-200 text-sm placeholder:text-text-muted/60"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={loading}
                className="w-full mt-2 py-3 bg-secondary text-background hover:bg-secondary/80 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-glow-cyan text-sm"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Initialize Handshake</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Profile Select shortcuts */}
            <div className="mt-8 pt-6 border-t border-border/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono block text-center mb-3">
                Pre-seeded Operator Profiles
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleQuickLogin("engineer@plantmind.com", "engineerpassword")}
                  className="p-3 bg-card hover:bg-card-secondary border border-border/50 hover:border-secondary rounded-xl text-left transition-all duration-200 cursor-pointer"
                >
                  <p className="text-[10px] font-bold text-white">Sarah Chen</p>
                  <span className="text-[9px] text-secondary font-mono uppercase font-bold">Engineer</span>
                </button>
                <button
                  onClick={() => handleQuickLogin("admin@plantmind.com", "adminpassword")}
                  className="p-3 bg-card hover:bg-card-secondary border border-border/50 hover:border-primary rounded-xl text-left transition-all duration-200 cursor-pointer"
                >
                  <p className="text-[10px] font-bold text-white">Admin Lead</p>
                  <span className="text-[9px] text-primary font-mono uppercase font-bold">Admin Manager</span>
                </button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginView;
