import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // 80-15-5: bg is the dominant 80%, surface/hover the 15% of raised
        // panels, accent the 5%. Warm near-black neutrals with clearly stepped
        // surfaces so panels read as distinct instead of flat gray.
        notion: {
          bg:      "#17181a",  // dominant base (80%)
          surface: "#202225",  // sidebar / panels / navbar (15%)
          hover:   "#2a2d31",  // raised / hover
          border:  "#33363b",  // visible separation between surfaces
          text:    "#e6e6e3",  // warm off-white
          muted:   "#9a9a94",
          faint:   "#6b6b66",
        },
        // Accent (5%). Emerald, matching the existing emerald-* usage.
        accent: {
          DEFAULT: "#10b981",
          hover:   "#0ea371",
          soft:    "#10b98122",
        },
      },
      maxWidth: {
        prose: "720px",
      },
    },
  },
  plugins: [],
} satisfies Config;
