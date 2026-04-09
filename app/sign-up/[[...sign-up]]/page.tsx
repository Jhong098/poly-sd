import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-950">
      <SignUp />
    </div>
  )
}
