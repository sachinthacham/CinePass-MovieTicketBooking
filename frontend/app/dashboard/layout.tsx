'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Ticket, User, Bell, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'My Bookings', href: '/dashboard/tickets', icon: Ticket },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Profile Settings', href: '/dashboard/profile', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

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
    <div className="container mx-auto px-4 py-8 md:px-8 max-w-7xl min-h-[calc(100vh-14rem)]">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-(--muted)/50 border border-(--border)">
            <div className="h-12 w-12 rounded-full bg-(--primary)/20 text-(--primary) flex items-center justify-center font-bold text-lg">
              {initials}
            </div>
            <div>
              <p className="font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-(--muted-foreground)">{user?.email}</p>
            </div>
          </div>

          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start h-12',
                    pathname === item.href
                      ? 'bg-(--muted) text-(--foreground)'
                      : 'text-(--foreground)/70 hover:bg-(--muted)'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 text-(--muted-foreground)" />
                  {item.name}
                </Button>
              </Link>
            ))}
            <div className="h-px bg-(--border) my-2 w-full" />
            <Button
              variant="ghost"
              className="w-full justify-start text-(--destructive) hover:text-(--destructive) hover:bg-(--destructive)/10 h-12"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">{children}</div>
      </div>
    </div>
  )
}
