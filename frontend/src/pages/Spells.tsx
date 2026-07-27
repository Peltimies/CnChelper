import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Spell } from '../types';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import SpellDescription from '../components/SpellDescription';

export default function Spells() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSpells = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (classFilter) params.set('class', classFilter);
      if (levelFilter) params.set('level', levelFilter);
      const data = await api.get<{ spells: Spell[] }>(`/spells?${params}`);
      setSpells(data.spells);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(fetchSpells, 300);
    return () => clearTimeout(timeout);
  }, [search, classFilter, levelFilter]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif font-bold text-parchment-900">Spell Library</h2>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search spells..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-32"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All Classes</option>
          <option value="wizard">Wizard</option>
          <option value="illusionist">Illusionist</option>
          <option value="cleric">Cleric</option>
          <option value="druid">Druid</option>
          <option value="bard">Bard</option>
          <option value="knight">Knight</option>
          <option value="paladin">Paladin</option>
          <option value="ranger">Ranger</option>
          <option value="assassin">Assassin</option>
        </select>
        <select
          className="input w-24"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="">All Lv</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
            <option key={l} value={l}>Lv {l}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-parchment-600 text-center py-8 font-body italic">Loading...</p>
      ) : spells.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-parchment-600 font-body text-lg italic">No spells found.</p>
          <p className="text-parchment-500 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-parchment-500 font-body">{spells.length} spells</p>
          {spells.map((spell) => {
            const isExpanded = expandedId === spell._id;
            return (
              <div
                key={spell._id}
                className="card cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setExpandedId(isExpanded ? null : spell._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-serif font-bold text-lg text-arcane-800">
                      {spell.name}
                      {spell.reversible && <span className="text-parchment-500 ml-1">*</span>}
                    </h3>
                    <p className="text-sm text-arcane-600 font-body">
                      Level {spell.level} — {spell.classes.join(', ')}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="text-parchment-400 shrink-0" size={20} />
                  ) : (
                    <ChevronDown className="text-parchment-400 shrink-0" size={20} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-parchment-700 mt-3 bg-parchment-100/60 rounded-lg p-2">
                  <div><span className="font-serif font-semibold text-parchment-800">CT:</span> {spell.castingTime}</div>
                  <div><span className="font-serif font-semibold text-parchment-800">Range:</span> {spell.range}</div>
                  <div><span className="font-serif font-semibold text-parchment-800">Duration:</span> {spell.duration}</div>
                  <div><span className="font-serif font-semibold text-parchment-800">Save:</span> {spell.savingThrow}</div>
                  <div><span className="font-serif font-semibold text-parchment-800">SR:</span> {spell.spellResistance}</div>
                  <div><span className="font-serif font-semibold text-parchment-800">Comp:</span> {spell.components}</div>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-parchment-300/60 pt-3">
                    <SpellDescription text={spell.description} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
