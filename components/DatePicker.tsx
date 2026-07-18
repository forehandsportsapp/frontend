"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarIcon,
  ChevronRightIcon,
} from "@/components/Icons";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  id?: string;
  isDob?: boolean;
  triggerClassName?: string;
  customTrigger?: React.ReactNode;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  error,
  id,
  isDob = false,
  triggerClassName = "",
  customTrigger,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Initial view date setup
  const initialViewDate = useMemo(() => {
    if (value) return new Date(value);
    if (isDob) {
      // Default to 25 years ago for DOB fields to make navigation faster
      const date = new Date();
      date.setFullYear(date.getFullYear() - 25);
      return date;
    }
    return new Date();
  }, [value, isDob]);

  const [viewDate, setViewDate] = useState<Date>(initialViewDate);
  const [mode, setMode] = useState<"days" | "months" | "years">(
    isDob && !value ? "years" : "days"
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Safely detect mobile screens
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update view date when the value changes externally (e.g. form reset or pre-population)
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  // Click outside detection for desktop popover
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  // Calendar Helpers for Days View
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0,
  ).getDate();

  const firstDayIndex = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1,
  ).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Calendar Helpers for Years View
  // We display 12 years in a grid
  const yearStart = Math.floor(viewDate.getFullYear() / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  // Event handlers for header buttons
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "days") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (mode === "months") {
      setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    } else if (mode === "years") {
      setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "days") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else if (mode === "months") {
      setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
    } else if (mode === "years") {
      setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1));
    }
  };

  const selectDay = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const selectMonth = (monthIndex: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
    setMode("days");
  };

  const selectYear = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setMode("months");
  };

  const displayValue = useMemo(() => {
    if (!value) return "";
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [value]);

  const triggerOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Reset view date and mode when opening
    if (value) {
      setViewDate(new Date(value));
      setMode("days");
    } else {
      setViewDate(initialViewDate);
      setMode(isDob ? "years" : "days");
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {customTrigger ? (
        <div onClick={triggerOpen}>{customTrigger}</div>
      ) : (
        <div
          onClick={triggerOpen}
          className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border flex items-center justify-between cursor-pointer transition-all duration-200 ${
            isOpen
              ? "border-primary ring-2 ring-primary/20 shadow-sm"
              : error
              ? "border-red-500"
              : "border-[var(--color-border)] hover:border-gray-400"
          } ${triggerClassName}`}
        >
          <span
            className={
              value
                ? "text-[var(--color-text)] font-semibold text-[15px]"
                : "text-[var(--color-text-secondary)] opacity-30 font-medium text-[15px]"
            }
          >
            {displayValue || placeholder}
          </span>
          <CalendarIcon
            className={`transition-colors ${
              isOpen ? "text-primary" : "text-[var(--color-muted)]"
            }`}
            size={18}
          />
        </div>
      )}

      {isOpen && (
        <>
          {/* Backdrop for overlay dismiss */}
          <div
            className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[998]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          <div
            className={`
              z-[999] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl select-none
              ${
                isMobile
                  ? "fixed bottom-0 left-0 right-0 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300"
                  : "absolute top-[calc(100%+8px)] left-0 max-w-[380px] w-full rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl"
              }
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-5" />
            )}

            {/* Header controls with view-switching/zoom-out */}
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={handlePrev}
                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-elevated)] text-[var(--color-text)] transition-colors border border-transparent hover:border-[var(--color-border)]"
              >
                <ChevronRightIcon size={16} className="rotate-180" />
              </button>

              {/* Zoom-out month name / year selector */}
              <div className="font-bold text-[var(--color-text)] tracking-wide flex gap-1.5 text-base sm:text-sm">
                {mode === "days" && (
                  <>
                    <span
                      onClick={() => setMode("months")}
                      className="cursor-pointer hover:underline hover:text-primary transition-colors"
                      title="Select month"
                    >
                      {monthNames[viewDate.getMonth()]}
                    </span>
                    <span
                      onClick={() => setMode("years")}
                      className="cursor-pointer hover:underline hover:text-primary transition-colors"
                      title="Select year"
                    >
                      {viewDate.getFullYear()}
                    </span>
                  </>
                )}

                {mode === "months" && (
                  <span
                    onClick={() => setMode("years")}
                    className="cursor-pointer hover:underline hover:text-primary transition-colors"
                    title="Select year"
                  >
                    {viewDate.getFullYear()}
                  </span>
                )}

                {mode === "years" && (
                  <span>
                    {yearStart} - {yearStart + 11}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-elevated)] text-[var(--color-text)] transition-colors border border-transparent hover:border-[var(--color-border)]"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>

            {/* DAYS MODE */}
            {mode === "days" && (
              <>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {blanks.map((blank) => (
                    <div key={`blank-${blank}`} className="aspect-square" />
                  ))}
                  {days.map((day) => {
                    const dateString = `${viewDate.getFullYear()}-${String(
                      viewDate.getMonth() + 1
                    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSelected = value === dateString;
                    const isToday =
                      new Date().toISOString().split("T")[0] === dateString;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => selectDay(day)}
                        className={`aspect-square w-full rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200
                          ${
                            isSelected
                              ? "bg-primary text-white font-bold shadow-md scale-105"
                              : isToday
                              ? "border border-primary text-primary font-bold hover:bg-primary/10"
                              : "text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] hover:scale-105"
                          }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* MONTHS MODE */}
            {mode === "months" && (
              <div className="grid grid-cols-3 gap-3 py-2">
                {monthNames.map((name, index) => {
                  const isCurrentMonth = viewDate.getMonth() === index;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectMonth(index)}
                      className={`py-3.5 px-2 rounded-xl text-sm font-semibold transition-all duration-150
                        ${
                          isCurrentMonth
                            ? "bg-primary text-white font-bold"
                            : "text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
                        }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* YEARS MODE */}
            {mode === "years" && (
              <div className="grid grid-cols-3 gap-3 py-2">
                {years.map((year) => {
                  const isCurrentYear = viewDate.getFullYear() === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => selectYear(year)}
                      className={`py-3.5 px-2 rounded-xl text-sm font-semibold transition-all duration-150
                        ${
                          isCurrentYear
                            ? "bg-primary text-white font-bold"
                            : "text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
                        }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom quick actions */}
            <div className="mt-4 pt-3.5 border-t border-[var(--color-border)] flex justify-between">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  onChange(
                    `${today.getFullYear()}-${String(
                      today.getMonth() + 1
                    ).padStart(2, "0")}-${String(today.getDate()).padStart(
                      2,
                      "0"
                    )}`
                  );
                  setIsOpen(false);
                }}
                className="text-xs font-bold text-primary hover:text-orange-600 transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
