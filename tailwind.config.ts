import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-montserrat)", "Helvetica", "Arial", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          hover: "hsl(var(--surface-hover))",
        },
        border: "hsl(var(--border))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#EAF8FD",
          100: "#D2F0FB",
          200: "#A6E1F7",
          300: "#79D1F3",
          400: "#4DC6F1",
          500: "#40c0f0",
          600: "#0498af",
          700: "#00425a",
          800: "#003447",
          900: "#002533",
        },
        petrol: {
          DEFAULT: "hsl(var(--petrol))",
          foreground: "hsl(var(--petrol-foreground))",
        },
        smart: "hsl(var(--smart))",
        sani: "hsl(var(--sani))",
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "#052e1f",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "#3d2c05",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "#3a0410",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
        },
        card: "hsl(var(--surface))",
        ring: "hsl(var(--primary))",
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 66 90 / 0.04), 0 1px 3px 0 rgb(0 66 90 / 0.06)",
        elevated: "0 8px 24px -8px rgb(0 66 90 / 0.12), 0 2px 8px -2px rgb(0 66 90 / 0.06)",
        glow: "0 0 0 1px hsl(var(--primary) / 0.2), 0 10px 28px -10px hsl(var(--primary) / 0.45)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "slide-up": "slide-up 0.35s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
