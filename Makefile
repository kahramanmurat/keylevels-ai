.PHONY: help install dev up down logs clean db-push db-migrate db-studio test backend frontend

help:
	@echo "KeyLevels AI - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install     - Install all dependencies"
	@echo "  make db-push     - Push database schema"
	@echo ""
	@echo "Development:"
	@echo "  make dev         - Start all services with Docker"
	@echo "  make up          - Start services in background"
	@echo "  make down        - Stop all services"
	@echo "  make logs        - View logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-push     - Push Prisma schema to database"
	@echo "  make db-migrate  - Create a new migration"
	@echo "  make db-studio   - Open Prisma Studio"
	@echo ""
	@echo "Testing:"
	@echo "  make test        - Run all tests"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean       - Stop services and remove volumes"

install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Generating Prisma client..."
	cd frontend && npx prisma generate

dev:
	docker-compose up

up:
	docker-compose up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

down:
	docker-compose down

logs:
	docker-compose logs -f

db-push:
	cd frontend && npx prisma db push

db-migrate:
	@read -p "Migration name: " name; \
	cd frontend && npx prisma migrate dev --name $$name

db-studio:
	cd frontend && npx prisma studio

test:
	@echo "Running backend tests..."
	cd backend && pytest
	@echo "Running frontend tests..."
	cd frontend && npm test

backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

clean:
	docker-compose down -v
	@echo "Cleaned up! All containers and volumes removed."
