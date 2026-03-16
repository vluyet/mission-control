import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101010",
        paper: "#f2efe8",
        ember: "#d96c31",
        moss: "#3c5a4f",
        brass: "#8d6a2f",
        cloud: "#dad4c8"
      },
      boxShadow: {
        panel: "0 30px 80px rgba(16, 16, 16, 0.16)",
        float: "0 14px 34px rgba(16, 16, 16, 0.14)"
      },
      backgroundImage: {
        "radial-shell":
          "radial-gradient(circle at top left, rgba(217,108,49,0.15), transparent 32%), radial-gradient(circle at bottom right, rgba(60,90,79,0.18), transparent 30%)"
      }
    }
  },
  plugins: []
};

export default config;
