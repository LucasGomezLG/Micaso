import { signOut } from "@/auth";
import PanelLogoutSubmitButton from "@/components/PanelLogoutSubmitButton";

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
      <PanelLogoutSubmitButton />
    </form>
  );
}
