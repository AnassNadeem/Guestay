import type { Config } from "tailwindcss";

/**
 * Brand tokens sampled from /public/logo.png:
 * Olive #4D503B · Sage #A1A580 · Cream #DDDED0
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
          DEFAULT: "#4D503B",
          50: "#F4F5F0",
          100: "#E8E9E0",
          200: "#D1D3C1",
          300: "#B3B79A",
          400: "#8B9068",
          500: "#6B7052",
          600: "#4D503B",
          700: "#3E4130",
          800: "#2F3125",
          900: "#1F2119",
        },
        sage: {
          DEFAULT: "#A1A580",
          50: "#F6F7F3",
          100: "#EDEEE6",
          200: "#D9DCC9",
          300: "#C2C6A8",
          400: "#A1A580",
          500: "#8A8E68",
          600: "#6E7252",
          700: "#55583F",
          800: "#3F4230",
          900: "#2A2C20",
        },
        cream: {
          DEFAULT: "#DDDED0",
          50: "#F9F9F6",
          100: "#F3F3EE",
          200: "#EAEBE3",
          300: "#DDDED0",
          400: "#C8C9B8",
          500: "#B0B29E",
        },
        ink: {
          DEFAULT: "#2A2C24",
          muted: "#5C5F52",
          soft: "#7A7D6E",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          warm: "#F7F7F3",
          cream: "#F3F3EE",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "14px",
        soft: "12px",
        pill: "9999px",
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(77, 80, 59, 0.08), 0 2px 8px -2px rgba(77, 80, 59, 0.04)",
        lift: "0 12px 40px -8px rgba(77, 80, 59, 0.14), 0 4px 12px -4px rgba(77, 80, 59, 0.06)",
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
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
