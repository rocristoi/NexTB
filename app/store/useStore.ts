import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Store = {
  displayAdditionalInfo: boolean;
  selectedPrimaryDetail: string;

  toggleDisplayAdditionalInfo: () => void;
  setSelectedPrimaryDetail: (mewDetail: string) => void;
};

export const useStore = create<Store>()(
    persist(
        (set) => ({
            displayAdditionalInfo: true,
            selectedPrimaryDetail: 'ac',
            toggleDisplayAdditionalInfo: () => 
                set((state) => ({ displayAdditionalInfo: !state.displayAdditionalInfo })), 
            setSelectedPrimaryDetail: (newDetail: string) => 
                set(() => ({ selectedPrimaryDetail: newDetail })),
        }),
        {
          name: 'app-storage', 
          storage: createJSONStorage(() => AsyncStorage),
        }
      )

);