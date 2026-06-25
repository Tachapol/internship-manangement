import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          light: "var(--brand-light)",
        },
        success: "var(--success)",
        danger: "var(--danger)",
        buddy: "var(--buddy)",
        bgPage: "var(--bg-page)",
        bgCard: "var(--bg-card)",
        bgInput: "var(--bg-input)",
        borderGray: "var(--border-gray)",
        text: {
          primary: "#1a1a1a",
          secondary: "#212121",
          muted: "#666666",
        },
      },
      fontSize: {
        'display': ['32px', { lineHeight: '40px', fontWeight: '500' }],
        'h1': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'subtitle': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-reg': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-semi': ['14px', { lineHeight: '20px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};

export default config;
