export const ACTIVE_WORKSPACE_COOKIE_NAME = "mission_control_workspace";
export const DEFAULT_WORKSPACE_SLUG = "north-star-lab";

export function getActiveWorkspaceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}
