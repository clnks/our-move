# our-move

The source is `src/index.html` (gitignored, lives only on Clarissa's Mac). `index.html` in the repo is the encrypted build made by `node build.mjs`. Never commit `src/`, `.passcode` or `.privatepin`.

## A scheduled task also updates this site

A daily scheduled task searches SpareRoom, adds matching rooms to the `SHORTLIST` in `src/index.html` (with `auto:true`, shown in the For one tab under "Found by automation"), runs `node build.mjs` on the Mac, then pushes the built `index.html` to GitHub from the cloud. The Mac's git history is not touched by the task, so `origin/main` is often ahead of the local branch.

Before committing and pushing a change of your own, sync like this:

```
git fetch origin
git reset --soft origin/main
node build.mjs
git add index.html
git commit -m "..."
git push
```

`src/` already holds everything, including the rooms the task added, so a fresh build after the soft reset is always correct. Never merge or rebase `index.html` by hand: rebuild it instead.

## Room entries

Automated rooms use the same shape as the other For one rooms, plus `auto:true` and `added:"YYYY-MM-DD"`. They stay in "Found by automation" until their status is changed in the page, then they move into the main list.
