import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f2533",
        panel: "#f4f8f8",
        teal: { 500: "#18a9a6", 600: "#108f8d" }
      }
    }
  },
  plugins: []
};

export default config;
