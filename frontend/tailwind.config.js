export default {
    content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            colors: {
                notion: {
                    bg: "#191919",
                    surface: "#1f1f1f",
                    hover: "#2d2d2d",
                    border: "#2e2e2e",
                    text: "#e0e0e0",
                    muted: "#9b9b9b",
                    faint: "#5a5a5a",
                },
            },
            maxWidth: {
                prose: "720px",
            },
        },
    },
    plugins: [],
};
