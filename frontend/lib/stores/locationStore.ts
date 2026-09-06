import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocationState {
  selectedCity: string
  setSelectedCity: (city: string) => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedCity: '',
      setSelectedCity: (city) => set({ selectedCity: city }),
    }),
    { name: 'location-storage' }
  )
)
