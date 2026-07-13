import Link from "next/link";
import { Shield, Coins, ArrowRightLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-yellow-400" />
          <span className="text-xl font-bold">Trust Issues</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-yellow-400">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-block px-4 py-1 mb-6 rounded-full bg-yellow-400/10 border border-yellow-400/30">
          <span className="text-yellow-400 text-sm font-medium">
            Freelance accountability platform
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Freelance Without
          <br />
          <span className="text-yellow-400">The Drama</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Escrow payments. Credit reputation. Backup freelancers. Stop getting
          ghosted. Start shipping with confidence.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold text-lg px-8"
            >
              Start Hiring
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="lg"
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-900 text-lg px-8"
            >
              Find Work
            </Button>
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          Three Systems. Zero Trust Required.
        </h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          We built the accountability layer that informal freelancing is missing.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-6">
              <Shield className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Escrow Protection</h3>
            <p className="text-gray-400 leading-relaxed">
              Recruiters deposit full payment upfront. Funds are locked in
              escrow and released only when milestones are completed and
              verified. No more paying for half-done work.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-6">
              <Coins className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Credit Reputation</h3>
            <p className="text-gray-400 leading-relaxed">
              Every freelancer has a public credit score. Complete projects to
              earn credits. Ghost a project and lose them. Your reputation is
              your currency.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-6">
              <ArrowRightLeft className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Backup Relay</h3>
            <p className="text-gray-400 leading-relaxed">
              If a freelancer disappears, the project does not die. Continuous
              documentation and AI-powered handover briefs let a backup
              freelancer pick up exactly where work stopped.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8 mt-12">
            <div>
              <div className="w-10 h-10 bg-yellow-400 text-black font-bold rounded-full flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Post a Project</h4>
              <p className="text-gray-400 text-sm">
                Define milestones, set deadlines, deposit payment into escrow.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-yellow-400 text-black font-bold rounded-full flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Hire a Freelancer</h4>
              <p className="text-gray-400 text-sm">
                Browse applications. Freelancer stakes credits to accept the
                project.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-yellow-400 text-black font-bold rounded-full flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Milestone Payments</h4>
              <p className="text-gray-400 text-sm">
                Payment releases only after each milestone is submitted and
                approved.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-yellow-400 text-black font-bold rounded-full flex items-center justify-center mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold mb-2">Protected Delivery</h4>
              <p className="text-gray-400 text-sm">
                If anything goes wrong, disputes, relays, and escrow keep both
                sides safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Ready to Fix Freelancing?
        </h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Whether you hire freelancers or you are one, Trust Issues makes sure
          everyone delivers and everyone gets paid.
        </p>
        <Link href="/register">
          <Button
            size="lg"
            className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold text-lg px-10"
          >
            Create Your Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-gray-800 py-8 mt-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-400" />
            <span className="font-semibold">Trust Issues</span>
          </div>
          <p className="text-gray-500 text-sm">
            Built to fix freelancing. One project at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}