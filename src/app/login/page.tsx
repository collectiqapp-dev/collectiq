import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { FullLogo } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { integrationModes } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  await connection();
  if (integrationModes().data === "demo") redirect("/overview");
  return (
    <div className="grid min-h-dvh place-items-center bg-sidebar px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6">
          <FullLogo onDark className="mx-auto max-w-[320px]" />
        </h1>
        <LoginForm initialMode={mode === "signup" ? "signup" : "login"} />
        <p className="mt-4 text-center text-xs">
          <Link href="/" className="text-sidebar-muted hover:text-white">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
