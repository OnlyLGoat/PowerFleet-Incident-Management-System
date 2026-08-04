import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserFullProfile, type FullUserProfile } from "@/lib/services/role";
import { AuthProvider } from "@/app/context/AuthContext";
import Header from "@/components/dashboard/Header";
import FloatingDock from "@/components/dashboard/FloatingDock";

async function getSessionUser(): Promise<FullUserProfile | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value || cookieStore.get("token")?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userID: number;
      tokenVersion: number;
    };

    const [user] = await db.select().from(users).where(eq(users.id, decoded.userID)).limit(1);
    if (user?.tokenVersion !== decoded.tokenVersion) return null;

    return await getUserFullProfile(user.id, user.name, user.email);
  } catch {
    return null;
  }
}

export default async function AuditLogsLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/");
  }

  if (user.role !== "Admin") {
    redirect("/incidents");
  }

  return (
    <AuthProvider initialUser={user}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500/20 selection:text-emerald-500">
        {/* Sticky Top Header */}
        <Header />

        {/* Main Route Content */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36">
          {children}
        </main>

        {/* Floating Dock Navigation */}
        <FloatingDock />
      </div>
    </AuthProvider>
  );
}
