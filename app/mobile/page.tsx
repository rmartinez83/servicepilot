import { redirect } from "next/navigation";

/** Alias URL for technician mobile jobs view (same as /tech). */
export default function MobileAliasPage() {
  redirect("/tech");
}
