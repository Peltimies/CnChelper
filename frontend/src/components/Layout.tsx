import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { ScrollText, Swords, Users, LogOut, Menu, Sparkles, Gem } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/characters', label: 'Characters', icon: Users },
    { path: '/spells', label: 'Spells', icon: Sparkles },
    { path: '/bestiary', label: 'Bestiary', icon: ScrollText },
    { path: '/treasures', label: 'Treasures', icon: Gem },
    { path: '/combat', label: 'Combat', icon: Swords },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-arcane-900 via-arcane-800 to-arcane-900 text-white shadow-lg sticky top-0 z-10 border-b-2 border-parchment-400/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1 hover:text-parchment-300"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-serif font-bold tracking-wide">C&amp;C Helper</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-parchment-300 font-body italic hidden sm:inline">{user?.displayName}</span>
            <button onClick={handleLogout} className="p-1 hover:text-parchment-300 transition-colors" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        <nav className={`md:block ${menuOpen ? 'block' : 'hidden'}`}>
          <div className="max-w-4xl mx-auto px-4 pb-3 flex flex-col md:flex-row gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`nav-link ${isActive(item.path) ? 'nav-link-active' : 'nav-link-inactive'}`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6"><Outlet /></main>
    </div>
  );
}
