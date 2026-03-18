/**
 * Company membership role from company_members / invite (e.g. admin, technician, owner).
 */
export function isTechnicianMembershipRole(role: string | null | undefined): boolean {
  return (role ?? "").trim().toLowerCase() === "technician";
}

/** Narrow phone-sized viewports (post-login redirect, banners). */
export function isMobileTechViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}
