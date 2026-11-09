import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LogoMark, Wordmark } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { integrationModes } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await connection();
  if (integrationModes().data === "demo") redirect("/");
  return (
    <div className="grid min-h-dvh place-items-center bg-sidebar px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <LogoMark className="mx-auto size-12" />
          <h1 className="mt-4 text-xl text-white">
            <Wordmark />
          </h1>
          <p className="mt-1 text-sm text-sidebar-muted">Do the work. Let your agent get you paid.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
