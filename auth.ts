import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Login del panel de corredor. Redirect URIs autorizados en Google Cloud
// Console: http://localhost:3000/api/auth/callback/google (local) y
// https://www.micaso.com.ar/api/auth/callback/google (producción, sumado
// el 17 sept 2026 — ver ARQUITECTURA.md sección 4, "Confirmado
// funcionando de punta a punta").
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días de sesión persistente
    updateAge: 24 * 60 * 60, // renovar cada 24 horas con actividad
  },
});
