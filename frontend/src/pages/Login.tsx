import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/characters');
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-arcane-950 via-arcane-900 to-arcane-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-serif font-bold text-parchment-100 tracking-wide drop-shadow-lg">
            C&amp;C Helper
          </h1>
          <p className="text-parchment-300 text-sm mt-1 italic font-body">
            Castles &amp; Crusades Companion
          </p>
        </div>
        <div className="card w-full">
          <h2 className="text-xl font-serif font-semibold text-arcane-800 mb-4 text-center">Welcome Back</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm cursor-pointer" onClick={clearError}>
                {error}
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Logging in...' : 'Enter the Realm'}
            </button>
            <p className="text-center text-sm text-parchment-600 font-body">
              No account? <Link to="/register" className="text-arcane-600 hover:underline font-semibold">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
