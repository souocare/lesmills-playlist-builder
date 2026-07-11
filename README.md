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
