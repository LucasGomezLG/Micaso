import { LogOut } from "lucide-react";
import { signOut } from "@/auth";

export default function PanelLogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        cookieStore.delete("case_id");
        if (process.env.NODE_ENV !== "production") {
          cookieStore.delete("micaso_dev_user");
        }
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        style={{ color: "var(--ink-muted)" }}
      >
        <LogOut size={16} className="sm:hidden" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </form>
  );
}
