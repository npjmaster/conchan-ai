import { NextResponse, type NextRequest } from "next/server";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("fly-client-ip") ??
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "-";
  const referer = request.headers.get("referer") ?? "-";

  console.info(
    JSON.stringify({
      type: "access",
      ts: new Date().toISOString(),
      method,
      path: `${nextUrl.pathname}${nextUrl.search}`,
      ip,
      userAgent,
      referer,
    }),
  );

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|map|txt)$).*)",
  ],
};
