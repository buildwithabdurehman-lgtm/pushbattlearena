# Push Battle Arena

Build an Android-first fitness game called PushOff.

Concept: A competitive push-up game where users battle, rank up, earn XP, and climb leaderboards.

Tech: React + TypeScript + Tailwind CSS + Supabase. Make it mobile-first and installable as an Android PWA.

DAY 1 MVP

Build these working screens:

Splash

Login / Sign Up

Home

Push-Up Battle

Results

Leaderboard

Profile

Ranks / XP

HOME

Show:

Username

Rank + badge

XP progress

Push-up personal best

Large START BATTLE button

Daily challenge

Leaderboard preview

BATTLE

Create a workout screen with:

Large push-up counter

Timer

Start / Pause / Finish

+1 and -1 manual counter for now

Live progress

Final result screen

Use the manual counter ONLY for this first version. Structure the code so camera-based push-up detection can be added later.

GAMIFICATION

Create XP, ranks, personal best and leaderboard systems using Supabase.

DESIGN THEME

Use a premium competitive gaming + fitness aesthetic:

Background: #080808

Primary red: #FF2B2B

Dark cards: #151515

White text

Gray secondary text

Subtle red glow

Bold condensed headings

Strong athletic/gaming visuals

Animated XP and progress bars

Competitive rank badges

Minimal gradients

No clutter

The visual feeling should be UFC × competitive gaming × modern fitness, but do NOT copy another app's exact design.

DATABASE

Set up Supabase authentication and tables for:

users/profiles

push-up records

XP

ranks

leaderboard

Make all buttons and navigation functional. Prioritize a working MVP over extra features. Do not add unnecessary features or placeholder pages.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pushbattlearena.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e985c939-06b6-48bc-9383-62cf77c68aab).

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
