import {
  BehaviorSubject,
  Subject,
  Observable,
  PartialObserver,
  Subscription,
  combineLatest,
  concatMap,
  map,
  of,
  shareReplay,
  takeUntil
} from 'rxjs';

type ProcessStrategy = 'FIFO' | 'LIFO' | 'WAIT';
type EmptyInput = Record<string, never>;

export type ExecCallbacks<TData, TError> = {
  next?: (value: TData) => void;
  error?: (err: TError | Error) => void;
  complete?: () => void;
};

type ExecuteFn<TInput extends object, TData, TError> = {
  (input?: TInput, callbacks?: ExecCallbacks<TData, TError>): void;
};

type QueuedTask<TInput, TData, TError> = {
  id: number;
  executor: (ctx: TInput & { signal: AbortSignal }) => Promise<TData | null>;
  input?: TInput;
  controller: AbortController;
  callbacks?: ExecCallbacks<TData, TError>;
};

type ParentType<T> = T extends Array<infer U> ? U : T;

type DataArray<T> = ReadonlyArray<T>;
type ReadableStream<T> = {
  subscribe: (observerOrNext?: PartialObserver<T> | ((value: T) => void)) => Subscription;
  pipe: Observable<T>['pipe'];
};
type ValueReadableStream<T> = ReadableStream<T> & {
  getValue?: () => T;
  value?: T;
};
type RelationQueryResult = {
  data$?: ValueReadableStream<DataArray<unknown> | null>;
  execute?: () => void;
};
type RelationSourceQuery = () => RelationQueryResult | undefined;

export type RelationConfig<TParent, TRelated> = {
  foreignKey: (parent: TParent) => string | number | undefined;
  keySelector: (related: TRelated) => string | number;
};

export type RelationSourceConfig<TParent, TRelated> = RelationConfig<TParent, TRelated> & {
  source?: ReadableStream<DataArray<TRelated> | null>;
  includeDefault?: boolean;
  sourceQuery?: () => {
    data$: ReadableStream<DataArray<TRelated> | null>;
    execute?: () => void;
  };
};

export type RelationMap<TParent> = Record<string, RelationSourceConfig<TParent, unknown>>;

type RelationMapOf<TParent, TMap extends Record<string, unknown>> = {
  [K in keyof TMap]: RelationSourceConfig<TParent, TMap[K]>;
};

type RelationFields<TMap extends Record<string, unknown>> = {
  [K in keyof TMap]?: TMap[K] | undefined;
};

type WithRelations<TData, TMap extends Record<string, unknown>> =
  TData extends Array<infer TItem>
    ? Array<TItem & RelationFields<TMap>>
    : TData & RelationFields<TMap>;

type RelationKey<T extends Record<string, unknown>> = keyof T extends never ? string : keyof T;

export type RelationController<TData, TMap extends Record<string, unknown>> = {
  with: (keys: readonly RelationKey<TMap>[]) => Observable<WithRelations<TData, TMap> | null>;
};

export type QueryDataStream<
  TData,
  TRelations extends Record<string, unknown> = Record<never, never>
> = {
  subscribe: (
    observerOrNext?:
      | PartialObserver<WithRelations<TData, TRelations> | null>
      | ((value: WithRelations<TData, TRelations> | null) => void)
  ) => Subscription;
  pipe: Observable<WithRelations<TData, TRelations> | null>['pipe'];
  with: (
    keys: readonly RelationKey<TRelations>[]
  ) => Observable<WithRelations<TData, TRelations> | null>;
  getValue: () => TData | null;
  readonly value: TData | null;
};

export type UseQueryResult<
  TData,
  TError,
  TRelations extends Record<string, unknown> = Record<never, never>,
  TInput extends object = EmptyInput
