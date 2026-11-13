import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Create an account") };
}

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
