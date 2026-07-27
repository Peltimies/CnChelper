import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Monster } from '../types';
import { ChevronLeft, Plus } from 'lucide-react';
import SpellDescription from '../components/SpellDescription';

export default function MonsterDetail() {
  const { id } = useParams();
  const [monster, setMonster] = useState<Monster | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<{ monster: Monster }>(`/monsters/${id}`);
        setMonster(data.monster);
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <p className="text-parchment-600">Loading...</p>;
  if (!monster) return <p className="text-parchment-600">Monster not found</p>;

  const statFields = [
    { label: 'No. Encountered', value: monster.noEncountered },
    { label: 'Size', value: monster.size },
    { label: 'HD', value: monster.hd },
    { label: 'HP', value: monster.hp },
    { label: 'Move', value: monster.move },
    { label: 'AC', value: monster.ac },
    { label: 'Attacks', value: monster.attacks },
    { label: 'Special', value: monster.special },
    { label: 'Saves', value: monster.saves },
    { label: 'Intelligence', value: monster.intelligence },
    { label: 'Alignment', value: monster.alignment },
    { label: 'Type', value: monster.type },
    { label: 'Treasure', value: monster.treasure },
    { label: 'XP', value: monster.xp },
  ];

  return (
    <div className="space-y-4">
      <Link to="/bestiary" className="btn btn-secondary text-sm flex items-center gap-1 w-fit">
        <ChevronLeft size={16} /> Back to Bestiary
      </Link>

      <div className="card">
        <h2 className="text-2xl font-serif font-bold text-parchment-900 mb-4">{monster.name}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm font-body">
          {statFields.filter((f) => f.value).map((field) => (
            <div key={field.label}>
              <span className="font-serif font-semibold text-parchment-500">{field.label}:</span>{' '}
              <span className="text-parchment-800">{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      {monster.description && (
        <div className="card">
          <h3 className="font-serif font-semibold text-arcane-800 text-lg mb-2">Description</h3>
          <SpellDescription text={monster.description} />
        </div>
      )}

      {monster.combat && (
        <div className="card">
          <h3 className="font-serif font-semibold text-arcane-800 text-lg mb-2">Combat</h3>
          <SpellDescription text={monster.combat} />
        </div>
      )}

      <Link
        to="/combat"
        className="btn btn-primary flex items-center gap-2 w-fit"
      >
        <Plus size={18} /> Start Combat with this Monster
      </Link>
    </div>
  );
}
