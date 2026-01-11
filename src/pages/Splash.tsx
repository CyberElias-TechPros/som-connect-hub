import React from 'react';
import somLogo from '@/images/som-logo.png';

export default function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
          <img src={somLogo} alt="SOM Connect Logo" className="w-12 h-12 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">SOM CONNECT</h1>
      </div>
    </div>
  );
}
