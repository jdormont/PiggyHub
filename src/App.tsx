import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyProvider } from './context/FamilyContext';
import { ChoresProvider } from './context/ChoresContext';
import { GoalsProvider } from './context/GoalsContext';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { ChildDetail } from './pages/ChildDetail';
import { KidView } from './pages/KidView';

type View =
  | { name: 'dashboard' }
  | { name: 'child'; id: string }
  | { name: 'kid'; id: string };

function AppInner() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<View>({ name: 'dashboard' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <FamilyProvider>
      <ChoresProvider>
      <GoalsProvider>
      {view.name === 'dashboard' && (
        <Dashboard
          onOpenChild={(id) => setView({ name: 'child', id })}
          onOpenKidView={(id) => setView({ name: 'kid', id })}
        />
      )}
      {view.name === 'child' && (
        <ChildDetail
          childId={view.id}
          onBack={() => setView({ name: 'dashboard' })}
          onKidView={() => setView({ name: 'kid', id: view.id })}
        />
      )}
      {view.name === 'kid' && (
        <KidView
          childId={view.id}
          onBack={() => setView({ name: 'child', id: view.id })}
        />
      )}
      </GoalsProvider>
      </ChoresProvider>
    </FamilyProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
