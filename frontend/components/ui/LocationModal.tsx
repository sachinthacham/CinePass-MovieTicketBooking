"use client"

import * as React from "react"
import { MapPin, Search } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect?: (location: string) => void
  /** Cities to list — defaults to a static fallback list when not provided. */
  cities?: string[]
}

const defaultCities = ["Mumbai", "Delhi-NCR", "Bengaluru", "Hyderabad", "Chandigarh", "Chennai", "Pune", "Kolkata", "Kochi"]

export function LocationModal({ isOpen, onClose, onSelect, cities = defaultCities }: LocationModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = (city: string) => {
    if (onSelect) onSelect(city)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-[600px] p-0 overflow-hidden">
      <div className="flex flex-col h-[500px]">
        
        {/* Header & Search */}
        <div className="p-4 border-b border-(--border) bg-(--muted)/30">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-(--muted-foreground)" />
            <Input 
              autoFocus
              placeholder="Search for your city..." 
              className="pl-10 h-12 bg-(--background) border-(--border)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Popular Cities Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-(--background)">
          <div className="flex items-center text-(--muted-foreground) mb-4 text-sm font-medium">
            <MapPin className="mr-2 h-4 w-4" />
            <span className="uppercase tracking-wider text-xs">Popular Cities</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredCities.map(city => (
              <button
                key={city}
                onClick={() => handleSelect(city)}
                className="flex items-center justify-center p-4 border border-(--border) rounded-xl hover:bg-(--muted) hover:border-(--primary) transition-all text-sm font-medium"
              >
                {city}
              </button>
            ))}
          </div>
          
          {filteredCities.length === 0 && (
            <div className="text-center py-12 text-(--muted-foreground)">
              No cities found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
        
        {/* Footer actions */}
        <div className="p-4 border-t border-(--border) bg-(--muted)/30 flex justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
