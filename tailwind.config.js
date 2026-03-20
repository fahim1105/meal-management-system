/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Custom premium colors
        'premium-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'premium-purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#3b82f6",           // Premium blue
          "primary-focus": "#2563eb",     
          "primary-content": "#ffffff",   
          
          "secondary": "#8b5cf6",         // Premium purple
          "secondary-focus": "#7c3aed",   
          "secondary-content": "#ffffff", 
          
          "accent": "#10b981",            // Premium green
          "accent-focus": "#059669",      
          "accent-content": "#ffffff",    
          
          "neutral": "#1f2937",           
          "neutral-focus": "#111827",     
          "neutral-content": "#ffffff",   
          
          "base-100": "#ffffff",          // Pure white
          "base-200": "#f9fafb",          // Subtle gray
          "base-300": "#f3f4f6",          // Light gray
          "base-content": "#111827",      // Almost black
          
          "info": "#0ea5e9",              
          "info-content": "#ffffff",      
          
          "success": "#10b981",           
          "success-content": "#ffffff",   
          
          "warning": "#f59e0b",           
          "warning-content": "#ffffff",   
          
          "error": "#ef4444",             
          "error-content": "#ffffff",     
          
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.95",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
      },
      {
        dark: {
          "primary": "#60a5fa",           // Brighter blue for dark
          "primary-focus": "#3b82f6",     
          "primary-content": "#0c4a6e",   // Dark blue text
          
          "secondary": "#a78bfa",         // Brighter purple
          "secondary-focus": "#8b5cf6",   
          "secondary-content": "#4c1d95", // Dark purple text
          
          "accent": "#34d399",            // Brighter green
          "accent-focus": "#10b981",      
          "accent-content": "#064e3b",    // Dark green text
          
          "neutral": "#374151",           
          "neutral-focus": "#4b5563",     
          "neutral-content": "#f9fafb",   
          
          "base-100": "#1f2937",          // Dark slate
          "base-200": "#111827",          // Darker slate
          "base-300": "#0f172a",          // Darkest slate
          "base-content": "#f9fafb",      // Almost white
          
          "info": "#38bdf8",              
          "info-content": "#082f49",      
          
          "success": "#34d399",           
          "success-content": "#064e3b",   
          
          "warning": "#fbbf24",           
          "warning-content": "#78350f",   
          
          "error": "#f87171",             
          "error-content": "#7f1d1d",     
          
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.95",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
      },
    ],
  },
}
