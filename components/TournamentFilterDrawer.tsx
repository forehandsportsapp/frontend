"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { SlidersIcon, XIcon, SearchIcon, CalendarIcon, RefreshIcon } from "@/components/Icons";

const sports = ["Badminton", "Tennis", "Table Tennis", "Squash", "Pickleball"];
const locations = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai"];

type FilterDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  onReset: () => void;
  initialFilters?: any;
};

export default function TournamentFilterDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  initialFilters = {},
}: FilterDrawerProps) {
  const dragControls = useDragControls();
  const [selectedSport, setSelectedSport] = useState(initialFilters.sport || "");
  const [locationSearch, setLocationSearch] = useState(initialFilters.location || "");
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || "");
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || "");

  const handleReset = () => {
    setSelectedSport("");
    setLocationSearch("");
    setDateFrom("");
    setDateTo("");
    onReset();
  };

  const handleApply = () => {
    onApply({
      sport: selectedSport,
      location: locationSearch,
      dateFrom,
      dateTo,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.85 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 120 || info.velocity.y > 300) {
                onClose();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md bg-[var(--color-surface)] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] max-h-[85dvh]"
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 rounded-full bg-[var(--color-border)] opacity-50" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] transition-colors"
                  aria-label="Close"
                >
                  <XIcon size={20} />
                </button>
                <h2 className="text-xl font-bold text-[var(--color-text)]">Refine Results</h2>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-1.5 rounded-full border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 no-scrollbar pb-10">
              {/* Sport Selection */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-[var(--color-text)]">Select Sport</h3>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sport) => {
                    const isActive = selectedSport === sport;
                    return (
                      <button
                        key={sport}
                        onClick={() => setSelectedSport(isActive ? "" : sport)}
                        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-primary text-white shadow-md scale-105"
                            : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] opacity-80"
                        }`}
                      >
                        {sport}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Search Location */}
              <section className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-bold text-[var(--color-text)]">Search Location</label>
                  <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
                    <input
                      type="text"
                      placeholder="Search city or venue..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl py-3.5 pl-11 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc) => {
                    const isActive = locationSearch === loc;
                    return (
                      <button
                        key={loc}
                        onClick={() => setLocationSearch(isActive ? "" : loc)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-primary text-white shadow-sm"
                            : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] opacity-70"
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Schedule Window */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-[var(--color-text)]">Schedule Window</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ml-1">From</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ml-1">To</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sticky Footer */}
            <div className="p-6 pt-2 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
              <button
                onClick={handleApply}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