> = {
  data$: QueryDataStream<TData, TRelations>;
  error$: Observable<TError | Error | null>;
  loading$: Observable<boolean>;
  setRelations: <const TMap extends Record<string, unknown>>(
    relations: RelationMapOf<ParentType<TData>, TMap>
  ) => UseQueryResult<TData, TError, TMap, TInput>;
  execute: ExecuteFn<TInput, TData, TError>;
  cancel: () => void;
  reset: () => void;
  dispose: () => void;
  setData: (data: TData) => void;
  setLoading: (status: boolean) => void;
  setError: (error: Error | TError | null) => void;
};

function createRelationController<TData, TMap extends Record<string, unknown>>(
  parent$: Observable<TData | null>,
  relations: RelationMapOf<ParentType<TData>, TMap>
): RelationController<TData, TMap> {
  const allEntries = Object.entries(relations) as Array<
    [keyof TMap, RelationSourceConfig<ParentType<TData>, TMap[keyof TMap]>]
  >;
  const sourceCache = new Map<string, Observable<DataArray<unknown> | null>>();
  const sourceQueryCache = new Map<RelationSourceQuery, RelationQueryResult>();
  const executedSourceQueries = new Set<RelationSourceQuery>();

  const hasSourceData = (queryResult?: RelationQueryResult) => {
    if (!queryResult?.data$) return false;

    const fromGetter = queryResult.data$.getValue?.();
    if (fromGetter !== undefined) return fromGetter !== null;

    if ('value' in queryResult.data$) {
      return (queryResult.data$.value ?? null) !== null;
    }

    return false;
  };

  const getQueryResult = (sourceQuery?: RelationSourceQuery): RelationQueryResult | undefined => {
    if (!sourceQuery) return undefined;

    const cached = sourceQueryCache.get(sourceQuery);
    if (cached) return cached;

    const created = sourceQuery() as RelationQueryResult | undefined;
    if (!created) return undefined;

    sourceQueryCache.set(sourceQuery, created);
    return created;
  };

  const shouldExecute = (queryResult?: RelationQueryResult) =>
    !!queryResult?.execute && !hasSourceData(queryResult);

  const resolveSource = (
    key: string,
    config: RelationSourceConfig<ParentType<TData>, TMap[keyof TMap]>
  ): Observable<DataArray<unknown> | null> => {
    const cached = sourceCache.get(key);
    if (cached) return cached;

    const sourceQuery = config.sourceQuery as RelationSourceQuery | undefined;
    const queryResult = getQueryResult(sourceQuery);
    if (queryResult && sourceQuery && shouldExecute(queryResult) && !executedSourceQueries.has(sourceQuery)) {
      executedSourceQueries.add(sourceQuery);
      queryResult.execute?.();
    }

    const stream =
      (config.source as ReadableStream<DataArray<unknown> | null> | undefined) ??
      (queryResult?.data$ as ReadableStream<DataArray<unknown> | null> | undefined);

    const source = stream
      ? new Observable<DataArray<unknown> | null>((subscriber) => stream.subscribe(subscriber))
      : of(null);

    sourceCache.set(key, source);
    return source;
  };

  const buildStream = (
    entries: Array<[keyof TMap, RelationSourceConfig<ParentType<TData>, TMap[keyof TMap]>]>
  ): Observable<WithRelations<TData, TMap> | null> => {
    const relationKeys = entries.map(([key]) => String(key));
    const sources = entries.map(([key, config]) => resolveSource(String(key), config));
    let latestByKey: Record<string, DataArray<unknown> | null> = {};

    const createRelatedItem = (item: ParentType<TData>) => {
      if (!item || typeof item !== 'object') return item;

      const target = { ...(item as Record<string, unknown>) } as Record<string, unknown>;

      entries.forEach(([key, config]) => {
        Object.defineProperty(target, key, {
          get: () => {
            const related = latestByKey[String(key)];
            if (!related) return undefined;
            const fk = config.foreignKey(item);
            if (fk === undefined) return undefined;
            return related.find((rel) => config.keySelector(rel as TMap[keyof TMap]) === fk) as
              | TMap[keyof TMap]
              | undefined;
          },
          enumerable: true,
          configurable: true
        });
      });

      return target as ParentType<TData>;
    };

    return combineLatest([parent$, ...sources]).pipe(
      map(([parent, ...relatedArrays]) => {
        latestByKey = relationKeys.reduce<Record<string, DataArray<unknown> | null>>(
          (acc, key, index) => {
            acc[key] = (relatedArrays[index] as DataArray<unknown> | null) ?? null;
            return acc;
          },
          {}
        );

        if (!parent) return null;

        if (Array.isArray(parent)) {
          return parent.map((item) =>
            createRelatedItem(item as ParentType<TData>)
          ) as WithRelations<TData, TMap>;
        }

        return createRelatedItem(parent as ParentType<TData>) as WithRelations<TData, TMap>;
      }),
      shareReplay(1)
    );
  };

  return {
    with: (keys) => {
      const selected = allEntries.filter(([key]) => keys.includes(String(key)));
      return buildStream(selected);
    }
  };
}

