import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-4xl font-bold">About EarnFlow</h1>
          <p className="text-xl text-muted-foreground text-justify">
            EarnFlow is a next-generation earning platform designed to connect users with meaningful tasks.
            Our mission is to provide a transparent, reliable, and rewarding way for anyone with a smartphone
            to earn a side income.
          </p>

          <div className="grid gap-8 md:grid-cols-2 mt-12">
            <div className="p-6 rounded-xl bg-card border border-white/5">
              <h3 className="text-xl font-semibold mb-3 text-amber-500">Our Vision</h3>
              <p className="text-muted-foreground">
                To become the world's most trusted micro-tasking platform, empowering millions to achieve financial freedom.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-white/5">
              <h3 className="text-xl font-semibold mb-3 text-amber-500">Our Values</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Transparency in payouts</li>
                <li>Respect for user time</li>
                <li>Security of data</li>
                <li>Community first approach</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
