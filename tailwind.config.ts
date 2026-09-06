import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        amazon: {
          orange: "#FF9900",
          hover: "#E88B00",
          dark: "#131921",
          light: "#232F3E",
          yellow: "#F3A847"
        },
        trust: {
          green: "#059669",
          blue: "#2563EB",
          badge: "#FEF3C7"
        }
      },
    },
  },
  plugins: [],
};
export default config;
