import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Badge, Child, ChildInput, Family } from '../lib/types';
import { useAuth } from './AuthContext';

interface FamilyContextValue {
  family: Family | null;
  children: Child[];
  loading: boolean;
  refresh: () => Promise<void>;
  createChild: (input: ChildInput) => Promise<Child>;
  updateChild: (id: string, input: Partial<ChildInput>) => Promise<Child>;
  archiveChild: (id: string) => Promise<void>;
  awardBadge: (childId: string, badge: Badge) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export function FamilyProvider({ children: reactChildren }: { children: ReactNode }) {
  const { session } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFamily = useCallback(async (userId: string): Promise<Family | null> => {
    const { data: existing } = await supabase
      .from('families')
      .select('*')
      .eq('parent_user_id', userId)
      .maybeSingle();
    if (existing) return existing as Family;

    const { data: created, error } = await supabase
      .from('families')
      .insert({ parent_user_id: userId, parent_name: '' })
      .select()
      .maybeSingle();
    if (error) {
      console.error('Failed to create family', error);
      return null;
    }
    return created as Family;
  }, []);

  const loadChildren = useCallback(async (familyId: string) => {
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });
    setChildren((data ?? []) as Child[]);
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setFamily(null);
      setChildren([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fam = await loadFamily(session.user.id);
    setFamily(fam);
    if (fam) await loadChildren(fam.id);
    setLoading(false);
  }, [session, loadFamily, loadChildren]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createChild = async (input: ChildInput): Promise<Child> => {
    let fam = family;
    if (!fam && session?.user) {
      fam = await loadFamily(session.user.id);
      if (fam) setFamily(fam);
    }
    if (!fam) throw new Error('Family not ready. Please try again.');
    const { data, error } = await supabase
      .from('children')
      .insert({ ...input, family_id: fam.id })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Child was created but could not be read back.');
    setChildren((prev) => [...prev, data as Child]);
    return data as Child;
  };

  const updateChild = async (id: string, input: Partial<ChildInput>): Promise<Child> => {
    const { data, error } = await supabase
      .from('children')
      .update(input)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not update child.');
    setChildren((prev) => prev.map((c) => (c.id === id ? (data as Child) : c)));
    return data as Child;
  };

  const archiveChild = async (id: string) => {
    const { error } = await supabase.from('children').update({ is_archived: true }).eq('id', id);
    if (error) throw new Error(error.message);
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const awardBadge = async (childId: string, badge: Badge) => {
    const child = children.find((c) => c.id === childId);
    if (!child) return;
    const alreadyHas = child.badges.some(
      (b) => b.type === badge.type && b.chore_id === badge.chore_id,
    );
    if (alreadyHas) return;
    const newBadges = [...child.badges, badge];
    const { data, error } = await supabase
      .from('children')
      .update({ badges: newBadges })
      .eq('id', childId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) setChildren((prev) => prev.map((c) => (c.id === childId ? (data as Child) : c)));
  };

  return (
    <FamilyContext.Provider
      value={{ family, children, loading, refresh, createChild, updateChild, archiveChild, awardBadge }}
    >
      {reactChildren}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used inside FamilyProvider');
  return ctx;
}
