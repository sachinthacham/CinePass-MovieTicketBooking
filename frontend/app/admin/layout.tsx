'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Film,
  Building2,
  CalendarRange,
  Tag,
  Languages,
  MonitorPlay,
  Ticket,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'

const navSections = [
  {
    title: 'Overview',
    items: [{ name: 'Dashboard', href: '/admin', icon: LayoutDashboard }],
  },
  {
    title: 'Content',
    items: [
      { name: 'Movies', href: '/admin/movies', icon: Film },
      { name: 'Genres', href: '/admin/genres', icon: Tag },
      { name: 'Languages', href: '/admin/languages', icon: Languages },
    ],
  },
  {
    title: 'Venues',
    items: [
      { name: 'Theaters', href: '/admin/theaters', icon: Building2 },
    ],
  },
  {
    title: 'Shows',
    items: [
      { name: 'Showtimes', href: '/admin/showtimes', icon: CalendarRange },
      { name: 'Show Formats', href: '/admin/show-formats', icon: MonitorPlay },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Bookings', href: '/admin/bookings', icon: Ticket },
      { name: 'Users', href: '/admin/users', icon: Users },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    document.cookie = 'auth-token=; path=/; max-age=0'
    document.cookie = 'auth-role=; path=/; max-age=0'
    router.push('/')
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-(--border) bg-(--background) flex flex-col sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="p-4 border-b border-(--border)">
          <p className="font-(--font-marquee) text-xs text-(--muted-foreground) uppercase tracking-wider mb-1">
            Admin Panel
          </p>
          <p className="font-semibold text-sm truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-(--muted-foreground) truncate">{user?.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="font-(--font-marquee) text-xs text-(--muted-foreground) uppercase tracking-wider px-3 mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-start h-9 text-sm',
                          isActive
                            ? 'bg-(--muted) text-(--foreground) font-semibold'
                            : 'text-(--foreground)/70 hover:bg-(--muted)'
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.name}
                        {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-(--border) space-y-1">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start h-9 text-sm text-(--foreground)/70 hover:bg-(--muted)">
              ← Back to Site
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start h-9 text-sm text-(--destructive) hover:text-(--destructive) hover:bg-(--destructive)/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
    </div>
  )
}
