import { create } from 'zustand';

interface UserState {
    balance: number | null;
    setBalance: (balance: number) => void;
    fetchBalance: () => Promise<void>;
    isLoading: boolean;
}

export const useUserStore = create<UserState>()((set, get) => ({
    balance: null,
    isLoading: false,
    setBalance: (balance) => set({ balance }),
    fetchBalance: async () => {
        // Deduplication: If already loading, don't start another request
        if (get().isLoading) return;

        set({ isLoading: true });
        try {
            const res = await fetch("/api/balance");
            if (res.ok) {
                const data = await res.json();
                set({ balance: data.balance });
            }
        } catch (error) {
            console.error("Failed to fetch balance", error);
        } finally {
            set({ isLoading: false });
        }
    },
}));
