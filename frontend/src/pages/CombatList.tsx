import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { CombatSession } from '../types';
import { Plus, Swords, ChevronRight, Trash2 } from 'lucide-react';

export default function CombatList() {
  const [sessions, setSessions] = useState<CombatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ sessions: CombatSession[] }>('/combat');
      setSessions(data.sessions);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/combat', { name: newName });
      setNewName('');
      setShowCreate(false);
      fetchSessions();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this combat session?')) return;
    try {
      await api.delete(`/combat/${id}`);
      fetchSessions();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-parchment-900 flex items-center gap-2">
          <Swords size={24} /> Combat Sessions
        </h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary flex items-center gap-1">
          <Plus size={18} /> New
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card flex gap-2">
          <input
            className="input flex-1"
            placeholder="Session name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      {loading ? (
        <p className="text-parchment-600 text-center py-8 font-body italic">Loading...</p>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-parchment-600 font-body text-lg italic">No combat sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session._id} className="card flex items-center justify-between">
              <Link to={`/combat/${session._id}`} className="flex-1 flex items-center justify-between hover:shadow-lg transition-all rounded-xl">
                <div>
                  <h3 className="font-serif font-bold text-lg text-parchment-900">{session.name}</h3>
                  <p className="text-xs text-parchment-500 font-body">
                    {session.combatants.length} combatants | Round {session.round} | {session.isActive ? 'Active' : 'Ended'}
                  </p>
                </div>
                <ChevronRight className="text-arcane-400" />
              </Link>
              <button onClick={() => handleDelete(session._id)} className="btn btn-danger p-2 ml-2">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
