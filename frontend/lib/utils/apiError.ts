/** Extracts a user-facing message from an Axios error shape, falling back gracefully. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as {
    response?: { data?: { message?: string; errors?: string[] } }
    message?: string
  }
  return (
    e.response?.data?.errors?.[0] ??
    e.response?.data?.message ??
    e.message ??
    fallback
  )
}
