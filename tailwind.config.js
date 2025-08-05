/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}", // for Next.js app directory
    ],
    theme: {
        extend: {
        fontFamily: {
            serif: ['"Merriweather"', "serif"],
        },
        colors: {
            ocean: "#0b3d91",
            gold: "#bfa45d",
            parchment: "#fdf6e3",
        },
        },
    },
    plugins: [],
};