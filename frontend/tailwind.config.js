/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // "Clinical Teal" palette — deep navy-teal ink, teal primary, ribbon-pink oncology accent.
        sage: { DEFAULT: "#2D7F8C", 50: "#F2F8F9", 100: "#E2F0F2", 200: "#CBDDE0", 300: "#A9D1D8", 400: "#7DB8C1", 500: "#4F9EAA", 600: "#2D7F8C", 700: "#246774", 800: "#1C505B" },
        sage2: "#4F9EAA",
        olive: { DEFAULT: "#0E7C86", 100: "#E3F5F6", 200: "#C5E6E8", 300: "#9DD3D7", 400: "#5FC0C4", 500: "#1BA5A8", 600: "#0E7C86", 700: "#0A626B" },
        clay: { DEFAULT: "#E8833A", 300: "#F3B27A", 500: "#E8833A", 600: "#C96A24" },
        aqua: { DEFAULT: "#22D3EE", 400: "#22D3EE", 500: "#06B6D4", 600: "#0891B2" },
        cream: "#F2F7F8",
        ink: "#0A1F2E",
        ink2: "#12303F",
        beam: "#0E7C86",
        signal: "#0FA37F",
        mist: "#F2F7F8",
        warn: "#E8833A",
        violet: "#1BA5A8",
        indigo: "#2D7F8C",
        rose: "#E5484D",
        ribbon: { DEFAULT: "#D6336C", 50: "#FDF0F5", 100: "#FAD9E6", 300: "#F08AB0", 500: "#D6336C", 600: "#B82658" },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(160deg, #0A1F2E 0%, #12303F 55%, #103B49 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.25)",
        glow: "0 0 28px rgba(27, 165, 168,0.45)",
      },
      keyframes: {
        beamPulse: {
          "0%, 100%": { opacity: 0.35 },
          "50%": { opacity: 1 },
        },
        beamTravel: {
          "0%": { transform: "translateX(0)", opacity: 0 },
          "10%": { opacity: 1 },
          "100%": { transform: "translateX(340px)", opacity: 0 },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        beamPulse: "beamPulse 2.4s ease-in-out infinite",
        beamTravel: "beamTravel 2.6s linear infinite",
        floatSlow: "floatSlow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
