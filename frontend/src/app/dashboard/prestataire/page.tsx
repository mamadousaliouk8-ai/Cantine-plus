"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LanguageSelector from "../../../components/LanguageSelector";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type User = { id: string; email: string; role: string; name: string };
type Menu = {
  id: string;
  date: string;
  type: string;
  entree: string;
  plat: string;
  dessert: string;
  bio: boolean;
};
type Commande = {
  date: string;
  type: string;
  ecoles: { nom: string };
  enfants?: { nom: string; prenom: string; allergies?: string };
};

export default function PrestataireDashboard() {
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
  const [tab, setTab] = useState("menus");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [prestaProfile, setPrestaProfile] = useState<{
    id: string;
    nom: string;
  } | null>(null);
  const [msg, setMsg] = useState("");
  const [setupNom, setSetupNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [conseils, setConseils] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: "menus", label: "Gestion des Menus", icon: "🍽️" },
    { id: "commandes", label: "Commandes Cuisine", icon: "📦" },
    { id: "reports", label: "Rapports d'Activité", icon: "📥" },
  ];

  const generateReport = (period: string) => {
    setMsg(`⌛ Génération du rapport ${period} en cours...`);
    setTimeout(() => {
      setMsg(
        `✅ Rapport ${period} téléchargé avec succès ! (Simulé pour la démo)`
      );
    }, 2000);
  };

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchData = useCallback(
    async (prestaId: string) => {
      try {
        const [m, c] = await Promise.all([
          fetch(`${API}/prestataire/menus/${prestaId}`, { headers }).then((r) =>
            r.json()
          ),
          fetch(`${API}/prestataire/commandes/${prestaId}`, { headers }).then(
            (r) => r.json()
          ),
        ]);
        setMenus(Array.isArray(m) ? m : []);
        setCommandes(Array.isArray(c) ? c : []);
      } catch (err) {
        console.error("Erreur fetchData:", err);
      }
    },
    [headers]
  );

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push("/");
      return;
    }
    if (user.role !== "Prestataire") {
      router.push("/");
      return;
    }

    fetch(`${API}/prestataire/profile/${user.id}`, { headers })
      .then((r) => r.json())
      .then((p) => {
        if (p) {
          setPrestaProfile(p);
          fetchData(p.id);
        }
      })
      .catch((err) => console.error("Erreur profil:", err));
  }, [router, fetchData, headers, user]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("⏳ Création de votre structure...");
    try {
      const res = await fetch(`${API}/prestataire/profile`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user!.id, nom: setupNom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur API");
      setMsg("✅ Profil prestataire créé !");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Impossible de créer le profil.";
      setMsg(`❌ Erreur: ${errorMsg}`);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    try {
      const res = await fetch(
        `${API}/prestataire/menus/import/${prestaProfile!.id}`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      );
      const data = await res.json();
      setMsg(`✅ ${data.succes} menus importés !`);
      if (prestaProfile) fetchData(prestaProfile.id);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Erreur lors de l'import.";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push("/");
  };

  if (!mounted) return null;

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#328A4A] text-white">
        Chargement...
      </div>
    );

  if (!prestaProfile)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#1E5C30] to-[#328A4A]">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSelector />
        </div>
        <Image
          src="/icone.svg"
          alt="logo"
          width={80}
          height={80}
          className="mb-0"
          style={{ marginBottom: "-6px" }}
        />
        <Image
          src="/texte.svg"
          alt="Cantine+"
          width={200}
          height={55}
          className="mb-6"
        />
        <div className="w-full max-w-md rounded-2xl p-8 bg-white/10 backdrop-blur-md border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-2">👨‍🍳 Bienvenue !</h2>
          <p className="text-white/70 mb-6">
            Configurez votre profil Prestataire.
          </p>
          <form onSubmit={handleSetup} className="space-y-4">
            <input
              type="text"
              value={setupNom}
              onChange={(e) => setSetupNom(e.target.value)}
              placeholder="Nom de votre structure"
              required
              className="w-full px-4 py-3 rounded-xl bg-white text-black focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#F47B20]"
            >
              {loading ? "⏳..." : "✅ Créer mon profil"}
            </button>
          </form>
        </div>
      </div>
    );

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      <nav
        className="flex items-center justify-between px-8 py-4 print:hidden"
        style={{
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center gap-3">
          <Image src="/icone.svg" alt="logo" width={50} height={50} />
          <Image src="/texte.svg" alt="Cantine+" width={130} height={35} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/80 text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
            👨‍🍳 {prestaProfile.nom}
          </span>
          <LanguageSelector />
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-[#F47B20] text-white shadow-lg transition-all active:scale-95"
          >
            🚪 Déconnexion
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="relative mb-8 print:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-6 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white font-bold text-lg shadow-xl transition-all hover:bg-white/10 active:scale-95"
          >
            <span>{tabs.find((t) => t.id === tab)?.icon}</span>
            <span>{tabs.find((t) => t.id === tab)?.label}</span>
            <span
              className={`ml-2 transition-transform duration-300 ${
                menuOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    setMenuOpen(false);
                    setMsg("");
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all hover:bg-[#F47B20] hover:text-white ${
                    tab === t.id ? "bg-[#F47B20] text-white" : "text-white/80"
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {msg && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/40 text-white animate-bounce">
            {msg}
          </div>
        )}

        {tab === "menus" && (
          <div className="space-y-8">
            <div className="rounded-2xl p-6 bg-white/10 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">
                📥 Importer des menus
              </h2>
              <p className="text-white/70 mb-4 text-sm">
                Importez votre fichier Excel contenant les colonnes : Date
                (JJ/MM/AAAA), Type, Entrée, Plat principal, Dessert, Bio
                (Oui/Non).
              </p>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#F47B20] file:text-white hover:file:bg-[#1E5C30]"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4">
                📋 Vos menus publiés
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="rounded-2xl p-5 bg-white/15 border border-white/20"
                  >
                    <div className="flex justify-between mb-3">
                      <span className="font-bold text-white text-sm">
                        {new Date(menu.date).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="px-2 py-1 bg-[#F47B20] rounded-lg text-[10px] text-white uppercase">
                        {menu.type}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs mb-1">
                      Entrée: {menu.entree}
                    </p>
                    <p className="text-white font-medium text-sm mb-1">
                      Plat: {menu.plat}
                    </p>
                    <p className="text-white/70 text-xs mb-3">
                      Dessert: {menu.dessert}
                    </p>

                    <button
                      onClick={async () => {
                        setLoadingAi(menu.id);
                        try {
                          const res = await fetch(
                            `${API}/prestataire/menus/${menu.id}/conseil`,
                            {
                              method: "POST",
                              headers: {
                                ...headers,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                entree: menu.entree,
                                plat: menu.plat,
                                dessert: menu.dessert,
                              }),
                            }
                          );
                          const data = await res.json();
                          setConseils((prev) => ({
                            ...prev,
                            [menu.id]: data.conseil,
                          }));
                        } catch {
                          console.error("Erreur de connexion à l'IA");
                        } finally {
                          setLoadingAi(null);
                        }
                      }}
                      disabled={loadingAi === menu.id}
                      className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      {loadingAi === menu.id
                        ? "⏳ Analyse..."
                        : "✨ Demander Conseil IA"}
                    </button>

                    {conseils[menu.id] && (
                      <div className="mt-3 p-3 bg-blue-500/20 border border-blue-500/40 rounded-xl">
                        <p className="text-blue-300 text-xs italic">
                          {conseils[menu.id]}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "commandes" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                📦 Récapitulatif des commandes (Prévisions)
              </h2>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all print:hidden flex items-center gap-2"
              >
                🖨️ Générer PDF (Cuisine)
              </button>
            </div>
            {commandes.length === 0 ? (
              <p className="text-white/60">Aucune commande pour le moment.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  commandes.reduce((acc, curr) => {
                    if (!acc[curr.date])
                      acc[curr.date] = {
                        total: 0,
                        Viande: 0,
                        "Sans viande": 0,
                        Mixte: 0,
                        allergies: [] as string[],
                      };
                    acc[curr.date].total += 1;
                    const typeKey = curr.type as
                      | "Viande"
                      | "Sans viande"
                      | "Mixte";
                    if (acc[curr.date][typeKey] !== undefined)
                      acc[curr.date][typeKey] += 1;

                    // Capture des allergies
                    const eChild = (curr as Commande).enfants;
                    if (eChild && eChild.allergies) {
                      acc[curr.date].allergies.push(
                        `${eChild.prenom} ${eChild.nom} : ${
                          eChild.allergies
                        } (${(curr as Commande).ecoles?.nom})`
                      );
                    }
                    return acc;
                  }, {} as Record<string, { total: number; Viande: number; "Sans viande": number; Mixte: number; allergies: string[] }>)
                )
                  .sort(
                    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
                  )
                  .map(([date, stats]) => (
                    <div
                      key={date}
                      className="rounded-2xl p-6 bg-white/10 border border-white/20"
                    >
                      <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                        <span className="capitalize">
                          📅{" "}
                          {new Date(date).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                        <span className="px-4 py-1.5 bg-[#F47B20] rounded-full text-sm font-black text-white">
                          {stats.total} portions à préparer
                        </span>
                      </h3>

                      {stats.allergies.length > 0 && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50">
                          <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                            ⚠️ Attention : {stats.allergies.length} profil(s)
                            allergique(s)
                          </h4>
                          <ul className="list-disc pl-5 text-sm text-white/80">
                            {stats.allergies.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="space-y-5">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/80 font-medium">
                              🥩 Viande
                            </span>
                            <span className="text-white font-bold">
                              {stats.Viande} portions (
                              {((stats.Viande / stats.total) * 100).toFixed(0)}
                              %)
                            </span>
                          </div>
                          <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden border border-white/5">
                            <div
                              className="bg-gradient-to-r from-red-500 to-red-400 h-4 rounded-full transition-all duration-500"
                              style={{
                                width: `${(stats.Viande / stats.total) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/80 font-medium">
                              🥗 Sans viande (Végétarien)
                            </span>
                            <span className="text-white font-bold">
                              {stats["Sans viande"]} portions (
                              {(
                                (stats["Sans viande"] / stats.total) *
                                100
                              ).toFixed(0)}
                              %)
                            </span>
                          </div>
                          <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden border border-white/5">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  (stats["Sans viande"] / stats.total) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/80 font-medium">
                              🥘 Mixte
                            </span>
                            <span className="text-white font-bold">
                              {stats.Mixte} portions (
                              {((stats.Mixte / stats.total) * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden border border-white/5">
                            <div
                              className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-4 rounded-full transition-all duration-500"
                              style={{
                                width: `${(stats.Mixte / stats.total) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        {tab === "reports" && (
          <div className="max-w-4xl animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="p-3 bg-white/10 rounded-2xl">📄</span>
              Rapports & Analyses d&apos;Activité
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Mensuel",
                  desc: "Volume de production & Statistiques du mois",
                  icon: "🗓️",
                },
                {
                  title: "Trimestriel",
                  desc: "Bilan financier et logistique",
                  icon: "📈",
                },
                {
                  title: "Annuel",
                  desc: "Rapport d'impact global",
                  icon: "🌟",
                },
              ].map((report, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {report.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {report.title}
                  </h3>
                  <p className="text-white/50 text-sm mb-6">{report.desc}</p>
                  <button
                    onClick={() => generateReport(report.title)}
                    className="w-full py-3 bg-[#F47B20] text-white font-bold rounded-xl shadow-lg hover:bg-[#ff8c3a] transition-all"
                  >
                    📥 Télécharger PDF
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 text-9xl opacity-20">
                  📊
                </div>
                <h3 className="text-xl font-black mb-2 italic">
                  Prévisions IA
                </h3>
                <p className="opacity-90 leading-relaxed">
                  D&apos;après nos analyses, la demande en repas sans viande
                  augmentera de 12% le mois prochain dans vos écoles
                  partenaires.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1E5C30] to-[#328A4A] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 text-9xl opacity-20">
                  🍃
                </div>
                <h3 className="text-xl font-black mb-2 italic">Impact Éco</h3>
                <p className="opacity-90 leading-relaxed">
                  Grâce à l&apos;optimisation de vos tournées et la bourse
                  d&apos;échange, vous avez évité l&apos;émission de 450kg de
                  CO2 ce mois-ci.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
