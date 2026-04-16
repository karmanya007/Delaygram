import { clerkMiddleware } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (_auth, request) => {
  const traceId = request.headers.get("x-trace-id") ?? nanoid(12);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-trace-id", traceId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-trace-id", traceId);
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};