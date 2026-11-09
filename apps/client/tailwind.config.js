/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--border))',
        ring: 'hsl(var(--primary))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: '0 0% 100%' },
        sidebar: { DEFAULT: 'hsl(var(--sidebar))', foreground: 'hsl(var(--sidebar-foreground))' },
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
      fontFamily: { sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
