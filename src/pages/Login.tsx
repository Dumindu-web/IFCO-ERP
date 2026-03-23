import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const { loginWithGoogle, isLoading } = useAuth();

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const success = await loginWithGoogle();
      if (!success) {
        setError('Access denied. This account is not authorized for PPI access.');
      }
    } catch (err: any) {
      console.error("Login attempt failed:", err);
      setError('Login failed. Please try again or use Local Mode if available.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <LogIn className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">IFCO Systems</h1>
            <p className="text-zinc-500 text-sm mt-1">Inventory Management Portal</p>
          </div>

          <div className="space-y-6">
            <div className="text-center mb-6">
              <p className="text-zinc-400 text-sm">
                Please sign in with your authorized Google account to access the system from any device.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 mb-4"
                >
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign in with Google
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium mb-2">
              Authorized Access Only
            </p>
            <p className="text-[10px] text-zinc-700 italic">
              Your data is securely synced to the cloud for access from any device.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
