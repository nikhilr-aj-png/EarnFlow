"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";

export default function PrivacyPage() {
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
              Privacy Policy
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
              <h2 className="text-white text-2xl font-bold mb-4">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us when you create an account, complete tasks, or communicate with us. This includes your name, email address, payment details (like UPI ID), and any other information you choose to provide.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our services.</li>
                <li>Verify task completions and process rewards.</li>
                <li>Communicate with you about tasks, bonuses, and support.</li>
                <li>Monitor and analyze trends, usage, and activities.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">3. Sharing of Information</h2>
              <p>
                We do not sell your personal information. We may share information with third-party partners only to verify task completions (e.g., website visits or app downloads) or to process payments through secure gateways like Razorpay.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">4. Data Security</h2>
              <p>
                We use industry-standard security measures to protect your information from unauthorized access, disclosure, or destruction. However, no internet transmission is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">5. Your Choices</h2>
              <p>
                You can update or delete your account information at any time within your profile settings. You may also opt-out of promotional communications.
              </p>
            </section>

            <section>
              <h2 className="text-white text-2xl font-bold mb-4">6. Changes to the Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page with a new "Last Updated" date.
              </p>
            </section>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
