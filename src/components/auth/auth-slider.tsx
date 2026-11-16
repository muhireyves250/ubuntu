"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDE_MS = 6000;

// Line art in three weights: faint structure, stronger outlines, and one
// orange accent (the logo's colour) for whatever the slide is about.
const LINE = "stroke-white/20";
const LINE_STRONG = "stroke-white/45";
const BLOCK = "fill-white/15";
// Nodes are filled with the panel colour so lines appear to pass behind them.
const NODE = "fill-teal-950";
const LABEL = "fill-white/50 text-[10px] font-medium tracking-[0.16em]";
// A slow, soft ring around the one thing that matters on the slide.
const PING = "origin-center [transform-box:fill-box] motion-safe:animate-ping [animation-duration:2.6s]";

interface ArtProps {
  /** True while the slide is showing: restarts its one-shot line drawing. */
  active: boolean;
}

// A patient list with one row flagged.
function RiskListArt() {
  const rows = [98, 138, 178, 218];
  const flagged = 138;
  return (
    <svg viewBox="0 0 480 300" fill="none" className="h-full w-full">
      <rect x="110" y="36" width="260" height="228" rx="12" strokeWidth="1.5" className={LINE_STRONG} />
      <rect x="130" y="58" width="84" height="6" rx="3" className={BLOCK} />
      <path d="M110 80H370" className={LINE} />
      {rows.map((y) => (
        <g key={y}>
          {y === flagged ? (
            <>
              <circle cx="142" cy={y + 6} r="7" className={`fill-orange-400/50 ${PING}`} />
              <circle cx="142" cy={y + 6} r="6" className="fill-orange-400" />
              <rect x="314" y={y - 3} width="38" height="18" rx="9" strokeWidth="1.5" className="stroke-orange-400" />
            </>
          ) : (
            <circle cx="142" cy={y + 6} r="6" strokeWidth="1.5" className={LINE_STRONG} />
          )}
          <rect x="162" y={y} width="132" height="6" rx="3" className={BLOCK} />
          <rect x="162" y={y + 12} width="78" height="5" rx="2.5" className="fill-white/10" />
        </g>
      ))}
    </svg>
  );
}

