"use client";

import Link from "next/link";
import { toQuery } from "@/lib/utils";
import { TrophyIcon } from "@/components/Icons";
import { sanitizeLogoUrl } from "@/lib/logo";


function MapPinIcon({ size = 12 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

export type ColorfulTournamentCardProps = {
    id: string;
    name: string;
    venue: string;
    address: string;
    sport: string;
    category: string;
    modes: string;
    entryFee?: string;
    ctaText?: string;
    colorVariant?: "orange" | "green" | "red" | "blue" | "purple";
    href?: string;
    logoText?: string;
    logoUrl?: string | null;
};

export default function ColorfulTournamentCard({
    id,
    name,
    venue,
    address,
    sport,
    category,
    modes,
    entryFee,
    ctaText = "Register",
    colorVariant = "orange",
    href,
    logoText,
    logoUrl,
}: ColorfulTournamentCardProps) {
    const url = `/tournaments/detail${toQuery({ id })}`
    const safeLogoUrl = sanitizeLogoUrl(logoUrl);

    const bgVariants = {
        orange: "from-orange-500 to-orange-700 dark:from-orange-600 dark:to-orange-800",
        green: "from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800",
        red: "from-rose-500 to-rose-700 dark:from-rose-600 dark:to-rose-800",
        blue: "from-blue-600 to-indigo-800 dark:from-blue-700 dark:to-indigo-900",
        purple: "from-purple-600 to-purple-900 dark:from-purple-700 dark:to-purple-950"
    };

    const btnVariants = {
        orange: "border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10",
        green: "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
        red: "border-rose-500 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10",
        blue: "border-blue-500 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10",
        purple: "border-purple-500 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-500/10"
    };

    const bgClass = bgVariants[colorVariant] || bgVariants.orange;
    const btnClass = btnVariants[colorVariant] || btnVariants.orange;

    return (
        <Link href={url} className="block group w-full active:scale-[0.98] transition-transform">
            {/* Reduced border radius from 24px to 16px */}
            <div className="relative overflow-hidden rounded-[16px] bg-[var(--color-surface)] shadow-sm transition-shadow duration-300 group-hover:shadow-md flex flex-col border border-[var(--color-border)]">

                {/* TOP SECTION - Reduced padding from p-5 to p-3 */}
                <div className={`relative bg-gradient-to-br ${bgClass} p-3 text-white flex-1 overflow-hidden`}>

                    {/* Scaled down geometric accents */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 blur-xl group-hover:bg-white/20 transition-colors pointer-events-none" />
                    <div className="absolute right-0 bottom-0 opacity-[0.05] pointer-events-none">
                        <svg width="80" height="80" viewBox="0 0 100 100">
                            <polygon points="100,0 100,100 0,100" fill="currentColor" />
                            <circle cx="80" cy="80" r="10" fill="currentColor" />
                        </svg>
                    </div>

                    <div className="relative z-10 flex flex-col h-full">

                        {/* Reduced Logo from w-12/h-12 to w-8/h-8, smaller text */}
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-black text-gray-900 shadow-sm dark:bg-[var(--color-surface-elevated)] dark:text-orange-400">
                            {safeLogoUrl ? (
                                <img src={safeLogoUrl} alt={name} className="h-full w-full object-cover" />
                            ) : (
                                <TrophyIcon size={18} className="text-gray-700 dark:text-orange-400" />
                            )}
                        </div>

                        <h3 className="mb-2 font-heading text-[18px] font-black leading-tight tracking-tight text-white drop-shadow-sm line-clamp-2">
                            {name}
                        </h3>

                        <div className="mb-3 flex items-center flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                            <span>{sport}</span>
                            <span className="w-1 h-1 rounded-full bg-white/60" />
                            <span>{category}</span>
                            <span className="w-1 h-1 rounded-full bg-white/60" />
                            <span>{modes}</span>
                        </div>

                        <div className="flex items-start gap-1.5 text-white/95 mt-auto">
                            <div className="mt-[2px] shrink-0 opacity-80">
                                <MapPinIcon size={13} />
                            </div>
                            <p className="truncate text-[11px] font-medium leading-snug">
                                <span className="font-bold">{venue}</span>, {address}
                            </p>
                        </div>
                    </div>
                </div>

                {/* BOTTOM SECTION - Reduced padding from px-5 py-4 to px-3 py-2.5 */}
                <div className="flex items-center justify-between bg-[var(--color-surface)] px-3 py-3">
                    <div>
                        <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                            Entry Fee
                        </p>
                        <p className="text-base font-black leading-none text-[var(--color-text)]">
                            {entryFee ? entryFee : "Free"}
                        </p>
                    </div>

                    <div className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[11px] font-bold transition-colors ${btnClass}`}>
                        {ctaText}
                    </div>
                </div>

            </div>
        </Link>
    );
}

