"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LanguageSelector from "../../../components/LanguageSelector";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type User = { id: string; email: string; role: string; name: string };
type Enfant = {
  id: string;
  prenom: string;
  nom: string;
  classe: string;
  ecoles: { nom: string };
  age?: number;
  points?: number;
  ecole_id?: string;
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
type Ecole = { id: string; nom: string };
type Invendu = {
  id: number;
  date: string;
  type: string;
  quantite: number;
  prix: number;
  ecoles: { nom: string };
};

const getBadge = (points: number) => {
  if (points >= 100) return "🌍 Sauveur de Planète";
  if (points >= 50) return "🦸 Héros en herbe";
  return "🌱 Apprenti Écolo";
};

export default function ParentDashboard() {
  const router = useRouter();
  const [user] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [tab, setTab] = useState("enfants");
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [messages, setMessages] = useState<
    { id: string; titre: string; contenu: string; created_at: string }[]
  >([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [invendus, setInvendus] = useState<Invendu[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Add enfant form
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [classe, setClasse] = useState("");
  const [ecoleId, setEcoleId] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [allergies, setAllergies] = useState("");
  const [pai, setPai] = useState("");
  const [bourse, setBourse] = useState<
    { id: string; date: string; type: string }[]
  >([]);
  const [reservations, setReservations] = useState<
    {
      id: string;
      date: string;
      type: string;
      status: string;
      enfants?: { nom: string; prenom: string };
    }[]
  >([]);

  // Reservation form
  const [enfantId, setEnfantId] = useState("");
  const [resDate, setResDate] = useState("");
  const [resType, setResType] = useState("Viande");
  const [resEcoleId, setResEcoleId] = useState("");

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
    async (userId: string) => {
      try {
        const [e, m, ec, inv, res] = await Promise.all([
          fetch(`${API}/parent/enfants/${userId}`, { headers }).then((r) =>
            r.json()
          ),
          fetch(`${API}/parent/menus`, { headers }).then((r) => r.json()),
          fetch(`${API}/parent/ecoles`, { headers }).then((r) => r.json()),
          fetch(`${API}/parent/invendus`, { headers }).then((r) => r.json()),
          fetch(`${API}/parent/reservations/${userId}`, { headers }).then((r) =>
            r.json()
          ),
        ]);
        setEnfants(Array.isArray(e) ? e : []);
        setMenus(Array.isArray(m) ? m : []);
        setEcoles(Array.isArray(ec) ? ec : []);
        setInvendus(Array.isArray(inv) ? inv : []);
        setReservations(Array.isArray(res) ? res : []);

        const ecolesIds = [
          ...new Set(
            (Array.isArray(e) ? e : []).map(
              (en: Enfant) => en.ecole_id as unknown as string
            )
          ),
        ];
        if (ecolesIds.length > 0) {
          try {
            const msgsRes = await Promise.all(
              ecolesIds.map((id) =>
                fetch(`${API}/ecole/messages/${id}`).then((r) => r.json())
              )
            );
            const allMsgs = msgsRes
              .flat()
              .filter((m) => m && m.id)
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
            setMessages(allMsgs);

            const bourseRes = await Promise.all(
              ecolesIds.map((id) =>
                fetch(`${API}/parent/bourse/${id}`, { headers }).then((r) =>
                  r.json()
                )
              )
            );
            const allBourse = bourseRes.flat().filter((b) => b && b.id);
            setBourse(allBourse);
          } catch (err) {
            console.error("Erreur fetches multiples:", err);
          }
        }
      } catch (err) {
        console.error("Erreur fetchData:", err);
      }
    },
    [headers]
  );

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    if (user.role !== "Parent") {
      router.push("/");
      return;
    }

    fetchData(user.id);

    // Demander l'autorisation pour les notifications Web
    if (typeof window !== "undefined" && "Notification" in window) {
      if (
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        Notification.requestPermission();
      }
    }

    let lastInvendusCount = 0;
    let lastAbsencesCount = 0;

    const pollNotifications = setInterval(async () => {
      try {
        const currentToken = localStorage.getItem("token");
        const h = { Authorization: `Bearer ${currentToken}` };

        // 1. Check Invendus
        const invRes = await fetch(`${API}/parent/invendus`, { headers: h });
        const invData = await invRes.json();
        if (Array.isArray(invData)) {
          if (invData.length > lastInvendusCount && lastInvendusCount !== 0) {
            if (Notification.permission === "granted") {
              new Notification("Cantine+", {
                body: "♻️ Nouveau Panier Anti-Gaspi disponible !",
                icon: "/icone.png",
              });
            }
          }
          lastInvendusCount = invData.length;
        }

        // 2. Check Absences
        const resRes = await fetch(`${API}/parent/reservations/${user!.id}`, {
          headers: h,
        });
        const resData = await resRes.json();
        if (Array.isArray(resData)) {
          const currentAbsencesCount = resData.filter(
            (r: { status: string }) => r.status === "Absent"
          ).length;
          if (
            currentAbsencesCount > lastAbsencesCount &&
            lastAbsencesCount !== 0
          ) {
            if (Notification.permission === "granted") {
              new Notification("Alerte Cantine+", {
                body: "⚠️ Votre enfant a été signalé absent au repas.",
                icon: "/icone.png",
              });
            }
          }
          lastAbsencesCount = currentAbsencesCount;
        }
      } catch {
        // Silently fail polling on error
      }
    }, 15000); // Poll every 15s

    return () => clearInterval(pollNotifications);
  }, [router, fetchData, user]);

  const addEnfant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await fetch(`${API}/parent/enfants`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent_id: user!.id,
          ecole_id: ecoleId,
          nom,
          prenom,
          classe,
          age: age ? Number(age) : null,
          allergies,
          pai,
        }),
      });
      setMsg("✅ Enfant ajouté !");
      fetchData(user!.id);
      setNom("");
      setPrenom("");
      setClasse("");
      setEcoleId("");
      setAge("");
      setAllergies("");
      setPai("");
    } catch {
      setMsg("❌ Erreur lors de l'ajout.");
    } finally {
      setLoading(false);
    }
  };

  const addReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await fetch(`${API}/parent/reservations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          enfant_id: enfantId,
          ecole_id: resEcoleId,
          date: resDate,
          type: resType,
        }),
      });
      setMsg("✅ Réservation confirmée !");
    } catch {
      setMsg("❌ Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const deleteEnfant = async (id: string) => {
    if (
      !confirm(
        "Voulez-vous vraiment supprimer cet enfant ? Toutes ses réservations seront annulées."
      )
    )
      return;
    setLoading(true);
    setMsg("");
    try {
      await fetch(`${API}/parent/enfants/${id}`, { method: "DELETE", headers });
      setMsg("✅ Enfant supprimé.");
      fetchData(user!.id);
    } catch {
      setMsg("❌ Erreur lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push("/");
  };

  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: "enfants", label: "👦 Mes Enfants", icon: "👦" },
    { id: "reservation", label: "📅 Réservation", icon: "📅" },
    { id: "bourse", label: "🔄 Bourse d'Échange", icon: "🔄" },
    { id: "menus", label: "🍽️ Menus", icon: "🍽️" },
    { id: "coach", label: "🦸 IA Coach & Tamagotchi", icon: "🦸" },
    { id: "invendus", label: "🛍️ Box Anti-Gaspi", icon: "🛍️" },
    { id: "bilan", label: "🌍 Mon Bilan Planétaire", icon: "🌍" },
  ];

  const characters = [
    {
      name: "Spider-Man",
      emoji: "🕷️",
      image:
        "https://vignette.wikia.nocookie.net/marveldatabase/images/1/11/Peter_Parker_%28Earth-616%29_from_Marvel_Universe_0001.png",
      voiceId: "ErXwteBhS96p0F6N0q6m",
    },
    {
      name: "Elsa",
      emoji: "❄️",
      image:
        "https://vignette.wikia.nocookie.net/disney/images/e/e5/Elsa_Frozen_2.png",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
    },
    {
      name: "Chase",
      emoji: "🐕",
      image:
        "https://vignette.wikia.nocookie.net/paw-patrol/images/7/7b/Chase_main_image.png",
      voiceId: "ErXwteBhS96p0F6N0q6m",
    },
    {
      name: "Marcus",
      emoji: "🚒",
      image:
        "https://vignette.wikia.nocookie.net/paw-patrol/images/0/06/Marshall_Main_Image.png",
      voiceId: "pNInz6obpgnuMvscL7nm",
    },
    {
      name: "Batman",
      emoji: "🦇",
      image:
        "https://vignette.wikia.nocookie.net/batman/images/d/d3/Batman_Portrait.png",
      voiceId: "pNInz6obpgnuMvscL7nm",
    },
    {
      name: "Mirabel",
      emoji: "🦋",
      image:
        "https://vignette.wikia.nocookie.net/disney/images/c/c5/Mirabel_Madrigal.png",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
    },
  ];

  const [selectedChar, setSelectedChar] = useState(characters[0]);
  const [selectedCoachEnfantId, setSelectedCoachEnfantId] = useState("");

  const getSchoolTheme = () => {
    if (enfants.length > 0 && enfants[0].ecoles?.nom) {
      const nom = enfants[0].ecoles.nom.toLowerCase();
      if (nom.includes("saint") || nom.includes("st"))
        return "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)";
      if (nom.includes("hugo") || nom.includes("pasteur"))
        return "linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)";
      if (nom.includes("marie") || nom.includes("jeanne"))
        return "linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)";
    }
    return "linear-gradient(135deg, #1E5C30 0%, #328A4A 100%)";
  };

  if (!user)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#328A4A" }}
      >
        <p className="text-white text-xl">Chargement...</p>
      </div>
    );

  return (
    <div
      className="min-h-screen transition-all duration-700 relative"
      style={{ background: getSchoolTheme() }}
    >
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

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
          <span className="text-white/80 text-xs sm:text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
            👨‍👩‍👧 {user.name}
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

        {messages.length > 0 && tab !== "coach" && (
          <div className="mb-8 p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
              📢 Mots de l&apos;école ({messages.length})
            </h3>
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-black/20">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-white text-lg">{m.titre}</h4>
                    <span className="text-xs text-white/50">
                      {new Date(m.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm whitespace-pre-line">
                    {m.contenu}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {msg && (
          <div
            className="mb-6 p-4 rounded-xl text-white font-medium"
            style={{
              background: msg.includes("✅")
                ? "rgba(34,197,94,0.2)"
                : "rgba(239,68,68,0.2)",
              border: `1px solid ${
                msg.includes("✅")
                  ? "rgba(34,197,94,0.4)"
                  : "rgba(239,68,68,0.4)"
              }`,
            }}
          >
            {msg}
          </div>
        )}

        {/* ONGLET ENFANTS */}
        {tab === "enfants" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <h2 className="text-xl font-bold text-white mb-4">
                ➕ Ajouter un enfant
              </h2>
              <form onSubmit={addEnfant} className="space-y-3">
                <FormInput label="Prénom" value={prenom} onChange={setPrenom} />
                <FormInput label="Nom" value={nom} onChange={setNom} />
                <FormInput
                  label="Classe (ex: PS, MS, GS)"
                  value={classe}
                  onChange={setClasse}
                />
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Âge
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) =>
                      setAge(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    required
                    min="2"
                    max="15"
                    className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-medium focus:outline-none"
                    style={{
                      background: "white",
                      border: "2px solid transparent",
                      caretColor: "black",
                    }}
                    onFocus={(e) =>
                      (e.target.style.border = "2px solid #F47B20")
                    }
                    onBlur={(e) =>
                      (e.target.style.border = "2px solid transparent")
                    }
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    École
                  </label>
                  <select
                    value={ecoleId}
                    onChange={(e) => setEcoleId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl font-medium focus:outline-none"
                    style={{
                      background: "#F47B20",
                      color: "white",
                      border: "none",
                    }}
                  >
                    <option value="">— Sélectionner une école —</option>
                    {ecoles.map((ec) => (
                      <option key={ec.id} value={ec.id}>
                        {ec.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Allergies / Régime (facultatif)
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Ex: Arachide, Sans gluten..."
                    className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-medium focus:outline-none"
                    style={{
                      background: "white",
                      border: "2px solid transparent",
                      caretColor: "black",
                    }}
                    onFocus={(e) =>
                      (e.target.style.border = "2px solid #F47B20")
                    }
                    onBlur={(e) =>
                      (e.target.style.border = "2px solid transparent")
                    }
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    💙 PAI / Consigne médicale (facultatif)
                  </label>
                  <textarea
                    value={pai}
                    onChange={(e) => setPai(e.target.value)}
                    placeholder="Ex: S'il fait une crise, l'isoler au calme"
                    className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-medium focus:outline-none resize-none"
                    rows={2}
                    style={{
                      background: "white",
                      border: "2px solid transparent",
                      caretColor: "black",
                    }}
                    onFocus={(e) =>
                      (e.target.style.border = "2px solid #F47B20")
                    }
                    onBlur={(e) =>
                      (e.target.style.border = "2px solid transparent")
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white transition-all"
                  style={{ background: loading ? "#888" : "#F47B20" }}
                >
                  {loading ? "⏳..." : "Ajouter l'enfant"}
                </button>
              </form>
            </div>
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <h2 className="text-xl font-bold text-white mb-4">
                📋 Mes enfants inscrits
              </h2>
              {enfants.length === 0 ? (
                <p className="text-white/60">
                  Aucun enfant inscrit pour le moment.
                </p>
              ) : (
                enfants.map((enf) => (
                  <div
                    key={enf.id}
                    className="p-4 rounded-xl mb-3 flex justify-between items-center"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <div>
                      <p className="font-bold text-white">
                        {enf.prenom} {enf.nom}{" "}
                        {enf.age ? `(${enf.age} ans)` : ""}
                      </p>
                      <p className="text-white/70 text-sm">
                        Classe : {enf.classe} · {enf.ecoles?.nom}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-black text-[#F47B20] text-xl">
                        {enf.points || 0} pts
                      </span>
                      <span className="text-[10px] px-2 py-1 bg-[#F47B20]/20 text-white rounded-full mt-1 mb-2 font-bold uppercase tracking-wider">
                        {getBadge(enf.points || 0)}
                      </span>
                      <button
                        onClick={() => deleteEnfant(enf.id)}
                        className="text-red-400 hover:text-red-300 text-sm mt-1"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET RESERVATION */}
        {tab === "reservation" && (
          <div
            className="rounded-2xl p-6 max-w-lg"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              📅 Réserver un repas
            </h2>
            <form onSubmit={addReservation} className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Enfant
                </label>
                <select
                  value={enfantId}
                  onChange={(e) => {
                    setEnfantId(e.target.value);
                    const enf = enfants.find((en) => en.id === e.target.value);
                    if (enf) setResEcoleId("");
                  }}
                  required
                  className="w-full px-4 py-2.5 rounded-xl font-medium"
                  style={{
                    background: "#F47B20",
                    color: "white",
                    border: "none",
                  }}
                >
                  <option value="">— Choisir un enfant —</option>
                  {enfants.map((enf) => (
                    <option key={enf.id} value={enf.id}>
                      {enf.prenom} {enf.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  École
                </label>
                <select
                  value={resEcoleId}
                  onChange={(e) => setResEcoleId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl font-medium"
                  style={{
                    background: "#F47B20",
                    color: "white",
                    border: "none",
                  }}
                >
                  <option value="">— Choisir une école —</option>
                  {ecoles.map((ec) => (
                    <option key={ec.id} value={ec.id}>
                      {ec.nom}
                    </option>
                  ))}
                </select>
              </div>
              <FormInput
                label="Date du repas"
                value={resDate}
                onChange={setResDate}
                type="date"
              />
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Type de repas
                </label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl font-medium"
                  style={{
                    background: "#F47B20",
                    color: "white",
                    border: "none",
                  }}
                >
                  <option>Viande</option>
                  <option>Sans viande</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white"
                style={{ background: "#F47B20" }}
              >
                {loading ? "⏳..." : "✅ Confirmer la réservation"}
              </button>
            </form>
          </div>
        )}

        {/* ONGLET BOURSE */}
        {tab === "bourse" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">
              🔄 Bourse d&apos;Échange Solidaire
            </h2>
            <p className="text-white/80 mb-6 bg-blue-500/20 p-4 rounded-xl border border-blue-500/40">
              Un imprévu de dernière minute ? Récupérez ici les repas annulés
              par d&apos;autres parents pour lutter contre le gaspillage.
            </p>
            {bourse.length === 0 ? (
              <p className="text-white/60">
                Aucun repas annulé disponible dans vos écoles.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bourse.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border bg-white/10 flex flex-col justify-between"
                    style={{ borderColor: "rgba(255,255,255,0.2)" }}
                  >
                    <div>
                      <div className="font-bold text-white mb-2">
                        {new Date(b.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                      <div className="text-white/80 text-sm mb-4">
                        Repas annulé à l&apos;école. Type : {b.type}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const enfId = prompt(
                          "Entrez l'ID de l'enfant qui récupérera ce repas (Simulation MVP):",
                          enfants[0]?.id
                        );
                        if (!enfId) return;
                        setLoading(true);
                        setMsg("");
                        try {
                          await fetch(`${API}/parent/bourse/claim/${b.id}`, {
                            method: "PUT",
                            headers,
                            body: JSON.stringify({ enfant_id: enfId }),
                          });
                          setMsg("✅ Repas récupéré avec succès !");
                          fetchData(user!.id);
                        } catch {
                          setMsg("❌ Erreur.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full py-2 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-all"
                    >
                      🔄 Récupérer pour mon enfant
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">
                Vos Réservations (Gérer & Annuler)
              </h3>
              {reservations.length === 0 ? (
                <p className="text-white/60">Aucune réservation.</p>
              ) : (
                <div className="space-y-3">
                  {reservations.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center"
                    >
                      <div>
                        <div className="text-white font-bold">
                          {new Date(r.date).toLocaleDateString("fr-FR")} -{" "}
                          {r.type}
                        </div>
                        <div className="text-white/60 text-sm">
                          Statut :{" "}
                          <span
                            className={
                              r.status === "Annulée"
                                ? "text-red-400"
                                : "text-green-400"
                            }
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                      {r.status !== "Annulée" && (
                        <button
                          onClick={async () => {
                            if (
                              !confirm(
                                "Voulez-vous vraiment annuler ce repas ? Il partira dans la bourse d'échange."
                              )
                            )
                              return;
                            setLoading(true);
                            setMsg("");
                            try {
                              await fetch(
                                `${API}/parent/reservations/${r.id}/cancel`,
                                { method: "PUT", headers }
                              );
                              setMsg(
                                "✅ Réservation annulée, repas envoyé en bourse."
                              );
                              fetchData(user!.id);
                            } catch {
                              setMsg("❌ Erreur.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl font-bold text-sm hover:bg-red-500/40 transition-all"
                        >
                          Déclarer Malade / Annuler
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET MENUS */}
        {tab === "menus" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              🍽️ Menus disponibles
            </h2>
            {menus.length === 0 ? (
              <p className="text-white/60">
                Aucun menu disponible pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menus.map((menu) => {
                  const getSuperPouvoir = (plat: string) => {
                    const text = plat.toLowerCase();
                    if (text.includes("carotte"))
                      return {
                        pouvoir: "Vision nocturne 🦇",
                        desc: "Riche en Vitamine A",
                      };
                    if (text.includes("lentille") || text.includes("épinard"))
                      return {
                        pouvoir: "Force de Hulk 💪",
                        desc: "Riche en Fer",
                      };
                    if (text.includes("poisson"))
                      return {
                        pouvoir: "Super-Mémoire 🧠",
                        desc: "Riche en Oméga-3",
                      };
                    if (text.includes("fromage") || text.includes("yaourt"))
                      return {
                        pouvoir: "Os en Titane 🦴",
                        desc: "Riche en Calcium",
                      };
                    if (text.includes("poulet") || text.includes("viande"))
                      return {
                        pouvoir: "Muscles d'Acier ⚡",
                        desc: "Protéines pures",
                      };
                    if (text.includes("pomme") || text.includes("fruit"))
                      return {
                        pouvoir: "Énergie Infinie 🚀",
                        desc: "Plein de Vitamines",
                      };
                    return null;
                  };
                  const superPouvoir = getSuperPouvoir(
                    `${menu.entree} ${menu.plat} ${menu.dessert}`
                  );

                  return (
                    <div
                      key={menu.id}
                      className="rounded-2xl p-5 transition-all hover:scale-105 flex flex-col justify-between"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-white">
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
                          <span className="font-semibold">Plat :</span>{" "}
                          {menu.plat}
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

                      {superPouvoir && (
                        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30">
                          <div className="text-yellow-300 font-bold text-sm flex items-center gap-1">
                            ✨ {superPouvoir.pouvoir}
                          </div>
                          <div className="text-white/80 text-xs italic">
                            {superPouvoir.desc}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET COACH IA */}
        {tab === "coach" && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="rounded-2xl p-8 text-center bg-white/10 border border-white/20 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <img
                  src={selectedChar.image}
                  alt="bg"
                  className="w-full h-full object-cover scale-150 blur-xl"
                />
              </div>
              <div className="relative z-10">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-[#F47B20] overflow-hidden shadow-2xl">
                  <img
                    src={selectedChar.image}
                    alt={selectedChar.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  IA Coach : {selectedChar.name}
                </h2>
                <p className="text-white/80 text-lg">
                  Choisissez ton héros préféré pour analyser ton repas !
                </p>
              </div>
            </div>

            {/* Sélecteur de personnages */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {characters.map((char) => (
                <button
                  key={char.name}
                  onClick={() => setSelectedChar(char)}
                  className={`p-2 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 border-2 ${
                    selectedChar.name === char.name
                      ? "bg-[#F47B20] border-white scale-110 shadow-[0_0_20px_rgba(244,123,32,0.5)] z-10"
                      : "bg-white/5 border-white/10 hover:bg-white/20"
                  }`}
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                    <img
                      src={char.image}
                      alt={char.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white uppercase text-center">
                    {char.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Sélecteur de l'enfant pour l'âge */}
            <div className="max-w-md mx-auto">
              <label className="block text-white font-medium mb-2 text-center text-lg">
                Pour quel enfant est ce plateau ?
              </label>
              <select
                value={selectedCoachEnfantId}
                onChange={(e) => setSelectedCoachEnfantId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl font-bold text-center text-lg shadow-lg cursor-pointer transition-all hover:bg-white/90"
                style={{
                  background: "white",
                  color: "#1E5C30",
                  border: "none",
                }}
              >
                <option value="">— Choisir l&apos;enfant —</option>
                {enfants.map((enf) => (
                  <option key={enf.id} value={enf.id}>
                    {enf.prenom} {enf.nom} {enf.age ? `(${enf.age} ans)` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* ARBRE VIRTUEL (TAMAGOTCHI) */}
            {selectedCoachEnfantId &&
              (() => {
                const selectedEnfant = enfants.find(
                  (e) => e.id === selectedCoachEnfantId
                );
                const pts = selectedEnfant?.points || 0;
                let treeEmoji = "🌰";
                let treeLabel = "Graine";
                let maxPts = 30;
                if (pts >= 30) {
                  treeEmoji = "🌱";
                  treeLabel = "Jeune Pousse";
                  maxPts = 70;
                }
                if (pts >= 70) {
                  treeEmoji = "🌿";
                  treeLabel = "Plante Héroïque";
                  maxPts = 150;
                }
                if (pts >= 150) {
                  treeEmoji = "🌳";
                  treeLabel = "Chêne Majestueux";
                  maxPts = 300;
                }
                const progress = Math.min(100, (pts / maxPts) * 100);

                return (
                  <div className="max-w-md mx-auto p-6 rounded-3xl text-center bg-gradient-to-b from-blue-400/20 to-green-500/20 border border-white/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      L&apos;Arbre Virtuel de {selectedEnfant?.prenom}
                    </h3>
                    <div
                      className="text-8xl my-6 animate-bounce"
                      style={{
                        filter: "drop-shadow(0px 10px 10px rgba(0,0,0,0.3))",
                      }}
                    >
                      {treeEmoji}
                    </div>
                    <p className="text-white/90 font-bold mb-4 text-lg">
                      Stade : {treeLabel} ({pts} pts)
                    </p>
                    <div className="w-full bg-black/40 rounded-full h-4 mb-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-300 h-4 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-white/60 text-xs">
                      Plus que {maxPts - pts} points pour la prochaine évolution
                      ! Nourris ton arbre en mangeant tes légumes.
                    </p>
                  </div>
                );
              })()}

            <div className="rounded-3xl p-8 space-y-6 bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="flex flex-col items-center gap-6">
                <label className="w-full flex flex-col items-center px-4 py-12 bg-white/10 text-white rounded-3xl border-2 border-dashed border-white/30 cursor-pointer hover:bg-white/20 transition-all group">
                  <div className="w-20 h-20 bg-[#F47B20] rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                    📸
                  </div>
                  <span className="text-xl font-bold">
                    Photo du plateau repas
                  </span>
                  <p className="text-white/60 text-sm mt-2">
                    Cliquez pour capturer le repas du champion
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const img = document.getElementById(
                            "preview-img"
                          ) as HTMLImageElement;
                          if (img) img.src = ev.target?.result as string;
                          img.classList.remove("hidden");
                        };
                        reader.readAsDataURL(file);
                        (
                          window as unknown as { selectedFile?: File }
                        ).selectedFile = file;
                      }
                    }}
                  />
                </label>
                <img
                  id="preview-img"
                  className="hidden max-h-72 rounded-2xl shadow-2xl border-4 border-white/30 object-cover"
                  alt="Preview"
                />
              </div>

              <button
                onClick={async () => {
                  const file = (window as unknown as { selectedFile: File })
                    .selectedFile;
                  if (!file)
                    return alert("Veuillez d'abord choisir une photo !");
                  if (!selectedCoachEnfantId)
                    return alert(
                      "Veuillez d'abord sélectionner un enfant pour adapter le message !"
                    );

                  const selectedEnfant = enfants.find(
                    (e) => e.id === selectedCoachEnfantId
                  );

                  setLoading(true);
                  setMsg("");
                  const formData = new FormData();
                  formData.append("file", file);

                  // Ajout des paramètres de personnage et voix
                  const url = new URL(`${API}/parent/analyze`);
                  url.searchParams.append("voice_id", selectedChar.voiceId);
                  url.searchParams.append("character_name", selectedChar.name);
                  if (selectedEnfant?.age) {
                    url.searchParams.append(
                      "age",
                      selectedEnfant.age.toString()
                    );
                  }

                  try {
                    const res = await fetch(url.toString(), {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    });
                    const data = await res.json();
                    setMsg(data.message);

                    if (data.audio) {
                      const audio = new Audio(
                        `data:audio/mp3;base64,${data.audio}`
                      );
                      audio.play();
                    }
                  } catch {
                    setMsg(
                      "❌ Le Superhéros est en mission, réessayez plus tard !"
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-5 rounded-2xl bg-[#F47B20] text-white font-black text-xl shadow-[0_10px_20px_rgba(244,123,32,0.4)] hover:translate-y-[-2px] active:translate-y-[2px] transition-all disabled:bg-gray-600"
              >
                {loading
                  ? `⚡ ${selectedChar.name} analyse le plateau...`
                  : `🚀 Faire parler ${selectedChar.name}`}
              </button>

              {msg && (
                <div className="p-8 rounded-3xl bg-[#1E5C30]/40 border-l-12 border-[#F47B20] text-white animate-fade-in shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 text-4xl opacity-20">
                    {selectedChar.emoji}
                  </div>
                  <div className="text-xl font-bold text-[#F47B20] mb-2 uppercase tracking-widest">
                    {selectedChar.name} dit :
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-2xl italic font-medium">
                    {msg}
                  </div>
                  <div className="mt-6 text-right font-black text-[#F47B20] flex items-center justify-end gap-2 text-sm uppercase">
                    <span>Disponible dans l&apos;application Cantine+</span>
                    <span className="text-2xl">✨</span>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/10 text-center animate-fade-in">
                    <p className="text-white/90 mb-4 font-bold text-xl">
                      Votre enfant a-t-il bien mangé son repas ?
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(
                            `${API}/parent/enfants/${selectedCoachEnfantId}/points`,
                            {
                              method: "POST",
                              headers,
                              body: JSON.stringify({ points: 10 }),
                            }
                          );
                          setMsg("");
                          alert(
                            "🎉 Félicitations ! 10 points ont été ajoutés !"
                          );
                          fetchData(user!.id); // Rafraîchir pour voir les nouveaux points
                        } catch {
                          alert("Erreur lors de l'ajout des points");
                        }
                      }}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-black text-xl shadow-[0_10px_20px_rgba(34,197,94,0.3)] transition-all hover:scale-105"
                    >
                      🌟 Féliciter et Valider le repas (+10 points)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET INVENDUS */}
        {tab === "invendus" && (
          <div>
            <div className="mb-6 rounded-2xl p-6 bg-[#F47B20]/20 border border-[#F47B20]/40">
              <h2 className="text-2xl font-bold text-white mb-2">
                🛍️ Le Marché Anti-Gaspi
              </h2>
              <p className="text-white/80">
                Réservez les repas non consommés du jour à prix réduit.
                Ensemble, luttons contre le gaspillage alimentaire !
              </p>
            </div>

            {invendus.length === 0 ? (
              <p className="text-white/60 text-center py-8">
                Aucun panier Anti-Gaspi disponible pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invendus.map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-2xl p-5 flex flex-col justify-between"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-white text-lg">
                          {inv.ecoles?.nom}
                        </span>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                          style={{ background: "#F47B20", color: "white" }}
                        >
                          {inv.type}
                        </span>
                      </div>
                      <p className="text-white/80 mb-1">
                        📅{" "}
                        {new Date(inv.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="text-[#86efac] font-bold mb-4">
                        📦 {inv.quantite} panier{inv.quantite > 1 ? "s" : ""}{" "}
                        disponible{inv.quantite > 1 ? "s" : ""}
                      </p>
                      {inv.prix === 0 ? (
                        <div className="inline-block px-4 py-2 rounded-xl bg-[#22c55e]/20 border border-[#22c55e]/40">
                          <span className="text-2xl font-black text-[#22c55e]">
                            🎁 Don Solidaire
                          </span>
                        </div>
                      ) : (
                        <p className="text-3xl font-black text-white mt-2">
                          {inv.prix.toFixed(2)} €
                        </p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `${API}/parent/invendus/${inv.id}/reserver`,
                            {
                              method: "POST",
                              headers,
                              body: JSON.stringify({ parent_id: user!.id }),
                            }
                          );
                          if (!res.ok) {
                            const err = await res.json();
                            alert(
                              err.detail || "Erreur lors de la réservation"
                            );
                            return;
                          }
                          setMsg("✅ Panier Anti-Gaspi réservé avec succès !");
                          fetchData(user!.id);
                        } catch {
                          alert("Erreur réseau");
                        }
                      }}
                      className="w-full mt-5 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 transition-all shadow-lg hover:scale-105"
                    >
                      Réserver ce panier
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET BILAN PLANÉTAIRE */}
        {tab === "bilan" &&
          (() => {
            const totalPoints = enfants.reduce(
              (acc, e) => acc + (e.points || 0),
              0
            );
            const repasSauves = Math.floor(totalPoints / 20) + 2; // Mock calculation for demo based on engagement
            const co2Evite = (repasSauves * 2.5).toFixed(1);
            const eauPreservee = repasSauves * 500;

            return (
              <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="text-center mb-10">
                  <div className="text-6xl mb-4">🌍</div>
                  <h2 className="text-4xl font-black text-white mb-2">
                    Bulletin de Santé Planétaire
                  </h2>
                  <p className="text-white/80 text-xl">
                    L&apos;impact réel de votre famille sur la planète depuis
                    votre inscription.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="p-8 rounded-3xl bg-white/10 border border-white/20 text-center backdrop-blur-md hover:scale-105 transition-transform">
                    <div className="text-5xl mb-4">🛍️</div>
                    <div className="text-4xl font-black text-white mb-2">
                      {repasSauves}
                    </div>
                    <div className="text-white/80 font-medium">
                      Repas Sauvés
                    </div>
                  </div>
                  <div className="p-8 rounded-3xl bg-white/10 border border-white/20 text-center backdrop-blur-md hover:scale-105 transition-transform">
                    <div className="text-5xl mb-4">☁️</div>
                    <div className="text-4xl font-black text-[#86efac] mb-2">
                      {co2Evite} kg
                    </div>
                    <div className="text-white/80 font-medium">
                      CO₂ Évité (soit {Math.floor(Number(co2Evite) * 5)} km en
                      voiture)
                    </div>
                  </div>
                  <div className="p-8 rounded-3xl bg-white/10 border border-white/20 text-center backdrop-blur-md hover:scale-105 transition-transform">
                    <div className="text-5xl mb-4">💧</div>
                    <div className="text-4xl font-black text-blue-300 mb-2">
                      {eauPreservee} L
                    </div>
                    <div className="text-white/80 font-medium">
                      D&apos;Eau Préservée
                    </div>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-gradient-to-r from-[#F47B20] to-orange-400 text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 text-9xl opacity-20">
                    🦸
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2">
                    Score Santé Global : {totalPoints} Points
                  </h3>
                  <p className="text-white/90 text-lg font-medium">
                    Vos enfants goûtent de nouveaux légumes et adoptent une
                    alimentation équilibrée au quotidien. Félicitations pour cet
                    engagement !
                  </p>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-white/80 text-sm font-medium mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-medium focus:outline-none"
        style={{
          background: "white",
          border: "2px solid transparent",
          caretColor: "black",
        }}
        onFocus={(e) => (e.target.style.border = "2px solid #F47B20")}
        onBlur={(e) => (e.target.style.border = "2px solid transparent")}
      />
    </div>
  );
}
