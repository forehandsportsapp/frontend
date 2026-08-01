"use client";

import React, { useState, useEffect } from "react";

interface SwipingDotsProps {
  itemCount: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  activeIndex?: number;
  activeColor?: string;
  inactiveColor?: string;
  className?: string;
}

export default function SwipingDots({
  itemCount,
  containerRef,
  activeIndex: externalActiveIndex,
  activeColor = "bg-orange-500",
  inactiveColor = "bg-neutral-300",
  className = "",
}: SwipingDotsProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex =
    externalActiveIndex !== undefined ? externalActiveIndex : internalIndex;

  useEffect(() => {
    const el = containerRef?.current;
    if (!el || externalActiveIndex !== undefined) return;

    const handleScroll = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length > 0) {
        let closestIndex = 0;
        let minDistance = Infinity;
        const containerLeft = el.getBoundingClientRect().left;

        children.forEach((child, index) => {
          const childLeft = child.getBoundingClientRect().left;
          const distance = Math.abs(childLeft - containerLeft);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });
        setInternalIndex(closestIndex);
      } else if (itemCount > 0) {
        const itemWidth = el.scrollWidth / itemCount;
        if (itemWidth > 0) {
          const index = Math.round(el.scrollLeft / itemWidth);
          setInternalIndex(Math.min(Math.max(0, index), itemCount - 1));
        }
      }
    };

    // Calculate initial position and listen for scroll/resize
    handleScroll();
    const timer = setTimeout(handleScroll, 100);

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [containerRef, itemCount, externalActiveIndex]);

  if (itemCount <= 0) return null;

  const handleDotClick = (index: number) => {
    if (containerRef?.current) {
      const el = containerRef.current;
      const children = Array.from(el.children) as HTMLElement[];
      if (children[index]) {
        children[index].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      } else {
        const width = el.scrollWidth / itemCount;
        el.scrollTo({ left: width * index, behavior: "smooth" });
      }
    }
  };

  return (
    <div
      className={`flex items-center justify-center gap-2 py-2 ${className}`}
    >
      {Array.from({ length: itemCount }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handleDotClick(i)}
          aria-label={`Go to item ${i + 1}`}
          className={`h-2 rounded-full transition-all duration-300 focus:outline-none cursor-pointer shrink-0 ${
            activeIndex === i
              ? `w-6 ${activeColor}`
              : `w-2 ${inactiveColor} hover:bg-neutral-400`
          }`}
        />
      ))}
    </div>
  );
}
