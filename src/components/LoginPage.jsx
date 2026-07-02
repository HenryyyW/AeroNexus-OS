import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen bg-[#030914] text-white">
      <div className="fixed inset-0 opacity-50 pointer-events-none" style={{ background:'radial-gradient(circle at 12% 18%, rgba(0,240,255,.08), transparent 22%), radial-gradient(circle at 80% 14%, rgba(55,242,155,.06), transparent 20%), linear-gradient(180deg, #03101e 0%, #030914 100%)' }} />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-8 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.38em] text-cyan-400/80">Ascendo Nexus OS</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">Nexus OS Workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Please sign in to access the home dashboard.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-cyan-400/50" placeholder="Enter username" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-cyan-400/50" placeholder="Enter password" />
            </div>
            <button type="submit" className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition-colors hover:bg-cyan-400">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}
