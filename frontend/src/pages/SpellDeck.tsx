import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Character } from '../types';
import { BookOpen, Brain, Zap } from 'lucide-react';
import SpellDescription from '../components/SpellDescription';
import { isCharacterSpellcaster } from '../data/classData';

export default function SpellDeck() {
  const { id } = useParams();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<{ character: Character }>(`/characters/${id}`);
        setCharacter(data.character);
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <p className="text-parchment-600">Loading...</p>;
  if (!character) return <p className="text-parchment-600">Character not found</p>;
  if (!isCharacterSpellcaster(character.classes)) {
    return (
      <div className="text-center py-12">
        <p className="text-parchment-600 font-body text-lg italic mb-4">Not a spellcaster</p>
        <p className="text-sm text-parchment-500 font-body mb-4">
          {character.name} is a {character.classes.map((c) => c.name).join(' / ')} and cannot use spells.
        </p>
        <Link to={`/characters/${id}`} className="btn btn-primary">Back to Character</Link>
      </div>
    );
  }

  const presentLevels = useMemo(
    () => [...new Set(character.knownSpells.map((s) => s.level))].sort((a, b) => a - b),
    [character.knownSpells]
  );

  const visibleSpells = useMemo(() => {
    const q = search.toLowerCase();
    return character.knownSpells
      .filter((s) => (levelFilter === null || s.level === levelFilter) && (!q || s.name.toLowerCase().includes(q)))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [character.knownSpells, levelFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-parchment-900">{character.name}'s Spells</h2>
        <Link to={`/characters/${id}`} className="btn btn-secondary text-sm">Back</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link to={`/characters/${id}/spells/learn`} className="btn btn-primary flex items-center gap-1">
          <Zap size={18} /> Learn New Spells
        </Link>
        <Link to={`/characters/${id}/spells/memorize`} className="btn btn-secondary flex items-center gap-1">
          <Brain size={18} /> Memorize Spells
        </Link>
      </div>

      <div>
        <h3 className="font-serif font-semibold text-arcane-800 text-lg mb-3 flex items-center gap-2">
          <BookOpen size={20} /> Known Spells ({visibleSpells.length}/{character.knownSpells.length})
        </h3>
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          <input
            className="input py-1 text-sm flex-1 min-w-0"
            placeholder="Search spells…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setLevelFilter(null)}
              className={`px-2 py-1 rounded text-xs font-body ${levelFilter === null ? 'bg-arcane-600 text-white' : 'bg-parchment-200 text-parchment-700'}`}
            >All</button>
            {presentLevels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(levelFilter === lvl ? null : lvl)}
                className={`px-2 py-1 rounded text-xs font-body ${levelFilter === lvl ? 'bg-arcane-600 text-white' : 'bg-parchment-200 text-parchment-700'}`}
              >{lvl === 0 ? 'Cantrip' : `Lv ${lvl}`}</button>
            ))}
          </div>
        </div>
        {character.knownSpells.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-parchment-600 font-body text-lg italic">No spells known yet.</p>
            <p className="text-parchment-500 text-sm mt-1">Level up to learn new spells!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleSpells.map((spell) => {
                const isCantrip = spell.level === 0;
                const isMemorized = !isCantrip && character.memorizedSpells.some((s) => s._id === spell._id);
                const isLost = !isCantrip && character.lostSpells.some((s) => s._id === spell._id);
                return (
                  <div
                    key={spell._id}
                    className={`card ${isLost ? 'opacity-50' : ''} ${isMemorized ? 'border-l-4 border-l-arcane-500' : ''} ${isCantrip ? 'border-l-4 border-l-green-400' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-serif font-semibold text-parchment-900">
                          {spell.name} {spell.reversible && '*'}
                          <span className="text-xs text-parchment-500 ml-2 font-body">Lv {spell.level}</span>
                        </p>
                        <p className="text-xs text-parchment-500 mt-1 font-body">
                          CT {spell.castingTime} | R {spell.range} | D {spell.duration} | SV {spell.savingThrow} | SR {spell.spellResistance} | Comp {spell.components}
                        </p>
                        <div className="mt-2 line-clamp-3"><SpellDescription text={spell.description} /></div>
                      </div>
                      <div className="ml-2 flex flex-col gap-1 items-end">
                        {isCantrip && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-serif">Always Known</span>}
                        {isMemorized && <span className="text-xs bg-arcane-100 text-arcane-700 px-2 py-1 rounded font-serif">Memorized</span>}
                        {isLost && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-serif">Lost</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
