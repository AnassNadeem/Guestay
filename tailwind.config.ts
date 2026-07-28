import type { Config } from "tailwindcss";

/**
 * Brand tokens from Guestay logo assets:
 * Ink #3B4430 · Sage #A6AC7E · Cream #E7E7D6 · White #FFFFFF · Warm Grey #6B6B60
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          DEFAULT: "#3B4430",
          50: "#F4F5F0",
          100: "#E8E9E0",
          200: "#D1D3C1",
          300: "#B3B79A",
          400: "#8B9068",
          500: "#6B7052",
          600: "#3B4430",
          700: "#2F3626",
          800: "#23291D",
          900: "#171B13",
        },
        sage: {
          DEFAULT: "#A6AC7E",
          50: "#F6F7F3",
          100: "#EDEEE6",
          200: "#D9DCC9",
          300: "#C2C6A8",
          400: "#A6AC7E",
          500: "#8A8E68",
          600: "#6E7252",
          700: "#55583F",
          800: "#3F4230",
          900: "#2A2C20",
        },
        cream: {
          DEFAULT: "#E7E7D6",
          50: "#FBFBF7",
          100: "#F5F5EE",
          200: "#EEEEE3",
          300: "#E7E7D6",
          400: "#D0D0BD",
          500: "#B8B8A3",
        },
        ink: {
          DEFAULT: "#231F1A",
          heading: "#231F1A",
          /** WCAG-safe muted on cream — avoid light grey on white */
          muted: "#4A4742",
          soft: "#5C5C52",
        },
        /** Warm stone / travertine tones used by the hero showroom. */
        sand: {
          50: "#F7F3EA",
          100: "#EFE9DC",
          200: "#E3D9C6",
          300: "#D4C7AC",
          400: "#C9BBA0",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          warm: "#F5F5EE",
          cream: "#E7E7D6",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "14px",
        soft: "12px",
        pill: "9999px",
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(59, 68, 48, 0.08), 0 2px 8px -2px rgba(59, 68, 48, 0.04)",
        lift: "0 12px 40px -8px rgba(59, 68, 48, 0.14), 0 4px 12px -4px rgba(59, 68, 48, 0.06)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.6)",
      },
      spacing: {
        section: "6.5rem",
        "section-sm": "4rem",
      },
      maxWidth: {
        content: "72rem",
        narrow: "40rem",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        marquee: "marquee 42s linear infinite",
        "marquee-reverse": "marquee-reverse 48s linear infinite",
        ticker: "marquee 38s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
