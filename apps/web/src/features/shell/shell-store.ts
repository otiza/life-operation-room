import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ShellState = {
  currentWorkspaceId: string | null;
  mobileNavOpen: boolean;
  notificationsOpen: boolean;
  hasHydrated: boolean;
  setCurrentWorkspaceId: (id: string | null) => void;
  setMobileNavOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      mobileNavOpen: false,
      notificationsOpen: false,
      hasHydrated: false,
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setNotificationsOpen: (open) => set({ notificationsOpen: open }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'tiza-shell',
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
