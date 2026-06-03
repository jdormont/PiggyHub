/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FamilyProvider, useFamily } from '../context/FamilyContext';
import { ChoresProvider, useChores } from '../context/ChoresContext';
import { GoalsProvider, useGoals } from '../context/GoalsContext';

// ── Supabase In-Memory Mock DB ───────────────────────────────────────

let mockSession: any = null;
let mockTables: Record<string, any[]> = {
  families: [],
  children: [],
  chores: [],
  chore_completions: [],
  transactions: [],
  goals: [],
  goal_contributions: [],
};

const resetMockDb = () => {
  mockSession = null;
  mockTables = {
    families: [],
    children: [],
    chores: [],
    chore_completions: [],
    transactions: [],
    goals: [],
    goal_contributions: [],
  };
};

class MockBuilder {
  constructor(private table: string) {}

  select(_fields?: string) {
    return this;
  }

  insert(data: any) {
    const rows = Array.isArray(data) ? data : [data];
    const inserted = rows.map((r) => {
      const row = {
        id: r.id || `${this.table}-${Math.random().toString(36).substring(2, 9)}`,
        created_at: new Date().toISOString(),
        ...r,
      };
      mockTables[this.table].push(row);
      return row;
    });
    return new MockQueryPromise(Array.isArray(data) ? inserted : inserted[0]);
  }

  update(data: any) {
    return new MockUpdateBuilder(this.table, data);
  }

  delete() {
    return new MockDeleteBuilder(this.table);
  }

  eq(col: string, val: any) {
    return new MockFilterBuilder(this.table, [[col, 'eq', val]]);
  }

  in(col: string, vals: any[]) {
    return new MockFilterBuilder(this.table, [[col, 'in', vals]]);
  }

  order(_col: string, _opts?: any) {
    return this;
  }

  limit(_num: number) {
    return this;
  }
}

class MockUpdateBuilder {
  private filters: any[] = [];
  constructor(private table: string, private data: any) {}

  eq(col: string, val: any) {
    this.filters.push([col, 'eq', val]);
    return this;
  }

  select() {
    return this;
  }

  maybeSingle() {
    const rows = mockTables[this.table];
    const match = rows.find((r) => {
      return this.filters.every(([c, _, v]) => r[c] === v);
    });
    if (match) {
      Object.assign(match, this.data);
    }
    return Promise.resolve({ data: match || null, error: null });
  }
}

class MockDeleteBuilder {
  private filters: any[] = [];
  constructor(private table: string) {}

  eq(col: string, val: any) {
    this.filters.push([col, 'eq', val]);
    return this;
  }

  then(resolve: any) {
    mockTables[this.table] = mockTables[this.table].filter((r) => {
      const match = this.filters.every(([c, _, v]) => r[c] === v);
      return !match;
    });
    return Promise.resolve({ error: null }).then(resolve);
  }
}

class MockFilterBuilder {
  constructor(private table: string, private filters: any[][]) {}

  eq(col: string, val: any) {
    this.filters.push([col, 'eq', val]);
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push([col, 'in', vals]);
    return this;
  }

  order(_col: string, _opts?: any) {
    return this;
  }

  limit(_num: number) {
    return this;
  }

  maybeSingle() {
    const rows = mockTables[this.table];
    const match = rows.find((r) => {
      return this.filters.every(([c, op, v]) => {
        if (op === 'eq') return r[c] === v;
        if (op === 'in') return v.includes(r[c]);
        return false;
      });
    });
    return Promise.resolve({ data: match || null, error: null });
  }

  then(resolve: any) {
    const result = mockTables[this.table].filter((r) => {
      return this.filters.every(([c, op, v]) => {
        if (op === 'eq') return r[c] === v;
        if (op === 'in') return v.includes(r[c]);
        return false;
      });
    });
    return Promise.resolve({ data: result, error: null }).then(resolve);
  }
}

class MockQueryPromise {
  constructor(private data: any) {}

  select() {
    return this;
  }

  maybeSingle() {
    return Promise.resolve({ data: this.data, error: null });
  }

  then(resolve: any) {
    return Promise.resolve({ data: this.data, error: null }).then(resolve);
  }
}

const authListeners = new Set<any>();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => new MockBuilder(table)),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: mockSession }, error: null })),
      onAuthStateChange: vi.fn((cb) => {
        authListeners.add(cb);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
      }),
      signInWithPassword: vi.fn(({ email }) => {
        mockSession = { user: { id: 'parent-123', email }, id: 'sess-123' };
        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));
        return Promise.resolve({ data: { session: mockSession }, error: null });
      }),
      signUp: vi.fn(({ email }) => {
        mockSession = { user: { id: 'parent-123', email }, id: 'sess-123' };
        authListeners.forEach((cb) => cb('SIGNED_IN', mockSession));
        return Promise.resolve({ data: { session: mockSession }, error: null });
      }),
      signOut: vi.fn(() => {
        mockSession = null;
        authListeners.forEach((cb) => cb('SIGNED_OUT', null));
        return Promise.resolve({ error: null });
      }),
    },
  },
}));

// ── Test Flow Application ───────────────────────────────────────────

