import { signOut } from "@/auth";

export default function PanelLogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        if (process.env.NODE_ENV !== "production") {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          cookieStore.delete("micaso_dev_user");
        }
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
        Cerrar sesión
      </button>
    </form>
  );
}
