import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Monster } from '../types';
import { Search, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';

export default function Bestiary() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'hd' | 'ac' | 'xp'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  const fetchMonsters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const data = await api.get<{ monsters: Monster[] }>(`/monsters?${params}`);
      setMonsters(data.monsters);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const parseHD = (hd: string): number => {
    const s = hd.trim();
    const parenMatch = s.match(/^(\d+)\s*\(/);
    if (parenMatch) return parseInt(parenMatch[1]);
    const modMatch = s.match(/^(\d+)([+-]\d+)$/);
    if (modMatch) return parseInt(modMatch[1]) + parseInt(modMatch[2]);
    const numMatch = s.match(/^(\d+)/);
    if (numMatch) return parseInt(numMatch[1]);
    return 0;
  };

  const sortedMonsters = [...monsters].sort((a, b) => {
    let aVal: string | number, bVal: string | number;
    switch (sortBy) {
      case 'name': aVal = a.name; bVal = b.name; break;
      case 'type': aVal = a.type || ''; bVal = b.type || ''; break;
      case 'hd': aVal = parseHD(a.hd); bVal = parseHD(b.hd); break;
      case 'ac': aVal = a.ac || ''; bVal = b.ac || ''; break;
      case 'xp': aVal = a.xp || ''; bVal = b.xp || ''; break;
      default: aVal = a.name; bVal = b.name;
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc' 
      ? String(aVal).localeCompare(String(bVal)) 
      : String(bVal).localeCompare(String(aVal));
  });

  useEffect(() => {
    const timeout = setTimeout(fetchMonsters, 300);
    return () => clearTimeout(timeout);
  }, [search, typeFilter]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif font-bold text-parchment-900">Bestiary</h2>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search monsters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          className="input w-32"
          placeholder="Type..."
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
        <select className="input w-32" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="name">Name</option>
          <option value="type">Type</option>
          <option value="hd">HD</option>
          <option value="ac">AC</option>
          <option value="xp">XP</option>
        </select>
        <button
          className="btn btn-secondary px-3"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          title={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
        >
          {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>
      </div>

      {loading ? (
        <p className="text-parchment-600 text-center py-8 font-body italic">Loading...</p>
      ) : monsters.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-parchment-600 font-body text-lg italic">No monsters found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMonsters.map((monster) => (
            <Link
              key={monster._id}
              to={`/bestiary/${monster._id}`}
              className="card flex items-center justify-between hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div>
                <h3 className="font-serif font-bold text-lg text-parchment-900">{monster.name}</h3>
                <p className="text-xs text-parchment-500 font-body">
                  {monster.type} | HD {monster.hd} | AC {monster.ac} | XP {monster.xp}
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
