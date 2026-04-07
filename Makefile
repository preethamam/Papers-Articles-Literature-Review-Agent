.PHONY: help install dev build start typecheck clean

help:
	@echo ""
	@echo "Lit Review Agent v2 - Make targets"
	@echo ""
	@echo "make install    install deps + build frontend + create .env"
	@echo "make dev        run backend + frontend dev servers"
	@echo "make build      build frontend into app/public"
	@echo "make start      run express app"
	@echo "make typecheck  run app/frontend TypeScript checks"
	@echo "make clean      remove node_modules and build artifacts"
	@echo ""

install:
	npm install
	npm --prefix app install
	npm --prefix frontend install
	@[ -f .env ] || cp .env.example .env
	npm run build

dev:
	npm run dev

build:
	npm run build

start:
	npm start

typecheck:
	npm --prefix app run build
	npm --prefix frontend run build

clean:
	rm -rf node_modules app/node_modules frontend/node_modules
	rm -rf app/public/assets
