'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Camera, Save } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/authStore'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  bio: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5050/api/v1'
const UPLOADS = API_URL.replace('/api/v1', '')

export default function ProfilePage() {
  const { setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [profileSuccess, setProfileSuccess] = React.useState('')
  const [passwordSuccess, setPasswordSuccess] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
  })

  const user = data?.data

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      bio: user?.bio ?? '',
      dateOfBirth: user?.dateOfBirth?.split('T')[0] ?? '',
      gender: user?.gender ?? '',
    },
  })

  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) })

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileData) => authApi.updateProfile(data),
    onSuccess: (res) => {
      if (res.data) {
        setUser(res.data)
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        setProfileSuccess('Profile updated successfully!')
        setTimeout(() => setProfileSuccess(''), 3000)
      }
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordData) =>
      authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      passwordForm.reset()
      setPasswordSuccess('Password changed successfully!')
      setTimeout(() => setPasswordSuccess(''), 3000)
    },
  })

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => authApi.uploadProfileImage(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImageMutation.mutate(file)
  }

  const avatarUrl = user?.profileImageUrl
    ? user.profileImageUrl.startsWith('http')
      ? user.profileImageUrl
      : `${UPLOADS}${user.profileImageUrl}`
    : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-(--muted-foreground)" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(--font-display) text-2xl font-bold">Profile Settings</h1>
        <p className="text-(--muted-foreground) text-sm mt-1">Manage your account information</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 border-b border-(--border) bg-transparent p-0 rounded-none h-auto w-full justify-start">
          {['profile', 'password'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-(--primary) data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 capitalize"
            >
              {tab === 'profile' ? 'Profile Info' : 'Change Password'}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover border-2 border-(--border)"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-(--primary)/20 text-(--primary) flex items-center justify-center text-2xl font-bold border-2 border-(--border)">
                  {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-(--background) border border-(--border) flex items-center justify-center cursor-pointer hover:bg-(--muted) transition-colors"
              >
                {uploadImageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageChange}
              />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-(--muted-foreground) text-sm">{user?.email}</p>
              {user?.roles && (
                <p className="text-xs text-(--primary) mt-1">{user.roles.join(', ')}</p>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <form
            onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))}
            className="space-y-4 border border-(--border) rounded-2xl p-6"
          >
            <h3 className="font-semibold text-lg">Personal Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <Input {...profileForm.register('firstName')} />
                {profileForm.formState.errors.firstName && (
                  <p className="mt-1 text-xs text-(--destructive)">
                    {profileForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <Input {...profileForm.register('lastName')} />
                {profileForm.formState.errors.lastName && (
                  <p className="mt-1 text-xs text-(--destructive)">
                    {profileForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                className="w-full bg-(--muted) rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-(--ring) resize-none min-h-[80px] border border-(--input)"
                placeholder="Tell us about yourself..."
                {...profileForm.register('bio')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <Input type="date" {...profileForm.register('dateOfBirth')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  className="w-full h-10 rounded-md border border-(--input) bg-(--background) px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-(--ring)"
                  {...profileForm.register('gender')}
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {updateProfileMutation.isError && (
              <div className="rounded-lg bg-(--destructive)/10 border border-(--destructive)/20 px-4 py-3 text-sm text-(--destructive)">
                Failed to update profile. Please try again.
              </div>
            )}

            {profileSuccess && (
              <div className="rounded-lg bg-(--success)/10 border border-(--success)/20 px-4 py-3 text-sm text-(--success)">
                {profileSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="password">
          <form
            onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
            className="space-y-4 border border-(--border) rounded-2xl p-6 max-w-md"
          >
            <h3 className="font-semibold text-lg">Change Password</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Current Password</label>
              <Input type="password" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="mt-1 text-xs text-(--destructive)">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <Input type="password" {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-(--destructive)">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
              <Input type="password" {...passwordForm.register('confirmPassword')} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-(--destructive)">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {changePasswordMutation.isError && (
              <div className="rounded-lg bg-(--destructive)/10 border border-(--destructive)/20 px-4 py-3 text-sm text-(--destructive)">
                Failed to change password. Check your current password.
              </div>
            )}

            {passwordSuccess && (
              <div className="rounded-lg bg-(--success)/10 border border-(--success)/20 px-4 py-3 text-sm text-(--success)">
                {passwordSuccess}
              </div>
            )}

            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Password
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
