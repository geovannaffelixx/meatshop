import { QueryClient } from '@tanstack/react-query';

export const API_CACHE_STALE_TIME = 5 * 60_000;

export const panelQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: API_CACHE_STALE_TIME,
      gcTime: 600_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

let scope = 'anonymous';

export function apiQueryKey(path: string) {
  return ['api', scope, path] as const;
}

export function canCacheApiPath(path: string) {
  return !/^\/(?:auth(?:\/|$)|orders(?:\/|\?|$)|notifications(?:\/|\?|$)|chat(?:\/|\?|$)|users\/me(?:\/export|\/retention-policy)?(?:\?|$)|legal(?:\/|$))/.test(path)
    && !/\/(?:tracking|history)(?:\?|$)/.test(path);
}

export function resetApiCache(nextScope = 'anonymous') {
  scope = nextScope;
  panelQueryClient.clear();
}

export function setApiCacheScope(nextScope: string) {
  if (scope !== nextScope) resetApiCache(nextScope);
}

export async function invalidateApiCache() {
  await panelQueryClient.cancelQueries();
  await panelQueryClient.invalidateQueries({ refetchType: 'none' });
}

export function peekApiData<T>(path: string): T | undefined {
  const state = panelQueryClient.getQueryState<T>(apiQueryKey(path));
  if (!state || state.isInvalidated || Date.now() - state.dataUpdatedAt >= API_CACHE_STALE_TIME) return;
  return state.data;
}
