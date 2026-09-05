'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api/auth'
import { establishSession } from '@/lib/auth/establishSession'
import { getApiErrorMessage } from '@/lib/utils/apiError'

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>


export default function RegisterPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      })
      if (!res.success || !res.data?.accessToken || !res.data?.refreshToken) {
        setError('root', { message: res.message ?? 'Registration failed' })
        return
      }
      await establishSession(res.data.accessToken, res.data.refreshToken)
      document.cookie = `auth-token=${res.data.accessToken}; path=/; max-age=86400`
      const { useAuthStore } = await import('@/lib/stores/authStore')
      const role = useAuthStore.getState().user?.roles?.includes('Admin') ? 'Admin' : 'User'
      document.cookie = `auth-role=${role}; path=/; max-age=86400`
      router.push('/')
    } catch (err: unknown) {
      setError('root', { message: getApiErrorMessage(err, 'Registration failed. Please try again.') })
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-(--border) bg-(--background) p-8 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-(--primary) hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium leading-6 mb-2">
                First Name
              </label>
              <Input id="firstName" placeholder="John" {...register('firstName')} />
              {errors.firstName && (
                <p className="mt-1 text-xs text-(--destructive)">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium leading-6 mb-2">
                Last Name
              </label>
              <Input id="lastName" placeholder="Smith" {...register('lastName')} />
              {errors.lastName && (
                <p className="mt-1 text-xs text-(--destructive)">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 mb-2">
              Email address
            </label>
            <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-(--destructive)">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 mb-2">
              Password
            </label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="mt-1 text-xs text-(--destructive)">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 mb-2">
              Confirm Password
            </label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-(--destructive)">{errors.confirmPassword.message}</p>
            )}
          </div>

          {errors.root && (
            <div className="rounded-lg bg-(--destructive)/10 border border-(--destructive)/20 px-4 py-3 text-sm text-(--destructive)">
              {errors.root.message}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </div>
    </div>
  )
}
