import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowRight, Sparkles, User, Mail, Lock } from 'lucide-react';
import somLogo from '@/images/som-logo.png';
import { motion } from 'framer-motion';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', affiliation: '', terms: false });
  const [errors, setErrors] = useState({ name: '', email: '', password: '', terms: '' });
  const [generalError, setGeneralError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    let valid = true;
    const e = { name: '', email: '', password: '', terms: '' };
    if (!form.name.trim()) { e.name = 'Name required'; valid = false; }
    if (!form.email.trim()) { e.email = 'Email required'; valid = false; }
    else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email)) { e.email = 'Invalid email'; valid = false; }
    if (!form.password) { e.password = 'Password required'; valid = false; }
    else if (form.password.length < 3) { e.password = 'Min 3 chars (happy path)'; valid = false; }
    if (!form.terms) { e.terms = 'Accept terms'; valid = false; }
    setErrors(e);
    return valid;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setGeneralError('');
      await register(form.email, form.password, form.name);
      navigate('/');
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAF8F5] dark:bg-[#070A12]">
      <div className="flex-1 flex flex-col justify-center p-6 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-[460px] mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <img src={somLogo} alt="SOM" className="w-6 h-6 invert dark:invert-0" />
            </div>
            <span className="font-display text-[1.1rem]">SOM CONNECT</span>
            <span className="ml-auto font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-accent text-accent-foreground">New • 2025</span>
          </div>

          <div className="space-y-2 mb-8">
            <h1 className="font-display text-[2.4rem] leading-[0.9] tracking-[-0.03em]">Create your account</h1>
            <p className="text-muted-foreground text-[15px]">Join 12k+ believers. Happy path — any details work.</p>
          </div>

          <div className="rounded-[1.5rem] border border-border/60 bg-card/80 backdrop-blur-2xl p-7 shadow-[0_8px_40px_hsl(var(--foreground)/0.06)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {generalError && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-2.5 text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-[13px]">{generalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="font-[600] text-[13px]">Full name</Label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input placeholder="David Emmanuel" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} className={`h-12 pl-11 rounded-full bg-secondary/50 border-border/60 ${errors.name ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="font-[600] text-[13px]">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }} className={`h-12 pl-11 rounded-full bg-secondary/50 border-border/60 ${errors.email ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="font-[600] text-[13px]">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input type="password" placeholder="Min 3 chars — happy path" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }} className={`h-12 pl-11 rounded-full bg-secondary/50 border-border/60 ${errors.password ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.password && <p className="text-[11px] text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="font-[600] text-[13px]">SOM Affiliation (optional)</Label>
                  <Input placeholder="Christ Embassy Lagos" value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} className="h-12 rounded-full bg-secondary/50 border-border/60" />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Checkbox id="terms" checked={form.terms} onCheckedChange={c => { setForm({ ...form, terms: !!c }); setErrors({ ...errors, terms: '' }); }} className="mt-0.5" />
                  <Label htmlFor="terms" className="text-[13px] leading-[1.4] font-[450]">I agree to the <span className="font-[650] underline underline-offset-4">Terms</span> and <span className="font-[650] underline underline-offset-4">Privacy</span>. I understand this is a demo with happy-path auth.</Label>
                </div>
                {errors.terms && <p className="text-[11px] text-destructive">{errors.terms}</p>}
              </div>

              <Button type="submit" disabled={isLoading || !form.terms} className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-[650] gap-2 shadow-[0_8px_24px_hsl(var(--foreground)/0.15)]">
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Creating...
                  </>
                ) : (
                  <>Create account <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">Already have an account? <Link to="/login" className="font-[650] text-foreground hover:underline underline-offset-4">Sign in</Link></p>
        </motion.div>
      </div>

      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-[#0A0E1A]">
        <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=1200&fit=crop" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 w-full">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/70">Join the movement</span>
            </div>
            <blockquote className="font-display text-[2rem] leading-[0.95] tracking-[-0.02em] text-white text-balance">
              “The Word works. Faith is a lifestyle, not a moment.”
              <footer className="mt-4 font-mono text-[11px] tracking-[0.15em] uppercase text-white/40 not-italic">— Pastor Chris Oyakhilome</footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
