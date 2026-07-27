import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Characters from './pages/Characters';
import CharacterSheet from './pages/CharacterSheet';
import Spells from './pages/Spells';
import SpellDeck from './pages/SpellDeck';
import LearnSpells from './pages/LearnSpells';
import MemorizeSpells from './pages/MemorizeSpells';
import Bestiary from './pages/Bestiary';
import MonsterDetail from './pages/MonsterDetail';
import CombatList from './pages/CombatList';
import CombatTracker from './pages/CombatTracker';
import MishapTable from './pages/MishapTable';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token, fetchMe]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="characters" element={<Characters />} />
        <Route path="characters/:id" element={<CharacterSheet />} />
        <Route path="characters/:id/spells" element={<SpellDeck />} />
        <Route path="characters/:id/spells/learn" element={<LearnSpells />} />
        <Route path="characters/:id/spells/memorize" element={<MemorizeSpells />} />
        <Route path="characters/:id/mishap" element={<MishapTable />} />
        <Route path="spells" element={<Spells />} />
        <Route path="bestiary" element={<Bestiary />} />
        <Route path="bestiary/:id" element={<MonsterDetail />} />
        <Route path="combat" element={<CombatList />} />
        <Route path="combat/:id" element={<CombatTracker />} />
        <Route path="" element={<Navigate to="/characters" />} />
      </Route>
    </Routes>
  );
}
