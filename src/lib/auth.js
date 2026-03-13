import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Load advisors from env vars
function getAdvisors() {
  const advisors = [];
  for (let i = 0; i < 50; i++) {
    const email = process.env[`ADVISOR_${i}_EMAIL`];
    if (!email) break;
    advisors.push({
      email: email.toLowerCase(),
      password: process.env[`ADVISOR_${i}_PASSWORD`],
      name: process.env[`ADVISOR_${i}_NAME`],
      notionId: process.env[`ADVISOR_${i}_NOTION_ID`],
    });
  }
  return advisors;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Advisor Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const advisors = getAdvisors();
        const advisor = advisors.find(
          (a) => a.email === credentials.email.toLowerCase()
        );

        if (!advisor) return null;
        if (credentials.password !== advisor.password) return null;

        return {
          id: advisor.notionId,
          email: advisor.email,
          name: advisor.name,
          notionId: advisor.notionId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.notionId = user.notionId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.notionId) {
        session.user.notionId = token.notionId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});
