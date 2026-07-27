import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Character } from '../types';
import { BookOpen, Brain, Moon, Zap, Trash2, TrendingUp, Plus } from 'lucide-react';
import { isCharacterSpellcaster, getXpForLevel, getBth, canLevelUp } from '../data/classData';

export default function CharacterSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [mishapResult, setMishapResult] = useState<{ spellName: string; roll: number; description: string } | null>(null);
  const [processingSpell, setProcessingSpell] = useState<string | null>(null);
  const [xpInput, setXpInput] = useState('');
  const [levelingUp, setLevelingUp] = useState(false);
  const [levelUpResult, setLevelUpResult] = useState<string | null>(null);

  const fetchCharacter = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ character: Character }>(`/characters/${id}`);
      setCharacter(data.character);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharacter();
  }, [id]);

  const handleSpellLost = async (spellId: string) => {
    setProcessingSpell(spellId);
    try {
      const data = await api.post<{ character: Character }>(`/characters/${id}/spell-lost`, { spellId });
      setCharacter(data.character);
    } catch {
      // ignore
    }
    setProcessingSpell(null);
  };

  const handleMishap = async (spellId: string, spellName: string) => {
    setProcessingSpell(spellId);
    try {
      const data = await api.post<{ character: Character; mishap: { roll: number; description: string } }>(`/characters/${id}/spell-mishap`, { spellId });
      setCharacter(data.character);
      setMishapResult({ spellName, roll: data.mishap.roll, description: data.mishap.description });
    } catch {
      // ignore
    }
    setProcessingSpell(null);
  };

  const handleRest = async () => {
    try {
      const data = await api.post<{ character: Character }>(`/characters/${id}/rest`);
      setCharacter(data.character);
      setMishapResult(null);
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this character?')) return;
    try {
      await api.delete(`/characters/${id}`);
      navigate('/characters');
    } catch {
      // ignore
    }
  };

  const handleAddXp = async () => {
    const amount = parseInt(xpInput, 10);
    if (isNaN(amount) || amount <= 0) return;
    try {
      const data = await api.post<{ character: Character }>(`/characters/${id}/add-xp`, { amount });
      setCharacter(data.character);
      setXpInput('');
    } catch {
      // ignore
    }
  };

  const handleLevelUp = async () => {
    if (!character) return;
    setLevelingUp(true);
    setLevelUpResult(null);
    try {
      const data = await api.post<{ character: Character }>(`/characters/${id}/level-up`, { xp: character.xp });
      setCharacter(data.character);
      const newLevel = data.character.classes[0]?.level || 0;
      const hpGain = data.character.maxHp - character.maxHp;
      setLevelUpResult(`Level ${newLevel}! Gained ${hpGain} HP.`);
    } catch {
      // ignore
    }
    setLevelingUp(false);
  };

  if (loading) return <p className="text-parchment-600">Loading...</p>;
  if (!character) return <p className="text-parchment-600">Character not found</p>;

  const attrMod = (score: number) => Math.floor((score - 10) / 2);
  const charLevel = character.classes.reduce((sum, c) => sum + (c.isHalfClass ? Math.floor(c.level / 2) : c.level), 0);
  const canCast = isCharacterSpellcaster(character.classes);
  const className = character.classes[0]?.name || 'Fighter';
  const bth = getBth(className, charLevel);
  const nextLevelXp = getXpForLevel(className, charLevel + 1);
  const readyToLevel = canLevelUp(className, charLevel, character.xp);
  const allPrimes = [character.primaryAttribute, ...character.secondaryPrimaryAttributes];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-parchment-900">{character.name}</h2>
          <p className="text-parchment-600 font-body">
            {character.race} {character.classes.map((c) => `${c.name} ${c.level}${c.isHalfClass ? ' (half)' : ''}`).join(' / ')}
          </p>
        </div>
        <button onClick={handleDelete} className="btn btn-danger flex items-center gap-1">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="card">
        <h3 className="font-serif font-semibold text-arcane-800 text-lg mb-3">Attributes</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['str', 'int', 'wis', 'dex', 'con', 'cha'] as const).map((attr) => (
            <div key={attr} className="text-center bg-parchment-100/60 rounded-lg py-2">
              <p className="text-xs uppercase text-parchment-500 font-serif">{attr}</p>
              <p className="text-lg font-serif font-bold text-parchment-900">{character.attributes[attr]}</p>
              <p className="text-xs text-parchment-500 font-body">
                {attrMod(character.attributes[attr]) >= 0 ? '+' : ''}{attrMod(character.attributes[attr])}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-parchment-300/60 space-y-1">
          <p className="text-sm font-body">
            <span className="font-serif font-semibold text-parchment-800">Race:</span> {character.race}
          </p>
          <p className="text-sm font-body">
            <span className="font-serif font-semibold text-parchment-800">Primary Attributes:</span> {allPrimes.map((p) => p.toUpperCase()).join(', ')}
          </p>
          <p className="text-sm font-body">
            <span className="font-serif font-semibold text-parchment-800">Level:</span> {charLevel} | <span className="font-serif font-semibold text-parchment-800">BtH:</span> +{bth}
          </p>
          <p className="text-sm font-body">
            <span className="font-serif font-semibold text-parchment-800">HP:</span> {character.hp} / {character.maxHp}
          </p>
          <p className="text-sm font-body">
            <span className="font-serif font-semibold text-parchment-800">XP:</span> {character.xp.toLocaleString()} / {nextLevelXp.toLocaleString()}
            {readyToLevel && <span className="text-green-600 font-semibold ml-2">Ready to level up!</span>}
          </p>
        </div>
      </div>

      <div className="card flex items-center gap-2">
        <input
          className="input flex-1"
          type="number"
          placeholder="Add XP..."
          value={xpInput}
          onChange={(e) => setXpInput(e.target.value)}
        />
        <button onClick={handleAddXp} className="btn btn-secondary flex items-center gap-1" disabled={!xpInput}>
          <Plus size={16} /> Add XP
        </button>
        <button
          onClick={handleLevelUp}
          className="btn btn-primary flex items-center gap-1"
          disabled={!readyToLevel || levelingUp}
        >
          <TrendingUp size={16} /> Level Up
        </button>
      </div>

      {levelUpResult && (
        <div className="card border-2 border-green-500">
          <p className="font-serif font-bold text-green-700 text-lg">{levelUpResult}</p>
          {canCast && <p className="text-sm text-parchment-600 mt-1">Visit Learn Spells to pick up new spells for your new level.</p>}
        </div>
      )}

      {canCast && (
        <div className="flex gap-2 flex-wrap">
          <Link to={`/characters/${id}/spells`} className="btn btn-primary flex items-center gap-1">
            <BookOpen size={18} /> Spell Deck
          </Link>
          <Link to={`/characters/${id}/spells/learn`} className="btn btn-secondary flex items-center gap-1">
            <Zap size={18} /> Learn Spells
          </Link>
          <Link to={`/characters/${id}/spells/memorize`} className="btn btn-secondary flex items-center gap-1">
            <Brain size={18} /> Memorize
          </Link>
          <Link to={`/characters/${id}/mishap`} className="btn btn-secondary flex items-center gap-1">
            <Zap size={18} /> Mishap Table
          </Link>
          <button onClick={handleRest} className="btn btn-secondary flex items-center gap-1">
            <Moon size={18} /> Rest
          </button>
        </div>
      )}

      {mishapResult && (
        <div className="card border-2 border-red-500">
          <h3 className="font-serif font-bold text-red-700 text-lg mb-1">Mishap! — {mishapResult.spellName}</h3>
          <p className="text-sm font-body">
            <span className="font-serif font-bold">Roll: {mishapResult.roll}</span> — {mishapResult.description}
          </p>
        </div>
      )}

      {canCast && (
        <div>
          <h3 className="font-serif font-semibold text-arcane-800 text-lg mb-3">Memorized Spells ({character.memorizedSpells.length})</h3>
          {character.memorizedSpells.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-parchment-600 font-body italic">No spells memorized.</p>
              <p className="text-parchment-500 text-sm mt-1">Rest and memorize spells to cast.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {character.memorizedSpells.map((spell) => (
                <div key={spell._id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-serif font-semibold text-parchment-900">{spell.name}</p>
                    <p className="text-xs text-parchment-500 font-body">Level {spell.level} | CT {spell.castingTime} | R {spell.range} | D {spell.duration}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSpellLost(spell._id)}
                      disabled={processingSpell === spell._id}
                      className="btn btn-secondary text-sm"
                    >
                      Lost
                    </button>
                    <button
                      onClick={() => handleMishap(spell._id, spell.name)}
                      disabled={processingSpell === spell._id}
                      className="btn btn-danger text-sm"
                    >
                      Mishap!
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canCast && character.lostSpells.length > 0 && (
        <div>
          <h3 className="font-serif font-semibold text-parchment-500 text-lg mb-3">Lost Spells ({character.lostSpells.length})</h3>
          <div className="space-y-2">
            {character.lostSpells.map((spell) => (
              <div key={spell._id} className="card opacity-50">
                <p className="font-serif font-medium text-parchment-700 line-through">{spell.name}</p>
                <p className="text-xs text-parchment-500 font-body">Lost until next rest</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
