import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { Spell, Character } from '../types';
import SwipeCard from '../components/SwipeCard';
import { Check, X, ChevronLeft, Brain } from 'lucide-react';
import { isCharacterSpellcaster } from '../data/classData';

export default function MemorizeSpells() {
  const { id } = useParams();
  const [character, setCharacter] = useState<Character | null>(null);
  const [memorized, setMemorized] = useState<string[]>([]);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const charData = await api.get<{ character: Character }>(`/characters/${id}`);
        setCharacter(charData.character);
        setAvailableSpells(charData.character.knownSpells.filter((s) => s.level > 0));
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      const spell = availableSpells[currentIndex];
      if (spell && !memorized.includes(spell._id)) {
        setMemorized((m) => [...m, spell._id]);
      }
    }
    setCurrentIndex((i) => i + 1);
  };

  const handleSave = async () => {
    try {
      await api.post(`/characters/${id}/memorize-spells`, { spellIds: memorized });
      setSaved(true);
    } catch {
      // ignore
    }
  };

  if (loading) return <p className="text-parchment-600 font-body italic">Loading...</p>;

  if (character && !isCharacterSpellcaster(character.classes)) {
    return (
      <div className="text-center py-12">
        <p className="text-parchment-600 font-body text-lg italic mb-4">Not a spellcaster</p>
        <p className="text-sm text-parchment-500 font-body mb-4">
          {character.name} is a {character.classes.map((c) => c.name).join(' / ')} and cannot memorize spells.
        </p>
        <Link to={`/characters/${id}`} className="btn btn-primary">Back to Character</Link>
      </div>
    );
  }

  const currentSpell = availableSpells[currentIndex];
  const nextSpell = availableSpells[currentIndex + 1];

  if (saved) {
    return (
      <div className="text-center py-12 space-y-4">
        <Brain size={48} className="mx-auto text-arcane-600" />
        <p className="text-lg font-serif font-medium text-parchment-900">Spells memorized!</p>
        <p className="text-sm text-parchment-600 font-body">{memorized.length} spell(s) ready to cast.</p>
        <Link to={`/characters/${id}`} className="btn btn-primary">Back to Character</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to={`/characters/${id}`} className="btn btn-secondary text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </Link>
        <h2 className="text-xl font-serif font-bold text-parchment-900">Memorize Spells</h2>
        <span className="text-sm text-parchment-600 font-body">Selected: {memorized.length}</span>
      </div>

      {currentSpell ? (
        <>
          <div className="relative h-[500px] mx-auto max-w-sm">
            <AnimatePresence>
              {nextSpell && (
                <div key={nextSpell._id} className="absolute inset-0">
                  <SwipeCard spell={nextSpell} onSwipe={() => {}} isLast={false} actionLabel="Memorize" />
                </div>
              )}
              <div key={currentSpell._id} className="absolute inset-0">
                <SwipeCard spell={currentSpell} onSwipe={handleSwipe} isLast={true} actionLabel="Memorize" />
              </div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-4 max-w-sm mx-auto">
            <button
              onClick={() => handleSwipe('left')}
              className="btn btn-secondary rounded-full p-4 shadow-lg"
            >
              <X size={28} className="text-red-500" />
            </button>
            <button
              onClick={() => handleSwipe('right')}
              className="btn btn-secondary rounded-full p-4 shadow-lg"
            >
              <Check size={28} className="text-green-500" />
            </button>
          </div>
          <p className="text-center text-xs text-parchment-500 font-body">
            Swipe right to memorize, left to skip. {availableSpells.length - currentIndex - 1} remaining.
          </p>
        </>
      ) : (
        <div className="text-center py-12 space-y-4">
          <p className="text-parchment-600 font-body text-lg italic">All spells reviewed!</p>
          <p className="text-sm text-parchment-500 font-body">{memorized.length} spell(s) selected for memorization.</p>
          <button onClick={handleSave} className="btn btn-primary flex items-center gap-2 mx-auto">
            <Brain size={18} /> Memorize Selected Spells
          </button>
          <Link to={`/characters/${id}`} className="btn btn-secondary block mx-auto w-fit">Cancel</Link>
        </div>
      )}
    </div>
  );
}
