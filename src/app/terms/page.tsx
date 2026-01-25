"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Terms of Service
            </h1>
            <p className="text-muted-foreground italic">Last Updated: January 2026</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="prose prose-invert max-w-none space-y-8 text-muted-foreground"
          >
            <section>
              <h2 className="text-white text-2xl font-bold mb-4">1. Acceptence of Terms</h2>
              <p>
                By accessing and using EarnFlow, you agree to comply with and be bound by these Terms of Service. If you do not agree, please refrain from using our platform.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">2. User Eligibility</h2>
              <p>
                You must be at least 18 years old or the legal age of majority in your jurisdiction to use EarnFlow. One account is allowed per individual. Multiple accounts will lead to permanent suspension.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">3. Earning and Tasks</h2>
              <p>
                Earnings are based on the successful completion of tasks. EarnFlow reserves the right to verify every task action. Fraudulent activities, including using bots, VPNs, or automated scripts, are strictly prohibited and will result in forfeiture of all earnings.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">4. Payouts and Withdrawals</h2>
              <p>
                Users can withdraw earnings once the minimum threshold is reached. Payout processing times may vary but typically occur within 48 hours. EarnFlow is not responsible for incorrect payment information provided by the user.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">5. Premium Membership</h2>
              <p>
                Premium memberships are non-refundable once activated. Premium features are subject to change as we improve our platform.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">6. Limitation of Liability</h2>
              <p>
                EarnFlow is provided "as is" without any warranties. We are not liable for any direct or indirect damages arising from your use of the platform or inability to use the platform.
              </p>
            </section>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
