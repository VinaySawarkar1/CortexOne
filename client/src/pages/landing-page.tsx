import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Logged-in users skip the marketing page
  useEffect(() => {
    if (user) setLocation("/apps");
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/40">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md">C</div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">BizSuite</span>
              <p className="text-[11px] text-gray-500 -mt-1">by Reckonix</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth"><Button variant="ghost">Log in</Button></Link>
            <Link href="/auth"><Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-4">All-in-one business suite</span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 max-w-3xl mx-auto">
          Run your entire business from <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">one place</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          CRM, Sales, Inventory, Manufacturing, Purchasing and HR — modular apps that work together, with role-based access controlled by your administrator.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/auth"><Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Get started <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          <a href="#modules"><Button size="lg" variant="outline">Explore modules</Button></a>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
          {["Multi-company", "Role-based access", "Real-time data"].map((f) => (
            <span key={f} className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> {f}</span>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Everything you need, in modules</h2>
        <p className="text-center text-gray-500 mb-10">Enable only what your team uses. Access to each app is granted per user.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.filter((m) => m.id !== "settings").map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shadow-md mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{m.name}</h3>
                <p className="text-xs font-medium text-blue-600 mb-2">{m.tagline}</p>
                <p className="text-sm text-gray-600">{m.description}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {m.items.map((i) => (
                    <li key={i.href} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{i.title}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-10 text-center text-white shadow-lg">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <p className="mt-2 text-blue-100">Create an account or log in. Your administrator decides which apps you can access.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/auth"><Button size="lg" variant="secondary">Log in</Button></Link>
            <Link href="/auth"><Button size="lg" className="bg-white/10 hover:bg-white/20 border border-white/30">Register</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200/60 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} BizSuite · Reckonix Management System
      </footer>
    </div>
  );
}
