import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Only apply to paths inside /games/
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/games/')) {
    const cookieHeader = request.headers.get("cookie") || "";
    
    // Vercel Best Practice 1.1: Check Cheap Conditions Before Async
    // If there's no auth session cookie present at all, fail fast without fetching
    if (!cookieHeader.includes("better-auth.session_token") && !cookieHeader.includes("__Secure-better-auth.session_token")) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const origin = request.nextUrl.origin;
    
    try {
      console.log('checking the game qith proxy')
      // Proxy the request to the auth session endpoint to verify the user
      const response = await fetch(`${origin}/api/auth/get-session`, {
        headers: {
          cookie: cookieHeader,
        },
      });

      // Handle raw unauthorized response or empty response
      if (!response.ok) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const session = await response.json();

      // If there's no session data, redirect to login
      if (!session || !session.user) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (e) {
      console.error("Proxy Auth Verification Error:", e);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/games/:path+'],
};