// Five visits on a line, each with its record; the line fills to the current one.
function VisitTimelineArt({ active }: ArtProps) {
  const visits = [70, 155, 240, 325, 410];
  const current = 240;
  return (
    <svg viewBox="0 0 480 300" fill="none" className="h-full w-full">
      <path d="M70 176H410" strokeWidth="1.5" className={LINE} />
      <path
        d={`M70 176H${current}`}
        strokeWidth="2"
        pathLength={1}
        className={`stroke-orange-400 ${active ? "animate-auth-draw [animation-delay:300ms] [animation-duration:1400ms]" : "opacity-0"}`}
      />
      {visits.map((x) => {
        const done = x <= current;
        return (
          <g key={x}>
            <rect
              x={x - 27}
              y="92"
              width="54"
              height="46"
              rx="6"
              strokeWidth="1.5"
              className={done ? LINE_STRONG : LINE}
            />
            {done && (
              <>
                <rect x={x - 17} y="104" width="34" height="5" rx="2.5" className={BLOCK} />
                <rect x={x - 17} y="115" width="22" height="5" rx="2.5" className="fill-white/10" />
              </>
            )}
            <path d={`M${x} 138V167`} className={LINE} />
            {x === current && <circle cx={x} cy="176" r="9" className={`fill-orange-400/50 ${PING}`} />}
            <circle
              cx={x}
              cy="176"
              r="8"
              strokeWidth="2"
              className={`${NODE} ${done ? "stroke-orange-400" : LINE_STRONG}`}
            />
            {x < current && (
              <path
                d={`m${x - 3.4} 176.2 2.4 2.4 4.4-4.8`}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-orange-400"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// A referral slip above the three statuses a referral moves through.
function ReferralStepsArt({ active }: ArtProps) {
  const steps = [
    { x: 90, label: "PENDING" },
    { x: 240, label: "ACCEPTED" },
    { x: 390, label: "CLOSED" },
  ];
  return (
    <svg viewBox="0 0 480 300" fill="none" className="h-full w-full">
      <rect x="176" y="34" width="128" height="104" rx="10" strokeWidth="1.5" className={LINE_STRONG} />
      <path d="M198 52v14M191 59h14" strokeWidth="2.5" strokeLinecap="round" className="stroke-orange-400" />
      <rect x="216" y="56" width="66" height="6" rx="3" className={BLOCK} />
      {[84, 100, 116].map((y, index) => (
        <rect key={y} x="194" y={y} width={index === 2 ? 52 : 92} height="5" rx="2.5" className="fill-white/10" />
      ))}
      <path d="M240 138v46" strokeDasharray="3 5" className={LINE} />

      <path d="M90 212H390" strokeWidth="1.5" className={LINE} />
      <path
        d="M90 212H390"
        strokeWidth="2"
        pathLength={1}
        className={`stroke-orange-400 ${active ? "animate-auth-draw [animation-delay:300ms] [animation-duration:1800ms]" : "opacity-0"}`}
      />
      {steps.map((step) => (
        <g key={step.label}>
          <circle cx={step.x} cy="212" r="9" strokeWidth="2" className={`${NODE} stroke-orange-400`} />
          <text x={step.x} y="244" textAnchor="middle" className={LABEL}>
            {step.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// The record at the centre, the six roles that work from it around it.
function CareTeamArt() {
  const hub = { x: 240, y: 150 };
  const roles = [
    { x: 392, y: 150 },
    { x: 316, y: 58 },
    { x: 164, y: 58 },
    { x: 88, y: 150 },
    { x: 164, y: 242 },
    { x: 316, y: 242 },
  ];
  return (
    <svg viewBox="0 0 480 300" fill="none" className="h-full w-full">
      {roles.map((role) => (
        <path key={`${role.x}-${role.y}`} d={`M${hub.x} ${hub.y}L${role.x} ${role.y}`} strokeWidth="1.5" className={LINE} />
      ))}
      {roles.map((role) => (
        <g key={`${role.x}-${role.y}`}>
          <circle cx={role.x} cy={role.y} r="15" strokeWidth="1.5" className={`${NODE} ${LINE_STRONG}`} />
          <circle cx={role.x} cy={role.y - 3.5} r="3.5" strokeWidth="1.5" className={LINE_STRONG} />
          <path
            d={`M${role.x - 6} ${role.y + 8}a6 6 0 0 1 12 0`}
            strokeWidth="1.5"
            strokeLinecap="round"
            className={LINE_STRONG}
          />
        </g>
      ))}
      <circle cx={hub.x} cy={hub.y} r="27" strokeWidth="1.5" className={`stroke-orange-400/60 ${PING}`} />
      <circle cx={hub.x} cy={hub.y} r="27" strokeWidth="2" className={`${NODE} stroke-orange-400`} />
      <path
        d="M240 162s-11-6.8-11-14.7a6.1 6.1 0 0 1 11-3.7 6.1 6.1 0 0 1 11 3.7c0 7.9-11 14.7-11 14.7Z"
        className="fill-orange-400"
      />
    </svg>
  );
}

const SLIDES = [
  {
    tag: "Risk classification",
    title: <>Track Every High&#8209;Risk Pregnancy!</>,
    description:
      "Identify, classify, and follow up on high-risk cases from ANC through postpartum — across every level of care.",
    Art: RiskListArt,
  },
  {
    tag: "Antenatal visits",
    title: "Every Visit on One Record",
    description: "Vital signs, symptoms and lab results from each antenatal visit, kept together and in order.",
    Art: VisitTimelineArt,
  },
  {
    tag: "Emergency referrals",
    title: "Referrals You Can Follow",
    description:
      "Send an emergency referral to the next level of care and watch it move from pending to accepted to closed.",
    Art: ReferralStepsArt,
  },
  {
    tag: "One care team",
    title: "One Record for the Whole Team",
    description:
      "Nurses, laboratory, pharmacy, specialists and community health workers each see the part of the record their work needs.",
    Art: CareTeamArt,
  },
];

// The brand half of the signed-out pages: a quiet dark panel that turns
// through a few slides about what the app does. Desktop only — on smaller
// screens the form has the page to itself.
export function AuthSlider() {
  const [active, setActive] = useState(0);
  // Hovering or tabbing into the panel holds the current slide.
  const [paused, setPaused] = useState(false);

  // A timeout keyed on the slide, not an interval: picking a slide by hand
  // gives it its full time too.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [active, paused]);

  return (
    <aside
      aria-roledescription="carousel"
      aria-label="What ubuntumed does"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative isolate hidden shrink-0 flex-col overflow-hidden bg-teal-950 p-10 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[46%] xl:p-14"
    >
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full">
        <defs>
          <pattern id="auth-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-white/10" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-dot-grid)" />
      </svg>

      <div className="flex items-center gap-3">
        {/* White chip: the logo's teal lettering disappears on teal. */}
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
          <Image src="/logo-mark-v3.png" alt="" width={44} height={44} className="h-9 w-9 object-contain" />
        </span>
        <span className="text-lg font-semibold tracking-tight">ubuntumed</span>
      </div>

      <div aria-hidden className="relative min-h-0 flex-1">
        {SLIDES.map(({ tag, Art }, index) => (
          <div
            key={tag}
            className={`absolute inset-0 flex items-center justify-center py-6 transition-opacity duration-700 ease-in-out ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="aspect-[8/5] max-h-full w-full max-w-[34rem]">
              <Art active={index === active} />
            </div>
          </div>
        ))}
      </div>

      {/* Every slide's text shares one grid cell, so the block is as tall as
          the longest and the indicators below never move. */}
      <div className="grid max-w-lg items-end">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.tag}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${SLIDES.length}`}
            aria-hidden={index !== active}
            className={`col-start-1 row-start-1 transition-opacity duration-700 ease-in-out ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">{slide.tag}</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">{slide.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-teal-50/70 xl:text-[15px]">{slide.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.tag}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Slide ${index + 1} of ${SLIDES.length}: ${slide.tag}`}
            aria-current={index === active}
            className="group rounded-full py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                index === active ? "w-8 bg-orange-400" : "w-2 bg-white/30 group-hover:bg-white/60"
              }`}
            />
          </button>
        ))}
      </div>
    </aside>
  );
}
