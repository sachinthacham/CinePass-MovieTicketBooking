'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, User, LogIn, LogOut, Menu, LayoutDashboard, Shield } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LocationModal } from '@/components/ui/LocationModal'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/Dropdown'
import { useAuthStore } from '@/lib/stores/authStore'
import { useLocationStore } from '@/lib/stores/locationStore'
import { theatersApi } from '@/lib/api/theaters'

export function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore()
  const { selectedCity, setSelectedCity } = useLocationStore()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [locationModalOpen, setLocationModalOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const { data: citiesData } = useQuery({
    queryKey: ['theater-cities'],
    queryFn: theatersApi.getCities,
  })
  const cities: string[] = citiesData?.data ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) router.push(`/movies?search=${encodeURIComponent(q)}`)
  }

  const handleLogout = () => {
    logout()
    document.cookie = 'auth-token=; path=/; max-age=0'
    document.cookie = 'auth-role=; path=/; max-age=0'
    router.push('/')
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U'

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-(--border) bg-(--background)/95 backdrop-blur supports-[backdrop-filter]:bg-(--background)/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        {/* Brand & Desktop Links */}
        <div className="flex flex-1 items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-(--font-marquee) text-xl tracking-wide text-(--foreground)">
              MOVIETICK<span className="text-(--primary)">.</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-4 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-(--foreground)/80 text-(--foreground)">
              Movies
            </Link>
            <Link href="/theatres" className="transition-colors hover:text-(--foreground)/80 text-(--foreground)/60">
              Theatres
            </Link>
            {isAdmin && (
              <Link href="/admin" className="transition-colors hover:text-(--foreground)/80 text-(--primary) flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 items-center justify-center max-w-md px-6">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--muted-foreground)" />
            <Input
              type="search"
              placeholder="Search for movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-(--muted) border-none pl-9 focus-visible:bg-(--background) focus-visible:ring-1 transition-all"
            />
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex text-(--muted-foreground) px-2"
            onClick={() => setLocationModalOpen(true)}
          >
            <MapPin className="mr-2 h-4 w-4" />
            <span>{selectedCity || 'Select Location'}</span>
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full px-3 gap-2">
                  <div className="h-6 w-6 rounded-full bg-(--primary)/20 text-(--primary) flex items-center justify-center text-xs font-bold">
                    {initials}
                  </div>
                  <span className="hidden sm:inline">{user?.firstName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="right">
                <div className="px-4 py-2 text-xs text-(--muted-foreground)">
                  {user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/dashboard/tickets" className="flex w-full items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    My Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/dashboard/profile" className="flex w-full items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link href="/admin" className="flex w-full items-center text-(--primary)">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-(--destructive) focus:text-(--destructive)"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full px-3">
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="right">
                  <DropdownMenuItem>
                    <Link href="/auth/login" className="flex w-full items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/auth/register" className="flex w-full items-center">
                      Register
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-(--border) bg-(--background) px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
          <Link href="/" className="block py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
            Movies
          </Link>
          <Link href="/theatres" className="block py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
            Theatres
          </Link>
          {isAdmin && (
            <Link href="/admin" className="block py-2 font-medium text-(--primary)" onClick={() => setMobileMenuOpen(false)}>
              Admin
            </Link>
          )}
          {!isAuthenticated ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-(--border)">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-md border border-(--border) px-4 py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground)"
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2 border-t border-(--border)">
              <Link href="/dashboard/tickets" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                My tickets
              </Link>
              <Link href="/dashboard/profile" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                Profile
              </Link>
              <button
                type="button"
                className="text-left py-2 text-(--destructive)"
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}

      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSelect={setSelectedCity}
        cities={cities.length > 0 ? cities : undefined}
      />
    </nav>
  )
}
