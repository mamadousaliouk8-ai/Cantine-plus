"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LanguageSelector from "../../../components/LanguageSelector";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type User = { id: string; email: string; role: string; name: string };
type GlobalStats = {
  total_kg_jetes: number;
  total_invendus_sauves: number;
  total_points_ia: number;
  total_co2_sauve: number;
  users: { parents: number; ecoles: number; prestataires: number };
  is_restricted?: boolean;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Parse error", e);
      }
    }
  }, []);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/stats`, { headers });
      if (!res.ok) throw new Error("Impossible de charger les statistiques");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Erreur de communication avec le serveur.");
      // Fallback stats pour éviter le blocage complet si le serveur est vide
      setStats({
        total_kg_jetes: 0,
        total_invendus_sauves: 0,
        total_points_ia: 0,
        total_co2_sauve: 0,
        users: { parents: 0, ecoles: 0, prestataires: 0 },
      });
    }
  }, [headers]);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push("/");
      return;
    }
    if (user.role !== "Admin") {
      router.push("/");
      return;
    }
    fetchStats();
  }, [router, fetchStats, user]);

  const logout = () => {
    localStorage.clear();
    router.push("/");
  };

  if (!mounted) return null;

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">Redirection...</p>
      </div>
    );

  if (!stats)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1E5C30]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
        <p className="text-white font-medium">
          Chargement du Centre de Contrôle...
        </p>
        {error && <p className="text-red-300 mt-4 text-sm">{error}</p>}
      </div>
    );

  return (
    <div className="min-h-screen bg-[#1E5C30] text-white p-4 sm:p-8 relative">

      {/* Navbar - Improved for Mobile */}
      <nav className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 gap-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 mb-8">
        <div className="flex items-center gap-3">
          <Image
            src="/icone.svg"
            alt="logo"
            width={35}
            height={35}
            className="sm:w-[40px] sm:h-[40px]"
          />
          <span className="font-bold text-lg sm:text-xl tracking-wider text-transparent bg-clip-text bg-linear-to-r from-green-400 to-blue-500">
            CANTINE+ SUPERVISION
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <span className="text-white/70 text-xs sm:text-sm font-mono bg-white/5 px-3 py-1 rounded-full">
            ID: {user.id.substring(0, 8)}
          </span>
          <LanguageSelector />
          <button
            onClick={logout}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          >
            DECONNEXION
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black mb-2 tracking-tight">
            Impact Global & Performance
          </h1>
          <p className="text-gray-400 text-lg">
            {stats.is_restricted
              ? "📊 Vue restreinte à votre établissement"
              : "🌍 Suivi en temps réel de l'écosystème Cantine+"}
          </p>
          {stats.is_restricted && (
            <div className="mt-4 inline-block px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded-full text-blue-300 text-sm font-bold">
              🛡️ Mode Super Admin École Activé
            </div>
          )}
        </div>

        {/* TOP KPIs - IMPACT ENVIRONNEMENTAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl p-8 bg-linear-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-500">
              🌍
            </div>
            <h3 className="text-green-400 font-bold uppercase tracking-widest text-sm mb-2">
              Empreinte Carbone Evitée
            </h3>
            <p className="text-6xl font-black text-white">
              {stats.total_co2_sauve}{" "}
              <span className="text-3xl text-green-400">Kg CO₂</span>
            </p>
            <p className="text-gray-400 mt-2">
              Estimation basée sur les invendus sauvés de la poubelle.
            </p>
          </div>

          <div className="rounded-3xl p-8 bg-linear-to-br from-[#F47B20]/20 to-red-500/20 border border-[#F47B20]/30 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-500">
              🗑️
            </div>
            <h3 className="text-[#F47B20] font-bold uppercase tracking-widest text-sm mb-2">
              Gaspillage Constaté en Écoles
            </h3>
            <p className="text-6xl font-black text-white">
              {stats.total_kg_jetes}{" "}
              <span className="text-3xl text-[#F47B20]">Kg</span>
            </p>
            <p className="text-gray-400 mt-2">
              Total du gaspillage pesé et déclaré par les établissements.
            </p>
          </div>
        </div>

        {/* SECOND ROW - ENGAGEMENT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 font-semibold mb-2">
              Paniers Anti-Gaspi Sauvés
            </h3>
            <p className="text-5xl font-black text-white mb-2">
              {stats.total_invendus_sauves}
            </p>
            <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">
              Repas Redistribués
            </span>
          </div>

          <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 font-semibold mb-2">
              Points IA Coach (Enfants)
            </h3>
            <p className="text-5xl font-black text-[#F47B20] mb-2">
              {stats.total_points_ia}
            </p>
            <span className="inline-block px-3 py-1 bg-[#F47B20]/20 text-[#F47B20] rounded-full text-xs font-bold uppercase tracking-wider">
              Engagement Gamification
            </span>
          </div>

          <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
            <h3 className="text-gray-400 font-semibold mb-2">
              Utilisateurs Actifs (Réseau)
            </h3>
            <div className="flex justify-center items-end gap-3 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {stats.users.parents}
                </p>
                <p className="text-xs text-gray-500 uppercase">Parents</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-blue-400">
                  {stats.users.ecoles}
                </p>
                <p className="text-xs text-blue-500/50 uppercase">Ecoles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {stats.users.prestataires}
                </p>
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