function TestFlowApp() {
  const { session, signIn, signOut } = useAuth();
  const { family, children, createChild } = useFamily();
  const { chores, completions, createChore, markDone, approveCompletion, balancesByChild } = useChores();
  const { goals, createGoal, contribute, progressById } = useGoals();

  const handleSignIn = async () => {
    await signIn('parent@test.com', 'password');
  };

  const handleCreateChild = async () => {
    await createChild({
      name: 'Timmy',
      avatar: '👦',
      dob: null,
      split_spend: 50,
      split_save: 30,
      split_give: 20,
      allowance_amount: 5,
      allowance_frequency: 'weekly',
      allowance_next_date: null,
      savings_match_rate: 0,
    });
  };

  return (
    <div>
      <div data-testid="auth-state">{session ? `authenticated:${session.user.id}` : 'unauthenticated'}</div>
      <div data-testid="family-state">{family ? `family:${family.id}` : 'no-family'}</div>
      <div data-testid="children-count">{children.length}</div>
      <div data-testid="chores-count">{chores.length}</div>
      <div data-testid="completions-count">{completions.length}</div>
      <div data-testid="goals-count">{goals.length}</div>

      <button onClick={handleSignIn} data-testid="btn-signin">Sign In</button>
      <button onClick={() => signOut()} data-testid="btn-signout">Sign Out</button>
      <button onClick={handleCreateChild} data-testid="btn-create-child">Create Child</button>

      {children.map((c) => (
        <div key={c.id} data-testid={`child-balances-${c.name}`}>
          Spend: {balancesByChild[c.id]?.spend ?? 0}, Save: {balancesByChild[c.id]?.save ?? 0}, Give: {balancesByChild[c.id]?.give ?? 0}
        </div>
      ))}

      {children[0] && (
        <button
          onClick={() =>
            createChore(children[0].id, {
              title: 'Mow Lawn',
              description: '',
              value: 10,
              frequency: 'weekly',
              due_date: null,
              day_of_week: null,
              is_milestone: false,
            })
          }
          data-testid="btn-create-chore"
        >
          Create Chore
        </button>
      )}

      {chores[0] && (
        <button onClick={() => markDone(chores[0])} data-testid="btn-mark-done">
          Mark Done
        </button>
      )}

      {completions[0] && completions[0].status === 'pending' && (
        <button onClick={() => approveCompletion(completions[0].id)} data-testid="btn-approve">
          Approve
        </button>
      )}

      {children[0] && (
        <button
          onClick={() =>
            createGoal(children[0].id, {
              title: 'Lego Set',
              target_amount: 50,
              target_date: null,
              emoji: '🧱',
              image_url: '',
            })
          }
          data-testid="btn-create-goal"
        >
          Create Goal
        </button>
      )}

      {goals[0] && children[0] && (
        <button onClick={() => contribute(goals[0].id, 2, 'save')} data-testid="btn-contribute">
          Contribute 2 Save
        </button>
      )}

      {goals[0] && (
        <div data-testid="goal-progress">
          Progress: {progressById[goals[0].id]?.contributed ?? 0}
        </div>
      )}
    </div>
  );
}

// ── Integration Tests ───────────────────────────────────────────────

describe('PiggyHub Integration Flow Tests', () => {
  beforeEach(() => {
    resetMockDb();
    vi.clearAllMocks();
  });

  it('runs the full parent & child flow end-to-end', async () => {
    render(
      <AuthProvider>
        <FamilyProvider>
          <ChoresProvider>
            <GoalsProvider>
              <TestFlowApp />
            </GoalsProvider>
          </ChoresProvider>
        </FamilyProvider>
      </AuthProvider>
    );

    // 1. Initial State
    expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('family-state')).toHaveTextContent('no-family');

    // 2. Sign In
    fireEvent.click(screen.getByTestId('btn-signin'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated:parent-123');
    });

    // 3. Family Load
    await waitFor(() => {
      expect(screen.getByTestId('family-state')).not.toHaveTextContent('no-family');
    });

    // 4. Create Child
    fireEvent.click(screen.getByTestId('btn-create-child'));
    await waitFor(() => {
      expect(screen.getByTestId('children-count')).toHaveTextContent('1');
    });
    expect(screen.getByTestId('child-balances-Timmy')).toHaveTextContent('Spend: 0, Save: 0, Give: 0');

    // 5. Create Chore
    fireEvent.click(screen.getByTestId('btn-create-chore'));
    await waitFor(() => {
      expect(screen.getByTestId('chores-count')).toHaveTextContent('1');
    });

    // 6. Child Marks Chore Done
    fireEvent.click(screen.getByTestId('btn-mark-done'));
    await waitFor(() => {
      expect(screen.getByTestId('completions-count')).toHaveTextContent('1');
    });

    // 7. Parent Approves Chore & Payout is credited (Split 50% spend / 30% save / 20% give)
    fireEvent.click(screen.getByTestId('btn-approve'));
    await waitFor(() => {
      expect(screen.getByTestId('child-balances-Timmy')).toHaveTextContent('Spend: 5, Save: 3, Give: 2');
    });

    // 8. Create Savings Goal
    fireEvent.click(screen.getByTestId('btn-create-goal'));
    await waitFor(() => {
      expect(screen.getByTestId('goals-count')).toHaveTextContent('1');
    });

    // 9. Child Contributes $2 from Save bucket to Lego Set goal
    fireEvent.click(screen.getByTestId('btn-contribute'));
    await waitFor(() => {
      expect(screen.getByTestId('goal-progress')).toHaveTextContent('Progress: 2');
    });

    // 10. Save balance is reduced by $2 (reduced to $1)
    await waitFor(() => {
      expect(screen.getByTestId('child-balances-Timmy')).toHaveTextContent('Spend: 5, Save: 1, Give: 2');
    });

    // 11. Sign Out
    fireEvent.click(screen.getByTestId('btn-signout'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
    });
  });
});
