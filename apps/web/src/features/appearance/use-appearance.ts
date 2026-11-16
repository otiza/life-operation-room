'use client';

import { DEFAULT_APPEARANCE, type Appearance, type UpdateAppearanceInput } from '@life-room/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { me, type User } from '../auth/auth-api';
import { applyAppearance, updateAppearance } from './appearance';

type MeData = { user: User };

/** The signed-in person's appearance, with an optimistic `update` that applies at once and saves. */
export function useAppearance() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });
  const appearance: Appearance = meQuery.data?.user.appearance ?? DEFAULT_APPEARANCE;

  const mutation = useMutation({
    mutationFn: updateAppearance,
    onMutate: async (patch: UpdateAppearanceInput) => {
      await queryClient.cancelQueries({ queryKey: ['me'] });
      const previous = queryClient.getQueryData<MeData>(['me']);
      const next = { ...appearance, ...patch };
      applyAppearance(next);
      queryClient.setQueryData<MeData>(['me'], (old) => (old ? { ...old, user: { ...old.user, appearance: next } } : old));
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (!context?.previous) return;
      queryClient.setQueryData(['me'], context.previous);
      applyAppearance(context.previous.user.appearance);
    },
    onSuccess: ({ appearance: saved }) => {
      queryClient.setQueryData<MeData>(['me'], (old) => (old ? { ...old, user: { ...old.user, appearance: saved } } : old));
    },
  });

  return { appearance, loaded: Boolean(meQuery.data), update: mutation.mutate, saving: mutation.isPending, failed: mutation.isError };
}
