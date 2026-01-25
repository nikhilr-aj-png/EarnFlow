"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is EarnFlow?",
    answer: "EarnFlow is a premier micro-task platform where users can earn rewards for completing simple digital tasks. We connect brands with a global community of earners."
  },
  {
    question: "How do I start earning?",
    answer: "Simply create a free account, go to the 'Tasks' section, and choose any available task. Some tasks may require you to watch a short ad, visit a website, or complete a quick quiz."
  },
  {
    question: "What are Premium Tasks?",
    answer: "Premium tasks are high-reward assignments reserved for our premium members. These tasks often pay 2-3x more than standard tasks and have zero ad requirements."
  },
  {
    question: "How do I withdraw my earnings?",
    answer: "You can request a withdrawal once you reach the minimum coin balance. We currently support UPI, Bank Transfer, and popular digital wallets. Processing usually takes 24-48 hours."
  },
  {
    question: "Is EarnFlow free to use?",
    answer: "Yes, EarnFlow is completely free to join and use. We offer an optional premium upgrade for those who want to maximize their earnings and unlock exclusive features."
  },
  {
    question: "Why do some tasks have a 60-second timer?",
    answer: "For 'Visit' tasks, our partners require a minimum engagement time to ensure quality traffic. Staying on the page for the full duration is necessary to verify the task and release your reward."
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h1>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about EarnFlow and how to maximize your digital earnings.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-sm shadow-xl"
          >
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-white/5">
                  <AccordionTrigger className="text-left font-bold text-lg hover:text-amber-500 transition-colors py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground">
              Still have questions? <a href="/contact" className="text-amber-500 font-bold hover:underline">Contact our support team</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