export class DataSubject<
  TData,
  TRelations extends Record<string, unknown> = Record<never, never>
> extends BehaviorSubject<TData | null> {
  private readonly base$: Observable<TData | null>;
  private relations?: RelationMapOf<ParentType<TData>, TRelations>;
  private controller?: RelationController<TData, TRelations>;
  private defaultIncludeKeys: Array<keyof TRelations> = [];

  constructor(initialValue: TData | null) {
    super(initialValue);
    this.base$ = new Observable<TData | null>((subscriber) => super.subscribe(subscriber));
  }

  public getDefaultStream(): Observable<WithRelations<TData, TRelations> | null> {
    if (this.defaultIncludeKeys.length === 0) {
      return this.base$ as Observable<WithRelations<TData, TRelations> | null>;
    }
    return this.with([]) as Observable<WithRelations<TData, TRelations> | null>;
  }

  public with(
    keys: readonly RelationKey<TRelations>[]
  ): Observable<WithRelations<TData, TRelations> | null> {
    if (!this.controller) {
      if (!this.relations) return this.base$ as Observable<WithRelations<TData, TRelations> | null>;
      this.controller = createRelationController(
        this.base$,
        this.relations
      ) as unknown as RelationController<TData, TRelations>;
    }

    const defaultKeys = this.defaultIncludeKeys.map((key) => String(key));
    const mergedKeys = [...new Set([...defaultKeys, ...keys.map((key) => String(key))])];
    return this.controller.with(mergedKeys) as Observable<WithRelations<TData, TRelations> | null>;
  }
}

function createDataStream<TData, TRelations extends Record<string, unknown> = Record<never, never>>(
  subject: DataSubject<TData, TRelations>
): QueryDataStream<TData, TRelations> {
  return {
    subscribe: (observerOrNext) => {
      const stream = subject.getDefaultStream();
      if (typeof observerOrNext === 'function') {
        return stream.subscribe({ next: observerOrNext });
      }
      if (observerOrNext) {
        return stream.subscribe(observerOrNext);
      }
      return stream.subscribe({});
    },
    pipe: subject
      .getDefaultStream()
      .pipe.bind(subject.getDefaultStream()) as Observable<WithRelations<
      TData,
      TRelations
    > | null>['pipe'],
    with: subject.with.bind(subject),
    getValue: () => subject.getValue(),
    get value() {
      return subject.getValue();
    }
  };
}

export function useQuery<
  TData = unknown,
  TError = unknown,
  TInput extends object = EmptyInput
