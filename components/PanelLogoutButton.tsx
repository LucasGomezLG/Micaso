import { signOut } from "@/auth";

export default function PanelLogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
        Cerrar sesión
      </button>
    </form>
  );
}
