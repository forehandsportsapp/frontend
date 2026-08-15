"use client";

import React from "react";

export type TabItem = { id: string; label: string };

type TabsProps = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
};

export default function Tabs({ tabs, activeId, onChange, ariaLabel = "Tabs" }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 p-1 rounded-lg bg-[var(--color-surface-elevated)] overflow-x-auto overflow-y-hidden no-scrollbar"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`min-h-[44px] px-4 rounded-md font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "bg-primary text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

