import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { Spell, Character } from '../types';
import SwipeCard from '../components/SwipeCard';
import { Check, X, ChevronLeft } from 'lucide-react';
import { isCharacterSpellcaster, getCharacterSpellcastingInfo, getMaxKnownSpellsPerLevel } from '../data/classData';

export default function LearnSpells() {
  const { id } = useParams();
  const [character, setCharacter] = useState<Character | null>(null);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [learnedCount, setLearnedCount] = useState(0);
  const [maxPerLevel, setMaxPerLevel] = useState<number[]>([]);
  const [knownPerLevel, setKnownPerLevel] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const charData = await api.get<{ character: Character }>(`/characters/${id}`);
        setCharacter(charData.character);

        if (!isCharacterSpellcaster(charData.character.classes)) {
          setLoading(false);
          return;
        }

        const castInfo = getCharacterSpellcastingInfo(charData.character.classes, charData.character.attributes as unknown as Record<string, number>);
        if (!castInfo) {
          setLoading(false);
          return;
        }

        const charClasses = charData.character.classes
          .filter((c) => {
            const cls = isCharacterSpellcaster([c]);
            return cls;
          })
          .map((c) => c.name.toLowerCase());
        const knownSpells = charData.character.knownSpells;
        const knownSpellIds = knownSpells.map((s) => s._id);

        // Max known spells per level = spells per day (including prime attr bonus)
        const maxSpells = getMaxKnownSpellsPerLevel(castInfo.className, castInfo.level, castInfo.primeAttrScore);
        setMaxPerLevel(maxSpells);

        // Count known spells per level
        const knownCounts = new Array(10).fill(0);
        for (const s of knownSpells) knownCounts[s.level] = (knownCounts[s.level] || 0) + 1;
        setKnownPerLevel(knownCounts);

        const highestCastableLevel = Math.max(0, ...maxSpells.map((n, i) => n > 0 ? i : -1));

        const spellData = await api.get<{ spells: Spell[] }>(`/spells`);

        // Cantrips (level 0) are always known automatically — learn them silently
        const cantrips = spellData.spells.filter(
          (spell) => spell.level === 0 &&
            spell.classes.some((c) => charClasses.includes(c.toLowerCase())) &&
            !knownSpellIds.includes(spell._id)
        );
        await Promise.allSettled(cantrips.map((s) => api.post(`/characters/${id}/learn-spell`, { spellId: s._id })));
        // Update local counts so the level-0 badge shows correctly
        knownCounts[0] = (knownCounts[0] || 0) + cantrips.length;
        setKnownPerLevel([...knownCounts]);

        // Swipe deck: level 1+ spells only, respecting per-level cap
        const filtered = spellData.spells.filter(
          (spell) =>
            spell.level > 0 &&
            spell.classes.some((c) => charClasses.includes(c.toLowerCase())) &&
            !knownSpellIds.includes(spell._id) &&
            spell.level <= highestCastableLevel &&
            (knownCounts[spell.level] || 0) < (maxSpells[spell.level] || 0)
        );
        setAvailableSpells(filtered);
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Auto-advance past spells whose level is now at cap
  useEffect(() => {
    const spell = availableSpells[currentIndex];
    if (!spell) return;
    const max = maxPerLevel[spell.level] || 0;
    const known = knownPerLevel[spell.level] || 0;
    if (max > 0 && known >= max) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, knownPerLevel, availableSpells, maxPerLevel]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (direction === 'right' && character) {
      const spell = availableSpells[currentIndex];
      const known = knownPerLevel[spell.level] || 0;
      const max = maxPerLevel[spell.level] || 0;
      if (known < max) {
        try {
          await api.post(`/characters/${id}/learn-spell`, { spellId: spell._id });
          setLearnedCount((c) => c + 1);
          setKnownPerLevel((prev) => {
            const next = [...prev];
            next[spell.level] = (next[spell.level] || 0) + 1;
            return next;
          });
        } catch {
          // ignore
        }
      }
    }
    setCurrentIndex((i) => i + 1);
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    handleSwipe(direction);
  };

  if (loading) return <p className="text-parchment-600 font-body italic">Loading...</p>;

  if (character && !isCharacterSpellcaster(character.classes)) {
    return (
      <div className="text-center py-12">
        <p className="text-parchment-600 font-body text-lg italic mb-4">Not a spellcaster</p>
        <p className="text-sm text-parchment-500 font-body mb-4">
          {character.name} is a {character.classes.map((c) => c.name).join(' / ')} and cannot learn spells.
        </p>
        <Link to={`/characters/${id}`} className="btn btn-primary">
          Back to Character
        </Link>
      </div>
    );
  }

  const currentSpell = availableSpells[currentIndex];
  const nextSpell = availableSpells[currentIndex + 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to={`/characters/${id}/spells`} className="btn btn-secondary text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </Link>
        <h2 className="text-xl font-serif font-bold text-parchment-900">Learn Spells</h2>
        <span className="text-sm text-parchment-600 font-body">Learned: {learnedCount}</span>
      </div>

      {character && (
        <>
          <p className="text-sm text-center text-parchment-600 font-body italic">
            {character.name} — {character.classes.map((c) => c.name).join(' / ')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs font-body">
            {maxPerLevel.map((max, lvl) => {
              if (max === 0 || lvl === 0) return null;
              const known = knownPerLevel[lvl] || 0;
              const atCap = known >= max;
              return (
                <span key={lvl} className={`px-2 py-1 rounded ${atCap ? 'bg-green-100 text-green-700' : 'bg-arcane-100 text-arcane-700'}`}>
                  Lv{lvl}: {known}/{max}{atCap && ' ✓'}
                </span>
              );
            })}
          </div>
        </>
      )}

      {currentSpell ? (
        <>
          <div className="relative h-[500px] mx-auto max-w-sm">
            <AnimatePresence>
              {nextSpell && (
                <div key={nextSpell._id} className="absolute inset-0">
                  <SwipeCard spell={nextSpell} onSwipe={() => {}} isLast={false} />
                </div>
              )}
              <div key={currentSpell._id} className="absolute inset-0">
                <SwipeCard spell={currentSpell} onSwipe={handleSwipe} isLast={true} />
              </div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-4 max-w-sm mx-auto">
            <button
              onClick={() => handleButtonSwipe('left')}
              className="btn btn-secondary rounded-full p-4 shadow-lg"
            >
              <X size={28} className="text-red-500" />
            </button>
            <button
              onClick={() => handleButtonSwipe('right')}
              className="btn btn-secondary rounded-full p-4 shadow-lg"
            >
              <Check size={28} className="text-green-500" />
            </button>
          </div>
          <p className="text-center text-xs text-parchment-500 font-body">
            Swipe right to learn, left to skip.{' '}
            {(() => {
              const slots = maxPerLevel.reduce((sum, max, lvl) => sum + Math.max(0, max - (knownPerLevel[lvl] || 0)), 0);
              return slots > 0 ? `${slots} spell slot${slots !== 1 ? 's' : ''} left to fill.` : 'All slots filled — remaining cards will be skipped.';
            })()}
          </p>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-parchment-600 font-body text-lg italic mb-4">No more spells to learn!</p>
          <p className="text-sm text-parchment-500 font-body mb-4">Learned {learnedCount} new spell(s) this session.</p>
          <Link to={`/characters/${id}/spells`} className="btn btn-primary">
            Back to Spell Deck
          </Link>
        </div>
      )}
    </div>
  );
}
