import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/libs/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "database" },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("=== USER SIGN IN ===");
      console.log("User:", JSON.stringify(user, null, 2));
      console.log("Account:", JSON.stringify(account, null, 2));
      console.log("Profile:", JSON.stringify(profile, null, 2));
      console.log("====================");

      // Sync Google profile data to DB on every sign-in
      if (user.id && profile) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            name: profile.name as string | undefined,
            image: profile.picture as string | undefined,
          },
        });
      }

      return true;
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
