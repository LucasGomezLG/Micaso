import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Login del panel de corredor. Redirect URI configurado en Google
// Cloud Console hoy: solo http://localhost:3000/api/auth/callback/google
// — agregar el de producción ahí cuando haya dominio (ver
// ARQUITECTURA.md sección 11).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
});
