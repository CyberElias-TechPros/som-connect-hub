import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import somLogo from '@/images/som-logo.png';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', affiliation: '', terms: false });
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(form.email, form.password, form.name);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-background">
      <div className="max-w-sm mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto">
            <img src={somLogo} alt="SOM Connect Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground">Join the SOM CONNECT community</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Enter your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Create a password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliation">SOM Affiliation (Optional)</Label>
            <Input id="affiliation" placeholder="e.g., Christ Embassy Lagos" value={form.affiliation} onChange={e => setForm({...form, affiliation: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="terms" checked={form.terms} onCheckedChange={(c) => setForm({...form, terms: !!c})} required />
            <Label htmlFor="terms" className="text-sm">I agree to the Terms of Service</Label>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !form.terms}>{isLoading ? 'Creating...' : 'Create Account'}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
