import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import somLogo from '@/images/som-logo.png';
import { useToast } from '@/components/ui/use-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', affiliation: '', terms: false });
  const [errors, setErrors] = useState({ name: '', email: '', password: '', terms: '' });
  const [generalError, setGeneralError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', password: '', terms: '' };
    
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!form.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!form.terms) {
      newErrors.terms = 'You must accept the terms to continue';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setGeneralError('');
      await register(form.email, form.password, form.name);
      navigate('/');
      toast({
        title: 'Registration Successful',
        description: 'Welcome to SOM Connect! Your journey begins now.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Registration error:', error);
      setGeneralError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Please check your information and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-background">
      <div className="max-w-sm md:max-w-md mx-auto w-full space-y-8" role="main" aria-labelledby="register-title">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto">
            <img src={somLogo} alt="SOM Connect Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 id="register-title" className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground">Join the SOM CONNECT community</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="register-title" role="form">
          {generalError && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{generalError}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={form.name}
              onChange={e => {
                setForm({...form, name: e.target.value});
                setErrors({...errors, name: ''});
              }}
              className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={e => {
                setForm({...form, email: e.target.value});
                setErrors({...errors, email: ''});
              }}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={e => {
                setForm({...form, password: e.target.value});
                setErrors({...errors, password: ''});
              }}
              className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
              required
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="affiliation">SOM Affiliation (Optional)</Label>
            <Input id="affiliation" placeholder="e.g., Christ Embassy Lagos" value={form.affiliation} onChange={e => setForm({...form, affiliation: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="terms"
              checked={form.terms}
              onCheckedChange={(c) => {
                setForm({...form, terms: !!c});
                setErrors({...errors, terms: ''});
              }}
              required
              aria-invalid={!!errors.terms}
              aria-describedby={errors.terms ? 'terms-error' : undefined}
            />
            <Label htmlFor="terms" className="text-sm">I agree to the Terms of Service</Label>
          </div>
          {errors.terms && (
            <p id="terms-error" className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.terms}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading || !form.terms}>
            {isLoading ? (
              <>
                <span className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full inline-block"></span>
                Creating Account...
              </>
            ) : 'Create Account'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
