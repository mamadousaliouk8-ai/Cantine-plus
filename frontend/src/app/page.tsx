'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LanguageSelector from '../components/LanguageSelector';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://cantine-plus-api.onrender.com';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regRole, setRegRole] = useState('Parent');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur de connexion');
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const role = data.user.role;
      if (role === 'Parent') router.push('/dashboard/parent');
      else if (role === 'Ecole') router.push('/dashboard/ecole');
      else if (role === 'Prestataire') router.push('/dashboard/prestataire');
      else if (role === 'Admin') router.push('/dashboard/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword, role: regRole, name: regName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur lors de la création du compte");
      setSuccess('✅ Compte créé ! Connectez-vous maintenant.');
      setTab('login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={{ background: 'linear-gradient(135deg, #1E5C30 0%, #328A4A 50%, #2A7A40 100%)' }}>
      
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 animate-fade-in">
        <Image src="/icone.svg" alt="Cantine+ icône" width={120} height={120} className="mb-0" style={{marginBottom: '-8px'}} />
        <Image src="/texte.svg" alt="Cantine+" width={280} height={70} />
        <p className="text-white/70 text-sm tracking-widest mt-2 font-light">MOINS DE GASPILLAGE, PLUS DE SENS.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>
        
        {/* Tabs */}
        <div className="flex mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
          {(['login', 'register'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              className="flex-1 py-3 text-sm font-semibold transition-all duration-300"
              style={{ background: tab === t ? '#F47B20' : 'transparent', color: 'white' }}>
              {t === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>{error}</div>}
        {success && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac' }}>{success}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <InputField label="Email" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="votre@email.com" />
            <InputField label="Mot de passe" type="password" value={loginPassword} onChange={setLoginPassword} placeholder="••••••••" />
            <SubmitButton loading={loading} label="Se connecter" />
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Parent', label: '👨‍👩‍👧 Parent' },
                  { id: 'Ecole', label: '🏫 École' },
                  { id: 'Prestataire', label: '👨‍🍳 Presta' },
                  { id: 'Admin', label: '🛡️ Admin' }
                ].map(r => (
                  <button key={r.id} type="button" onClick={() => setRegRole(r.id)}
                    className={`p-3 rounded-xl border-2 transition-all font-medium text-sm ${regRole === r.id ? 'border-[#F47B20] bg-[#F47B20]/10 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <InputField label="Nom / Prénom ou nom de la structure" type="text" value={regName} onChange={setRegName} placeholder="Ex: Marie Dupont" />
            <InputField label="Email" type="email" value={regEmail} onChange={setRegEmail} placeholder="votre@email.com" />
            <InputField label="Mot de passe" type="password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" />
            <SubmitButton loading={loading} label="Créer mon compte" />
          </form>
        )}
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-white/80 text-sm font-medium mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full px-4 py-3 rounded-xl text-gray-900 font-medium focus:outline-none transition-all"
        style={{ background: 'white', caretColor: 'black', border: '2px solid transparent' }}
        onFocus={e => e.target.style.border = '2px solid #F47B20'}
        onBlur={e => e.target.style.border = '2px solid transparent'} />
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3 rounded-xl font-bold text-white transition-all duration-300 mt-2"
      style={{ background: loading ? '#888' : '#F47B20', cursor: loading ? 'not-allowed' : 'pointer' }}
      onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#1E5C30'; }}
      onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#F47B20'; }}>
      {loading ? (
        <div className="flex flex-col items-center gap-1">
          <span>⏳ Chargement...</span>
          <span className="text-[10px] opacity-70 font-normal">Le serveur Render peut mettre 30s à se réveiller</span>
        </div>
      ) : label}
    </button>
  );
}
