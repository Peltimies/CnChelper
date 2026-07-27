import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { MishapEntry } from '../types';
import { Plus, Trash2, Dice5, Save } from 'lucide-react';

export default function MishapTable() {
  const { id } = useParams();
  const [entries, setEntries] = useState<MishapEntry[]>([]);
  const [rollResult, setRollResult] = useState<{ roll: number; description: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ entries: MishapEntry[] }>('/mishap');
      setEntries(data.entries);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleRoll = async () => {
    try {
      const data = await api.post<{ roll: number; description: string }>('/mishap/roll');
      setRollResult(data);
    } catch {
      // ignore
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put('/mishap', { entries: entries.map((e) => ({ roll: e.roll, description: e.description })) });
    } catch {
      // ignore
    }
    setSaving(false);
  };

  const handleAdd = () => {
    const maxRoll = entries.reduce((max, e) => Math.max(max, e.roll), 0);
    setEntries([...entries, { _id: `temp-${Date.now()}`, roll: maxRoll + 1, description: '' }]);
  };

  const handleRemove = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: 'roll' | 'description', value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: field === 'roll' ? parseInt(value) || 1 : value };
    setEntries(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to={id ? `/characters/${id}` : '/characters'} className="btn btn-secondary text-sm">
          Back
        </Link>
        <h2 className="text-xl font-serif font-bold text-parchment-900">Mishap Table</h2>
        <div className="w-20" />
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-parchment-600 font-body">Roll on the mishap table (d20)</p>
          {rollResult && (
            <p className="mt-2 text-sm font-body">
              <span className="font-serif font-bold text-red-600">Roll: {rollResult.roll}</span> — {rollResult.description}
            </p>
          )}
        </div>
        <button onClick={handleRoll} className="btn btn-primary flex items-center gap-2">
          <Dice5 size={20} /> Roll
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-parchment-600 font-body italic">Loading...</p>
        ) : (
          <>
            {entries.map((entry, index) => (
              <div key={entry._id} className="card flex items-center gap-2">
                <input
                  className="input w-16 text-center font-serif"
                  type="number"
                  min={1}
                  max={20}
                  value={entry.roll}
                  onChange={(e) => handleChange(index, 'roll', e.target.value)}
                />
                <input
                  className="input flex-1 font-body"
                  value={entry.description}
                  onChange={(e) => handleChange(index, 'description', e.target.value)}
                  placeholder="Mishap effect..."
                />
                <button onClick={() => handleRemove(index)} className="btn btn-danger p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn btn-secondary flex items-center gap-1">
                <Plus size={18} /> Add Entry
              </button>
              <button onClick={handleUpdate} disabled={saving} className="btn btn-primary flex items-center gap-1">
                <Save size={18} /> {saving ? 'Saving...' : 'Save Table'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
