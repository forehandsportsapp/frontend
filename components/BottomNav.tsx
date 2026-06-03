"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type IconProps = {
  size?: number;
  className?: string;
};

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
};

const userLinks = [
  { href: "/user/home", label: "Home", icon: HomeIcon },
  { href: "/user/tournaments", label: "Tournaments", icon: TrophyIcon },
  { href: "/user/settings", label: "Profile", icon: Profile },
] satisfies readonly NavLink[];

const orgLinks = [
  { href: "/org/home", label: "Home", icon: HomeIcon },
  { href: "/org/tournaments", label: "Tournaments", icon: TrophyIcon },
  { href: "/org/settings", label: "Profile", icon: Profile },
] satisfies readonly NavLink[];

const appLinks = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/tournaments", label: "Tournaments", icon: TrophyIcon },
  { href: "/settings", label: "Profile", icon: Profile },
] satisfies readonly NavLink[];

function isLinkActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;

  if (href === "/settings") {
    return pathname.startsWith("/profile");
  }

  if (href === "/user/settings") {
    return pathname.startsWith("/user/profile");
  }

  if (href === "/org/settings") {
    return pathname.startsWith("/org/profile");
  }

  if (href === "/user/tournaments") {
    return pathname === "/tournaments" || pathname.startsWith("/tournaments/");
  }

  if (href === "/org/tournaments") {
    return pathname.startsWith("/org/tournaments");
  }

  return false;
}

function HomeIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TrophyIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function Profile({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ""}`.trim()}
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const isOrg = pathname.startsWith("/org");
  const isUser = pathname.startsWith("/user");
  const links = isOrg ? orgLinks : isUser ? userLinks : appLinks;

  const innerElements = ({
    icon: Icon,
    label,
    active,
  }: Omit<NavLink, "href"> & { active: boolean }) => (
    <>
      <Icon size={active ? 22 : 18} />
      <span className="text-sm">{label}</span>
    </>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div className="flex justify-around items-end pointer-events-auto">
        {links.map(({ href, label, icon }, index) => {
          const active = isLinkActive(pathname, href);
          const first = index == 0;
          const last = index == links.length - 1;
          return (
            <Link key={href} href={href}>
              <div
                className={`p-1 my-2 bg-[var(--nav-bar-bg)]
                  backdrop-blur-none

                  border-t-[1px]
                  border-b-[1px]
                  ${first && "border-l-[1px]"}
                  ${last && "border-r-[1px]"}
                  border-[var(--nav-bar-border)]
                  ${first && "rounded-tl-md rounded-bl-md"}
                ${last && "rounded-tr-md rounded-br-md"}
                ${!first && active && "rounded-tl-2xl"}
                ${!last && active && "rounded-tr-2xl"}
                `}
              >
                {active ? (
                  <div
                    className={`bg-gradient-to-b from-[#F28B28] via-[#ED6535] to-[#E85F3D] flex justify-center items-center flex-col p-3 text-white font-semibold
                    rounded-md
                    rounded-tr-2xl
                    rounded-tl-2xl
                    ${first && "rounded-tl-none"}
                    ${last && "rounded-tr-none"}
                      `}
                  >
                    {innerElements({ icon, label, active })}
                  </div>
                ) : (
                  <div className="px-2 py-2 flex justify-center items-center flex-col">
                    {innerElements({ icon, label, active })}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
