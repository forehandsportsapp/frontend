"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
  RotateCcwIcon,
  XIcon,
} from "@/components/Icons";

interface CourtSliderProps {
  onBack: () => void;
  onStart: (payload: {
    courtId: string;
    format: "singles" | "doubles";
    scoring: "sideout" | "rally";
    bestOf: 1 | 3 | 5;
    points: 11 | 15 | 21;
    winByTwo: boolean;
    initialServer: 1 | 2;
    players: Record<SlotId, string | null>;
  }) => void;
}

type SlotId = "leftTop" | "leftBottom" | "rightTop" | "rightBottom";

type MatchFormState = {
  doubles: boolean;
  initialServer: 1 | 2;
  scoringSystem: "sideout" | "rally";
  bestOf: "1" | "3" | "5";
  pointsToWin: "11" | "15" | "21";
  timeoutPerSet: boolean;
  winByTwo: boolean;
  warmup: boolean;
  serveRotation: "set" | "point" | "none";
};

const SLOT_ORDER: SlotId[] = [
  "leftTop",
  "leftBottom",
  "rightTop",
  "rightBottom",
];

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function SelectLine({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="surface-input h-10 w-full appearance-none px-3 text-[12px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

function CheckLine({
  text,
  checked,
  onChange,
}: {
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex h-10 w-full items-center justify-between rounded-input border border-border bg-surface-elevated px-3 text-[12px] transition-colors hover:bg-surface"
    >
      <span className="font-medium text-text">{text}</span>
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border-2 transition-colors ${
          checked
            ? "border-primary bg-primary text-white"
            : "border-border bg-transparent"
        }`}
      >
        {checked && <CheckIcon size={11} />}
      </span>
    </button>
  );
}

export default function CourtSlider({ onBack, onStart }: CourtSliderProps) {
  const [form, setForm] = useState<MatchFormState>({
    doubles: false,
    initialServer: 1,
    scoringSystem: "sideout",
    bestOf: "3",
    pointsToWin: "11",
    timeoutPerSet: true,
    winByTwo: true,
    warmup: false,
    serveRotation: "set",
  });

  const [slots, setSlots] = useState<Record<SlotId, string | null>>({
    leftTop: null,
    leftBottom: null,
    rightTop: null,
    rightBottom: null,
  });

  const handleRef = useRef<HTMLSpanElement>(null);
  const [pickerSlot, setPickerSlot] = useState<SlotId | null>(null);
  const [playerDraft, setPlayerDraft] = useState("");

  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [maxDrag, setMaxDrag] = useState(200);

  // THUMB constants (must match the style below exactly)
  const THUMB_W = 70; // px — width of the white pill
  const SIDE_PAD = 12; // px — inset from each side inside the capsule

  useEffect(() => {
    const update = () => {
      const track = trackRef.current;
      if (!track) return;
      setMaxDrag(
        Math.max(0, track.clientWidth - THUMB_W - SIDE_PAD - SIDE_PAD),
      );
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [THUMB_W, SIDE_PAD]);

  const visibleSlots = form.doubles
    ? SLOT_ORDER
    : (["leftTop", "rightBottom"] as SlotId[]);

  const canStart = visibleSlots.every((slot) => Boolean(slots[slot]));

  const handleReset = () => {
    setForm((previous) => ({
      ...previous,
      doubles: false,
      initialServer: 1,
      scoringSystem: "sideout",
      bestOf: "3",
      pointsToWin: "11",
      timeoutPerSet: true,
      winByTwo: true,
      warmup: false,
      serveRotation: "set",
    }));
    setSlots({
      leftTop: null,
      leftBottom: null,
      rightTop: null,
      rightBottom: null,
    });
    x.set(0);
  };

  const [showConfirmStart, setShowConfirmStart] = useState(false);

  const handleSwipeEnd = () => {
    const current = x.get();
    if (current >= maxDrag * 0.8 && canStart) {
      animate(x, maxDrag, { type: "spring", stiffness: 500, damping: 30 });
      window.setTimeout(() => {
        setShowConfirmStart(true);
      }, 200);
      return;
    }
    animate(x, 0, { type: "spring", stiffness: 360, damping: 24 });
  };

  const confirmAndStart = () => {
    setShowConfirmStart(false);
    onStart({
      courtId: form.doubles ? "c2" : "c1",
      format: form.doubles ? "doubles" : "singles",
      scoring: form.scoringSystem,
      bestOf: Number(form.bestOf) as 1 | 3 | 5,
      points: Number(form.pointsToWin) as 11 | 15 | 21,
      winByTwo: form.winByTwo,
      initialServer: form.initialServer,
      players: slots,
    });
  };

  const handleOpenPlayerPrompt = (slot: SlotId) => {
    setPickerSlot(slot);
    setPlayerDraft(slots[slot] ?? "");
  };

  const handleSavePlayer = () => {
    if (!pickerSlot) return;
    const trimmed = playerDraft.trim();
    if (!trimmed) return;
    setSlots((previous) => ({ ...previous, [pickerSlot]: trimmed }));
    setPickerSlot(null);
    setPlayerDraft("");
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[390px] px-4 pb-4 pt-3 text-text">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="h-8 w-8"
            aria-label="Back"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h2 className="text-[22px] font-semibold leading-none">
            Match Setup
          </h2>
          <button
            type="button"
            onClick={handleReset}
            className="h-8 w-8 text-primary"
            aria-label="Reset"
          >
            <RotateCcwIcon size={18} />
          </button>
        </div>

        {/* Select Player Sides */}
        <section className="mb-4">
          <p className="mb-2 text-[13px] font-semibold">Select Player Sides</p>
          <div className="grid h-8 grid-cols-2 rounded-[9px] border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, doubles: false }))
              }
              className={`rounded-[7px] text-[11px] transition-colors ${
                !form.doubles
                  ? "bg-surface-elevated text-text font-semibold"
                  : "text-muted"
              }`}
            >
              Singles
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, doubles: true }))
              }
              className={`rounded-[7px] text-[11px] transition-colors ${
                form.doubles
                  ? "bg-surface-elevated text-text font-semibold"
                  : "text-muted"
              }`}
            >
              Doubles
            </button>
          </div>

          {/* Court diagram - intentionally green, not themed */}
          <div className="relative mt-2 h-[150px] w-full border-2 border-white/95 bg-[#2EC15B]">
            <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/95" />
            <span className="absolute inset-y-0 left-[34%] w-[2px] -translate-x-1/2 bg-white/75" />
            <span className="absolute inset-y-0 left-[66%] w-[2px] -translate-x-1/2 bg-white/75" />
            <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/95" />
            <span className="absolute left-0 top-1/4 h-[2px] w-[23%] bg-white/95" />
            <span className="absolute right-0 top-1/4 h-[2px] w-[23%] bg-white/95" />
            <span className="absolute left-0 top-3/4 h-[2px] w-[23%] -translate-y-1/2 bg-white/95" />
            <span className="absolute right-0 top-3/4 h-[2px] w-[23%] -translate-y-1/2 bg-white/95" />

            {SLOT_ORDER.map((slot) => {
              if (!visibleSlots.includes(slot)) return null;
              const positionClass: Record<SlotId, string> = {
                leftTop: "left-[10%] top-[12%]",
                leftBottom: "left-[10%] top-[58%]",
                rightTop: "right-[10%] top-[12%]",
                rightBottom: "right-[10%] top-[58%]",
              };
              const name = slots[slot];
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleOpenPlayerPrompt(slot)}
                  className={`absolute ${positionClass[slot]} flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#1E1F23] text-[10px] font-bold text-white shadow-md`}
                  title={name ?? "Assign player"}
                >
                  {name ? initialsFromName(name) : "+"}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted">
            <InfoIcon size={12} />
            <span>Side may switch during the match per rules.</span>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="mb-2 text-[13px] font-semibold">Who'll serve first?</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, initialServer: 1 }))
              }
              className={`h-10 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                form.initialServer === 1
                  ? "border-border bg-surface-elevated text-text"
                  : "border-border bg-surface text-muted"
              }`}
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
              Player 1
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, initialServer: 2 }))
              }
              className={`h-10 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                form.initialServer === 2
                  ? "border-border bg-surface-elevated text-text"
                  : "border-border bg-surface text-muted"
              }`}
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full border border-current align-middle" />
              Player 2
            </button>
          </div>
        </section>

        {/* Scoring System */}
        <section className="mb-4">
          <h3 className="mb-2 text-[13px] font-semibold">Scoring System</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  scoringSystem: "sideout",
                }))
              }
              className={`h-10 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                form.scoringSystem === "sideout"
                  ? "border-border bg-surface-elevated text-text"
                  : "border-border bg-surface text-muted"
              }`}
            >
              Side-out Scoring
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, scoringSystem: "rally" }))
              }
              className={`h-10 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                form.scoringSystem === "rally"
                  ? "border-border bg-surface-elevated text-text"
                  : "border-border bg-surface text-muted"
              }`}
            >
              Rally Scoring
            </button>
          </div>
        </section>

        {/* Match Format */}
        <section className="mb-4">
          <h3 className="mb-2 text-[22px] font-semibold leading-none tracking-tight">
            Match Format
          </h3>
          <div className="rounded-card border border-border bg-surface p-2">
            <SelectLine
              value={form.bestOf}
              onChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  bestOf: value as MatchFormState["bestOf"],
                }))
              }
              options={[
                { label: "Best of 1", value: "1" },
                { label: "Best of 3", value: "3" },
                { label: "Best of 5", value: "5" },
              ]}
            />
            <div className="mt-2">
              <SelectLine
                value={form.pointsToWin}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    pointsToWin: value as MatchFormState["pointsToWin"],
                  }))
                }
                options={[
                  { label: "11 points to win", value: "11" },
                  { label: "15 points to win", value: "15" },
                  { label: "21 points to win", value: "21" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Time out Rules */}
        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[22px] font-semibold leading-none tracking-tight">
              Time out Rules
            </h3>
            <ChevronDownIcon size={18} />
          </div>
          <div className="rounded-card border border-border bg-surface p-2">
            <CheckLine
              text="Win by 2 points"
              checked={form.winByTwo}
              onChange={(checked) =>
                setForm((previous) => ({ ...previous, winByTwo: checked }))
              }
            />
          </div>
        </section>

        {/* Serve Rotation */}
        <section className="mb-6">
          <h3 className="mb-2 text-[22px] font-semibold leading-none tracking-tight">
            Serve Rotation
          </h3>
          <SelectLine
            value={form.serveRotation}
            onChange={(value) =>
              setForm((previous) => ({
                ...previous,
                serveRotation: value as MatchFormState["serveRotation"],
              }))
            }
            options={[
              { label: "Switch side every set", value: "set" },
              { label: "Switch side every point", value: "point" },
              { label: "No switch", value: "none" },
            ]}
          />
        </section>

        {/* Swipe to Start */}
        <div className="flex justify-center mt-6">
          <div
            ref={trackRef}
            className={`relative flex h-14 w-full max-w-[340px] select-none items-center overflow-hidden rounded-full shadow-xl transition-opacity ${
              canStart ? "opacity-100" : "opacity-60"
            }`}
            style={{
              background: "linear-gradient(135deg,#ff8c00,#f97316)",
              boxShadow: "0 8px 32px rgba(249,115,22,0.45)",
            }}
          >
            {/* Centered label — sits behind thumb via z-index */}
            <span className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-[14px] font-bold tracking-wide text-white">
              {canStart ? "Swipe to start match" : "Enter players to start"}
            </span>

            {/* White pill thumb — fixed size, positioned with SIDE_PAD inset */}
            <motion.button
              drag={canStart ? "x" : false}
              dragConstraints={{ left: 0, right: maxDrag }}
              dragElastic={0}
              dragMomentum={false}
              style={{
                x,
                position: "absolute",
                left: `${SIDE_PAD}px`,
                height: "40px",
                width: `${THUMB_W}px`,
                minWidth: `${THUMB_W}px`,
                flexShrink: 0,
              }}
              onDragEnd={handleSwipeEnd}
              type="button"
              aria-label="Swipe to start match"
              className="z-10 touch-none cursor-grab flex items-center justify-center rounded-full bg-white shadow-md active:cursor-grabbing disabled:cursor-not-allowed"
            >
              {/* Orange arrow icon */}
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f97316"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Player Name Picker */}
      {pickerSlot && (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="w-full max-w-[390px] surface-popup p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Enter Player Name</h4>
              <button
                type="button"
                onClick={() => setPickerSlot(null)}
                className="h-7 w-7 text-muted"
              >
                <XIcon size={16} />
              </button>
            </div>

            <input
              value={playerDraft}
              onChange={(event) => setPlayerDraft(event.target.value)}
              placeholder="Type player name"
              className="surface-input h-11 w-full px-3 text-sm"
              autoFocus
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSlots((previous) => ({ ...previous, [pickerSlot]: null }));
                  setPickerSlot(null);
                  setPlayerDraft("");
                }}
                className="surface-row rounded-xl px-3 py-2.5 text-sm text-muted"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSavePlayer}
                className="rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-contrast disabled:opacity-50"
                disabled={!playerDraft.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Start Warning Dialog */}
      {showConfirmStart && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[320px] rounded-[24px] bg-[var(--color-surface)] p-6 shadow-2xl">
            <h3 className="text-center text-[18px] font-bold text-[var(--color-text)]">
              Before you begin
            </h3>
            <div className="mt-4 flex items-start gap-2.5 text-left">
              <InfoIcon size={16} className="mt-0.5 shrink-0 text-muted" />
              <p className="text-[13px] font-medium leading-[1.4] text-muted">
                Quick match results are for instant tracking only and will not
                be saved to your profile or history.
              </p>
            </div>
            <button
              type="button"
              onClick={confirmAndStart}
              className="mt-6 h-12 w-full rounded-full bg-primary text-[15px] font-bold text-white shadow-md hover:bg-primary/90 active:scale-[0.98]"
            >
              Start Match
            </button>
          </div>
        </div>
      )}
    </>
  );
}
