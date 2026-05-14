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
  const [tab, setTab] = useState("enfants");
  const [filterRegime, setFilterRegime] = useState("Standard");
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [messages, setMessages] = useState<
    { id: string; titre: string; contenu: string; created_at: string }[]
  >([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [invendus, setInvendus] = useState<Invendu[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const bgAudio = useMemo(() => (typeof window !== "undefined" ? new Audio() : null), []);

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

  // Quiz states
  const [quizActive, setQuizActive] = useState(false);
  const [quizSubStep, setQuizSubStep] = useState(0); 
  const [quizDate, setQuizDate] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizStep, setQuizStep] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPresentation, setQuizPresentation] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

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
    if (!mounted) return;
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
    { id: "enfants", label: "Mes Enfants", icon: "👦" },
    { id: "reservation", label: "Réservation", icon: "📅" },
    { id: "bourse", label: "Bourse d'Échange", icon: "🔄" },
    { id: "menus", label: "Menus", icon: "🍽️" },
    { id: "coach", label: "IA Coach & Tamagotchi", icon: "🦸" },
    { id: "invendus", label: "Box Anti-Gaspi", icon: "🛍️" },
    { id: "bilan", label: "Mon Bilan Planétaire", icon: "🌍" },
  ];

  const characters = [
    {
      name: "Spider-Man",
      emoji: "🕷️",
      image: "/heroes/spider-man.jpg",
      voiceId: "fr-FR-RemyMultilingualNeural",
    },
    {
      name: "Elsa",
      emoji: "❄️",
      image: "/heroes/elsa.jpg",
      voiceId: "fr-FR-DeniseNeural",
    },
    {
      name: "Chase",
      emoji: "🐕",
      image: "/heroes/chase.jpg",
      voiceId: "fr-BE-GerardNeural",
    },
    {
      name: "Marcus",
      emoji: "🚒",
      image: "/heroes/marcus.jpg",
      voiceId: "fr-CA-AntoineNeural",
    },
    {
      name: "Batman",
      emoji: "🦇",
      image: "/heroes/batman.jpg",
      voiceId: "fr-FR-HenriNeural",
    },
    {
      name: "Mirabel",
      emoji: "🦋",
      image: "/heroes/Mirabel.jpg",
      voiceId: "fr-FR-EloiseNeural",
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

  if (!mounted) return null;

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
          <LanguageSelector />
          {/* Bouton enveloppe messages */}
          <button
            onClick={() => { setTab("enfants"); }}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
            title="Messages de l'école"
          >
            <span className="text-xl">✉️</span>
            {messages.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg">
                {messages.length}
              </span>
            )}
          </button>
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
                    if (enf && enf.ecole_id) setResEcoleId(enf.ecole_id); else setResEcoleId("");
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
                  {ecoles
                    .filter((ec) => {
                      if (!enfantId) return true; // Affiche tout si aucun enfant n'est sélectionné
                      const enf = enfants.find((e) => e.id === enfantId);
                      return enf ? ec.id === enf.ecole_id : true;
                    })
                    .map((ec) => (
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
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white mb-4 md:mb-0">
                🍽️ Menus disponibles
              </h2>
              
              {/* Filtre de Régime */}
              <div className="flex bg-black/20 p-1 rounded-xl w-full md:w-auto">
                <button
                  onClick={() => setFilterRegime("Standard")}
                  className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                    filterRegime === "Standard"
                      ? "bg-[#F47B20] text-white shadow-lg"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  🥩 Standard
                </button>
                <button
                  onClick={() => setFilterRegime("Végétarien")}
                  className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                    filterRegime === "Végétarien"
                      ? "bg-green-500 text-white shadow-lg"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  🌱 Végétarien
                </button>
              </div>
            </div>

            {menus.length === 0 ? (
              <p className="text-white/60">
                Aucun menu disponible pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menus.filter((menu) => {
                  const isVeggie = menu.type.toLowerCase().includes("végétarien") || menu.type.toLowerCase().includes("sans viande");
                  return filterRegime === "Végétarien" ? isVeggie : !isVeggie;
                }).map((menu) => {
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
                    return {
                      pouvoir: "Énergie du Héros ⚡",
                      desc: "Repas équilibré",
                    };
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
                        <div className="mt-4 p-3 rounded-xl bg-linear-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30">
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
              <div className="relative z-10">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <img
                    src={selectedChar.image}
                    alt="bg"
                    className="w-full h-full object-cover scale-150 blur-xl"
                  />
                </div>
                <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-[#F47B20] overflow-hidden shadow-2xl bg-white/20">
                  <img
                    src={selectedChar.image}
                    alt={selectedChar.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size: 4rem;">${selectedChar.emoji}</span>`;
                    }}
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
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center text-3xl">
                    <img
                      src={char.image}
                      alt={char.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.innerHTML = char.emoji;
                      }}
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
                  <div className="max-w-md mx-auto p-6 rounded-3xl text-center bg-linear-to-b from-blue-400/20 to-green-500/20 border border-white/20 shadow-2xl relative overflow-hidden">
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
                        className="bg-linear-to-r from-green-400 to-green-300 h-4 rounded-full transition-all duration-1000"
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

            <div className="rounded-3xl p-8 space-y-6 bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden min-h-[400px] flex flex-col justify-center">
              {!quizActive ? (
                /* --- ÉTAPE 1 : SÉLECTION DE LA MISSION --- */
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-linear-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-pulse">
                      🎯
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">Mission Nutrition</h3>
                      <p className="text-white/60 text-sm">Prépare tes super-pouvoirs pour demain !</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <label className="block text-white/70 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Date du repas à découvrir</label>
                      <input
                        type="date"
                        value={quizDate}
                        onChange={(e) => setQuizDate(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl bg-white text-black text-xl font-black focus:ring-4 focus:ring-[#F47B20]/30 outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!quizDate || !selectedCoachEnfantId) {
                        return alert("Choisis une date et un enfant !");
                      }
                      setLoading(true);
                      // DÉBLOCAGE CRITIQUE : Amorçage du lecteur dans le thread du clic
                      if (bgAudio) {
                        bgAudio.play().then(() => bgAudio.pause()).catch(() => {});
                      }
                      try {
                        const targetEnfant = enfants.find(e => e.id === selectedCoachEnfantId);
                        const menuRes = await fetch(`${API}/parent/menus`);
                        const menus = await menuRes.json();
                        const dayMenu = menus.filter((m: any) => m.date === quizDate);
                        
                        if (dayMenu.length === 0) {
                          alert("Pas de menu disponible pour cette date.");
                          setLoading(false);
                          return;
                        }

                        const menuStr = dayMenu.map((m: any) => `${m.type}: ${m.plat}`).join(", ");
                        
                        const quizRes = await fetch(`${API}/parent/quiz`, {
                          method: "POST",
                          headers: { ...headers, "Content-Type": "application/json" },
                          body: JSON.stringify({
                            menu_description: menuStr,
                            character_name: selectedChar.name,
                            child_name: targetEnfant?.prenom,
                            age: targetEnfant?.age,
                            voice_id: selectedChar.voiceId
                          })
                        });
                        const data = await quizRes.json();
                        setQuizQuestions(data.quiz);
                        setQuizPresentation(data.presentation);
                        setQuizActive(true);
                        setQuizSubStep(0); 
                        setQuizStep(0);
                        setQuizScore(0);
                        
                        if (data.audio && bgAudio) {
                          const audioUrl = `data:audio/mp3;base64,${data.audio}`;
                          setAudioSrc(audioUrl);
                          bgAudio.src = audioUrl;
                          bgAudio.play().catch(e => console.warn("Audio bloqué:", e));
                        }
                      } catch (err) {
                        console.error(err);
                        alert("Erreur lors de la mission.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full py-6 rounded-2xl font-black text-white bg-linear-to-r from-[#F47B20] to-[#FF9D5C] shadow-[0_10px_30px_rgba(244,123,32,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-xl tracking-tighter"
                  >
                    {loading ? "⚡ GÉNÉRATION DE LA MISSION..." : "🚀 LANCER MA MISSION"}
                  </button>
                </div>
              ) : quizSubStep === 0 ? (
                /* --- ÉTAPE 2 : BRIEFING AUTOMATIQUE --- */
                <div className="space-y-8 animate-fade-in text-center p-4">
                  <div className="relative inline-block">
                    <div className="w-48 h-48 mx-auto rounded-full border-8 border-[#F47B20] overflow-hidden shadow-2xl transform hover:scale-110 transition-transform duration-500">
                      <img src={selectedChar.image} alt={selectedChar.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-3 shadow-lg animate-bounce">
                      <span className="text-3xl">🎙️</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">Message de {selectedChar.name}</h3>
                    <div className="bg-white/10 p-10 rounded-[40px] border border-white/20 italic text-2xl text-white leading-relaxed shadow-2xl backdrop-blur-xl relative">
                      <span className="absolute top-4 left-6 text-6xl opacity-20 text-[#F47B20]">&quot;</span>
                      {quizPresentation}
                      <span className="absolute bottom-0 right-6 text-6xl opacity-20 text-[#F47B20]">&quot;</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setQuizSubStep(1);
                      if (bgAudio) bgAudio.pause();
                    }}
                    className="w-full py-6 rounded-3xl font-black text-white bg-linear-to-r from-green-500 to-emerald-600 shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-4 text-2xl group"
                  >
                    <span>🚀 C&apos;EST PARTI POUR LE QUIZ !</span>
                    <span className="group-hover:translate-x-2 transition-transform">➡️</span>
                  </button>
                </div>
              ) : (
                /* --- ÉTAPE 3 : LE QUIZ OU LA VICTOIRE --- */
                <div className="w-full">
                  {quizStep < quizQuestions.length ? (
                    <div className="space-y-6 animate-fade-in relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="px-6 py-2 bg-white/10 rounded-full text-white font-black text-sm uppercase tracking-widest">
                          Mission : {quizStep + 1} / {quizQuestions.length}
                        </div>
                        <div className="flex items-center gap-2 px-6 py-2 bg-yellow-400 text-black rounded-full font-black text-sm shadow-lg">
                          ⭐ {quizScore} PTS
                        </div>
                      </div>

                      {/* Lecture de la question */}
                      <button
                        onClick={async () => {
                          const q = quizQuestions[quizStep];
                          const text = `${q.question}. Choix 1 : ${q.options[0]}. Choix 2 : ${q.options[1]}. Choix 3 : ${q.options[2]}.`;
                          try {
                            const res = await fetch(`${API}/parent/tts`, {
                              method: "POST",
                              headers: { ...headers, "Content-Type": "application/json" },
                              body: JSON.stringify({ text, voice_id: selectedChar.voiceId })
                            });
                            const data = await res.json();
                            if (data.audio && bgAudio) {
                              bgAudio.src = `data:audio/mp3;base64,${data.audio}`;
                              bgAudio.play();
                            }
                          } catch (e) { console.error(e); }
                        }}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 rounded-3xl text-white font-bold flex items-center justify-center gap-4 transition-all group"
                      >
                        <div className="w-10 h-10 bg-[#F47B20] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <span className="text-xl">🔊</span>
                        </div>
                        <span className="text-lg">Écouter {selectedChar.name} lire la question</span>
                      </button>

                      <div className="p-8 rounded-[40px] bg-white/5 border border-white/20 shadow-3xl backdrop-blur-md relative overflow-hidden">
                        <h3 className="text-3xl font-black text-white leading-tight mb-10 text-center">
                          {quizQuestions[quizStep].question}
                        </h3>

                        <div className="space-y-4">
                          {quizQuestions[quizStep].options.map((opt: string, i: number) => (
                            <button
                              key={i}
                              disabled={showFeedback}
                              onClick={() => {
                                const isCorrect = i === quizQuestions[quizStep].answer;
                                if (isCorrect) setQuizScore(quizScore + 50);
                                setShowFeedback(true);
                                
                                setTimeout(async () => {
                                  const feedbackText = isCorrect 
                                    ? `Magnifique ! C'est exactement ça. ${quizQuestions[quizStep].explanation}`
                                    : `Pas tout à fait ! Écoute bien : ${quizQuestions[quizStep].explanation}`;
                                  try {
                                    const res = await fetch(`${API}/parent/tts`, {
                                      method: "POST",
                                      headers: { ...headers, "Content-Type": "application/json" },
                                      body: JSON.stringify({ text: feedbackText, voice_id: selectedChar.voiceId })
                                    });
                                    const data = await res.json();
                                    if (data.audio && bgAudio) {
                                      bgAudio.src = `data:audio/mp3;base64,${data.audio}`;
                                      bgAudio.play();
                                    }
                                  } catch (e) { console.error(e); }
                                }, 100);
                              }}
                              className={`w-full p-6 rounded-3xl text-left font-black text-xl transition-all border-4 flex items-center justify-between group ${
                                showFeedback
                                  ? i === quizQuestions[quizStep].answer
                                    ? "bg-green-500/40 border-green-400 text-white shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                                    : "bg-white/5 border-white/5 text-white/20"
                                  : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-[#F47B20] hover:translate-x-2"
                              }`}
                            >
                              <span>{opt}</span>
                              {showFeedback && i === quizQuestions[quizStep].answer ? (
                                <span className="text-3xl animate-bounce">✅</span>
                              ) : !showFeedback && (
                                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#F47B20] transition-colors font-black text-sm">
                                  {i + 1}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {showFeedback && (
                        <div className="p-8 rounded-[40px] bg-linear-to-br from-[#1E5C30] to-[#064E3B] border-4 border-[#F47B20] shadow-3xl animate-slide-up relative overflow-hidden">
                          <div className="absolute -right-4 -top-4 text-8xl opacity-10 rotate-12">🌟</div>
                          <div className="text-[#F47B20] font-black uppercase tracking-[0.2em] mb-4 text-sm">Verdict du Héros</div>
                          <p className="text-white text-2xl font-bold leading-relaxed mb-8">
                            {quizQuestions[quizStep].explanation}
                          </p>
                          <button
                            onClick={async () => {
                              setShowFeedback(false);
                              if (quizStep + 1 < quizQuestions.length) {
                                setQuizStep(quizStep + 1);
                              } else {
                                try {
                                  await fetch(`${API}/parent/enfants/${selectedCoachEnfantId}/points`, {
                                    method: "POST",
                                    headers,
                                    body: JSON.stringify({ points: quizScore })
                                  });
                                  fetchData(user!.id);
                                } catch (e) { console.error(e); }
                                setQuizStep(quizQuestions.length);
                              }
                            }}
                            className="w-full py-6 bg-[#F47B20] text-white font-black rounded-2xl shadow-2xl hover:scale-[1.03] active:scale-[0.97] transition-all text-xl uppercase italic tracking-tighter"
                          >
                            {quizStep + 1 < quizQuestions.length ? "Question Suivante ➡️" : "Découvrir mon Score Final 🎉"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* --- ÉTAPE 4 : VICTOIRE ÉPIQUE --- */
                    <div className="py-10 space-y-10 animate-fade-in text-center relative">
                      <div className="relative inline-block">
                        <div className="text-[10rem] animate-bounce drop-shadow-[0_20px_40px_rgba(255,215,0,0.6)]">🏆</div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-10 py-4 bg-yellow-400 text-black font-black rounded-full shadow-[0_10px_30px_rgba(255,215,0,0.4)] text-3xl uppercase tracking-tighter border-4 border-white">
                          + {quizScore} PTS
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-6xl font-black text-white uppercase tracking-tighter leading-none animate-pulse">
                          MISSION RÉUSSIE !
                        </h3>
                        <p className="text-3xl text-white/90 font-medium max-w-lg mx-auto leading-tight">
                          {selectedChar.name} est impressionné ! Ton intelligence protège la planète et ta santé.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setQuizActive(false);
                          setQuizStep(0);
                        }}
                        className="w-full py-8 bg-white text-black font-black rounded-[35px] hover:bg-[#F47B20] hover:text-white transition-all text-3xl shadow-[0_25px_50px_rgba(0,0,0,0.4)] group flex items-center justify-center gap-6"
                      >
                        <span>🔄 NOUVELLE MISSION</span>
                        <span className="group-hover:translate-x-4 transition-transform text-4xl">➡️</span>
                      </button>
                    </div>
                  )}
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
                      className="w-full mt-5 py-3 rounded-xl font-bold text-white bg-linear-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 transition-all shadow-lg hover:scale-105"
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
            const repasSauves = Math.floor(totalPoints / 20); // Vrai calcul sans triche
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

                <div className="p-8 rounded-3xl bg-linear-to-r from-[#F47B20] to-orange-400 text-center shadow-2xl relative overflow-hidden">
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
