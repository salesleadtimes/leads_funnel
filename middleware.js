import { NextResponse } from 'next/server';

// Simple HTTP Basic Auth so tender/lead data isn't publicly open on the internet.
// Set APP_USER and APP_PASSWORD in Vercel -> Project Settings -> Environment Variables.
export function middleware(req) {
  const user = process.env.APP_USER || 'admin';
  const pass = process.env.APP_PASSWORD || 'changeme';

  const authHeader = req.headers.get('authorization');
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

  if (authHeader === expected) {
    return NextResponse.next();
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="HP Sales Funnel"' }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
