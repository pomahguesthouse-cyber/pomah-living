# Pomah Living Checklist Calculator

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ddbf805-5089-40a6-bb7c-583e14230f99).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Proyek Saya

Proyek Saya lives inside Profil and uses the existing Supabase database and
account session. For a fresh database, run `database/pomah-projects.sql` once
in the database used by the app. The existing Google and email sign-in setup is
used for this feature.

For acceptance testing, sign in and create two projects. Record a sale price and
project costs in a project detail page. Sign in with a different user and verify
that the first user's projects are private.
