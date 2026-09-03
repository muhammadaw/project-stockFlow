'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Boxes, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/navigation';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@stockflow.dev');
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-900 text-sky-400 shadow-md mb-4 border border-slate-800">
            <Boxes className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to Stock<span className="text-sky-600">Flow</span>
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Internal inventory management & invoicing system
          </p>
        </div>

        {/* Demo Quick-Fill Pill for Evaluators */}
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2 text-xs text-sky-900">
            <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Demo Evaluation Credentials</p>
              <p className="text-sky-700">admin@stockflow.dev / Password123!</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-medium px-3 py-1.5 rounded transition shadow-sm"
          >
            Auto-Fill
          </button>
        </div>

        {/* Login Card */}
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need an account?{' '}
            <a href="/register" className="font-semibold text-sky-600 hover:text-sky-700 hover:underline">
              Create one here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
