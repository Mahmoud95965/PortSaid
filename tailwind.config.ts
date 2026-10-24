import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "Tahoma", "sans-serif"],
      },
      colors: {
        ocean: {
          50: "#eef6ff",
          100: "#d9ebff",
          500: "#1e90ff",
          700: "#1559b7",
          900: "#0b2a5b",
        },
        teal2: {
          100: "#d5f7f3",
          400: "#22d3c5",
          500: "#0fb8ad",
          600: "#0a9a92",
          950: "#042f2d",
        },
        sand: {
          50: "#fffaf0",
          100: "#fff1d6",
          200: "#ffe3a8",
          300: "#ffd27a",
          400: "#ffb938",
        },
        coral: {
          400: "#ff7a59",
          500: "#f0452a",
        },
      },
      animation: {
        bob: "bob 5s ease-in-out infinite",
        "pop-in": "popIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "fade-out": "fadeOut 0.6s ease forwards",
        float: "float 6s ease-in-out infinite",
        "gradient-shift": "gradientShift 4s ease infinite",
        "morph-blob": "morphBlob 8s ease-in-out infinite",
        "text-glow": "textGlow 3s ease-in-out infinite",
        "wave-move": "waveMove 5s ease-in-out infinite",
        "slide-in-right": "slideInFromRight 0.5s ease both",
        "slide-in-left": "slideInFromLeft 0.5s ease both",
        "scale-up": "scaleUp 0.5s ease both",
        sparkle: "sparkle 2s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
      },
      keyframes: {
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        popIn: {
          from: { opacity: "0", transform: "translateY(28px) scale(0.96)" },
          to: { opacity: "1", transform: "none" },
        },
        fadeOut: {
          to: { opacity: "0", transform: "scale(1.04)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "33%": { transform: "translateY(-8px) rotate(1deg)" },
          "66%": { transform: "translateY(4px) rotate(-1deg)" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        morphBlob: {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "25%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
          "50%": { borderRadius: "50% 60% 30% 60% / 30% 60% 70% 40%" },
          "75%": { borderRadius: "60% 40% 60% 30% / 60% 40% 30% 60%" },
        },
        textGlow: {
          "0%, 100%": { textShadow: "0 0 20px rgba(255,185,56,0.3)" },
          "50%": { textShadow: "0 0 40px rgba(255,185,56,0.6), 0 0 80px rgba(255,185,56,0.2)" },
        },
        waveMove: {
          "0%": { transform: "translateX(0) translateY(0)" },
          "50%": { transform: "translateX(-25px) translateY(5px)" },
          "100%": { transform: "translateX(0) translateY(0)" },
        },
        slideInFromRight: {
          from: { opacity: "0", transform: "translateX(40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInFromLeft: {
          from: { opacity: "0", transform: "translateX(-40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleUp: {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0", transform: "scale(0) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(180deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
