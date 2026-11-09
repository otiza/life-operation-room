import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type QuickAddDefaults = {
  projectId?: string | null;
  whenDate?: string | null;
};

type ShellState = {
  currentWorkspaceId: string | null;
  mobileNavOpen: boolean;
  notificationsOpen: boolean;
  quickAddOpen: boolean;
  quickAddDefaults: QuickAddDefaults;
  hasHydrated: boolean;
  setCurrentWorkspaceId: (id: string | null) => void;
  setMobileNavOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  openQuickAdd: (defaults?: QuickAddDefaults) => void;
  closeQuickAdd: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      mobileNavOpen: false,
      notificationsOpen: false,
      quickAddOpen: false,
      quickAddDefaults: {},
      hasHydrated: false,
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setNotificationsOpen: (open) => set({ notificationsOpen: open }),
      openQuickAdd: (defaults = {}) => set({ quickAddOpen: true, quickAddDefaults: defaults }),
      closeQuickAdd: () => set({ quickAddOpen: false, quickAddDefaults: {} }),
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
