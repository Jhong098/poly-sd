import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-950">
      <SignIn />
    </div>
  )
}
