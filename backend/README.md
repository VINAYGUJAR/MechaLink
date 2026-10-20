# MechaLink backend

## PostgreSQL and Prisma setup

The backend uses Prisma ORM 7 with PostgreSQL. Copy `.env.example` to `.env`
and fill in credentials locally; never commit `.env`.

Location search runs in the frontend. Configure either
`VITE_GOOGLE_MAPS_API_KEY` (Google Maps JavaScript API and Places API (New))
or `VITE_GEOAPIFY_API_KEY` in `frontend/.env` (see `frontend/.env.example`).
When both are set, Google Places is used. Browser keys are visible to
frontend users, so restrict them to your frontend's allowed referrers/domains
and the required APIs. Google Maps requires billing to be enabled. The backend
receives selected location details and coordinates directly; it does not call
a geocoding service.

For Neon, use the pooled Neon connection string as `DATABASE_URL` for the
application. Use the direct (non-pooler) connection as `DIRECT_URL` for Prisma
migrations. `SHADOW_DATABASE_URL` is optional, but a separate disposable
database may be needed for `prisma migrate dev` if the migration role cannot
create a shadow database. For local PostgreSQL, the URLs can point to local
databases instead.

From the `backend` directory:

```powershell
npm ci
npm run prisma:generate
npm run db:migrate
npm start
```

If PowerShell already has a `DATABASE_URL` set, it takes precedence over the
`.env` value. To use the URL from `.env` for this terminal session, clear the
inherited value before starting the backend:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
npm run dev
```

`db:migrate` is for development and applies pending migrations. For deployment,
run `npm run prisma:generate` during the build and `npm run db:deploy` as a
release step before starting the server. Do not run migrations against a
database until you have confirmed its contents and taken a backup. The
migration creates application tables and enables PostGIS; it does not import
MongoDB records.

Create an administrator with `npm run admin:create`. The script reads
`ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from `.env`, hashes the
password with bcrypt, and does not print it.

## Data migration from MongoDB

No live MongoDB or Neon database was inspected during this code migration, so
database contents are unknown. Do not delete or repurpose the MongoDB database.
Before cutover:

1. Make a timestamped MongoDB backup and keep it separate from the application:

   ```powershell
   mongodump --uri="$env:MONGODB_URI" --out=".\mongo-backup"
   ```

2. Export the active Mongoose collections (`users`, `mechanics`,
   `customerlocations`, `vehicles`, and `emergencyrequests`) or restore the
   dump into a staging MongoDB instance for a controlled export.
3. Apply the PostgreSQL migration to a verified empty staging database. Keep
   the source MongoDB IDs as text IDs and convert each referenced ObjectId to
   its 24-character hexadecimal string before loading related rows.
4. Convert GeoJSON `[longitude, latitude]` coordinates to the separate
   `longitude` and `latitude` columns without reversing their order. Preserve
   passwords as existing bcrypt hashes; do not export or log plaintext
   credentials.
5. Load parent rows before dependent rows (users, then mechanics/locations/
   vehicles, then emergency requests), validate required/unique fields and
   foreign keys, and compare collection/table counts and representative
   records before cutover.
6. Keep the MongoDB backup and source database unchanged until production
   verification and rollback planning are complete.

The repository does not contain a verified MongoDB export or a safe, source-
specific import mapping, so this migration intentionally does not run an
automatic data import.

## API routes

Protected routes use `Authorization: Bearer <token>`. Examples use JSON and
the existing API paths and field names.

Register and log in:

```http
POST /api/auth/register
Content-Type: application/json

{"name":"Ravi Kumar","email":"ravi@example.com","phone":"9876543210","password":"replace-this-password","role":"customer"}
```

```http
POST /api/auth/login
Content-Type: application/json

{"email":"ravi@example.com","password":"replace-this-password"}
```

Save the authenticated customer's selected location and search for mechanics:

```http
PUT /api/customer-location/me
Authorization: Bearer <customer-token>
Content-Type: application/json

{"name":"Connaught Place","formattedAddress":"Connaught Place, New Delhi, Delhi, India","latitude":28.6315,"longitude":77.2167}
```

```http
GET /api/customer/mechanics/nearby?radiusKm=5
Authorization: Bearer <customer-token>
```

Customers can choose browser geolocation or select an address suggestion.
The nearby mechanics endpoint uses the saved coordinates with PostGIS to
filter by radius and return accurate distances from nearest to farthest.

Add a vehicle and request assistance (use IDs returned by the existing API):

```http
POST /api/vehicles
Authorization: Bearer <customer-token>
Content-Type: application/json

{"make":"Honda","model":"City","year":2022,"registrationNumber":"DL01AB1234","vehicleType":"car"}
```

```http
POST /api/customer/assistance-requests
Authorization: Bearer <customer-token>
Content-Type: application/json

{"vehicleId":"<vehicle-id>","mechanicId":"<mechanic-id>","description":"Vehicle will not start","radiusKm":5}
```

Mechanic profile and garage location:

```http
POST /api/mechanics/me
Authorization: Bearer <mechanic-token>
Content-Type: application/json

{"garageName":"Ravi Auto Care","description":"Two-wheeler and car repairs","services":["Engine repair","Battery"]}
```

```http
PATCH /api/mechanics/me/location
Authorization: Bearer <mechanic-token>
Content-Type: application/json

{"address":"Karol Bagh, New Delhi"}
```

`GET /api/customer-location/me`, `GET /api/vehicles`,
`GET /api/mechanics/me`, and the assistance-request routes are also available
as registered in `src/app.js` and the route modules.

## Location search

The migration enables Neon-supported PostGIS. Coordinates remain stored as
separate longitude/latitude values so the API can continue returning GeoJSON
points with `[longitude, latitude]`. Nearby searches use geography-based
`ST_DWithin` radius checks, spheroid distance sorting, and a GiST expression
index. Only approved mechanics with saved coordinates are returned, at most
50 results, and the requested radius remains capped at 50 km.
