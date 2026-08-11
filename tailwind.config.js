/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          500: '#10b981', // Healthy stock / Success / Completed
        },
        amber: {
          500: '#f59e0b', // Low stock warning / Pending
        },
        crimson: {
          500: '#e11d48', // Critical alert / Reorder Point reached / Danger
        }
      }
    },
  },
  plugins: [],
}
