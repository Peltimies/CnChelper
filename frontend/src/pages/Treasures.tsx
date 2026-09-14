import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Treasure } from '../types';
import { Search, ChevronRight, X } from 'lucide-react';

function formatDescription(text: string): React.ReactNode {
  if (!text) return null;

  const sections = text.split(/(?=^-\s|\n-\s)/m).filter(s => s.trim());

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (trimmed.startsWith('-')) {
          const [title, ...rest] = trimmed.substring(1).split(':');
          const content = rest.join(':').trim();
          return (
            <div key={idx} className="border-l-4 border-arcane-400 pl-3">
              <p className="font-serif font-semibold text-parchment-900 text-sm">{title.trim()}</p>
              {content && <p className="text-sm text-parchment-700 font-body mt-1">{content}</p>}
            </div>
          );
        }
        return (
          <p key={idx} className="text-sm text-parchment-700 font-body leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function Treasures() {
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedTreasure, setSelectedTreasure] = useState<Treasure | null>(null);

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
        <>
          <div className="space-y-2">
            {treasures.map((treasure) => (
              <button
                key={treasure._id}
                onClick={() => setSelectedTreasure(treasure)}
                className="card hover:shadow-lg transition-all hover:-translate-y-0.5 text-left w-full"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-parchment-900">{treasure.name}</h3>
                    <p className="text-xs text-parchment-500 font-body">{treasure.category}</p>
                  </div>
                  <ChevronRight className="text-arcane-400 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>

          {selectedTreasure && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-parchment-50 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-parchment-50 border-b border-parchment-200 p-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-parchment-900">{selectedTreasure.name}</h2>
                    <p className="text-sm text-parchment-500 font-body mt-1">{selectedTreasure.category}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTreasure(null)}
                    className="btn btn-secondary p-2 flex-shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {selectedTreasure.description && (
                    <div className="prose prose-sm max-w-none">
                      {formatDescription(selectedTreasure.description)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
