import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);
    const { pathname } = request.nextUrl;

    const isAuthRoute = ["/", "/sign-in", "/sign-up"].includes(pathname);
    const isAppRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/tasks") || pathname.startsWith("/settings");

    if (!sessionCookie && isAppRoute) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    if (sessionCookie && isAuthRoute) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/sign-in", "/sign-up", "/dashboard/:path*"],
};