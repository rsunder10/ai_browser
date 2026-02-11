.PHONY: dev dev-vite dev-electron build package clean install

# Start full dev environment (Vite HMR + Electron)
dev:
	npm run dev

# Start Vite dev server only (port 5173)
dev-vite:
	npm run dev:vite

# Compile TypeScript and launch Electron only
dev-electron:
	npm run dev:electron

# Compile TypeScript + Vite production build
build:
	npm run build

# Build + package with electron-builder
package:
	npm run build:all

# Install dependencies
install:
	npm install

# Remove build artifacts
clean:
	rm -rf dist release
