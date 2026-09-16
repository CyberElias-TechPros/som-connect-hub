import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, AlertCircle, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import somLogo from '@/images/som-logo.png';
import { requestPasswordReset, resetPassword } from '@/services/auth-service';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | undefined>();
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email required'); return; }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { setError('Invalid email'); return; }
    setLoading(true);
    try {
      // POST /auth/forgot — always answers 200 so accounts can't be enumerated.
      const result = await requestPasswordReset(email.trim().toLowerCase());
      setResetToken(result?.resetToken);
      setSuccess(true);
    } catch (caught: any) {
      setError(caught?.message ?? 'We could not send that email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAF8F5] dark:bg-[#070A12]">
      <div className="flex-1 flex flex-col justify-center p-6 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[420px] mx-auto space-y-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-[13px] font-[600] text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to login</Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center"><img src={somLogo} alt="SOM" className="w-6 h-6 invert dark:invert-0" /></div>
            <span className="font-display">SOM CONNECT</span>
          </div>

          {success ? (
            <div className="rounded-[1.5rem] border border-border/50 bg-card p-7 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-7 h-7 text-emerald-600" /></div>
              <h1 className="font-display text-[1.8rem] leading-[0.9]">Check your email</h1>
              <p className="text-[14px] leading-[1.5] text-muted-foreground">We sent a reset link to <span className="font-[600] text-foreground">{email}</span>. It expires in 15 minutes.</p>

              {resetToken && (
                <div className="space-y-3 text-left rounded-[1rem] border border-border/60 bg-secondary/30 p-4">
                  <Label className="font-[600] text-[13px]">Set a new password</Label>
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    className="h-11 rounded-full bg-background"
                  />
                  <Button className="w-full rounded-full bg-foreground text-background h-11 font-[600]" disabled={newPassword.length < 3} onClick={async () => {
                    try {
                      await resetPassword(email.trim().toLowerCase(), newPassword, resetToken);
                      navigate('/');
                    } catch (caught: any) {
                      setError(caught?.message ?? 'Could not reset the password.');
                    }
                  }}>Save password & sign in</Button>
                  {error && <p className="text-[12px] text-destructive">{error}</p>}
                </div>
              )}

              <Button variant="outline" className="w-full rounded-full h-11 font-[600]" onClick={()=>navigate('/login')}>Back to login</Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] uppercase tracking-[0.1em]"><Sparkles className="w-3 h-3" /> Reset password</div>
                <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Forgot password?</h1>
                <p className="text-muted-foreground text-[14px]">Enter your email — we’ll send a reset link. Demo mode: any email works.</p>
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-card/80 backdrop-blur p-7">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-2 text-destructive text-[13px]"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}
                  <div className="space-y-2">
                    <Label className="font-[600] text-[13px]">Email</Label>
                    <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value); setError('');}} className="h-12 pl-11 rounded-full bg-secondary/50 border-border/60" /></div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-foreground text-background font-[650] gap-2">{loading ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Sending…</> : 'Send reset link'}</Button>
                </form>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-[#0A0E1A]">
        <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=1200&fit=crop" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/60 to-transparent" />
      </div>
    </div>
  );
}
