import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

vi.mock('../common/utils/crypto.js', () => ({
  hashPassword: vi.fn(async () => 'hashed-password'),
  verifyPassword: vi.fn(async () => true),
}));

const userRow = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'sam@example.com',
  name: 'Sam',
  passwordHash: 'hashed-password',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

const workspaceRow = {
  id: '22222222-2222-4222-8222-222222222222',
  name: "Sam's space",
  slug: 'personal-sam',
  kind: 'personal' as const,
  ownerUserId: userRow.id,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('AuthService.signup', () => {
  let authService: AuthService;
  let db: { transaction: ReturnType<typeof vi.fn> };
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    toDto: ReturnType<typeof vi.fn>;
  };
  let workspacesService: {
    createPersonalWorkspace: ReturnType<typeof vi.fn>;
    toDto: ReturnType<typeof vi.fn>;
  };
  let sessionService: { createSession: ReturnType<typeof vi.fn> };
  let notificationsService: { create: ReturnType<typeof vi.fn> };
  let committedUsers: typeof userRow[];
  let pendingUsers: typeof userRow[];

  function makeTx() {
    const selectBuilder = {
      from: vi.fn(() => selectBuilder),
      innerJoin: vi.fn(() => selectBuilder),
      where: vi.fn(async () => []),
    };
    return {
      tag: 'tx',
      select: vi.fn(() => selectBuilder),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => undefined),
        })),
      })),
    };
  }

  beforeEach(() => {
    committedUsers = [];
    pendingUsers = [];

    db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        try {
          const result = await fn(makeTx());
          committedUsers.push(...pendingUsers);
          pendingUsers = [];
          return result;
        } catch (error) {
          pendingUsers = [];
          throw error;
        }
      }),
    };

    usersService = {
      findByEmail: vi.fn(async () => undefined),
      create: vi.fn(async () => {
        pendingUsers.push(userRow);
        return userRow;
      }),
      toDto: vi.fn((user: typeof userRow) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      })),
    };

    workspacesService = {
      createPersonalWorkspace: vi.fn(async () => workspaceRow),
      toDto: vi.fn((workspace: typeof workspaceRow) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        kind: workspace.kind,
        ownerUserId: workspace.ownerUserId,
        createdAt: workspace.createdAt.toISOString(),
      })),
    };

    sessionService = {
      createSession: vi.fn(async () => 'session-token'),
    };

    notificationsService = {
      create: vi.fn(async () => ({ id: 'n1' })),
    };

    authService = new AuthService(
      db as never,
      usersService as never,
      sessionService as never,
      workspacesService as never,
      notificationsService as never,
    );
  });

  it('leaves no user row when workspace creation fails inside the transaction', async () => {
    workspacesService.createPersonalWorkspace.mockRejectedValue(new Error('workspace failed'));

    await expect(
      authService.signup({ email: 'sam@example.com', name: 'Sam', password: 'password123' }),
    ).rejects.toThrow('workspace failed');

    expect(usersService.create).toHaveBeenCalled();
    expect(committedUsers).toHaveLength(0);
    expect(sessionService.createSession).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('returns 409 when a concurrent signup hits the users.email unique constraint', async () => {
    const uniqueError = Object.assign(new Error('duplicate key value'), {
      code: '23505',
      constraint: 'users_email_unique',
      detail: 'Key (email)=(sam@example.com) already exists.',
    });
    usersService.create.mockRejectedValue(uniqueError);

    try {
      await authService.signup({ email: 'sam@example.com', name: 'Sam', password: 'password123' });
      expect.unreachable('signup should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as ConflictException).message).toBe('Email already registered');
    }

    expect(committedUsers).toHaveLength(0);
    expect(sessionService.createSession).not.toHaveBeenCalled();
  });

  it('creates the session only after the signup transaction commits', async () => {
    const callOrder: string[] = [];
    db.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      callOrder.push('transaction:start');
      const result = await fn(makeTx());
      committedUsers.push(...pendingUsers);
      pendingUsers = [];
      callOrder.push('transaction:commit');
      return result;
    });
    sessionService.createSession.mockImplementation(async () => {
      callOrder.push('session');
      return 'session-token';
    });

    const result = await authService.signup({
      email: 'sam@example.com',
      name: 'Sam',
      password: 'password123',
    });

    expect(result.sessionToken).toBe('session-token');
    expect(callOrder).toEqual(['transaction:start', 'transaction:commit', 'session']);
    expect(committedUsers).toHaveLength(1);
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sam@example.com', name: 'Sam' }),
      expect.objectContaining({ tag: 'tx' }),
    );
    expect(workspacesService.createPersonalWorkspace).toHaveBeenCalledWith(
      userRow,
      expect.objectContaining({ tag: 'tx' }),
    );
  });
});
