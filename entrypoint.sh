#!/bin/sh

# Wait for DB? (Prisma migrate handles connection retry usually, but we could add wait-for-it if needed. 
# For now rely on restart: always or depends_on condition service_healthy in compose usually)

echo "Running migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "Seeding database..."
  # Run the seed command defined in package.json or direct
  npm run db:seed:vehicles
else
  echo "Skipping seed (SEED_ON_START is not true)"
fi

echo "Starting application..."
npm run start:prod