>(
  executor: (ctx: TInput & { signal: AbortSignal }) => Promise<TData | null>,
  strategy: ProcessStrategy = 'FIFO'
): UseQueryResult<TData, TError, Record<never, never>, TInput> {
  const dataState: DataSubject<TData, Record<never, never>> = new DataSubject<TData>(null);
  const errorState = new BehaviorSubject<TError | Error | null>(null);
  const loadingState = new BehaviorSubject<boolean>(false);

  const queue$ = new BehaviorSubject<QueuedTask<TInput, TData, TError>[]>([]);
  const enqueue$ = new Subject<QueuedTask<TInput, TData, TError>>();
  const destroy$ = new Subject<void>();

  let taskIdCounter = 0;

  const executeTask = async (task: QueuedTask<TInput, TData, TError>) => {
    try {
      if (task.controller.signal.aborted) {
        throw new Error('Task aborted before execution');
      }

      const result = await task.executor({
        ...(task.input ?? ({} as TInput)),
        signal: task.controller.signal
      });

      if (!task.controller.signal.aborted) {
        dataState.next(result);
        if (result !== null) task.callbacks?.next?.(result);
      } else {
        task.callbacks?.error?.(new Error('Task aborted'));
      }
    } catch (err) {
      if (!task.controller.signal.aborted) {
        errorState.next(err as Error);
        task.callbacks?.error?.(err as Error);
      } else {
        task.callbacks?.error?.(new Error('Task aborted'));
      }
    } finally {
      task.callbacks?.complete?.();
    }

    return task.id;
  };

  enqueue$
    .pipe(concatMap((task) => executeTask(task)), takeUntil(destroy$))
    .subscribe((taskId) => {
      const currentQueue = queue$.getValue();
      const newQueue = currentQueue.filter((t) => t.id !== taskId);
      queue$.next(newQueue);

      if (newQueue.length === 0) {
        loadingState.next(false);
      }
    });

  let currentAbort: (() => void) | null = null;

  const run = (input?: TInput, callbacks?: ExecCallbacks<TData, TError>) => {
    const controller = new AbortController();

    const task: QueuedTask<TInput, TData, TError> = {
      id: ++taskIdCounter,
      executor,
      input,
      controller,
      callbacks
    };

    currentAbort = () => {
      controller.abort();
    };

    if (strategy === 'LIFO') {
      const currentQueue = queue$.getValue();
      currentQueue.forEach((t) => t.controller.abort());
      queue$.next([task]);
      enqueue$.next(task);
      loadingState.next(true);
      return;
    }

    if (strategy === 'WAIT' && queue$.getValue().length > 0) {
      return;
    }

    queue$.next([...queue$.getValue(), task]);
    enqueue$.next(task);
    loadingState.next(true);
  };

  const cancel = () => {
    currentAbort?.();
  };

  const reset = () => {
    dataState.next(null);
    errorState.next(null);
    loadingState.next(false);
  };

  const setData = (data: TData) => dataState.next(data);
  const setLoading = (status: boolean) => loadingState.next(status);
  const setError = (error: Error | TError | null) => errorState.next(error);

  const setRelations = <const TMap extends Record<string, unknown>>(
    relations: RelationMapOf<ParentType<TData>, TMap>
  ) => {
    const relationState = dataState as unknown as {
      base$: Observable<TData | null>;
      relations?: RelationMapOf<ParentType<TData>, TMap>;
      controller?: RelationController<TData, TMap>;
      defaultIncludeKeys: Array<keyof TMap>;
    };

    relationState.relations = relations;
    relationState.controller = createRelationController(relationState.base$, relations);
    relationState.defaultIncludeKeys = Object.entries(relations)
      .filter(([, config]) => !!config.includeDefault)
      .map(([key]) => key as keyof TMap);

    return result as unknown as UseQueryResult<TData, TError, TMap, TInput>;
  };

  const dispose = () => {
    cancel();
    destroy$.next();
    destroy$.complete();
    queue$.complete();
    enqueue$.complete();
    dataState.complete();
    errorState.complete();
    loadingState.complete();
  };

  const result: UseQueryResult<TData, TError, Record<never, never>, TInput> = {
    data$: createDataStream(dataState),
    error$: errorState.asObservable(),
    loading$: loadingState.asObservable(),
    setRelations,
    execute: run as ExecuteFn<TInput, TData, TError>,
    cancel,
    reset,
    dispose,
    setData,
    setError,
    setLoading
  };

  return result as UseQueryResult<TData, TError, Record<never, never>, TInput>;
}
