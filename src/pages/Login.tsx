import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getDemoAccounts } from '@/services/auth-service';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import somLogo from '@/images/som-logo.png';
import { motion } from 'framer-motion';

export default function Login() {
  // Demo credentials are served by the Worker (GET /auth/demo-accounts) so the
  // quick-fill buttons always match what the backend expects.
  const [demoAccounts, setDemoAccounts] = useState<Array<{ email: string; name: string; demoPassword: string }>>([]);
  useEffect(() => {
    getDemoAccounts()
      .then((accounts) => setDemoAccounts(accounts))
      .catch(() => undefined);
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);

  const validateForm = () => {
    let valid = true;
    if (!email) { setEmailError('Email is required'); valid = false; }
    else if (!validateEmail(email)) { setEmailError('Please enter a valid email'); valid = false; }
    else setEmailError('');
    if (!password) { setPasswordError('Password is required'); valid = false; }
    else if (password.length < 3) { setPasswordError('Password too short'); valid = false; }
    else setPasswordError('');
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setGeneralError('');
      await login(email, password);
      navigate('/');
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAF8F5] dark:bg-[#070A12]">
      {/* Left visual */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#0A0E1A]">
        <img src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200&h=1200&fit=crop" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/70 to-[#070A12]/20" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center">
              <img src={somLogo} alt="SOM" className="w-6 h-6" />
            </div>
            <span className="font-display text-white text-[1.1rem]">SOM CONNECT</span>
          </div>

          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/70">Welcome back</span>
            </div>
            <div>
              <h1 className="font-display text-[3.5rem] leading-[0.85] tracking-[-0.04em] text-white text-balance">
                Continue your <span className="italic font-[300] text-white/60">journey.</span>
              </h1>
              <p className="mt-4 text-white/50 leading-relaxed max-w-[36ch]">Thousands of teachings, daily devotionals, and a global community waiting for you.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-8 border-t border-white/10">
              {[
                { k: '12K+', v: 'Teachings' },
                { k: '45 days', v: 'Avg streak' },
                { k: '120+', v: 'Countries' },
              ].map(s => (
                <div key={s.k}>
                  <div className="font-display text-[1.5rem] text-white">{s.k}</div>
                  <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-white/40">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/20">© 2025 SOM CONNECT • Crafted for growth</div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col justify-center p-6 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-[420px] mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <img src={somLogo} alt="SOM" className="w-6 h-6 invert dark:invert-0" />
            </div>
            <span className="font-display text-[1.1rem]">SOM CONNECT</span>
          </div>

          <div className="space-y-2 mb-8">
            <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Welcome back</h1>
            <p className="text-muted-foreground text-[15px]">Sign in to continue your spiritual journey. Any email works — happy path enabled.</p>
          </div>

          <div className="rounded-[1.5rem] border border-border/60 bg-card/80 backdrop-blur-2xl p-7 shadow-[0_8px_40px_hsl(var(--foreground)/0.06)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              {generalError && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-2.5 text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-[13px] leading-[1.4]">{generalError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-[600] text-[13px] tracking-[-0.01em]">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} className={`h-12 pl-11 rounded-full bg-secondary/50 border-border/60 focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:border-foreground/20 transition-all ${emailError ? 'border-destructive' : ''}`} />
                </div>
                {emailError && <p className="text-[12px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{emailError}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-[600] text-[13px] tracking-[-0.01em]">Password</Label>
                  <Link to="/forgot-password" className="font-mono text-[11px] tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors">Forgot?</Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setPasswordError(''); }} className={`h-12 pl-11 pr-11 rounded-full bg-secondary/50 border-border/60 focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:border-foreground/20 transition-all ${passwordError ? 'border-destructive' : ''}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && <p className="text-[12px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{passwordError}</p>}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-[650] tracking-[-0.01em] gap-2 group shadow-[0_8px_24px_hsl(var(--foreground)/0.15)]">
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-border" /></div>
                <div className="relative flex justify-center"><span className="px-3 bg-card text-[11px] font-mono tracking-[0.15em] uppercase text-muted-foreground">Or continue with</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(demoAccounts.length
                  ? demoAccounts.slice(1) // skip the member account — the form is pre-filled with it
                  : [
                      { name: 'Pastor Michael', email: 'pastor@example.com', demoPassword: 'pastor123' },
                      { name: 'Admin User', email: 'admin@example.com', demoPassword: 'admin123' },
                    ]
                ).slice(0, 2).map(b => (
                  <button key={b.email} type="button" onClick={() => { setEmail(b.email); setPassword(b.demoPassword); }} className="h-11 rounded-full border border-border bg-secondary/30 hover:bg-secondary/60 text-[13px] font-[600] tracking-[-0.01em] transition-colors">
                    {b.name.replace(' demo', '')} demo
                  </button>
                ))}
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Don't have an account? <Link to="/register" className="font-[650] text-foreground hover:underline underline-offset-4">Create account</Link>
          </p>

          <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <p className="font-mono text-[11px] leading-[1.5] text-amber-900 dark:text-amber-100">
              <span className="font-[700]">Happy path active:</span> Any email + any password (min 3 chars) will sign you in. Try pastor@example.com or create your own.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
