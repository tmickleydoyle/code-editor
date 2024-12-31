import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			typography: {
				DEFAULT: {
					css: {
						maxWidth: 'none',
						color: '#f8f8f2', // Okaidia text color
						a: {
							color: '#a6e22e', // Okaidia green
							textDecoration: 'none',
							'&:hover': {
								textDecoration: 'underline',
							},
						},
						'h1, h2, h3, h4': {
							color: '#f8f8f2',
							fontWeight: '600',
						},
						code: {
							color: '#f8f8f2',
							backgroundColor: '#272822', // Okaidia background
							padding: '0.2em 0.4em',
							borderRadius: '3px',
							fontWeight: '400',
							fontSize: '85%',
						},
						'code::before': {
							content: '""',
						},
						'code::after': {
							content: '""',
						},
						pre: {
							backgroundColor: '#272822', // Okaidia background
							color: '#f8f8f2',
							borderRadius: '3px',
						},
						'pre code': {
							backgroundColor: 'transparent',
							padding: '0',
							color: 'inherit',
							fontSize: '100%',
						},
					},
				},
			},
			colors: {
				background: '#272822', // Okaidia background
				foreground: '#f8f8f2', // Okaidia foreground
				card: {
					DEFAULT: '#3e3d32', // Slightly lighter than background
					foreground: '#f8f8f2'
				},
				popover: {
					DEFAULT: '#3e3d32',
					foreground: '#f8f8f2'
				},
				primary: {
					DEFAULT: '#66d9ef', // Okaidia blue
					foreground: '#272822'
				},
				secondary: {
					DEFAULT: '#fd971f', // Okaidia orange
					foreground: '#272822'
				},
				muted: {
					DEFAULT: '#75715e', // Okaidia comment color
					foreground: '#f8f8f2'
				},
				accent: {
					DEFAULT: '#ae81ff', // Okaidia purple
					foreground: '#272822'
				},
				destructive: {
					DEFAULT: '#f92672', // Okaidia pink/red
					foreground: '#f8f8f2'
				},
				border: '#49483e',
				input: '#3e3d32',
				ring: '#66d9ef',
				chart: {
					'1': '#66d9ef', // blue
					'2': '#a6e22e', // green
					'3': '#fd971f', // orange
					'4': '#ae81ff', // purple
					'5': '#f92672'  // pink
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
