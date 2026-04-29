'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const API = 'http://localhost:8000';
type User = { id: string; email: string; role: string; name: string };
type Reservation = { id: string; date: string; type: string; status: string; enfants: { nom: string; prenom: string; classe: string; allergies?: string; pai?: string } };
type Menu = { id: string; date: string; type: string; entree: string; plat: string; dessert: string; bio: boolean };

export default function EcoleDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState('reservations');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [ecoleProfile, setEcoleProfile] = useState<{ id: string; nom: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [setupNom, setSetupNom] = useState('');
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [pointageMode, setPointageMode] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async (u: User, ecoleId: string) => {
    const [res, m] = await Promise.all([
      fetch(`${API}/ecole/reservations/${ecoleId}`, { headers }).then(r => r.json()),
      fetch(`${API}/ecole/menus`, { headers }).then(r => r.json()),
    ]);
    setReservations(Array.isArray(res) ? res : []);
    setMenus(Array.isArray(m) ? m : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored) as User;
    if (u.role !== 'Ecole') { router.push('/'); return; }
    setUser(u);
    fetch(`${API}/ecole/profile/${u.id}`, { headers })
      .then(r => r.json()).then(p => {
        if (p) { setEcoleProfile(p); fetchData(u, p.id); }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, fetchData]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault(); setLoadingSetup(true);
    await fetch(`${API}/ecole/profile`, { method: 'POST', headers, body: JSON.stringify({ user_id: user!.id, nom: setupNom, prestataire_id: null }) });
    window.location.reload();
  };

  const logout = () => { localStorage.clear(); router.push('/'); };

  const tabs = [
    { id: 'reservations', label: '📋 Réservations' },
    { id: 'menus', label: '🍽️ Menus' },
    { id: 'liaison', label: '📢 Cahier de Liaison' },
    { id: 'invendus', label: '♻️ Invendus' },
    { id: 'gaspillage', label: '🗑️ Suivi Gaspillage' },
  ];

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#328A4A' }}><p className="text-white">Chargement...</p></div>;

  if (!ecoleProfile) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #1E5C30 0%, #328A4A 100%)' }}>
      <Image src="/icone.svg" alt="logo" width={80} height={80} style={{ marginBottom: '-6px' }} />
      <Image src="/texte.svg" alt="Cantine+" width={200} height={55} className="mb-6" />
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <h2 className="text-2xl font-bold text-white mb-2">👋 Bienvenue !</h2>
        <p className="text-white/70 mb-6">Configurez votre profil École pour commencer.</p>
        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-1">Nom de votre établissement</label>
            <input type="text" value={setupNom} onChange={e => setSetupNom(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-gray-900 font-medium focus:outline-none"
              style={{ background: 'white', caretColor: 'black', border: '2px solid transparent' }}
              onFocus={e => e.target.style.border = '2px solid #F47B20'}
              onBlur={e => e.target.style.border = '2px solid transparent'} />
          </div>
          <button type="submit" disabled={loadingSetup} className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: '#F47B20' }}>
            {loadingSetup ? '⏳...' : '✅ Créer mon profil'}
          </button>
        </form>
      </div>
    </div>
  );

  const getSchoolTheme = () => {
    if (ecoleProfile?.nom) {
      const nom = ecoleProfile.nom.toLowerCase();
      if (nom.includes('saint') || nom.includes('st')) return 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)';
      if (nom.includes('hugo') || nom.includes('pasteur')) return 'linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)';
      if (nom.includes('marie') || nom.includes('jeanne')) return 'linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)';
    }
    return 'linear-gradient(135deg, #1E5C30 0%, #328A4A 100%)';
  };

  return (
    <div className="min-h-screen transition-all duration-700" style={{ background: getSchoolTheme() }}>
      <nav className="flex items-center justify-between px-8 py-4" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <Image src="/icone.svg" alt="logo" width={50} height={50} style={{ marginBottom: '-4px' }} />
          <Image src="/texte.svg" alt="Cantine+" width={130} height={35} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-sm">🏫 Espace École — {ecoleProfile.nom}</span>
          <button onClick={logout} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#F47B20', color: 'white' }}>🚪 Déconnexion</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: tab === t.id ? '#F47B20' : 'rgba(255,255,255,0.15)', color: 'white', border: tab === t.id ? 'none' : '1px solid rgba(255,255,255,0.2)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {msg && <div className="mb-6 p-4 rounded-xl text-white font-medium" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)' }}>{msg}</div>}

        {tab === 'reservations' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">📋 Réservations de votre école</h2>
              <button 
                onClick={() => setPointageMode(!pointageMode)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
              >
                {pointageMode ? '🔙 Vue Tableau' : '📱 Mode Pointage Rapide'}
              </button>
            </div>

            {reservations.length === 0 ? <p className="text-white/60">Aucune réservation pour le moment.</p> :
              pointageMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {reservations.map(r => (
                    <div key={r.id} className="p-5 rounded-2xl border bg-white/10" style={{ borderColor: r.status === 'Absent' ? '#ef4444' : 'rgba(255,255,255,0.2)' }}>
                      <div className="font-black text-xl text-white mb-1">{r.enfants?.prenom} {r.enfants?.nom}</div>
                      <div className="text-white/70 text-sm mb-4">Classe : {r.enfants?.classe}</div>
                      
                      {r.enfants?.allergies && (
                        <div className="mb-4 px-3 py-1.5 rounded-lg text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse">
                          ⚠️ Allergie: {r.enfants.allergies}
                        </div>
                      )}

                      {r.enfants?.pai && (
                        <button 
                          onClick={() => alert(`Consigne médicale / PAI pour ${r.enfants?.prenom} :\n${r.enfants?.pai}`)}
                          className="mb-4 px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50 flex items-center gap-2 hover:bg-blue-500/40 transition-all w-full text-left"
                        >
                          💙 Voir le PAI (Consigne Médicale)
                        </button>
                      )}

                      {r.status === 'Absent' ? (
                        <div className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-center">Déclaré Absent</div>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-lg transition-all"
                            onClick={() => alert('Déjà marqué présent par défaut.')}
                          >✅ Présent</button>
                          <button 
                            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-lg transition-all"
                            onClick={async () => {
                              if (!confirm(`Signaler ${r.enfants?.prenom} absent ?`)) return;
                              await fetch(`${API}/ecole/reservations/${r.id}/absent`, { method: 'PUT', headers });
                              setMsg(`✅ Absence signalée pour ${r.enfants?.prenom}`);
                              fetchData(user!, ecoleProfile.id);
                            }}
                          >❌ Absent</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <table className="w-full">
                    <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                      {['Date', 'Enfant', 'Classe', 'Type', 'Statut', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-white/70 text-sm font-semibold">{h}</th>)}
                    </tr></thead>
                    <tbody>{reservations.map((r, i) => (
                      <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.05)' }}>
                        <td className="px-4 py-3 text-white text-sm">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-white text-sm font-medium">
                          {r.enfants?.prenom} {r.enfants?.nom}
                          {r.enfants?.allergies && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse">
                              ⚠️ Allergie: {r.enfants.allergies}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/70 text-sm">{r.enfants?.classe}</td>
                        <td className="px-4 py-3 text-sm"><span className="px-2 py-1 rounded-lg" style={{ background: '#F47B20', color: 'white', fontSize: '12px' }}>{r.type}</span></td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 rounded-lg" style={{ background: r.status === 'Absent' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)', color: r.status === 'Absent' ? '#fca5a5' : '#86efac', fontSize: '12px' }}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.status !== 'Absent' && (
                            <button 
                              onClick={async () => {
                                if (!confirm("Signaler cet enfant absent ?")) return;
                                await fetch(`${API}/ecole/reservations/${r.id}/absent`, { method: 'PUT', headers });
                                setMsg(`✅ Absence signalée pour ${r.enfants?.prenom}`);
                                fetchData(user!, ecoleProfile.id);
                              }}
                              className="text-red-400 hover:text-red-300 text-xs font-bold underline"
                            >
                              Signaler Absent
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {tab === 'menus' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">🍽️ Menus de la semaine</h2>
            {menus.length === 0 ? <p className="text-white/60">Aucun menu disponible.</p> :
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menus.map(menu => (
                  <div key={menu.id} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-white text-sm">{new Date(menu.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: '#F47B20', color: 'white' }}>{menu.type}</span>
                    </div>
                    {menu.entree && <p className="text-white/70 text-sm mb-1"><span className="font-semibold text-white/90">Entrée :</span> {menu.entree}</p>}
                    <p className="text-white text-sm mb-1"><span className="font-semibold">Plat :</span> {menu.plat}</p>
                    {menu.dessert && <p className="text-white/70 text-sm"><span className="font-semibold text-white/90">Dessert :</span> {menu.dessert}</p>}
                    {menu.bio && <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(34,197,94,0.3)', color: '#86efac' }}>🌿 Bio</span>}
                  </div>
                ))}
              </div>}
          </div>
        )}

        {tab === 'invendus' && (
          <InvendusForm ecoleId={ecoleProfile.id} headers={headers} onMsg={setMsg} />
        )}

        {tab === 'liaison' && (
          <LiaisonForm ecoleId={ecoleProfile.id} headers={headers} onMsg={setMsg} />
        )}

        {tab === 'gaspillage' && (
          <GaspillageForm ecoleId={ecoleProfile.id} headers={headers} onMsg={setMsg} />
        )}
      </div>
    </div>
  );
}

function InvendusForm({ ecoleId, headers, onMsg }: { ecoleId: string; headers: Record<string,string>; onMsg: (m: string) => void }) {
  const [date, setDate] = useState(''); const [type, setType] = useState('Viande'); const [quantite, setQuantite] = useState(1); 
  const [prix, setPrix] = useState<number | ''>('');
  const [isDon, setIsDon] = useState(false);
  
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrix = isDon ? 0 : Number(prix);
    if (!isDon && prix === '') return alert('Veuillez définir un prix ou cocher la case Don');
    await fetch(`${API}/ecole/invendus`, { method: 'POST', headers, body: JSON.stringify({ ecole_id: ecoleId, date, type, quantite, prix: finalPrix }) });
    onMsg(isDon ? '✅ Don déclaré avec succès !' : '✅ Invendus déclarés !');
  };
  return (
    <div className="rounded-2xl p-6 max-w-lg" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
      <h2 className="text-xl font-bold text-white mb-4">♻️ Déclarer les invendus</h2>
      <p className="text-white/80 text-sm mb-6 bg-[#F47B20]/20 p-3 rounded-lg">💡 Conseil : Adaptez le prix du panier anti-gaspi en fonction du seuil de pauvreté de votre zone géographique pour le rendre accessible.</p>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="block text-white/80 text-sm mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl text-gray-900" style={{ background: 'white' }} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-white/80 text-sm mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl" style={{ background: '#F47B20', color: 'white' }}>
              <option>Viande</option><option>Sans viande</option><option>Mixte</option>
            </select>
          </div>
          <div><label className="block text-white/80 text-sm mb-1">Nombre de portions</label><input type="number" min={1} value={quantite} onChange={e => setQuantite(+e.target.value)} required className="w-full px-4 py-2.5 rounded-xl text-gray-900" style={{ background: 'white' }} /></div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F47B20]/10 border border-[#F47B20]/30">
          <input type="checkbox" id="don" checked={isDon} onChange={e => setIsDon(e.target.checked)} className="w-5 h-5 accent-[#F47B20] cursor-pointer" />
          <label htmlFor="don" className="text-white font-medium cursor-pointer">🎁 Proposer sous forme de don (Gratuit)</label>
        </div>
        {!isDon && (
          <div>
            <label className="block text-white/80 text-sm mb-1">Prix unitaire (€)</label>
            <input type="number" step="0.10" min="0" value={prix} onChange={e => setPrix(e.target.value === '' ? '' : Number(e.target.value))} required={!isDon} placeholder="Ex: 1.50" className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-bold" style={{ background: 'white' }} />
          </div>
        )}
        <button type="submit" className="w-full py-3 rounded-xl font-bold text-white mt-2 transition-all hover:scale-[1.02]" style={{ background: isDon ? '#22c55e' : '#F47B20' }}>
          {isDon ? '🎁 Mettre en Don Solidaire' : 'Déclarer et Mettre en vente'}
        </button>
      </form>
    </div>
  );
}

function GaspillageForm({ ecoleId, headers, onMsg }: { ecoleId: string; headers: Record<string,string>; onMsg: (m: string) => void }) {
  const [date, setDate] = useState(''); const [kgJetes, setKgJetes] = useState<number | ''>('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kgJetes === '') return;
    await fetch(`${API}/ecole/gaspillage`, { method: 'POST', headers, body: JSON.stringify({ ecole_id: ecoleId, date, kg_jetes: Number(kgJetes) }) });
    onMsg('✅ Déchets enregistrés ! Cela sera visible sur le bilan carbone.');
    setKgJetes('');
  };

  const analyzeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoadingAi(true);
    setAiAnalysis('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API}/ecole/analyze-waste`, {
        method: 'POST',
        headers: { 'Authorization': headers['Authorization'] },
        body: formData
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || "Impossible d'analyser l'image.");
    } catch (err) {
      setAiAnalysis("❌ Erreur de connexion à l'IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <h2 className="text-xl font-bold text-white mb-4">🗑️ Relevé manuel du Gaspillage</h2>
        <p className="text-white/80 text-sm mb-6 bg-red-500/20 p-3 rounded-lg border border-red-500/40">Saisissez ici le poids total des déchets alimentaires jetés aujourd'hui.</p>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-white/80 text-sm mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl text-gray-900" style={{ background: 'white' }} /></div>
          <div>
            <label className="block text-white/80 text-sm mb-1">Poids total jeté (en Kg)</label>
            <input type="number" step="0.1" min="0" value={kgJetes} onChange={e => setKgJetes(e.target.value === '' ? '' : Number(e.target.value))} required placeholder="Ex: 12.5" className="w-full px-4 py-2.5 rounded-xl text-gray-900 font-bold" style={{ background: 'white' }} />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl font-bold text-white mt-2 transition-all hover:scale-[1.02]" style={{ background: '#ef4444' }}>
            Enregistrer le relevé
          </button>
        </form>
      </div>

      <div className="rounded-2xl p-6 border-2 border-dashed border-green-500/50 bg-green-500/10 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 text-6xl opacity-10">🤖</div>
        <h2 className="text-xl font-bold text-green-400 mb-2">📸 Analyse IA Qualitative</h2>
        <p className="text-white/80 text-sm mb-6">Prenez une photo de la poubelle. Notre IA identifiera ce qui a été jeté et vous proposera des solutions pour demain.</p>
        
        <label className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-center cursor-pointer transition-all shadow-lg">
          {loadingAi ? '⏳ Analyse en cours...' : 'Prendre une photo / Uploader'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={analyzeImage} disabled={loadingAi} />
        </label>

        {aiAnalysis && (
          <div className="mt-6 p-4 bg-black/40 rounded-xl border border-green-500/30 animate-fade-in">
            <h3 className="text-green-300 font-bold mb-2">💡 Rapport de l'IA :</h3>
            <p className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LiaisonForm({ ecoleId, headers, onMsg }: { ecoleId: string; headers: Record<string,string>; onMsg: (m: string) => void }) {
  const [titre, setTitre] = useState(''); const [contenu, setContenu] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/ecole/messages`, { method: 'POST', headers, body: JSON.stringify({ ecole_id: ecoleId, titre, contenu }) });
    onMsg('✅ Message publié pour tous les parents !');
    setTitre(''); setContenu('');
  };
  return (
    <div className="rounded-2xl p-6 max-w-2xl" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
      <h2 className="text-xl font-bold text-white mb-4">📢 Cahier de Liaison</h2>
      <p className="text-white/80 text-sm mb-6 bg-blue-500/20 p-3 rounded-lg border border-blue-500/40">Publiez un message d'information général (ex: Semaine du goût, grève, changement de menu). Tous les parents de votre école le verront sur leur tableau de bord.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-white/80 text-sm mb-1">Sujet du message</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} required placeholder="Ex: Découverte des légumes oubliés" className="w-full px-4 py-2.5 rounded-xl text-gray-900" style={{ background: 'white' }} />
        </div>
        <div>
          <label className="block text-white/80 text-sm mb-1">Contenu détaillé</label>
          <textarea value={contenu} onChange={e => setContenu(e.target.value)} required placeholder="Saisissez votre message aux parents..." rows={5} className="w-full px-4 py-2.5 rounded-xl text-gray-900" style={{ background: 'white' }} />
        </div>
        <button type="submit" className="w-full py-3 rounded-xl font-bold text-white mt-2 transition-all hover:scale-[1.02]" style={{ background: '#3b82f6' }}>
          Publier le message
        </button>
      </form>
    </div>
  );
}
