import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { CombatSession, Combatant, Monster } from '../types';
import { ChevronLeft, Plus, Trash2, Heart, Dice5, Shield, Crosshair, RefreshCw } from 'lucide-react';

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function rollHD(hd: string): number {
  const s = hd.trim();
  if (s === '1/2') return rollDie(4);
  // "7 (d10)" or "3 (d8)" style
  const parenMatch = s.match(/^(\d+)\s*\(d(\d+)\)([+-]\d+)?$/i);
  if (parenMatch) {
    const n = parseInt(parenMatch[1]), sides = parseInt(parenMatch[2]);
    const mod = parenMatch[3] ? parseInt(parenMatch[3]) : 0;
    let t = 0; for (let i = 0; i < n; i++) t += rollDie(sides);
    return Math.max(1, t + mod);
  }
  const diceMatch = s.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (diceMatch) {
    const n = parseInt(diceMatch[1]), sides = parseInt(diceMatch[2]);
    const mod = diceMatch[3] ? parseInt(diceMatch[3]) : 0;
    let t = 0; for (let i = 0; i < n; i++) t += rollDie(sides);
    return Math.max(1, t + mod);
  }
  const modMatch = s.match(/^(\d+)([+-]\d+)$/);
  if (modMatch) {
    const n = parseInt(modMatch[1]), mod = parseInt(modMatch[2]);
    let t = 0; for (let i = 0; i < n; i++) t += rollDie(8);
    return Math.max(1, t + mod);
  }
  const numMatch = s.match(/^(\d+)$/);
  if (numMatch) {
    const n = parseInt(numMatch[1]);
    let t = 0; for (let i = 0; i < n; i++) t += rollDie(8);
    return Math.max(1, t);
  }
  return 0;
}

function rollDiceExpr(expr: string): number {
  const m = expr.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return 0;
  const n = parseInt(m[1]), sides = parseInt(m[2]), mod = m[3] ? parseInt(m[3]) : 0;
  let t = 0; for (let i = 0; i < n; i++) t += rollDie(sides);
  return t + mod;
}

function parseHDBonus(hd: string): number {
  const s = hd.trim();
  const parenMatch = s.match(/^(\d+)\s*\(/);
  if (parenMatch) return parseInt(parenMatch[1]);
  const modMatch = s.match(/^(\d+)([+-]\d+)$/);
  if (modMatch) return Math.max(1, parseInt(modMatch[1]) + parseInt(modMatch[2]));
  const numMatch = s.match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1]);
  return 0;
}

function parseDice(text: string): string[] {
  return [...text.matchAll(/\d+d\d+(?:[+-]\d+)?/gi)].map(m => m[0]);
}

