# Les Mills Playlist Builder

An unofficial playlist planning tool for Les Mills-style group fitness classes.

The project helps instructors browse program releases, search track metadata, filter their catalog, and build class playlists using random selection, themes, and track-by-track controls.

Built with Flask, SQLite, Jinja templates, plain CSS, and plain JavaScript.

---

## Status

Early development.

Current focus:

- Public program/release browser
- SQLite-backed metadata
- Playlist builder prototype
- BODYCOMBAT and BODYPUMP support
- Special release support, such as `BODYPUMP United`

Planned later:

- User accounts
- Owned releases
- Ratings and notes
- Saved playlists
- User-specific metadata overrides
- Smarter weighted playlist generation

---

## Features

- Program homepage
- Program-specific builder pages
- Release detail pages
- SQLite metadata storage
- Catalog filtering by oldest release, latest release exclusion, recent-release limit, and manual exclusions
- Search by title, artist, genre, difficulty, tags, slot name, or release
- Fill all tracks randomly
- Fill playlist by selected themes/filters
- Add or replace tracks slot-by-slot
- Special release ordering with `sort_order`, for example `113`, `113.5`, `114`

---

## Tech Stack

- Python
- Flask
- Flask-SQLAlchemy
- SQLite
- Jinja
- HTML
- CSS
- JavaScript

---

## Project Structure

```txt
lesmills-playlist-builder/
│
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── models.py
│   │
│   ├── routes/
│   │   └── public.py
│   │
│   ├── services/
│   │   ├── playlist_builder.py
│   │   └── program_repository.py
│   │
│   ├── seed/
│   │   ├── __init__.py
│   │   ├── create_programs_db.py
│   │   └── reset_programs_db.py
│   │
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── playlist_builder.js
│   │
│   └── templates/
│       ├── base.html
│       ├── home.html
│       └── public/
│           ├── program_detail.html
│           └── release_detail.html
│
├── instance/
│   └── programs.db
│
├── run.py
├── requirements.txt
├── README.md
└── .gitignore
```

---

## Database

The app currently uses one SQLite database:

```txt
instance/programs.db
```

This stores public/base metadata:

- programs
- track slots
- releases
- tracks
- track tags

Future user-specific data will likely live separately, for example:

```txt
instance/users.db
```

That database would store accounts, owned releases, ratings, notes, saved playlists, and personal overrides.

---

## Database Model

### `programs`

Stores each supported program.

```txt
id
name
slug
description
```

### `track_slots`

Stores the track structure for each program.

```txt
id
program_id
number
name
```

### `releases`

Stores release metadata.

```txt
id
program_id
code
title
display_number
sort_order
year
quarter
```

`sort_order` allows special releases to sit between numeric releases.

Example:

```txt
BODYPUMP 113      sort_order = 113
BODYPUMP United   sort_order = 113.5
BODYPUMP 114      sort_order = 114
```

### `tracks`

Stores track metadata.

```txt
id
program_id
release_id
slot_id
title
artist
duration
genre
difficulty
```

### `track_tags`

Stores flexible tags for filtering and theme generation.

```txt
id
track_id
tag
```

## Grouped Tracks

Some programs include tracks that are split into multiple parts but should be used together in a playlist.

Examples:

```txt
1A + 1B
1A + 1B + 1C
5A + 5B
```

These tracks are stored as separate rows in the database, but they share the same `group_key`.

This means the app can keep the original track metadata while still treating those tracks as one playlist option.

Example:

```txt
BC10001A → group_key = BC10001
BC10001B → group_key = BC10001
```

In the playlist builder, selecting that group adds both tracks together.

The `tracks` table includes extra fields for this:

```txt
source_code
group_key
segment
variant_type
source_track_number
```

These fields are used to support:

- multi-part tracks
- bonus tracks
- alternative tracks
- future program-specific track structures

Bonus tracks use:

```txt
variant_type = bonus
```

Alternative tracks use:

```txt
variant_type = alternative
```

This keeps the database flexible without requiring a different table structure for each program.

---

## Routes

```txt
/
```

Homepage with available programs.

```txt
/<program-slug>
```

Program builder page.

Examples:

```txt
/bodycombat
/bodypump
```

```txt
/<program-slug>/<release-code>
```

Release detail page.

Examples:

```txt
/bodycombat/100
/bodypump/113
/bodypump/united
```

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/lesmills-playlist-builder.git
cd lesmills-playlist-builder
```

### 2. Create a virtual environment

macOS/Linux:

```bash
python3 -m venv lesmills
source lesmills/bin/activate
```

Windows PowerShell:

```powershell
python -m venv lesmills
lesmills\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create the database

```bash
python -m app.seed.create_programs_db
```

This creates:

```txt
instance/programs.db
```

### 5. Add metadata

Example:

```bash
sqlite3 instance/programs.db < seed_bodycombat.sql
```

### 6. Run the app

```bash
flask run
```

Open:

```txt
http://127.0.0.1:5000/
```

---

## Working with the Database

Open the SQLite database:

```bash
sqlite3 instance/programs.db
```

Show tables:

```sql
.tables
```

Example queries:

```sql
SELECT * FROM programs;

SELECT code, title, display_number, sort_order
FROM releases
ORDER BY sort_order;

SELECT title, artist, duration, genre, difficulty
FROM tracks
LIMIT 20;
```

Exit:

```sql
.quit
```

You can also use DB Browser for SQLite and open:

```txt
instance/programs.db
```

