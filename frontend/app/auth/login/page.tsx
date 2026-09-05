'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api/auth'
import { establishSession } from '@/lib/auth/establishSession'
import { getApiErrorMessage } from '@/lib/utils/apiError'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5050/api/v1'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data)
      if (!res.success || !res.data?.accessToken || !res.data?.refreshToken) {
        setError('root', { message: res.message || 'Login failed' })
        return
      }
      await establishSession(res.data.accessToken, res.data.refreshToken)
      document.cookie = `auth-token=${res.data.accessToken}; path=/; max-age=86400`
      const { useAuthStore } = await import('@/lib/stores/authStore')
      const role = useAuthStore.getState().user?.roles?.includes('Admin') ? 'Admin' : 'User'
      document.cookie = `auth-role=${role}; path=/; max-age=86400`
      router.push(redirect)
    } catch (err: unknown) {
      setError('root', { message: getApiErrorMessage(err, 'Invalid email or password') })
    }
  }

  const handleSocialLogin = (provider: string) => {
    window.location.href = `${API_URL}/auth/${provider.toLowerCase()}`
  }

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-(--border) bg-(--background) p-8 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-semibold text-(--primary) hover:underline">
              Create one now
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6">
                Email address
              </label>
              <div className="mt-2">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-(--destructive)">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-semibold text-(--primary) hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-2">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-(--destructive)">{errors.password.message}</p>
                )}
              </div>
            </div>
          </div>

          {errors.root && (
            <div className="rounded-lg bg-(--destructive)/10 border border-(--destructive)/20 px-4 py-3 text-sm text-(--destructive)">
              {errors.root.message}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="mt-6 border-t border-(--border) pt-6">
          <div className="relative flex justify-center text-sm font-medium leading-6">
            <span className="bg-(--background) px-6 text-(--muted-foreground) absolute -top-3">
              Or continue with
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('google')}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('facebook')}
            >
              <svg className="mr-2 h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center">
        <div className="w-full max-w-md h-96 bg-(--muted) animate-pulse rounded-2xl" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
