import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth } from '../services/database';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Error Code:", err.code);
      if (isLogin) {
        // Requirement: If credentials are incorrect, show: "Email or password is incorrect"
        setError("Email or password is incorrect");
      } else {
        // Requirement: If the email already exists, show: "User already exists. Please sign in"
        if (err.code === 'auth/email-already-in-use') {
          setError("User already exists. Please sign in");
        } else {
          setError(err.message || "An error occurred during authentication");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md p-8 animate-in fade-in zoom-in duration-500">
        <div className="bg-white/80 backdrop-blur-xl border border-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mx-auto mb-6">
              <span className="font-black text-3xl italic">P</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Prasama ERP</h1>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">
              {isLogin ? 'Enter Enterprise Suite' : 'Register New Station'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <input 
                  type="email" 
                  required 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                  placeholder="admin@prasama.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl animate-in shake duration-300">
                <p className="text-[10px] font-bold text-rose-600 text-center uppercase tracking-tight">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Prasama Intelligence Systems</p>
      </div>
    </div>
  );
};

export default Auth;