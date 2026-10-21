# Errday for Apple Watch

The `ErrdayWatch` watchOS 10+ companion target is embedded in the iPhone app.
Use the shared `ErrdayWatch` scheme to run it on a Watch; building `Errday` also
builds and embeds the companion. It uses the same development team as the phone.

## First use

1. Install the latest iPhone build. In the iPhone Watch app, install Errday if
   automatic app installation is disabled.
2. Open Errday on the iPhone and Watch once to sync the training program.
3. Use **Connect Apple Health** on Watch to authorize the activity readings.
4. Choose any program session, or resume the active iPhone session. Tap a set,
   adjust kilograms and reps with the buttons or Digital Crown, then **Log set**.
5. Finish the workout to save completed sets to iPhone history. If disconnected,
   edits remain on Watch; open both apps when reconnected to finish syncing.

## Behavior

- The phone remains the source of saved workouts and program templates.
- Watch edits are persisted before feedback and sent in order. The shared
  reducer validates workout/exercise/set IDs and numeric ranges; processed IDs
  are saved in the same transaction as the phone records to prevent duplicates.
- Conflicting changes pause sync. Pending Watch edits stay on disk until retry
  or explicit confirmation to use the iPhone version.
- Rest uses an end date, so time stays correct after the wrist lowers. A local
  notification is scheduled if allowed, and the visible rest screen plays a
  completion haptic.
- Health shows today's steps and active energy, and the latest heart-rate sample
  with its reading time. Missing/denied data is shown as a dash. These are daily
  Health readings, not a separate live HealthKit workout recording. Existing
  iPhone workout export remains responsible for saving the workout to Health.
- No Health data is sent to a server by the watch app.

## Verification

`swift test --package-path Packages/ErrdayCore --scratch-path /tmp/errday-watch-core-tests --filter Watch`

Tests cover deterministic offline replay, duplicate delivery, stale-session
rejection, invalid inputs, completed-set editing and expired-rest handling.

The Debug-only launch argument `--watch-ui-preview` loads a local preview program
for simulator UI checks. It does not connect to iPhone or persist preview edits.