export default function CombatTracker() {
  const { id } = useParams();
  const [session, setSession] = useState<CombatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [monsterSearch, setMonsterSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Monster[]>([]);
  const [rollLog, setRollLog] = useState<{ id: number; label: string; total: number }[]>([]);
  const [pendingMonster, setPendingMonster] = useState<Monster | null>(null);
  const [pendingHD, setPendingHD] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rollLog]);

  const fetchSession = async () => {
    try {
      const data = await api.get<{ session: CombatSession }>(`/combat/${id}`);
      setSession(data.session);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  const searchMonsters = async (query: string) => {
    setMonsterSearch(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await api.get<{ monsters: Monster[] }>(`/monsters?search=${encodeURIComponent(query)}`);
      setSearchResults(data.monsters.slice(0, 10));
    } catch {
      // ignore
    }
  };

  const syncMonsterStats = async (index: number, monsterId: string) => {
    if (!session) return;
    try {
      const data = await api.get<{ monster: Monster }>(`/monsters/${monsterId}`);
      const m = data.monster;
      const updated = [...session.combatants];
      updated[index] = { ...updated[index], hd: m.hd, ac: m.ac, attacks: m.attacks, special: m.special };
      await api.put(`/combat/${id}`, { combatants: updated });
      setSession({ ...session, combatants: updated });
    } catch {
      // ignore
    }
  };

  const handleRoll = (expr: string, label: string) => {
    const total = rollDiceExpr(expr);
    setRollLog(prev => [...prev.slice(-29), { id: Date.now(), label: `${label} (${expr})`, total }]);
  };

  const addMonster = async (monster: Monster, hpOverride?: number, hdOverride?: string) => {
    const hp = hpOverride ?? (monster.hd ? rollHD(monster.hd) : 0);
    try {
      await api.post(`/combat/${id}/combatants`, {
        type: 'monster',
        name: monster.name,
        initiative: 0,
        hp,
        maxHp: hp,
        conditions: [],
        monsterId: monster._id,
        hd: hdOverride || monster.hd,
        ac: monster.ac,
        attacks: monster.attacks,
        special: monster.special,
      });
      setShowAdd(false);
      setMonsterSearch('');
      setSearchResults([]);
      setPendingMonster(null);
      setPendingHD('');
      fetchSession();
    } catch {
      // ignore
    }
  };

  const addPC = async () => {
    try {
      await api.post(`/combat/${id}/combatants`, {
        type: 'pc',
        name: 'New PC',
        initiative: 0,
        hp: 20,
        maxHp: 20,
        conditions: [],
      });
      fetchSession();
    } catch {
      // ignore
    }
  };

  const removeCombatant = async (index: number) => {
    if (!session) return;
    const updated = [...session.combatants];
    updated.splice(index, 1);
    try {
      await api.put(`/combat/${id}`, { combatants: updated });
      fetchSession();
    } catch {
      // ignore
    }
  };

  const updateCombatant = async (index: number, field: keyof Combatant, value: unknown) => {
    if (!session) return;
    const updated = [...session.combatants];
    updated[index] = { ...updated[index], [field]: value };
    try {
      await api.put(`/combat/${id}`, { combatants: updated });
      setSession({ ...session, combatants: updated });
    } catch {
      // ignore
    }
  };

  if (loading) return <p className="text-parchment-600 font-body italic">Loading...</p>;
  if (!session) return <p className="text-parchment-600 font-body italic">Session not found</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/combat" className="btn btn-secondary text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </Link>
        <h2 className="text-xl font-serif font-bold text-parchment-900">{session.name}</h2>
      </div>


      <div className="flex gap-2">
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary flex items-center gap-1 text-sm">
          <Plus size={16} /> Add Monster
        </button>
        <button onClick={addPC} className="btn btn-secondary flex items-center gap-1 text-sm">
          <Plus size={16} /> Add PC
        </button>
      </div>

      {showAdd && (
        <div className="card space-y-2">
          <input
            className="input"
            placeholder="Search monsters..."
            value={monsterSearch}
            onChange={(e) => searchMonsters(e.target.value)}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-auto">
              {searchResults.map((m) => (
                <button
                  key={m._id}
                  onClick={() => {
                    const hp = m.hd ? rollHD(m.hd) : 0;
                    if (hp === 0) { setPendingMonster(m); setPendingHD(''); }
                    else addMonster(m);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-parchment-100 transition-colors"
                >
                  <span className="font-serif font-medium text-parchment-900">{m.name}</span>
                  <span className="text-xs text-parchment-500 font-body ml-2">HD {m.hd} | AC {m.ac}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pendingMonster && (
        <div className="card space-y-3 border border-arcane-200 bg-arcane-50">
          <div>
            <p className="font-serif font-semibold text-parchment-900">{pendingMonster.name}</p>
            <p className="text-xs text-parchment-500 font-body mt-0.5">
              HD is <span className="font-mono">{pendingMonster.hd || 'unspecified'}</span> — enter the number of dice to roll (d8 unless noted)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="input w-32 font-mono"
              placeholder="e.g. 16 or 16d10"
              value={pendingHD}
              onChange={(e) => setPendingHD(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && pendingHD && addMonster(pendingMonster, rollHD(pendingHD), pendingHD)}
            />
            <button
              className="btn btn-primary flex items-center gap-1 text-sm"
              disabled={!pendingHD}
              onClick={() => addMonster(pendingMonster, rollHD(pendingHD), pendingHD)}
            >
              <Dice5 size={14} /> Roll & Add
            </button>
            <button className="btn btn-secondary text-sm" onClick={() => { setPendingMonster(null); setPendingHD(''); }}>
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[{l:'Hatchling',h:'4'},{l:'Young',h:'6'},{l:'Juvenile',h:'8'},{l:'Adolescent',h:'12'},{l:'Adult',h:'16'},{l:'Elder',h:'20'},{l:'Ancient',h:'24'},{l:'Wyrm',h:'28'}].map(({l,h}) => (
              <button key={h} onClick={() => addMonster(pendingMonster, rollHD(h), h)}
                className="text-xs px-2 py-1 bg-parchment-100 hover:bg-arcane-100 hover:text-arcane-700 rounded font-body border border-parchment-300">
                {l} <span className="font-mono text-parchment-500">({h}HD)</span>
              </button>
            ))}
          </div>
          {(pendingMonster.attacks || pendingMonster.special) && (
            <div className="text-xs space-y-1 pt-1 border-t border-arcane-100">
              {pendingMonster.attacks && (
                <div><span className="font-serif font-semibold text-parchment-700">Attacks: </span><span className="font-body text-parchment-600">{pendingMonster.attacks}</span></div>
              )}
              {pendingMonster.special && (
                <div><span className="font-serif font-semibold text-parchment-700">Special: </span><span className="font-body text-parchment-600">{pendingMonster.special}</span></div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {session.combatants.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-parchment-600 font-body italic">No combatants yet.</p>
            <p className="text-parchment-500 text-sm mt-1">Add monsters or PCs to start.</p>
          </div>
        ) : (
          session.combatants.map((combatant, index) => (
            <div
              key={index}
              className="card"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-serif ${combatant.type === 'monster' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {combatant.type === 'monster' ? 'NPC' : 'PC'}
                    </span>
                    <input
                      className="font-serif font-medium bg-transparent border-none outline-none flex-1 text-parchment-900"
                      value={combatant.name}
                      onChange={(e) => updateCombatant(index, 'name', e.target.value)}
                    />
                    {combatant.hd && (
                      <span className="text-xs text-parchment-400 font-body">HD {combatant.hd}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Heart size={14} className="text-red-500" />
                    <input
                      className="input w-20 text-sm py-1"
                      type="number"
                      value={combatant.hp}
                      onChange={(e) => updateCombatant(index, 'hp', parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs text-parchment-500 font-body">/ {combatant.maxHp}</span>
                    {combatant.ac && (
                      <span className="flex items-center gap-1 text-xs text-parchment-600 font-body ml-2">
                        <Shield size={12} className="text-parchment-400" /> AC {combatant.ac}
                      </span>
                    )}
                    {combatant.conditions.length > 0 && (
                      <span className="text-xs text-orange-600 font-body">{combatant.conditions.join(', ')}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => removeCombatant(index)} className="btn btn-danger p-2">
                  <Trash2 size={14} />
                </button>
              </div>
              {combatant.type === 'monster' && combatant.monsterId && !combatant.attacks && (
                <button onClick={() => syncMonsterStats(index, combatant.monsterId!)}
                  className="text-xs flex items-center gap-1 text-parchment-400 hover:text-arcane-600 font-body mt-1">
                  <RefreshCw size={12} /> Sync stats from bestiary
                </button>
              )}
              {combatant.type === 'monster' && (combatant.attacks || combatant.special) && (
                <div className="mt-2 pt-2 border-t border-parchment-200 space-y-2">
                  {combatant.attacks && (
                    <div>
                      <span className="text-xs font-serif font-semibold text-parchment-700">Attacks: </span>
                      <span className="text-xs text-parchment-600 font-body">{combatant.attacks}</span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {combatant.hd && parseHDBonus(combatant.hd) > 0 && (
                          <button onClick={() => handleRoll(`1d20+${parseHDBonus(combatant.hd!)}`, `${combatant.name} to hit`)}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 font-mono">
                            <Crosshair size={12} /> d20+{parseHDBonus(combatant.hd)}
                          </button>
                        )}
                        {parseDice(combatant.attacks).map((expr, i) => (
                          <button key={i} onClick={() => handleRoll(expr, `${combatant.name} dmg`)}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 bg-arcane-100 text-arcane-700 rounded hover:bg-arcane-200 font-mono">
                            <Dice5 size={12} /> {expr}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {combatant.special && (
                    <div>
                      <span className="text-xs font-serif font-semibold text-parchment-700">Special: </span>
                      <span className="text-xs text-parchment-600 font-body">{combatant.special}</span>
                      {(() => {
                        const hdN = combatant.hd ? parseHDBonus(combatant.hd) : 0;
                        const hasBreath = /breath weapon/i.test(combatant.special);
                        const staticDice = parseDice(combatant.special);
                        if (!hasBreath && staticDice.length === 0) return null;
                        return (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {hasBreath && hdN > 0 && (
                              <button onClick={() => handleRoll(`${hdN}d6`, `${combatant.name} breath`)}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 font-mono">
                                <Dice5 size={12} /> {hdN}d6 breath
                              </button>
                            )}
                            {staticDice.map((expr, i) => (
                              <button key={i} onClick={() => handleRoll(expr, `${combatant.name} special`)}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 font-mono">
                                <Dice5 size={12} /> {expr}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {rollLog.length > 0 && (
        <div className="fixed bottom-4 right-4 w-72 max-h-72 flex flex-col rounded-xl shadow-2xl border border-parchment-200 bg-parchment-50/95 backdrop-blur z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-parchment-200 shrink-0">
            <span className="text-xs font-serif font-semibold text-parchment-700">Combat Log</span>
            <button onClick={() => setRollLog([])} className="text-xs text-parchment-400 hover:text-parchment-700">Clear</button>
          </div>
          <div className="overflow-y-auto p-2 space-y-1">
            {rollLog.map(entry => (
              <div key={entry.id} className="text-xs font-body text-parchment-700 flex items-baseline justify-between gap-2">
                <span className="truncate">{entry.label}</span>
                <span className="font-serif font-bold text-base text-arcane-900 shrink-0">{entry.total}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
