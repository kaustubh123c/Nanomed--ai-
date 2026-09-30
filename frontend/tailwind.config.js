/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sage: { DEFAULT: "#6B705C", 50: "#F5F7F0", 100: "#EEF0E8", 200: "#DDE1D1", 300: "#C4CAB4", 400: "#AAB397", 500: "#87956E", 600: "#6B705C", 700: "#59604D", 800: "#454A3C" },
        sage2: "#87956E",
        olive: { DEFAULT: "#7A8062", 100: "#EEF0E4", 200: "#DDE1C8", 300: "#C2CBA9", 400: "#A8B58B", 500: "#8F9D70", 600: "#7A8062", 700: "#62674F" },
        clay: { DEFAULT: "#A65D3A", 300: "#C78A6E", 500: "#A65D3A", 600: "#8D4E31" },
        cream: "#F5F1E8",
        ink: "#292A24", // primary - charcoal olive
        ink2: "#3D4035", // lifted panel olive
        beam: "#6B705C", // secondary - sage
        signal: "#7A8B5B", // accent - moss
        mist: "#F5F1E8", // background
        warn: "#B46A3C",
        violet: "#8A6A4A",
        indigo: "#6B705C",
        rose: "#9B4F45",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(180deg, rgba(11,31,58,0.96) 0%, rgba(11,31,58,0.88) 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.25)",
        glow: "0 0 24px rgba(0,194,255,0.35)",
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
