/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0F14",
        card: "#151B23",
        "card-secondary": "#1E2632",
        border: "#2B3647",
        primary: "#F97316", // Primary Accent (Orange)
        secondary: "#00E5FF", // Secondary Accent (Cyan)
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        text: "#FFFFFF",
        "text-secondary": "#A8B3C5",
        "text-muted": "#64748B",
      },
      borderRadius: {
        'industrial': '20px',
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        code: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-hover': '0 8px 32px 0 rgba(249, 115, 22, 0.15)',
        'glow-orange': '0 0 15px rgba(249, 115, 22, 0.4)',
        'glow-cyan': '0 0 15px rgba(0, 229, 255, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
