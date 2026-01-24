import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              EarnFlow
            </h3>
            <p className="text-sm text-muted-foreground">
              Your trusted platform for earning real rewards through simple tasks.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/how-to-earn" className="hover:text-primary">How to Earn</Link></li>
              <li><Link href="/plans" className="hover:text-primary">Premium Plans</Link></li>
              <li><Link href="/leaderboard" className="hover:text-primary">Leaderboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/contact" className="hover:text-primary">Contact Us</Link></li>
              <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Newsletter</h4>
            <p className="mb-4 text-sm text-muted-foreground">
              Subscribe to get updates on new tasks and bonuses.
            </p>
            {/* Input placeholder */}
          </div>
        </div>
        <div className="mt-8 border-t border-white/5 pt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} EarnFlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
