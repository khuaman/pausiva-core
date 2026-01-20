import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check user but don't refresh token automatically
  // This prevents auto-restoration of sessions
  const { data: { user } } = await supabase.auth.getUser()
  
  // If there's no user, clear any lingering auth cookies
  if (!user) {
    const authCookies = request.cookies.getAll().filter(cookie => 
      cookie.name.includes('supabase') || cookie.name.includes('auth')
    )
    
    authCookies.forEach(cookie => {
      supabaseResponse.cookies.delete(cookie.name)
    })
  }

  return supabaseResponse
}
