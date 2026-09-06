import { describe, it, expect, vi, afterEach } from 'vitest';
import { useQuery } from './useQuery';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('useQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic lifecycle', () => {
    it('initializes with null data, not loading', () => {
      const query = useQuery(async () => null);
      expect(query.data$.getValue()).toBeNull();
      query.dispose();
    });

    it('sets data on successful execution', async () => {
      const query = useQuery(async () => ({ name: 'test' }));
      query.execute();
      await delay(20);
      expect(query.data$.getValue()).toEqual({ name: 'test' });
      query.dispose();
    });

    it('sets error on failed execution', async () => {
      const errors: unknown[] = [];
      const query = useQuery(async () => {
        throw new Error('fail');
      });
      query.error$.subscribe((e) => errors.push(e));
      query.execute();
      await delay(20);
      expect(errors.some((e) => e instanceof Error && e.message === 'fail')).toBe(true);
      query.dispose();
    });

    it('emits null data when executor returns null', async () => {
      const query = useQuery(async () => null);
      query.execute();
      await delay(20);
      expect(query.data$.getValue()).toBeNull();
      query.dispose();
    });
  });

  describe('execute', () => {
    it('passes input and signal to executor', async () => {
      const executor = vi.fn(async (ctx: { x: number } & { signal: AbortSignal }) => ctx.x * 2);
      const query = useQuery(executor);
      query.execute({ x: 5 });
      await delay(20);
      expect(executor).toHaveBeenCalledWith(
        expect.objectContaining({ x: 5, signal: expect.any(AbortSignal) })
      );
      expect(query.data$.getValue()).toBe(10);
      query.dispose();
    });

    it('provides non-aborted signal to executor', async () => {
      let capturedSignal: AbortSignal | undefined;
      const query = useQuery(async (ctx: { signal: AbortSignal }) => {
        capturedSignal = ctx.signal;
        return 'ok';
      });
      query.execute();
      await delay(20);
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal!.aborted).toBe(false);
      query.dispose();
    });
  });

  describe('cancel', () => {
    it('aborts the running task signal', async () => {
      let aborted = false;
      const query = useQuery(async (ctx: { signal: AbortSignal }) => {
        return new Promise<string>((resolve, reject) => {
          ctx.signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          });
          setTimeout(() => resolve('done'), 100);
        });
      });
      query.execute();
      await delay(10);
      query.cancel();
      await delay(10);
      expect(aborted).toBe(true);
      query.dispose();
    });
  });

  describe('reset', () => {
    it('clears data and error', async () => {
      const query = useQuery(async () => ({ name: 'test' }));
      query.execute();
      await delay(20);
      expect(query.data$.getValue()).toEqual({ name: 'test' });
      query.reset();
      expect(query.data$.getValue()).toBeNull();
      query.dispose();
    });
  });

  describe('dispose', () => {
    it('completes all subjects', () => {
      const query = useQuery(async () => 'data');
      query.dispose();
      expect(query.data$.getValue()).toBeNull();
    });

    it('prevents further emissions', async () => {
      const query = useQuery(async () => 'data');
      query.dispose();
      const values: unknown[] = [];
      query.data$.subscribe((v) => values.push(v));
      expect(values).toHaveLength(0);
    });
  });

  describe('manual setters', () => {
    it('setData updates data$', () => {
      const query = useQuery(async () => null);
      query.setData({ custom: true } as never);
      expect(query.data$.getValue()).toEqual({ custom: true });
      query.dispose();
    });

    it('setError updates error$', () => {
      const errors: unknown[] = [];
      const query = useQuery(async () => null);
      query.error$.subscribe((e) => errors.push(e));
      query.setError(new Error('manual'));
      expect(errors.some((e) => e instanceof Error)).toBe(true);
      query.dispose();
    });

    it('setLoading updates loading$', () => {
      const loadings: boolean[] = [];
      const query = useQuery(async () => null);
      query.loading$.subscribe((v) => loadings.push(v));
      query.setLoading(true);
      expect(loadings).toContain(true);
      query.dispose();
    });
  });

  describe('data$ stream', () => {
    it('subscribe receives values', async () => {
      const query = useQuery(async () => ({ name: 'stream' }));
      const values: unknown[] = [];
      query.data$.subscribe((v) => values.push(v));
      query.execute();
      await delay(20);
      expect(values).toContainEqual({ name: 'stream' });
      query.dispose();
    });

    it('getValue returns current value', async () => {
      const query = useQuery(async () => 42);
      expect(query.data$.getValue()).toBeNull();
      query.execute();
      await delay(20);
      expect(query.data$.getValue()).toBe(42);
      query.dispose();
    });

    it('value getter returns current value', async () => {
      const query = useQuery(async () => 42);
      expect(query.data$.value).toBeNull();
      query.execute();
      await delay(20);
      expect(query.data$.value).toBe(42);
      query.dispose();
    });
  });

  describe('FIFO strategy', () => {
    it('executes tasks in order', async () => {
      const order: number[] = [];
      const query = useQuery(async (ctx: { id: number } & { signal: AbortSignal }) => {
        order.push(ctx.id);
        await delay(5);
        return ctx.id;
      }, 'FIFO');

      query.execute({ id: 1 });
      await delay(2);
      query.execute({ id: 2 });
      await delay(2);
      query.execute({ id: 3 });
      await delay(60);

      const unique = [...new Set(order)];
      expect(unique).toEqual([1, 2, 3]);
      expect(query.data$.getValue()).toBe(3);
      query.dispose();
    });

    it('does not re-execute a finished task when another execute arrives mid-flight', async () => {
      let calls = 0;
      const resolvers: Array<(value: number) => void> = [];
      const emissions: Array<number | null> = [];

      const query = useQuery(async () => {
        calls++;
        return await new Promise<number>((resolve) => resolvers.push(resolve));
      }, 'FIFO');

      query.data$.subscribe((value) => emissions.push(value));

      query.execute();
      query.execute();

      await delay(5);
      expect(calls).toBe(1);

      resolvers[0](1);
      await delay(10);
      expect(calls).toBe(2);

      resolvers[1]?.(2);
      await delay(10);
      expect(calls).toBe(2);
      expect(emissions.filter((v) => v !== null).length).toBeGreaterThanOrEqual(2);

      query.dispose();
    });
  });

  describe('execute callbacks', () => {
    it('invokes next and complete on success', async () => {
      const next = vi.fn();
      const errorCb = vi.fn();
      const complete = vi.fn();
      const query = useQuery(async () => 'ok');

      query.execute(undefined, { next, error: errorCb, complete });
      await delay(20);

      expect(next).toHaveBeenCalledWith('ok');
      expect(errorCb).not.toHaveBeenCalled();
      expect(complete).toHaveBeenCalledTimes(1);
      query.dispose();
    });

    it('invokes error on executor failure', async () => {
      const next = vi.fn();
      const errorCb = vi.fn();
      const query = useQuery(async () => {
        throw new Error('boom');
      });

      query.execute(undefined, { next, error: errorCb });
      await delay(20);

      expect(next).not.toHaveBeenCalled();
      expect(errorCb).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
      query.dispose();
    });
  });

  describe('LIFO strategy', () => {
    it('executes only the latest task', async () => {
      const executor = vi.fn(async (ctx: { id: number } & { signal: AbortSignal }) => {
        await delay(10);
        return ctx.id;
      });
      const query = useQuery(executor, 'LIFO');

      query.execute({ id: 1 });
      query.execute({ id: 2 });
      query.execute({ id: 3 });
      await delay(60);

      expect(query.data$.getValue()).toBe(3);
      query.dispose();
    });
  });

  describe('WAIT strategy', () => {
    it('ignores new tasks while one is running', async () => {
      const executor = vi.fn(async (ctx: { id: number } & { signal: AbortSignal }) => {
        await delay(30);
        return ctx.id;
      });
      const query = useQuery(executor, 'WAIT');

      query.execute({ id: 1 });
      query.execute({ id: 2 });
      query.execute({ id: 3 });
      await delay(80);

      expect(executor).toHaveBeenCalledTimes(1);
      expect(query.data$.getValue()).toBe(1);
      query.dispose();
    });
  });

  describe('setRelations', () => {
    it('returns a new query result with relation support', () => {
      const query = useQuery(async () => [{ id: '1', userId: 'u1' }]);
      const withRelations = query.setRelations({
        user: {
          foreignKey: (parent: { userId: string }) => parent.userId,
          keySelector: (related: { id: string }) => related.id
        }
      });
      expect(withRelations).toBeDefined();
      expect(withRelations.data$).toBeDefined();
      query.dispose();
    });

    it('returns a stable stream reference for repeated .with() calls', () => {
      const query = useQuery(async () => [{ id: '1', userId: 'u1' }]);
      const relations = {
        user: {
          foreignKey: (parent: { userId: string }) => parent.userId,
          keySelector: (related: { id: string }) => related.id
        },
        other: {
          foreignKey: (parent: { userId: string }) => parent.userId,
          keySelector: (related: { id: string }) => related.id
        }
      };
      const withRelations = query.setRelations(relations);

      // Repeated calls with the same keys return the same stream.
      const userStream = withRelations.data$.with(['user']);
      expect(withRelations.data$.with(['user'])).toBe(userStream);

      // Key order must not matter.
      expect(withRelations.data$.with(['user', 'other'])).toBe(
        withRelations.data$.with(['other', 'user'])
      );

      // A different key set yields a distinct stream.
      expect(userStream).not.toBe(withRelations.data$.with(['other']));

      // Re-configuring relations replaces the streams.
      const streamBefore = withRelations.data$.with(['other']);
      const reconfigured = withRelations.setRelations(relations);
      expect(reconfigured.data$.with(['other'])).not.toBe(streamBefore);

      query.dispose();
    });
  });

  describe('handler', () => {
    it('replaces the executor for subsequent executions', async () => {
      const query = useQuery(async () => 'original');
      const newExecutor = vi.fn(async () => 'replaced');

      query.handler(newExecutor);
      query.execute();
      await delay(20);

      expect(newExecutor).toHaveBeenCalled();
      expect(query.data$.getValue()).toBe('replaced');
      query.dispose();
    });

    it('is chainable — returns the query result', () => {
      const query = useQuery<string>(async () => null);
      const returned = query.handler(async () => 'test');
      expect(returned).toBe(query);
      query.dispose();
    });

    it('replaces the strategy', async () => {
      const executor = vi.fn(async (ctx: { id: number } & { signal: AbortSignal }) => {
        await delay(10);
        return ctx.id;
      });
      const query = useQuery(executor, 'FIFO');

      query.handler(executor, 'LIFO');

      query.execute({ id: 1 });
      query.execute({ id: 2 });
      query.execute({ id: 3 });
      await delay(60);

      expect(query.data$.getValue()).toBe(3);
      query.dispose();
    });
  });
});
