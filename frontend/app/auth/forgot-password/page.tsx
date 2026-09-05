'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api/auth'

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RequestData = z.infer<typeof requestSchema>
type ResetData = z.infer<typeof resetSchema>

export default function ForgotPasswordPage() {
  const [step, setStep] = React.useState<'request' | 'reset' | 'done'>('request')
  const [email, setEmail] = React.useState('')
  const [resetToken, setResetToken] = React.useState('')

  const requestForm = useForm<RequestData>({ resolver: zodResolver(requestSchema) })
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })

  const onRequestSubmit = async (data: RequestData) => {
    try {
      const res = await authApi.requestPasswordReset({ email: data.email })
      if (res.success) {
        setEmail(data.email)
        // In development: token returned directly
        if (res.data?.resetToken) {
          setResetToken(res.data.resetToken)
          resetForm.setValue('token', res.data.resetToken)
        }
        setStep('reset')
      } else {
        requestForm.setError('root', { message: res.message ?? 'Request failed' })
      }
    } catch {
      requestForm.setError('root', { message: 'Failed to send reset request' })
    }
  }

  const onResetSubmit = async (data: ResetData) => {
    try {
      const res = await authApi.resetPassword({
        email,
        token: data.token,
        newPassword: data.newPassword,
      })
      if (res.success) {
        setStep('done')
      } else {
        resetForm.setError('root', { message: res.message ?? 'Reset failed' })
      }
    } catch {
      resetForm.setError('root', { message: 'Failed to reset password' })
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-(--border) bg-(--background) p-8 shadow-xl">
        {step === 'request' && (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Forgot password?</h2>
              <p className="mt-2 text-sm text-(--muted-foreground)">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...requestForm.register('email')}
                />
                {requestForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-(--destructive)">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              {requestForm.formState.errors.root && (
                <div className="rounded-lg bg-(--destructive)/10 border border-(--destructive)/20 px-4 py-3 text-sm text-(--destructive)">
                  {requestForm.formState.errors.root.message}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={requestForm.formState.isSubmitting}
              >
                {requestForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Reset Link
              </Button>
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full" type="button">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Reset password</h2>
              <p className="mt-2 text-sm text-(--muted-foreground)">
                Enter the reset token sent to <strong>{email}</strong>
              </p>
            </div>
            {resetToken && (
              <div className="rounded-lg bg-(--muted) px-4 py-3 text-xs text-(--muted-foreground) break-all">
                <strong>Dev Token:</strong> {resetToken}
              </div>
            )}
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium mb-2">
                  Reset Token
                </label>
                <Input id="token" placeholder="Paste token here" {...resetForm.register('token')} />
                {resetForm.formState.errors.token && (
                  <p className="mt-1 text-xs text-(--destructive)">
                    {resetForm.formState.errors.token.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                  New Password
                </label>
                <Input id="newPassword" type="password" {...resetForm.register('newPassword')} />
                {resetForm.formState.errors.newPassword && (
                  <p className="mt-1 text-xs text-(--destructive)">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...resetForm.register('confirmPassword')}
                />
                {resetForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-(--destructive)">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              {resetForm.formState.errors.root && (
                <div className="rounded-lg bg-(--destructive)/10 border border-(--destructive)/20 px-4 py-3 text-sm text-(--destructive)">
                  {resetForm.formState.errors.root.message}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={resetForm.formState.isSubmitting}
              >
                {resetForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reset Password
              </Button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-(--success) mx-auto" />
            <h2 className="text-2xl font-bold">Password Reset!</h2>
            <p className="text-(--muted-foreground)">
              Your password has been successfully reset.
            </p>
            <Link href="/auth/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
