"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState<string>("");

  const sections = [
    { id: "definitions", title: "1. Definitions" },
    { id: "eligibility", title: "2. Eligibility & Who May Use the Service" },
    { id: "account", title: "3. Account Registration & Security" },
    { id: "roles", title: "4. Roles & Organizations" },
    { id: "tournaments", title: "5. Tournaments & Live Scoring" },
    { id: "payments", title: "6. Payments, Fees & Refunds" },
    { id: "user-content", title: "7. User Content & Licenses" },
    { id: "acceptable-use", title: "8. Acceptable Use" },
    { id: "privacy", title: "9. Privacy & Data Handling" },
    { id: "third-party", title: "10. Third-Party Services" },
    { id: "intellectual-property", title: "11. Intellectual Property" },
    { id: "disclaimers", title: "12. Disclaimers" },
    { id: "limitation", title: "13. Limitation of Liability" },
    { id: "indemnity", title: "14. Indemnity" },
    { id: "suspension", title: "15. Suspension & Termination" },
    { id: "changes", title: "16. Changes to Terms" },
    { id: "governing-law", title: "17. Governing Law & Disputes" },
    { id: "miscellaneous", title: "18. Miscellaneous" },
    { id: "contact", title: "19. Contact" },
  ];

  // Optional smooth scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 150; // offset for header

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // initialize
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100, // Account for sticky header
        behavior: "smooth",
      });
    }
    // Update URL hash without jumping
    window.history.pushState(null, "", `#${id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] font-sans flex flex-col selection:bg-[#ff7a1a]/20">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-background)]/80 backdrop-blur-xl border-b border-[var(--color-border)]/30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/login"
            className="group flex items-center gap-2 text-[14px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-border)]/10 group-hover:bg-[#ff7a1a]/10 group-hover:text-[#ff7a1a] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            Back to Login
          </Link>
          <div className="flex items-center gap-2">
             <img src="/forehand_logo.png" alt="Forehand Logo" className="w-6 h-6 object-contain" />
             <span className="text-sm font-black tracking-tight text-[#ff7a1a]">FOREHAND</span>
          </div>
        </div>
      </header>

      {/* Main Layout (Mobile First) */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16 w-full flex flex-col lg:flex-row gap-8 lg:gap-20">
        
        {/* Sticky Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:block w-72 shrink-0 lg:order-1">
          <div className="sticky top-32">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-6 ml-4">
              Table of Contents
            </h3>
            <nav className="flex flex-col space-y-1 border-l-2 border-[var(--color-border)]/30 relative">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(e) => scrollToSection(e, section.id)}
                  className={`relative pl-4 py-2 text-[14px] font-medium transition-all duration-200 hover:text-[var(--color-text)] ${
                    activeSection === section.id
                      ? "text-[#ff7a1a]"
                      : "text-[var(--color-text-secondary)]/70"
                  }`}
                >
                  {/* Active Indicator Line */}
                  {activeSection === section.id && (
                    <div className="absolute left-[-2px] top-0 bottom-0 w-[2px] bg-[#ff7a1a] rounded-full shadow-[0_0_8px_rgba(255,122,26,0.6)]" />
                  )}
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 lg:order-2">
          {/* Page Title & Meta */}
          <div className="mb-8 lg:mb-16 border-b border-[var(--color-border)]/20 pb-6 lg:pb-10">
            <h1 className="text-3xl sm:text-5xl font-black text-[var(--color-text)] tracking-tight mb-4 lg:mb-6 leading-tight">
              Terms of <span className="text-[#ff7a1a]">Service</span>
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Last Updated: August 2026
              </div>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-[var(--color-border)]"></div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Please read these terms carefully.
              </div>
            </div>
          </div>

          {/* Table of Contents (Mobile Only) */}
          <div className="lg:hidden mb-10 bg-[var(--color-border)]/5 p-5 rounded-2xl border border-[var(--color-border)]/10">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">
              Table of Contents
            </h3>
            <nav className="flex flex-col space-y-3">
              {sections.map((section) => (
                <a
                  key={`mobile-${section.id}`}
                  href={`#${section.id}`}
                  onClick={(e) => scrollToSection(e, section.id)}
                  className={`text-[14px] font-medium transition-colors ${
                    activeSection === section.id
                      ? "text-[#ff7a1a]"
                      : "text-[var(--color-text)] hover:text-[#ff7a1a]"
                  }`}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>

          {/* Legal Text Content */}
          <div className="space-y-10 sm:space-y-16 text-[15px] sm:text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
            
            {/* Section 1 */}
            <section id="definitions" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">1.</span>
                <span>Definitions</span>
              </h2>
              <ul className="space-y-4 pl-4 border-l-2 border-[var(--color-border)]/20">
                <li><strong className="text-[var(--color-text)] font-semibold">“Forehand,” “we,” “us,” “our”:</strong> the operator of the Service.</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“You,” “User”:</strong> any person who accesses or uses the Service.</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Player”:</strong> a user participating in or viewing tournaments/matches.</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Organizer”:</strong> a user who manages tournaments/events through an Organization.</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Scorer”:</strong> a user designated to score a match (and/or an organizer who scores).</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Organization” / “Org”:</strong> an entity profile within the Service used to manage tournaments and members (e.g., clubs, academies, schools, corporates; verification may apply).</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Tournament” / “Event”:</strong> a competition listing and its related registrations, fixtures, matches, rules, and results.</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Match”:</strong> a specific game instance with participants, scoring events, and outcomes.</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Content”:</strong> text, images, photos, logos, banners, profile details, tournament descriptions/rules, and any other information posted to the Service.</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“User Content”:</strong> Content submitted by users (including organizers).</li>
                <li><strong className="text-[var(--color-text)] font-semibold">“Live Scoring”:</strong> real-time or near-real-time scoring updates, including offline capture with later synchronization.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="eligibility" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">2.</span>
                <span>Eligibility & Who May Use the Service</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">2.1 Age requirement.</strong> You must be at least 13 years old to use the Service. If you are under the age of 18, you represent that you have permission of a parent/guardian to use the Service. Certain features may require additional eligibility or verification.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">2.2 Minors and parental contact.</strong> For users under 17, the Service may request and store a parent/guardian contact for account management, safety, and compliance (e.g., school workflows).</p>
                <p><strong className="text-[var(--color-text)] font-semibold">2.3 Local law compliance.</strong> You may use the Service only if you are legally permitted to do so in your jurisdiction.</p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="account" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">3.</span>
                <span>Account Registration, Security & Profile Information</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">3.1 Sign-in methods.</strong> The Service may support sign-in via Google account sign-in, Phone/OTP, WhatsApp OTP, and/or Guest access for limited functionality.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">3.2 Accurate information.</strong> You agree to provide accurate and current information, including (where applicable): full name, city/location, active sports, gender, date of birth, profile photo, playing hand, and email.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">3.3 Profile QR codes.</strong> The Service may generate and display QR codes for player profiles and teams/tournaments for discovery and sharing.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">3.4 Account security.</strong> You are responsible for safeguarding your login credentials and for all activity under your account.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">3.5 Session stability.</strong> The Service may not reliably support multiple simultaneous sessions on multiple devices. If you experience sync issues, you may be required to log out of other devices.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="roles" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">4.</span>
                <span>Roles: Players, Organizers, Scorers, Organizations</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">4.1 Organizations.</strong> To create and manage tournaments, users may need to create or join an Organization. Organizations may have roles such as owner/admin/member/scorer with different permissions.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">4.2 Organization verification.</strong> Some Organization types (e.g., schools/academies) may require verification.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">4.3 Invitations and membership.</strong> Orgs can invite members; users may be able to switch context between individual profile and organization dashboards.</p>
                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">4.4 Organizer responsibilities.</strong> 
                  <ul className="list-disc pl-5 space-y-2 ml-4 marker:text-[#ff7a1a]">
                    <li>accurate tournament listings (venue, rules, entry fee, format)</li>
                    <li>participant approvals/management where applicable</li>
                    <li>scheduling and court assignments</li>
                    <li>score dispute handling and overrides (if enabled)</li>
                    <li>communicating critical changes</li>
                  </ul>
                </div>
                <p><strong className="text-[var(--color-text)] font-semibold">4.5 Scorer responsibilities.</strong> Scorers are responsible for accurately recording match events and scores. In some flows, players may self-score (if enabled).</p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="tournaments" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">5.</span>
                <span>Tournaments, Matches, Brackets & Live Scoring</span>
              </h2>
              <div className="space-y-6">
                <p><strong className="text-[var(--color-text)] font-semibold">5.1 Tournament discovery.</strong> Tournaments may be discoverable via in-app lists and filters, and/or direct links/QR codes shared by organizers.</p>
                
                <div className="bg-[var(--color-border)]/5 p-5 rounded-xl border border-[var(--color-border)]/10">
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">5.2 Registration and participation.</strong>
                  <ul className="list-disc pl-5 space-y-2 marker:text-[#ff7a1a]">
                    <li>Players may register for singles and doubles (where supported).</li>
                    <li>For doubles registration, a player may add a partner phone number, and the partner may need an account on Forehand to participate.</li>
                    <li>Organizers may approve registrations from the organizer view.</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">5.3 Brackets/fixtures and changes.</strong>
                  <ul className="list-disc pl-5 space-y-2 ml-4 marker:text-[var(--color-border)]">
                    <li>Brackets/fixtures may be generated after registration closes or when the organizer generates them.</li>
                    <li>In the current MVP logic, brackets may not be changeable/regenerable after publication (or may be limited); you acknowledge that matchups and byes may be automated based on participant counts.</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">5.4 Scheduling and attendance.</strong>
                  <ul className="list-disc pl-5 space-y-2 ml-4 marker:text-[var(--color-border)]">
                    <li>Match times/courts may be assigned by organizers (where supported).</li>
                    <li>You are responsible for arriving on time and following organizer instructions.</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">5.5 Live scoring (including offline-first).</strong>
                  <ul className="list-disc pl-5 space-y-2 ml-4 marker:text-[var(--color-border)]">
                    <li>The Service may support offline-first scoring with later sync. You acknowledge that connectivity issues can affect the immediacy and accuracy of live updates.</li>
                    <li>The Service may provide an undo, pause, restart, and submit/lock flow (feature set may vary by sport/version).</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">5.6 Disputes and corrections.</strong>
                  <ul className="list-disc pl-5 space-y-2 ml-4 marker:text-[var(--color-border)]">
                    <li>Dispute flagging and organizer override/edit capabilities may exist.</li>
                    <li>Finality rules may apply (e.g., once submitted, results may lock; in some organizer flows edits may be allowed for disputes).</li>
                  </ul>
                </div>

                <p><strong className="text-[var(--color-text)] font-semibold">5.7 Quick matches.</strong> Some “quick match” modes may not be recorded as part of your permanent stats/history.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="payments" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">6.</span>
                <span>Payments, Fees, Refunds, Withdrawals & Chargebacks</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">6.1 Payment methods and collection.</strong> Depending on the tournament, payments may be collected directly via organizer’s UPI/QR, at the venue (offline), and/or through an in-app payment gateway (planned/possible).</p>
                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">6.2 Forehand’s role in payments.</strong>
                  <ul className="list-disc pl-5 space-y-2 ml-4 marker:text-[#ff7a1a]">
                    <li>Where payment occurs outside the app (UPI/QR/venue), Forehand is not a payment intermediary and does not control the transaction.</li>
                    <li>Where payment occurs in-app, Forehand may facilitate payments via third-party payment processors; in that case, additional processor terms apply.</li>
                  </ul>
                </div>
                <p><strong className="text-[var(--color-text)] font-semibold">6.3 Refunds and withdrawals.</strong> Refund eligibility depends on the tournament’s rules and timing (e.g., before bracket generation vs. after). If the app includes “Withdraw/Leave” flows, those rules will apply. Otherwise, refunds/withdrawals are handled by the organizer.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">6.4 Chargebacks.</strong> If you initiate a chargeback for an in-app payment, Forehand and/or the organizer may suspend your participation or account pending investigation.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">6.5 Future monetization.</strong> The Service may evolve to include subscriptions, premium features, ticketing, e-commerce/marketplace, points redemption, sponsorships, and booking commissions. If introduced, additional terms (and pricing) will be presented to you at the time of purchase.</p>
              </div>
            </section>

            {/* Additional Sections Follow Similar Refined Styling */}
            
            {/* Section 7 */}
            <section id="user-content" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">7.</span>
                <span>User Content, Tournament Data, and Licenses</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">7.1 Your ownership.</strong> You retain ownership of your User Content, subject to the license you grant below.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">7.2 License to Forehand.</strong> You grant Forehand a worldwide, non-exclusive, royalty-free license to host, store, reproduce, modify (for formatting/display), publish, display, and distribute your User Content as necessary to operate, improve, and provide the Service.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">7.3 Tournament records and results.</strong> Tournament results, match logs, and related records may be retained as part of the integrity of competitions and the Service’s records, even if you request account deletion, subject to applicable law and our privacy practices.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">7.4 Organizer content.</strong> Organizers represent they have rights to use any logos, banners, and sponsor marks uploaded.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section id="acceptable-use" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">8.</span>
                <span>Acceptable Use & Prohibited Conduct</span>
              </h2>
              <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10">
                <p className="font-semibold text-[var(--color-text)] mb-4">You agree not to:</p>
                <ul className="space-y-3">
                  <li className="flex gap-3"><span className="text-red-500 font-semibold shrink-0 w-8">8.1</span> <span>Break the law or violate any sports body rules applicable to you.</span></li>
                  <li className="flex gap-3"><span className="text-red-500 font-semibold shrink-0 w-8">8.2</span> <span>Manipulate results, falsify scores, impersonate others, create fake accounts, or misrepresent identity/eligibility.</span></li>
                  <li className="flex gap-3"><span className="text-red-500 font-semibold shrink-0 w-8">8.3</span> <span>Harass, threaten, or discriminate against anyone.</span></li>
                  <li className="flex gap-3"><span className="text-red-500 font-semibold shrink-0 w-8">8.4</span> <span>Upload unlawful content, including content that infringes intellectual property or privacy rights.</span></li>
                  <li className="flex gap-3"><span className="text-red-500 font-semibold shrink-0 w-8">8.5</span> <span>Attempt to hack or disrupt the Service, including abusing APIs, scraping, reverse engineering (except where prohibited by law), or circumventing security.</span></li>
                  <li className="flex gap-3"><span className="text-red-500 font-semibold shrink-0 w-8">8.6</span> <span>Exploit minors or collect personal data about minors beyond what is permitted.</span></li>
                  <li className="flex gap-3"><span className="text-red-500 font-semibold shrink-0 w-8">8.7</span> <span>Use the Service for betting or gambling unless explicitly enabled by Forehand in writing with lawful compliance.</span></li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section id="privacy" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">9.</span>
                <span>Privacy, Data Handling, and Communications</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">9.1 Privacy Policy.</strong> Your use of the Service is also governed by our Privacy Policy (to be published separately). If these Terms conflict with the Privacy Policy on a privacy matter, the Privacy Policy controls.</p>
                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">9.2 Data we may process.</strong>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    <li className="bg-[var(--color-border)]/5 px-4 py-3 rounded-lg text-sm border border-[var(--color-border)]/10">Account and profile data</li>
                    <li className="bg-[var(--color-border)]/5 px-4 py-3 rounded-lg text-sm border border-[var(--color-border)]/10">Contact info & phone numbers</li>
                    <li className="bg-[var(--color-border)]/5 px-4 py-3 rounded-lg text-sm border border-[var(--color-border)]/10">Parent/guardian contacts</li>
                    <li className="bg-[var(--color-border)]/5 px-4 py-3 rounded-lg text-sm border border-[var(--color-border)]/10">Tournament & match data</li>
                    <li className="bg-[var(--color-border)]/5 px-4 py-3 rounded-lg text-sm border border-[var(--color-border)]/10">Location data (if enabled)</li>
                    <li className="bg-[var(--color-border)]/5 px-4 py-3 rounded-lg text-sm border border-[var(--color-border)]/10">Device, usage & analytics</li>
                  </ul>
                </div>
                <p><strong className="text-[var(--color-text)] font-semibold">9.3 Notifications.</strong> You agree we may send you transactional communications, invitations, and reminders subject to your settings and device permissions.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">9.4 Public vs restricted visibility.</strong> Some information may be visible to other users, such as tournament details, brackets, match scores, and participant lists, live match spectator views, and player profiles.</p>
              </div>
            </section>

            {/* Section 10 */}
            <section id="third-party" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">10.</span>
                <span>Third-Party Services, Links, and Integrations</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">10.1</strong> The Service may link to third-party services (e.g., Google sign-in, payment processors, venue booking partners, streaming tools, external documents). We do not control those services.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">10.2</strong> You agree that your use of third-party services is governed by their terms and policies, and Forehand is not responsible for third-party acts or omissions.</p>
              </div>
            </section>

            {/* Section 11 */}
            <section id="intellectual-property" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">11.</span>
                <span>Intellectual Property</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">11.1 Forehand IP.</strong> The Service, including its software, UI, design elements, templates, and branding, is owned by Forehand and protected by intellectual property laws.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">11.2 Limited license to you.</strong> Subject to these Terms, Forehand grants you a limited, non-transferable, revocable license to use the Service for your personal or organizational sports purposes.</p>
              </div>
            </section>

            {/* Section 12 */}
            <section id="disclaimers" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">12.</span>
                <span>Disclaimers (Service, Sports, Results, and Safety)</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">12.1 No warranty.</strong> The Service is provided “AS IS” and “AS AVAILABLE.” We do not guarantee that the Service will be uninterrupted, error-free, or perfectly accurate.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">12.2 Sports risk & safety.</strong> Sports participation involves inherent risks (injury, illness, property damage). You assume all risks associated with participating in tournaments/matches arranged through the Service.</p>
                <div>
                  <strong className="text-[var(--color-text)] font-semibold block mb-3">12.3 No guarantee of outcomes.</strong> Forehand does not guarantee:
                  <ul className="list-disc pl-5 space-y-1 ml-4 marker:text-[var(--color-border)]">
                    <li>match fairness,</li>
                    <li>organizer conduct,</li>
                    <li>venue quality,</li>
                    <li>the accuracy of user-entered data,</li>
                    <li>the resolution of disputes to your satisfaction.</li>
                  </ul>
                </div>
                <p><strong className="text-[var(--color-text)] font-semibold">12.4 Live scoring limitations.</strong> Due to offline scoring, sync delays, and human input, live scores may be delayed, incomplete, or inaccurate at times.</p>
              </div>
            </section>

            {/* Section 13 */}
            <section id="limitation" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">13.</span>
                <span>Limitation of Liability</span>
              </h2>
              <div className="bg-[var(--color-border)]/5 p-6 rounded-2xl border border-[var(--color-border)]/10">
                <p className="font-semibold text-[var(--color-text)] mb-4">To the maximum extent permitted by law:</p>
                <ul className="space-y-4">
                  <li className="flex gap-3"><span className="text-[var(--color-text)] font-semibold shrink-0 w-8">13.1</span> <span>Forehand will not be liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business interruption.</span></li>
                  <li className="flex gap-3"><span className="text-[var(--color-text)] font-semibold shrink-0 w-8">13.2</span> <span>Forehand’s total liability for any claim arising out of or relating to the Service will not exceed the amount you paid to Forehand (if any) for the Service in the 3 months before the event giving rise to the claim, or INR 1,000, whichever is greater.</span></li>
                  <li className="flex gap-3"><span className="text-[var(--color-text)] font-semibold shrink-0 w-8">13.3</span> <span>Some jurisdictions do not allow certain limitations; in that case, liability will be limited to the extent permitted.</span></li>
                </ul>
              </div>
            </section>

            {/* Section 14 */}
            <section id="indemnity" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">14.</span>
                <span>Indemnity</span>
              </h2>
              <div className="space-y-4">
                <p>You agree to defend, indemnify, and hold harmless Forehand from any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from:</p>
                <ul className="list-disc pl-5 space-y-2 ml-4 marker:text-[#ff7a1a]">
                  <li>your use of the Service,</li>
                  <li>your User Content,</li>
                  <li>your violation of these Terms,</li>
                  <li>disputes between you and other users (players, organizers, venues, sponsors).</li>
                </ul>
              </div>
            </section>

            {/* Section 15 */}
            <section id="suspension" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">15.</span>
                <span>Suspension, Termination & Account/Data Requests</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">15.1 Suspension/termination by Forehand.</strong> We may suspend or terminate your access if we reasonably believe you violated these Terms, created risk to others, engaged in fraud, or harmed the Service.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">15.2 Termination by you.</strong> You may stop using the Service at any time. Account deletion may be available via support request.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">15.3 Data retention.</strong> Even if your account is deleted, certain records (such as match results, tournament logs, and payment records) may be retained where necessary for integrity, disputes, legal compliance, or legitimate business purposes.</p>
              </div>
            </section>

            {/* Section 16 */}
            <section id="changes" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">16.</span>
                <span>Changes to the Service or Terms</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">16.1</strong> We may update the Service and these Terms from time to time.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">16.2</strong> If changes are material, we will provide notice (e.g., in-app prompt). Continued use after the effective date means you accept the updated Terms.</p>
              </div>
            </section>

            {/* Section 17 */}
            <section id="governing-law" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">17.</span>
                <span>Governing Law, Disputes, Arbitration/Forums</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">17.1 Governing law (India).</strong> Unless required otherwise by mandatory law, these Terms are governed by the laws of India.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">17.2 Venue/jurisdiction.</strong> Courts located in India will have jurisdiction over disputes not subject to arbitration (or where arbitration is unenforceable).</p>
                <p><strong className="text-[var(--color-text)] font-semibold">17.3 Informal resolution.</strong> Before filing a formal claim, you agree to contact us and attempt to resolve the dispute informally.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">17.4 Arbitration.</strong> You may choose to include a binding arbitration clause and waiver of class actions; enforceability and optimal drafting depend on your specific corporate structure and jurisdiction.</p>
              </div>
            </section>

            {/* Section 18 */}
            <section id="miscellaneous" className="scroll-mt-32">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-[#ff7a1a] shrink-0">18.</span>
                <span>Miscellaneous</span>
              </h2>
              <div className="space-y-5">
                <p><strong className="text-[var(--color-text)] font-semibold">18.1 Severability.</strong> If any provision is found unenforceable, the remaining provisions remain in effect.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">18.2 No waiver.</strong> Failure to enforce a provision is not a waiver.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">18.3 Assignment.</strong> You may not assign your rights under these Terms without our consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.</p>
                <p><strong className="text-[var(--color-text)] font-semibold">18.4 Entire agreement.</strong> These Terms and the Privacy Policy form the entire agreement regarding the Service.</p>
              </div>
            </section>

            {/* Section 19 */}
            <section id="contact" className="scroll-mt-32 pb-24">
              <div className="bg-[#ff7a1a]/5 border border-[#ff7a1a]/20 p-8 rounded-2xl">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-5 flex items-baseline gap-2 sm:gap-3">
                  <span className="text-[#ff7a1a] shrink-0">19.</span>
                  <span>Contact</span>
                </h2>
                <p className="text-[15px] sm:text-[16px] leading-relaxed text-[var(--color-text-secondary)] mb-8">
                  For support, bug reports, disputes, or legal notices, you can contact us through the app support feature or directly via:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <a href="mailto:forehandsportsapp@gmail.com" className="flex items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)]/50 px-4 py-4 rounded-xl hover:border-[#ff7a1a]/50 hover:bg-[#ff7a1a]/5 transition-colors group w-full shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-[#ff7a1a]/10 flex items-center justify-center text-[#ff7a1a] group-hover:bg-[#ff7a1a] group-hover:text-white transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-[14px] sm:text-[15px] text-[var(--color-text)] group-hover:text-[#ff7a1a] transition-colors truncate">forehandsportsapp@gmail.com</span>
                  </a>
                  <a href="tel:+919522195954" className="flex items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)]/50 px-4 py-4 rounded-xl hover:border-[#ff7a1a]/50 hover:bg-[#ff7a1a]/5 transition-colors group w-full shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-[#ff7a1a]/10 flex items-center justify-center text-[#ff7a1a] group-hover:bg-[#ff7a1a] group-hover:text-white transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-[14px] sm:text-[15px] text-[var(--color-text)] group-hover:text-[#ff7a1a] transition-colors shrink-0">+91 9522195954</span>
                  </a>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
