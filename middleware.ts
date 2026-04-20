import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that require a signed-in user
const isProtected = createRouteMatcher([
  '/play/((?!T-).*)',   // /play/[levelId] — only Tier 1+ (not /play/T-*)
  '/profile(.*)',
  '/community/create',
])

// Tutorial levels (T-0 through T-3) are open to guests
export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
