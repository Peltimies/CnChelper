import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Treasure } from '../types';
import { Search, ChevronRight } from 'lucide-react';

export default function Treasures() {
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchTreasures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const data = await api.get<{ treasures: Treasure[] }>(`/treasures?${params.toString()}`);
      setTreasures(data.treasures);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTreasures();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchTreasures, 300);
    return () => clearTimeout(timeout);
  }, [search, categoryFilter]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif font-bold text-parchment-900">Treasures</h2>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search treasures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          className="input w-40"
          placeholder="Category..."
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-parchment-600 text-center py-8 font-body italic">Loading...</p>
      ) : treasures.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-parchment-600 font-body text-lg italic">No treasures found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {treasures.map((treasure) => (
            <div
              key={treasure._id}
              className="card"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif font-bold text-lg text-parchment-900">{treasure.name}</h3>
                  <p className="text-xs text-parchment-500 font-body">{treasure.category}</p>
                </div>
                <ChevronRight className="text-arcane-400 flex-shrink-0" />
              </div>
              {treasure.description && (
                <p className="text-sm text-parchment-700 font-body mt-2 whitespace-pre-wrap">{treasure.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
