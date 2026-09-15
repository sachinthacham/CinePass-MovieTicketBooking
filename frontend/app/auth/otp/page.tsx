import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export default function OTPPage() {
  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-(--border) bg-(--background) p-8 shadow-xl text-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-(--foreground)">Verify your email</h2>
          <p className="mt-4 text-sm text-(--muted-foreground)">
            We&apos;ve sent a 6-digit verification code to your email. Please enter it below to confirm your account.
          </p>
        </div>

        <form className="mt-8 space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Input 
                key={i} 
                type="text" 
                maxLength={1} 
                className="w-12 h-14 text-center text-lg font-bold" 
                placeholder="0" 
              />
            ))}
          </div>

          <div className="pt-4">
            <Link href="/" tabIndex={-1}>
              <Button type="button" className="w-full h-12 text-md">
                Verify Code
              </Button>
            </Link>
          </div>
        </form>

        <div className="mt-6 text-sm">
          <p className="text-(--muted-foreground)">
            Didn&apos;t receive the code?{" "}
            <button className="font-semibold text-(--primary) hover:underline focus:outline-none">
              Resend code
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
