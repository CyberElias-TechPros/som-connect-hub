import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import somLogo from '@/images/som-logo.png';
import { useToast } from '@/components/ui/use-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setGeneralError('');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSent(true);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for instructions to reset your password.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      setGeneralError(error instanceof Error ? error.message : 'Failed to send reset email. Please try again.');
      toast({
        title: 'Password Reset Failed',
        description: error instanceof Error ? error.message : 'Please check your email and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col justify-center p-6 bg-background">
        <div className="max-w-sm md:max-w-md mx-auto w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <img src={somLogo} alt="SOM Connect Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Check Your Email</h1>
          <p className="text-muted-foreground">We've sent a password reset link to {email}</p>
          <Link to="/login"><Button variant="outline" className="w-full">Back to Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-background">
      <div className="max-w-sm mx-auto w-full space-y-8">
        <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <div className="space-y-2">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto">
            <img src={somLogo} alt="SOM Connect Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Forgot Password?</h1>
          <p className="text-muted-foreground">Enter your email and we'll send you a reset link</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {generalError && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{generalError}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                className={`pl-10 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                required
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
            </div>
            {emailError && (
              <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {emailError}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full inline-block"></span>
                Sending Reset Link...
              </>
            ) : 'Send Reset Link'}
          </Button>
        </form>
      </div>
    </div>
  );
}
