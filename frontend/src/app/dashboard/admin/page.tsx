'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LanguageSelector from '../../../components/LanguageSelector';

const API = 'https://cantine-plus-api.onrender.com';
type User = { id: string; email: string; role: string; name: string };
type GlobalStats = {
  total_kg_jetes: number;
  total_invendus_sauves: number;
  total_points_ia: number;
  total_co2_sauve: number;
  users: { parents: number; ecoles: number; prestataires: number };
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored) as User;
    if (u.role !== 'Admin') { router.push('/'); return; }
    setUser(u);

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/admin/stats`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Erreur de chargement des stats");
      }
    };
    fetchStats();
  }, [router]);

  const logout = () => { localStorage.clear(); router.push('/'); };

  if (!user || !stats) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><p className="text-white">Chargement du Centre de Contrôle...</p></div>;

  return (
    <div className="min-h-screen bg-[#1E5C30] text-white p-4 sm:p-8 relative">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      <nav className="flex items-center justify-between px-8 py-4 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image src="/icone.svg" alt="logo" width={40} height={40} />
          <span className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-linear-to-r from-green-400 to-blue-500">CANTINE+ SUPERVISION</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-sm font-mono">ID: {user.id.substring(0,8)}</span>
          <button onClick={logout} className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">DECONNEXION</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black mb-2 tracking-tight">Impact Global & Performance</h1>
          <p className="text-gray-400 text-lg">Suivi en temps réel de l'écosystème Cantine+</p>
        </div>

        {/* TOP KPIs - IMPACT ENVIRONNEMENTAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl p-8 bg-linear-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-500">🌍</div>
            <h3 className="text-green-400 font-bold uppercase tracking-widest text-sm mb-2">Empreinte Carbone Evitée</h3>
            <p className="text-6xl font-black text-white">{stats.total_co2_sauve} <span className="text-3xl text-green-400">Kg CO₂</span></p>
            <p className="text-gray-400 mt-2">Estimation basée sur les invendus sauvés de la poubelle.</p>
          </div>

          <div className="rounded-3xl p-8 bg-linear-to-br from-[#F47B20]/20 to-red-500/20 border border-[#F47B20]/30 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-500">🗑️</div>
            <h3 className="text-[#F47B20] font-bold uppercase tracking-widest text-sm mb-2">Gaspillage Constaté en Écoles</h3>
            <p className="text-6xl font-black text-white">{stats.total_kg_jetes} <span className="text-3xl text-[#F47B20]">Kg</span></p>
            <p className="text-gray-400 mt-2">Total du gaspillage pesé et déclaré par les établissements.</p>
          </div>
        </div>

        {/* SECOND ROW - ENGAGEMENT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 font-semibold mb-2">Paniers Anti-Gaspi Sauvés</h3>
            <p className="text-5xl font-black text-white mb-2">{stats.total_invendus_sauves}</p>
            <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Repas Redistribués</span>
          </div>

          <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 font-semibold mb-2">Points IA Coach (Enfants)</h3>
            <p className="text-5xl font-black text-[#F47B20] mb-2">{stats.total_points_ia}</p>
            <span className="inline-block px-3 py-1 bg-[#F47B20]/20 text-[#F47B20] rounded-full text-xs font-bold uppercase tracking-wider">Engagement Gamification</span>
          </div>

          <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 font-semibold mb-2">Utilisateurs Actifs (Réseau)</h3>
            <div className="flex justify-center items-end gap-3 mt-4">
               <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.users.parents}</p>
                  <p className="text-xs text-gray-500 uppercase">Parents</p>
               </div>
               <div className="text-center">
                  <p className="text-3xl font-black text-blue-400">{stats.users.ecoles}</p>
                  <p className="text-xs text-blue-500/50 uppercase">Ecoles</p>
               </div>
               <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.users.prestataires}</p>
                  <p className="text-xs text-gray-500 uppercase">Prestas</p>
               </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          Système de supervision global Cantine+ © 2026. Données en temps réel.
        </div>
      </div>
    </div>
  );
}
