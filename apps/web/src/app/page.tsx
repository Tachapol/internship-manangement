import { redirect } from "next/navigation";

// Root page — middleware handles auth redirect.
// This is a server component fallback.
export default function RootPage() {
  redirect("/auth/login");
}
