"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LanguageSelector from "../../../components/LanguageSelector";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type User = { id: string; email: string; role: string; name: string };
type Reservation = {
  id: string;
  date: string;
  type: string;
  status: string;
  enfants: {
    nom: string;
    prenom: string;
    classe: string;
    allergies?: string;
    pai?: string;
  };
};
type Menu = {
  id: string;
  date: string;
  type: string;
  entree: string;
  plat: string;
  dessert: string;
  bio: boolean;
};

export default function EcoleDashboard() {
  const router = useRouter();
  const [user] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [tab, setTab] = useState("reservations");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ecoleProfile, setEcoleProfile] = useState<{
    id: string;
    nom: string;
  } | null>(null);
  const [msg, setMsg] = useState("");
  const [setupNom, setSetupNom] = useState("");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [pointageMode, setPointageMode] = useState(false);
  const [prestataires, setPrestataires] = useState<
    { id: string; nom: string }[]
  >([]);
  const [selectedPresta, setSelectedPresta] = useState("");

  // Admin creation state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  // Stabiliser les headers pour éviter les boucles infinies
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchData = useCallback(
    async (ecoleId: string) => {
      try {
        const [res, m] = await Promise.all([
          fetch(`${API}/ecole/reservations/${ecoleId}`, { headers }).then((r) =>
            r.json()
          ),
          fetch(`${API}/ecole/menus`, { headers }).then((r) => r.json()),
        ]);
        setReservations(Array.isArray(res) ? res : []);
        setMenus(Array.isArray(m) ? m : []);
      } catch (e) {
        console.error("Erreur fetchData:", e);
      }
    },
    [headers]
  );

  const fetchPrestataires = useCallback(async () => {
    try {
      const res = await fetch(`${API}/ecole/prestataires`, { headers }).then(
        (r) => r.json()
      );
      setPrestataires(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Erreur prestataires:", e);
    }
  }, [headers]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    if (user.role !== "Ecole") {
      router.push("/");
      return;
    }

    fetch(`${API}/ecole/profile/${user.id}`, { headers })
      .then((r) => r.json())
      .then((p) => {
        if (p && p.id) {
          setEcoleProfile(p);
          fetchData(p.id);
        } else {
          fetchPrestataires();
        }
      })
      .catch((err) => console.error("Erreur profil:", err));
  }, [router, fetchData, fetchPrestataires, headers, user]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSetup(true);
    setMsg("⏳ Création de votre établissement...");
    try {
      const res = await fetch(`${API}/ecole/profile`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user!.id,
          nom: setupNom,
          prestataire_id: selectedPresta || null,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          `${data.detail || "Erreur lors de la création"} (API: ${API})`
        );
      setMsg("✅ Profil créé avec succès ! Redirection...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Problème de connexion";
      setMsg(`❌ Erreur: ${errorMsg}`);
      setLoadingSetup(false);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSetup(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/ecole/create-admin`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          name: adminName,
          ecole_id: ecoleProfile?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur lors de la création");
      setMsg("✅ Compte Administrateur créé avec succès !");
      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Erreur lors de la création";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setLoadingSetup(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push("/");
  };

  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: "reservations", label: "📅 Réservations", icon: "📋" },
    { id: "menus", label: "🍽️ Menus du jour", icon: "🥘" },
    { id: "liaison", label: "📢 Cahier de Liaison", icon: "💬" },
    { id: "invendus", label: "♻️ Gestion Invendus", icon: "🍎" },
    { id: "gaspillage", label: "🗑️ Suivi Déchets", icon: "📉" },
    { id: "reports", label: "📄 Rapports & PDF", icon: "📥" },
    { id: "admin", label: "🛡️ Gestion Admin", icon: "🔐" },
  ];

  const generateReport = (period: string) => {
    setMsg(`⌛ Génération du rapport ${period} en cours...`);
    setTimeout(() => {
      setMsg(
        `✅ Rapport ${period} téléchargé avec succès ! (Simulé pour la démo)`
      );
    }, 2000);
  };

  if (!user)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#328A4A" }}
      >
        <p className="text-white">Chargement...</p>
      </div>
    );

  if (!ecoleProfile)
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 relative"
        style={{
          background: "linear-gradient(135deg, #1E5C30 0%, #328A4A 100%)",
        }}
      >
        <div className="absolute top-4 right-4 z-50">
          <LanguageSelector />
        </div>
        <Image
          src="/icone.svg"
          alt="logo"
          width={80}
          height={80}
          style={{ marginBottom: "-6px" }}
        />
        <Image
          src="/texte.svg"
          alt="Cantine+"
          width={200}
          height={55}
          className="mb-6"
        />
        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">👋 Bienvenue !</h2>
          <p className="text-white/70 mb-4">
            Configurez votre profil École pour commencer.
          </p>

          {msg && (
            <div
              className={`mb-4 p-3 rounded-xl text-sm font-bold ${
                msg.includes("❌")
                  ? "bg-red-500/20 text-red-200"
                  : "bg-green-500/20 text-green-200"
              }`}
            >
              {msg}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">
                Nom de votre établissement
              </label>
              <input
                type="text"
                value={setupNom}
                onChange={(e) => setSetupNom(e.target.value)}
                required
                placeholder="Ex: École Pasteur"
                className="w-full px-4 py-3 rounded-xl text-gray-900 font-medium focus:outline-none"
                style={{ background: "white", border: "2px solid transparent" }}
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">
                Votre Prestataire (facultatif)
              </label>
              <select
                value={selectedPresta}
                onChange={(e) => setSelectedPresta(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-gray-900 font-medium focus:outline-none"
                style={{ background: "white" }}
              >
                <option value="">-- Aucun / À définir plus tard --</option>
                {prestataires.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={loadingSetup}
              className="w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2"
              style={{ background: "#F47B20" }}
            >
              {loadingSetup ? "⏳..." : "✅ Créer mon profil"}
            </button>
          </form>
        </div>
      </div>
    );

  const getSchoolTheme = () => {
    if (ecoleProfile?.nom) {
      const nom = ecoleProfile.nom.toLowerCase();
      if (nom.includes("saint") || nom.includes("st"))
        return "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)";
      if (nom.includes("hugo") || nom.includes("pasteur"))
        return "linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)";
      if (nom.includes("marie") || nom.includes("jeanne"))
        return "linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)";
    }
    return "linear-gradient(135deg, #1E5C30 0%, #328A4A 100%)";
  };

  return (
    <div
      className="min-h-screen transition-all duration-700 relative"
      style={{ background: getSchoolTheme() }}
    >
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Navbar - Improved for Mobile */}
      <nav
        className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 gap-4"
        style={{
          background: "rgba(0,0,0,0.3)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center gap-3">
          <Image src="/icone.svg" alt="logo" width={40} height={40} />
          <Image src="/texte.svg" alt="Cantine+" width={110} height={30} />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <span className="text-white/80 text-xs sm:text-sm font-medium bg-white/10 px-3 py-1 rounded-full text-center">
            🏫 {ecoleProfile.nom}
          </span>
          <button
            onClick={logout}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95"
            style={{ background: "#F47B20", color: "white" }}
          >
            🚪 Déconnexion
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* PREMIUM DROPDOWN MENU */}
        <div className="relative mb-8">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-bold text-lg shadow-xl transition-all hover:bg-white/20 active:scale-95"
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
            <div className="absolute top-full left-0 mt-2 w-72 bg-[#1E3A2A]/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    setMenuOpen(false);
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
          <div
            className="mb-6 p-4 rounded-xl text-white font-medium animate-bounce"
            style={{
              background: "rgba(34,197,94,0.2)",
              border: "1px solid rgba(34,197,94,0.4)",
            }}
          >
            {msg}
          </div>
        )}

        {tab === "reservations" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                📋 Réservations de votre école
              </h2>
              <button
                onClick={() => setPointageMode(!pointageMode)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
              >
                {pointageMode ? "🔙 Vue Tableau" : "📱 Mode Pointage Rapide"}
              </button>
            </div>

            {reservations.length === 0 ? (
              <p className="text-white/60">
                Aucune réservation pour le moment.
              </p>
            ) : pointageMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {reservations.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl border bg-white/10"
                    style={{
                      borderColor:
                        r.status === "Absent"
                          ? "#ef4444"
                          : "rgba(255,255,255,0.2)",
                    }}
                  >
                    <div className="font-black text-xl text-white mb-1">
                      {r.enfants?.prenom} {r.enfants?.nom}
                    </div>
                    <div className="text-white/70 text-sm mb-4">
                      Classe : {r.enfants?.classe}
                    </div>

                    {r.enfants?.allergies && (
                      <div className="mb-4 px-3 py-1.5 rounded-lg text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse">
                        ⚠️ Allergie: {r.enfants.allergies}
                      </div>
                    )}

                    {r.enfants?.pai && (
                      <button
                        onClick={() =>
                          alert(
                            `Consigne médicale / PAI pour ${r.enfants?.prenom} :\n${r.enfants?.pai}`
                          )
                        }
                        className="mb-4 px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50 flex items-center gap-2 hover:bg-blue-500/40 transition-all w-full text-left"
                      >
                        💙 Voir le PAI (Consigne Médicale)
                      </button>
                    )}

                    {r.status === "Absent" ? (
                      <div className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-center">
                        Déclaré Absent
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-lg transition-all"
                          onClick={() =>
                            alert("Déjà marqué présent par défaut.")
                          }
                        >
                          ✅ Présent
                        </button>
                        <button
                          className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-lg transition-all"
                          onClick={async () => {
                            if (
                              !confirm(`Signaler ${r.enfants?.prenom} absent ?`)
                            )
                              return;
                            await fetch(
                              `${API}/ecole/reservations/${r.id}/absent`,
                              { method: "PUT", headers }
                            );
                            setMsg(
                              `✅ Absence signalée pour ${r.enfants?.prenom}`
                            );
                            if (ecoleProfile) fetchData(ecoleProfile.id);
                          }}
                        >
                          ❌ Absent
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                      {[
                        "Date",
                        "Enfant",
                        "Classe",
                        "Type",
                        "Statut",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-white/70 text-sm font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r, i) => (
                      <tr
                        key={r.id}
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.1)",
                          background:
                            i % 2 === 0
                              ? "transparent"
                              : "rgba(255,255,255,0.05)",
                        }}
                      >
                        <td className="px-4 py-3 text-white text-sm">
                          {new Date(r.date).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-white text-sm font-medium">
                          {r.enfants?.prenom} {r.enfants?.nom}
                          {r.enfants?.allergies && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse">
                              ⚠️ Allergie: {r.enfants.allergies}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/70 text-sm">
                          {r.enfants?.classe}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className="px-2 py-1 rounded-lg"
                            style={{
                              background: "#F47B20",
                              color: "white",
                              fontSize: "12px",
                            }}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className="px-2 py-1 rounded-lg"
                            style={{
                              background:
                                r.status === "Absent"
                                  ? "rgba(239,68,68,0.3)"
                                  : "rgba(34,197,94,0.3)",
                              color:
                                r.status === "Absent" ? "#fca5a5" : "#86efac",
                              fontSize: "12px",
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.status !== "Absent" && (
                            <button
                              onClick={async () => {
                                if (!confirm("Signaler cet enfant absent ?"))
                                  return;
                                await fetch(
                                  `${API}/ecole/reservations/${r.id}/absent`,
                                  { method: "PUT", headers }
                                );
                                setMsg(
                                  `✅ Absence signalée pour ${r.enfants?.prenom}`
                                );
                                if (ecoleProfile) fetchData(ecoleProfile.id);
                              }}
                              className="text-red-400 hover:text-red-300 text-xs font-bold underline"
                            >
                              Signaler Absent
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "menus" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              🍽️ Menus de la semaine
            </h2>
            {menus.length === 0 ? (
              <p className="text-white/60">Aucun menu disponible.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-white text-sm">
                        {new Date(menu.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: "#F47B20", color: "white" }}
                      >
                        {menu.type}
                      </span>
                    </div>
                    {menu.entree && (
                      <p className="text-white/70 text-sm mb-1">
                        <span className="font-semibold text-white/90">
                          Entrée :
                        </span>{" "}
                        {menu.entree}
                      </p>
                    )}
                    <p className="text-white text-sm mb-1">
                      <span className="font-semibold">Plat :</span> {menu.plat}
                    </p>
                    {menu.dessert && (
                      <p className="text-white/70 text-sm">
                        <span className="font-semibold text-white/90">
                          Dessert :
                        </span>{" "}
                        {menu.dessert}
                      </p>
                    )}
                    {menu.bio && (
                      <span
                        className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background: "rgba(34,197,94,0.3)",
                          color: "#86efac",
                        }}
                      >
                        🌿 Bio
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "invendus" && (
          <InvendusForm
            ecoleId={ecoleProfile.id}
            headers={headers}
            onMsg={setMsg}
          />
        )}

        {tab === "liaison" && (
          <LiaisonForm
            ecoleId={ecoleProfile.id}
            headers={headers}
            onMsg={setMsg}
          />
        )}

        {tab === "gaspillage" && (
          <GaspillageForm
            ecoleId={ecoleProfile.id}
            headers={headers}
            onMsg={setMsg}
          />
        )}

        {tab === "admin" && (
          <div className="max-w-md bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#F47B20] rounded-full flex items-center justify-center text-2xl shadow-lg">
                🛡️
              </div>
              <h2 className="text-2xl font-bold text-white">
                Créer un Super Admin
              </h2>
            </div>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Ce compte aura un accès complet à la supervision globale de la
              plateforme, tout en étant rattaché à votre établissement :{" "}
              <strong>{ecoleProfile.nom}</strong>.
            </p>
            <form onSubmit={createAdmin} className="space-y-4">
              <div>
                <label className="block text-white/80 text-xs font-bold uppercase tracking-widest mb-1 ml-1">
                  Nom Complet
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white text-black font-medium focus:ring-2 focus:ring-[#F47B20] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-white/80 text-xs font-bold uppercase tracking-widest mb-1 ml-1">
                  Email Professionnel
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@ecole.fr"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white text-black font-medium focus:ring-2 focus:ring-[#F47B20] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-white/80 text-xs font-bold uppercase tracking-widest mb-1 ml-1">
                  Mot de Passe
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white text-black font-medium focus:ring-2 focus:ring-[#F47B20] outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loadingSetup}
                className="w-full py-4 rounded-xl font-black text-white bg-[#F47B20] shadow-[0_10px_20px_rgba(244,123,32,0.3)] hover:translate-y-[-2px] active:translate-y-[1px] transition-all disabled:opacity-50"
              >
                {loadingSetup
                  ? "⚡ CRÉATION EN COURS..."
                  : "🚀 CRÉER LE COMPTE ADMIN"}
              </button>
            </form>
          </div>
        )}
        {tab === "reports" && (
          <div className="max-w-3xl animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6">
              📄 Rapports & Compte-rendus
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Mensuel",
                  desc: "Statistiques du mois en cours",
                  icon: "📅",
                },
                {
                  title: "Trimestriel",
                  desc: "Bilan des 3 derniers mois",
                  icon: "📊",
                },
                {
                  title: "Annuel",
                  desc: "Rapport complet de l'année",
                  icon: "🏆",
                },
              ].map((report, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all group"
                >
                  <div className="text-4xl mb-4">{report.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {report.title}
                  </h3>
                  <p className="text-white/60 text-sm mb-6">{report.desc}</p>
                  <button
                    onClick={() => generateReport(report.title)}
                    className="w-full py-3 bg-white text-[#1E5C30] font-bold rounded-xl group-hover:bg-[#F47B20] group-hover:text-white transition-all"
                  >
                    📥 Télécharger
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-10 p-8 rounded-3xl bg-gradient-to-r from-[#F47B20] to-[#FF9D5C] text-white shadow-2xl">
              <h3 className="text-xl font-black mb-2">💡 Le saviez-vous ?</h3>
              <p className="opacity-90">
                Les rapports PDF incluent désormais une analyse prédictive basée
                sur l&apos;IA pour vous aider à réduire vos coûts de 15% dès le
                trimestre prochain.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InvendusForm({
  ecoleId,
  headers,
  onMsg,
}: {
  ecoleId: string;
  headers: Record<string, string>;
  onMsg: (m: string) => void;
}) {
  const [date, setDate] = useState("");
  const [type, setType] = useState("Viande");
  const [quantite, setQuantite] = useState(1);
  const [prix, setPrix] = useState<number | "">("");
  const [isDon, setIsDon] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrix = isDon ? 0 : Number(prix);
    if (!isDon && prix === "")
      return alert("Veuillez définir un prix ou cocher la case Don");
    await fetch(`${API}/ecole/invendus`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ecole_id: ecoleId,
        date,
        type,
        quantite,
        prix: finalPrix,
      }),
    });
    onMsg(isDon ? "✅ Don déclaré avec succès !" : "✅ Invendus déclarés !");
  };
  return (
    <div
      className="rounded-2xl p-6 max-w-lg"
      style={{
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <h2 className="text-xl font-bold text-white mb-4">
        ♻️ Déclarer les invendus
      </h2>
      <p className="text-white/80 text-sm mb-6 bg-[#F47B20]/20 p-3 rounded-lg">
        💡 Conseil : Adaptez le prix du panier anti-gaspi en fonction du seuil
        de pauvreté de votre zone géographique pour le rendre accessible.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-white/80 text-sm mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl text-gray-900"
            style={{ background: "white" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl"
              style={{ background: "#F47B20", color: "white" }}
            >
              <option>Viande</option>
              <option>Sans viande</option>
              <option>Mixte</option>
            </select>
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-1">
              Nombre de portions
            </label>
            <input
              type="number"
              min={1}
              value={quantite}
              onChange={(e) => setQuantite(+e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-gray-900"
              style={{ background: "white" }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F47B20]/10 border border-[#F47B20]/30">
          <input
            type="checkbox"
            id="don"
            checked={isDon}
            onChange={(e) => setIsDon(e.target.checked)}
            className="w-5 h-5 accent-[#F47B20] cursor-pointer"
          />
          <label
            htmlFor="don"
            className="text-white font-medium cursor-pointer"
          >
            🎁 Proposer sous forme de don (Gratuit)
          </label>
        </div>
        {!isDon && (
          <div>
            <label className="block text-white/80 text-sm mb-1">
              Prix unitaire (€)
            </label>
            <input
              type="number"
              step="0.10"
              min="0"
              value={prix}
              onChange={(e) =>
                setPrix(e.target.value === "" ? "" : Number(e.target.value))
              }
              required={!isDon}
              placeholder="Ex: 1.50"
              className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-bold"
              style={{ background: "white" }}
            />
          </div>
        )}
        <button
          type="submit"
          className="w-full py-3 rounded-xl font-bold text-white mt-2 transition-all hover:scale-[1.02]"
          style={{ background: isDon ? "#22c55e" : "#F47B20" }}
        >
          {isDon ? "🎁 Mettre en Don Solidaire" : "Déclarer et Mettre en vente"}
        </button>
      </form>
    </div>
  );
}

function GaspillageForm({
  ecoleId,
  headers,
  onMsg,
}: {
  ecoleId: string;
  headers: Record<string, string>;
  onMsg: (m: string) => void;
}) {
  const [date, setDate] = useState("");
  const [kgJetes, setKgJetes] = useState<number | "">("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kgJetes === "") return;
    await fetch(`${API}/ecole/gaspillage`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ecole_id: ecoleId,
        date,
        kg_jetes: Number(kgJetes),
      }),
    });
    onMsg("✅ Déchets enregistrés ! Cela sera visible sur le bilan carbone.");
    setKgJetes("");
  };

  const analyzeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingAi(true);
    setAiAnalysis("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/ecole/analyze-waste`, {
        method: "POST",
        headers: { Authorization: headers["Authorization"] },
        body: formData,
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || "Impossible d'analyser l'image.");
    } catch {
      setAiAnalysis("❌ Erreur de connexion à l'IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <h2 className="text-xl font-bold text-white mb-4">
          🗑️ Relevé manuel du Gaspillage
        </h2>
        <p className="text-white/80 text-sm mb-6 bg-red-500/20 p-3 rounded-lg border border-red-500/40">
          Saisissez ici le poids total des déchets alimentaires jetés
          aujourd&apos;hui.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-gray-900"
              style={{ background: "white" }}
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-1">
              Poids total jeté (en Kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={kgJetes}
              onChange={(e) =>
                setKgJetes(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              placeholder="Ex: 12.5"
              className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-bold"
              style={{ background: "white" }}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-white mt-2 transition-all hover:scale-[1.02]"
            style={{ background: "#ef4444" }}
          >
            Enregistrer le relevé
          </button>
        </form>
      </div>

      <div className="rounded-2xl p-6 border-2 border-dashed border-green-500/50 bg-green-500/10 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 text-6xl opacity-10">🤖</div>
        <h2 className="text-xl font-bold text-green-400 mb-2">
          📸 Analyse IA Qualitative
        </h2>
        <p className="text-white/80 text-sm mb-6">
          Prenez une photo de la poubelle. Notre IA identifiera ce qui a été
          jeté et vous proposera des solutions pour demain.
        </p>

        <label className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-center cursor-pointer transition-all shadow-lg">
          {loadingAi
            ? "⏳ Analyse en cours..."
            : "Prendre une photo / Uploader"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={analyzeImage}
            disabled={loadingAi}
          />
        </label>

        {aiAnalysis && (
          <div className="mt-6 p-4 bg-black/40 rounded-xl border border-green-500/30 animate-fade-in">
            <h3 className="text-green-300 font-bold mb-2">
              💡 Rapport de l&apos;IA :
            </h3>
            <p className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed">
              {aiAnalysis}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LiaisonForm({
  ecoleId,
  headers,
  onMsg,
}: {
  ecoleId: string;
  headers: Record<string, string>;
  onMsg: (m: string) => void;
}) {
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/ecole/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ecole_id: ecoleId, titre, contenu }),
    });
    onMsg("✅ Message publié pour tous les parents !");
    setTitre("");
    setContenu("");
  };
  return (
    <div
      className="rounded-2xl p-6 max-w-2xl"
      style={{
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <h2 className="text-xl font-bold text-white mb-4">
        📢 Cahier de Liaison
      </h2>
      <p className="text-white/80 text-sm mb-6 bg-blue-500/20 p-3 rounded-lg border border-blue-500/40">
        Publiez un message d&apos;information général (ex: Semaine du goût,
        grève, changement de menu). Tous les parents de votre école le verront
        sur leur tableau de bord.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-white/80 text-sm mb-1">
            Sujet du message
          </label>
          <input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            placeholder="Ex: Découverte des légumes oubliés"
            className="w-full px-4 py-2.5 rounded-xl text-gray-900"
            style={{ background: "white" }}
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm mb-1">
            Contenu détaillé
          </label>
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            required
            placeholder="Saisissez votre message aux parents..."
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl text-gray-900"
            style={{ background: "white" }}
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 rounded-xl font-bold text-white mt-2 transition-all hover:scale-[1.02]"
          style={{ background: "#3b82f6" }}
        >
          Publier le message
        </button>
      </form>
    </div>
  );
}
