import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { isCustomerPaid } from "@/lib/database";

export const runtime = "nodejs";

const credentialsSchema = z.object({
  email: z.string().email()
});

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET,
  providers: [
    CredentialsProvider({
      name: "Paid Subscriber",
      credentials: {
        email: {
          label: "Checkout Email",
          type: "email"
        }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const paid = await isCustomerPaid(parsed.data.email);

        if (!paid) {
          return null;
        }

        return {
          id: parsed.data.email.toLowerCase(),
          email: parsed.data.email.toLowerCase(),
          name: "Paid Subscriber"
        };
      }
    })
  ]
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
