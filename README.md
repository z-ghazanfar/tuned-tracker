<img width="3248" height="2124" alt="CleanShot 2026-01-02 at 21 21 58@2x" src="https://github.com/user-attachments/assets/e0208440-7c1d-4148-910b-56085267a6d7" />

# tuned

one thing about me is i love watching tv shows. honestly, i probably watch way too many of them. i built this because i was just tired of forgetting when a new episode for a show i was watching actually released. it's so annoying to have to manually check every week or miss an episode I'd been waiting for because I couldn't remember which day new episodes drop. i wanted a single place that just told me "hey, this show dropped a new episode today."

so i built **tuned**—a cinematic dashboard to track all your tv shows and anime in one place without the clutter.

### check it out

you can use the live app here: [https://use-tuned.netlify.app/](https://use-tuned.netlify.app/)

### how it works

- **track everything:** search for any show and add it to your library.
- **track your progress:** i made it so you can actually check off episodes as you finish them. there's a progress bar for every show in your library so you never lose your spot or forget where you left off in a 12-season binge.
- **personalized dashboard:** the main carousel on the dashboard isn't just random stuff. it's tailored to you—it looks at your currently watching list and your watchlist to recommend new shows that actually match your interests.
- **synced data:** i used google login so all your progress and your watchlist stay synced. you can check your progress on your phone and then jump to your laptop and it's all right there.
- **the calendar:** this is the part i use the most. it shows a personalized grid of exactly which shows from your watchlist are airing this week.
- **ai takes:** i integrated the gemini api to give "ai takes" on shows—it helps you decide if a show is actually worth your time based on a deep-dive analysis of the plot and genres.

### the tech stack

i wanted this to feel really smooth and "premium," so i went with:

- **frontend:** react + tailwind css (lots of glassmorphism and custom gradients to give it that high-end look).
- **backend/auth:** firebase. i used it for google authentication and firestore to keep everyone's watchlists and episode progress synced in real-time.
- **data:** the tvmaze api. it's super reliable for show metadata and episode schedules.
- **ai:** google gemini (gemini-3-pro and flash). it handles the show analysis and the personalized recommendation engine.
- **icons:** lucide-react (because they just look better).

this was a fun project to build because it solved a problem i actually had every day. if you use it and like it, let me know!