---

## Example Release Data

Normal release:

```sql
INSERT INTO releases (
  program_id,
  code,
  title,
  display_number,
  sort_order,
  year,
  quarter
)
VALUES (
  (SELECT id FROM programs WHERE slug = 'bodycombat'),
  '100',
  'BODYCOMBAT 100',
  '100',
  100,
  2024,
  'Q2'
);
```

Special release:

```sql
INSERT INTO releases (
  program_id,
  code,
  title,
  display_number,
  sort_order,
  year,
  quarter
)
VALUES (
  (SELECT id FROM programs WHERE slug = 'bodypump'),
  'united',
  'BODYPUMP United',
  'United',
  113.5,
  NULL,
  NULL
);
```

---

## Environment

Recommended `.gitignore`:

```gitignore
lesmills/
__pycache__/
*.pyc
.env
instance/
*.db
```

If seed SQL files should not be published, also add:

```gitignore
*.sql
```

---

## Docker

The app can be run with Docker and Docker Compose.

The Docker setup supports:

- configurable host port
- configurable SQLite database file
- default fallback to `./instance/programs.db`

---

### Docker Files

The repository includes:

```txt
Dockerfile
docker-compose.yml
.dockerignore
.env.example
```

---

### Default Usage

Run the app with the default configuration:

```bash
docker compose up -d --build
```

By default, the app will be available at:

```txt
http://localhost:8000
```

The default database file is:

```txt
./instance/programs.db
```

---

### Configure the Port

The exposed host port can be changed with `APP_PORT`.

Example:

```bash
APP_PORT=5050 docker compose up -d --build
```

The app will then be available at:

```txt
http://localhost:5050
```

---

### Configure the Database File

By default, Docker Compose uses:

```txt
./instance/programs.db
```

You can provide a different SQLite database file with `PROGRAMS_DB_PATH`.

Example:

```bash
PROGRAMS_DB_PATH=/home/user/data/custom-programs.db docker compose up -d --build
```

Inside the container, the selected database is mounted as:

```txt
/data/programs.db
```

The Flask app reads it through:

```txt
sqlite:////data/programs.db
```

---

### Configure with `.env`

You can also use a local `.env` file.

Copy the example file:

```bash
cp .env.example .env
```

Example `.env`:

```env
APP_PORT=8000
PROGRAMS_DB_PATH=./instance/programs.db
```

Then run:

```bash
docker compose up -d --build
```

Docker Compose will automatically read the `.env` file from the project root.

---

### Use a Custom Database

To use a custom database file:

```env
APP_PORT=5050
PROGRAMS_DB_PATH=/home/user/databases/lesmills-programs.db
```

Then run:

```bash
docker compose up -d --build
```

The app will be available at:

```txt
http://localhost:5050
```

and will use:

```txt
/home/user/databases/lesmills-programs.db
```

as the program metadata database.

---

### Important Notes

The database file specified in `PROGRAMS_DB_PATH` should already exist.

If the file does not exist, Docker may create an empty file at that path, and the app may fail because the required tables are missing.

To create the default database before running Docker:

```bash
python -m app.seed.create_programs_db
```

Then import metadata if needed:

```bash
sqlite3 instance/programs.db < seed_bodycombat.sql
sqlite3 instance/programs.db < seed_bodypump_with_united.sql
```

---

### Useful Commands

Start or rebuild the container:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop the container:

```bash
docker compose down
```

Restart the container:

```bash
docker compose restart
```

---

## Metadata

The project may use public track metadata such as release number, title, artist, slot, duration, genre, tags, and difficulty labels.

The project does not host or distribute audio files, choreography notes, instructor materials, videos, PDFs, or paid content.

---

## Roadmap

### Public Builder

- [x] Flask app structure
- [x] SQLite metadata database
- [x] Program pages
- [x] Release pages
- [x] Catalog filtering
- [x] Search catalog
- [x] Fill all randomly
- [x] Fill by theme
- [x] Track-by-track building
- [x] Special release handling

### Builder Improvements

- [ ] Browse modal
- [ ] Search inside Browse modal
- [ ] Lock tracks
- [ ] Clear individual tracks
- [ ] Clear full playlist
- [ ] Copy/export playlist
- [ ] Class format options
- [ ] Release/artist variety rules

### User Features

- [ ] Authentication
- [ ] Owned releases
- [ ] Ratings
- [ ] Track notes
- [ ] Saved playlists
- [ ] Recently used tracking
- [ ] Weighted playlist generation
- [ ] User-specific metadata overrides

---

## Inspiration

This project was inspired by the excellent Pump Playlist Builder project by jmisener123:

```txt
https://github.com/jmisener123/pump-playlist-builder
```

This implementation is built separately using Flask, SQLite, Jinja templates, and plain JavaScript, with the goal of supporting multiple programs and future personalized playlist generation.

---

## Disclaimer

This is an unofficial playlist planning tool for fitness instructors.

This project is not affiliated with, endorsed by, sponsored by, approved by, or officially connected to Les Mills International, BODYPUMP, BODYCOMBAT, BODYBALANCE, RPM, BODYATTACK, CORE, GRIT, SPRINT, or any related trademarks, programs, products, or organizations.

All trademarks, program names, and related marks belong to their respective owners.

This project does not provide official Les Mills materials, choreography, coaching notes, instructor resources, videos, audio, or paid content.

This project is intended for educational, personal, and playlist-planning purposes only.

---

## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.
