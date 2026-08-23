"use client";

import React, { useState } from "react";
import Link from "next/link";
import { XIcon, TrashIcon, ArrowLeftIcon, ChevronRightIcon, PlusIcon } from "@/components/Icons";

export default function CreateEventPage() {
    const [formData, setFormData] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = sessionStorage.getItem("createEventFormData");
            if (saved) return JSON.parse(saved);
        }
        return {
            eventName: "",
            sport: "",
            format: "",
            registrationDueDate: "",
            eventStartDate: "",
            gender: "",
            participationType: "",
            setsPerMatch: "",
            pointsPerSet: "",
            ageRestriction: "",
            freeEntry: false,
            paymentOption: "",
            upiId: "",
            entryFee: "",
        };
    });

    React.useEffect(() => {
        sessionStorage.setItem("createEventFormData", JSON.stringify(formData));
    }, [formData]);

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
                <h1 className="font-semibold">Create Event</h1>
                <Link
                    href="/org/tournaments/create"
                    className="p-2 hover:bg-[var(--color-surface-elevated)] rounded-lg"
                >
                    <XIcon size={20} />
                </Link>
            </div>

            <div className="p-4 space-y-5 pb-24">
                <h2 className="font-semibold">Setup Event</h2>

                {/* Event Card */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Event 1</h3>
                        <button className="text-red-500 text-sm"><TrashIcon size={16} /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Event Name *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Men's Double Open"
                                value={formData.eventName}
                                onChange={(e) =>
                                    setFormData({ ...formData, eventName: e.target.value })
                                }
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Select Sport *
                            </label>
                            <select
                                value={formData.sport}
                                onChange={(e) =>
                                    setFormData({ ...formData, sport: e.target.value })
                                }
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            >
                                <option value="">Select sport</option>
                                <option value="pickleball">Pickleball</option>
                                <option value="badminton">Badminton</option>
                                <option value="tennis">Tennis</option>
                                <option value="squash">Squash</option>
                                <option value="table-tennis">Table Tennis</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Select Format *
                            </label>
                            <select
                                value={formData.format}
                                onChange={(e) =>
                                    setFormData({ ...formData, format: e.target.value })
                                }
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            >
                                <option value="">Select format</option>
                                <option value="single-elimination">Single Knockout Elimination</option>
                                <option value="double-elimination">Double Elimination</option>
                                <option value="round-robin">Round Robin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Registration Due Date *
                            </label>
                            <input
                                type="date"
                                value={formData.registrationDueDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, registrationDueDate: e.target.value })
                                }
                                min={new Date().toISOString().split("T")[0]}
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Event Start Date *
                            </label>
                            <input
                                type="date"
                                value={formData.eventStartDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, eventStartDate: e.target.value })
                                }
                                min={formData.registrationDueDate || new Date().toISOString().split("T")[0]}
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Gender *</label>
                            <select
                                value={formData.gender}
                                onChange={(e) =>
                                    setFormData({ ...formData, gender: e.target.value })
                                }
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            >
                                <option value="">Select gender</option>
                                <option value="men">Men&apos;s</option>
                                <option value="women">Women&apos;s</option>
                                <option value="mixed">Mixed</option>
                                <option value="open">Open</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Participation Type *
                            </label>
                            <select
                                value={formData.participationType}
                                onChange={(e) =>
                                    setFormData({ ...formData, participationType: e.target.value })
                                }
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            >
                                <option value="">Select type</option>
                                <option value="singles">Singles</option>
                                <option value="doubles">Doubles</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Sets Per Match *
                            </label>
                            <select
                                value={formData.setsPerMatch}
                                onChange={(e) =>
                                    setFormData({ ...formData, setsPerMatch: e.target.value })
                                }
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            >
                                <option value="">Select</option>
                                <option value="best-of-1">Best of 1 - Sets 11</option>
                                <option value="best-of-3">Best of 3</option>
                                <option value="best-of-5">Best of 5</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Points Per Set *
                            </label>
                            <select
                                value={formData.pointsPerSet}
                                onChange={(e) =>
                                    setFormData({ ...formData, pointsPerSet: e.target.value })
                                }
                                className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            >
                                <option value="">Select</option>
                                <option value="11">11 points</option>
                                <option value="15">15 points</option>
                                <option value="21">21 points</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Players born after (Age Restriction)
                            </label>
                            <input
                                type="date"
                                value={formData.ageRestriction}
                                onChange={(e) =>
                                    setFormData({ ...formData, ageRestriction: e.target.value })
                                }
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                            />
                            <p className="text-xs text-[var(--color-muted)] mt-1">
                                Only players born after this age can register
                            </p>
                        </div>

                        {/* Free Entry Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="font-medium">Free Entry?</label>
                            <button
                                onClick={() =>
                                    setFormData({ ...formData, freeEntry: !formData.freeEntry })
                                }
                                className={`relative w-14 h-8 rounded-full transition-colors ${formData.freeEntry ? "bg-primary" : "bg-[var(--color-border)]"
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${formData.freeEntry ? "right-1" : "left-1"
                                        }`}
                                />
                                <span className="absolute right-10 top-1.5 text-xs font-medium">
                                    {formData.freeEntry ? "YES" : "NO"}
                                </span>
                            </button>
                        </div>

                        {!formData.freeEntry && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Select Payment Option *
                                    </label>
                                    <select
                                        value={formData.paymentOption}
                                        onChange={(e) =>
                                            setFormData({ ...formData, paymentOption: e.target.value })
                                        }
                                        className="native-select w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="pay-online">Pay Online</option>
                                        <option value="pay-at-venue">Pay at Venue</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Add your UPI ID *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="abcdefg@okbi"
                                        value={formData.upiId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, upiId: e.target.value })
                                        }
                                        className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Entry Fee (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.entryFee}
                                        onChange={(e) =>
                                            setFormData({ ...formData, entryFee: e.target.value })
                                        }
                                        className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Add Another Event */}
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary text-primary font-medium hover:bg-primary/5 transition-colors w-full">
                    + Add Event
                </button>
            </div>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-between items-center">
                <Link href="/org/tournaments/create" className="text-[var(--color-muted)] flex items-center gap-1">
                    <ArrowLeftIcon size={16} /> Previous
                </Link>
                <Link
                    href="/org/tournaments/create/review"
                    className="px-6 py-2 rounded-lg font-semibold text-white flex items-center gap-2"
                    style={{ background: "var(--gradient-orange)" }}
                >
                    Next <ChevronRightIcon size={16} />
                </Link>
            </div>
        </div>
    );
}

