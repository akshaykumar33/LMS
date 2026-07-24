import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/services/session";

export default async function Home() {
  const sessionUser = await getCurrentUser();

  if (sessionUser) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
