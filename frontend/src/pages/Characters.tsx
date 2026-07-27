import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Character, Attributes } from '../types';
import { Plus, ChevronRight, Dices } from 'lucide-react';
import { CLASSES, CLASS_NAMES, RACES, RACE_NAMES, roll3d6, attrMod, getStartingSpellCount, applyRacialModifiers, type AttrKey } from '../data/classData';

const ATTR_LABELS: Record<string, string> = {
  str: 'Strength', int: 'Intelligence', wis: 'Wisdom',
  dex: 'Dexterity', con: 'Constitution', cha: 'Charisma',
};
const ATTR_KEYS = ['str', 'int', 'wis', 'dex', 'con', 'cha'] as const;

export default function Characters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('Wizard');
  const [newRace, setNewRace] = useState('Human');
  const [baseAttrs, setBaseAttrs] = useState<Attributes>({ str: 10, int: 10, wis: 10, dex: 10, con: 10, cha: 10 });
  const [secondaryPrimes, setSecondaryPrimes] = useState<AttrKey[]>([]);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ characters: Character[] }>('/characters');
      setCharacters(data.characters);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const classInfo = CLASSES[newClass];
  const raceInfo = RACES[newRace];
  const attrs = applyRacialModifiers(baseAttrs as Record<AttrKey, number>, newRace) as Attributes;
  const conMod = attrMod(attrs.con);
  const numSecondaryPrimes = 1 + raceInfo.extraPrimaryAttributes;

  const rollAttributes = () => {
    const newAttrs: Attributes = { str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0 };
    for (const k of ATTR_KEYS) newAttrs[k] = roll3d6();
    setBaseAttrs(newAttrs);
  };

  const handleClassChange = (cls: string) => {
    setNewClass(cls);
    setSecondaryPrimes([]);
  };

  const handleRaceChange = (race: string) => {
    setNewRace(race);
    setSecondaryPrimes([]);
  };

  const toggleSecondaryPrime = (key: AttrKey) => {
    if (key === classInfo.primeAttribute) return;
    setSecondaryPrimes((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= numSecondaryPrimes) return prev;
      return [...prev, key];
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const hp = Math.max(1, classInfo.hitDie + conMod);
      const data = await api.post<{ character: Character }>('/characters', {
        name: newName,
        race: newRace,
        classes: [{ name: newClass, level: 1, isHalfClass: false }],
        primaryAttribute: classInfo.primeAttribute,
        secondaryPrimaryAttributes: secondaryPrimes,
        attributes: attrs,
        hp,
        maxHp: hp,
        xp: 0,
      });
      setNewName('');
      setShowCreate(false);
      if (classInfo.isSpellcaster) {
        navigate(`/characters/${data.character._id}/spells/learn`);
      } else {
        fetchCharacters();
      }
    } catch {
      // ignore
    }
    setCreating(false);
  };

  const startingSpells = classInfo.isSpellcaster ? getStartingSpellCount(newClass, 1, attrs[classInfo.primeAttribute]) : null;
  const allPrimes = [classInfo.primeAttribute, ...secondaryPrimes];
  const hasRaceBonus = raceInfo.extraPrimaryAttributes > 0;
  const hasAttrMods = Object.keys(raceInfo.attrModifiers).length > 0;
  const attrModSummary = hasAttrMods
    ? Object.entries(raceInfo.attrModifiers).map(([k, v]) => `${(v as number) > 0 ? '+' : ''}${v} ${ATTR_LABELS[k].slice(0,3).toUpperCase()}`).join(', ')
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-parchment-900">Your Characters</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary flex items-center gap-1">
          <Plus size={18} /> New Character
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card space-y-4">
          <h3 className="font-serif font-semibold text-arcane-800 text-lg">Create a New Hero</h3>

          <div>
            <label className="label">Character Name</label>
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus placeholder="Enter name..." />
          </div>

          <div>
            <label className="label">Race</label>
            <select className="input" value={newRace} onChange={(e) => handleRaceChange(e.target.value)}>
              {RACE_NAMES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-xs text-parchment-500 mt-1 font-body">
              {raceInfo.size} | Move {raceInfo.movement}ft
              {hasAttrMods && ` | ${attrModSummary}`}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {raceInfo.abilities.map((a, i) => (
                <span key={i} className="text-xs bg-parchment-100 text-parchment-600 px-1.5 py-0.5 rounded font-body">{a}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Class</label>
            <select className="input" value={newClass} onChange={(e) => handleClassChange(e.target.value)}>
              {CLASS_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-xs text-parchment-500 mt-1 font-body">
              Prime: {ATTR_LABELS[classInfo.primeAttribute]} | HD: d{classInfo.hitDie}
              {classInfo.isSpellcaster ? ` | ${classInfo.spellType} spellcaster` : ''}
            </p>
          </div>

          <div>
            <label className="label">Primary Attributes ({1 + numSecondaryPrimes} total)</label>
            <p className="text-xs text-parchment-500 mb-2 font-body">
              {classInfo.primeAttribute.toUpperCase()} is automatic from class. Pick {numSecondaryPrimes} more{hasRaceBonus ? ` (${newRace} bonus)` : ''}.
            </p>
            <div className="flex flex-wrap gap-2">
              {ATTR_KEYS.map((k) => {
                const isClassPrime = k === classInfo.primeAttribute;
                const isSecondaryPrime = secondaryPrimes.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={isClassPrime}
                    onClick={() => toggleSecondaryPrime(k)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-body transition-all ${
                      isClassPrime ? 'bg-arcane-200 text-arcane-800 font-semibold cursor-default' :
                      isSecondaryPrime ? 'bg-arcane-100 text-arcane-700 border border-arcane-400 font-semibold' :
                      'bg-parchment-100 text-parchment-600 border border-parchment-200 hover:border-arcane-300'
                    }`}
                  >
                    {ATTR_LABELS[k].slice(0, 3).toUpperCase()}{isClassPrime ? ' *' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Attributes (3d6 each)</label>
              <button type="button" onClick={rollAttributes} className="btn btn-secondary text-sm flex items-center gap-1 py-1 px-2">
                <Dices size={16} /> Roll
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ATTR_KEYS.map((k) => {
                const isPrime = allPrimes.includes(k);
                const baseVal = baseAttrs[k];
                const racialMod = (raceInfo.attrModifiers as Record<string, number>)[k] || 0;
                const mod = attrMod(attrs[k]);
                return (
                  <div key={k} className={`text-center rounded-lg p-2 ${isPrime ? 'bg-arcane-100 border border-arcane-300' : 'bg-parchment-100'}`}>
                    <p className="text-xs font-serif font-semibold text-parchment-700">{ATTR_LABELS[k].slice(0, 3).toUpperCase()}</p>
                    <p className="text-lg font-serif font-bold text-parchment-900">{attrs[k]}</p>
                    {racialMod !== 0 && (
                      <p className="text-xs text-arcane-500 font-body">{baseVal}{racialMod > 0 ? '+' : ''}{racialMod}</p>
                    )}
                    <p className={`text-xs font-body ${mod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mod >= 0 ? '+' : ''}{mod}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-parchment-100 rounded-lg p-3 space-y-1 text-sm font-body">
            <div className="flex justify-between">
              <span className="text-parchment-600">Hit Points:</span>
              <span className="font-serif font-bold text-parchment-900">
                {Math.max(1, classInfo.hitDie + conMod)} (d{classInfo.hitDie} + {conMod >= 0 ? '+' : ''}{conMod} CON)
              </span>
            </div>
            {startingSpells && (
              <div className="flex justify-between">
                <span className="text-parchment-600">Starting Spells:</span>
                <span className="font-serif font-bold text-arcane-700">
                  {startingSpells.level0} × Lv0, {startingSpells.level1} × Lv1
                </span>
              </div>
            )}
            {startingSpells && (startingSpells.level0 > 4 || startingSpells.level1 > 2) && (
              <p className="text-xs text-arcane-600 italic">
                Includes bonus spells from high {ATTR_LABELS[classInfo.primeAttribute]}
              </p>
            )}
          </div>

          <button type="submit" disabled={creating} className="btn btn-primary w-full">
            {creating ? 'Creating...' : 'Create Character'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-parchment-600 text-center py-8 font-body italic">Loading...</p>
      ) : characters.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-parchment-600 font-body text-lg italic">No characters yet.</p>
          <p className="text-parchment-500 text-sm mt-1">Create one to begin your adventure!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {characters.map((char) => (
            <Link
              key={char._id}
              to={`/characters/${char._id}`}
              className="card flex items-center justify-between hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div>
                <h3 className="font-serif font-bold text-lg text-parchment-900">{char.name}</h3>
                <p className="text-sm text-parchment-600 font-body">
                  {char.race} {char.classes.map((c) => `${c.name} ${c.level}${c.isHalfClass ? ' (half)' : ''}`).join(' / ')}
                  {' — HP '}{char.hp}/{char.maxHp}
                </p>
              </div>
              <ChevronRight className="text-arcane-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
