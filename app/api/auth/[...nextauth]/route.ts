import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        username: {},
        password: {},
      },

      async authorize(credentials) {
        if (
          credentials?.username ===
            process.env.ADMIN_USERNAME &&
          credentials?.password ===
            process.env.ADMIN_PASSWORD
        ) {
          return {
            id: "1",
            name: "Admin",
          };
        }

        return null;
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };