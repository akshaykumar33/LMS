# Wysbryx LMS – UI & UX Issues and Suggestions

This document tracks known UI/UX issues across the LMS and proposes concrete fixes.  
Scope: Super Admin console, tenant hub, academy landing pages, course/catalog views, and lesson player.

---

## 1. Top Navbar Responsiveness (Tenant Hub)

**Issue**  
On small viewports (e.g., iPhone 14 Pro Max ~430px), the top navbar chip “WYSBRYX PLATFORM” overlaps the logo/header area instead of wrapping or resizing. Some actions become cramped or visually broken.

**Probable Cause**

- Header container uses `flex` without `flex-wrap` on mobile.
- Platform pill has long label + padding + `whitespace-nowrap`, and refuses to shrink.

**Suggestions**

- Allow wrapping on narrow screens:
  - Container: `flex flex-wrap items-center justify-between gap-2 md:flex-nowrap`.
- Make platform pill responsive:
  - Use smaller font on mobile: `text-[10px] sm:text-xs`.
  - Add `max-w` + `truncate`: `max-w-[140px] truncate`.
- (Optional) Shorten label on mobile:
  - `"Platform"` for `sm:hidden`, `"WYSBRYX PLATFORM"` for `sm:inline`.

---

## 2. Top Navbar: Logout Visibility (Intel CoE Landing)

**Issue**  
On mobile widths (e.g., Samsung Galaxy S20 Ultra ~412px), the Logout action is not visible in the top navbar; only logo, academy chip, theme toggle, initials, and Workspace button appear.

**Probable Cause**

- Logout button is hidden via responsive classes like `hidden md:inline-flex`.
- Or it is placed at the far right of a non-wrapping flex container and gets cut off.

**Suggestions**

- Ensure logout is accessible on all viewports:
  - Remove mobile-only `hidden` classes from the Logout button.
  - Allow navbar to wrap: `flex flex-wrap items-center justify-between gap-2`.
- Better UX: move logout into a user menu:
  - Avatar chip opens a dropdown with “Profile” and “Logout”.
- Verify at multiple widths that Logout is always reachable without overflow.

---

## 3. Lesson Tabs: Hidden Options (Study Materials / Drawing Board / Notebook / …)

**Issue**  
On small screens, options beyond “Notebook” are cut off due to width constraints. Users cannot see that additional tabs exist.

**Probable Cause**

- Tab row is a plain `flex` without horizontal scrolling or wrapping.
- Container width is tied to viewport width; extra tabs overflow invisibly.

**Suggestions**

- Make tab row horizontally scrollable:
  - Wrap tabs in:

    ```tsx
    <div className="overflow-x-auto scrollbar-thin">
      <div className="flex gap-2 min-w-max">{/* tabs */}</div>
    </div>
    ```

- Add subtle visual cue that more tabs exist:
  - Right-side gradient fade or chevron icon.
- Confirm only the tab strip scrolls horizontally, not the entire page.

---

## 4. Video Player UX (Lesson Player)

**Issue**  
Video player is very basic: no pause, mute, or forward/backward controls. This makes lesson playback frustrating for learners.

**Probable Cause**

- `<video>` rendered without `controls`, or as a static image placeholder.

**Suggestions**

**Minimal fix (recommended first):**

- Enable native controls:

  ```tsx
  <video src={lesson.videoUrl} controls className="w-full rounded-xl" />
  ```

**Longer-term improvement:**

- Implement custom overlay controls:
  - Use `videoRef` with `play()`, `pause()`, `muted`, `currentTime +/- 10`.
  - Add branded control bar with play/pause, mute, ±10s, and progress.

---

## 5. Courses Grid: Disabled “Apply” Visibility (Light Mode)

**Issue**  
For non-enrolled courses, the “Apply Disabled” button text is extremely faint against the card background in light mode; users barely see the disabled state.

**Probable Cause**

- Disabled button uses low-contrast combo like `bg-muted text-muted-foreground` on a light card.

**Suggestions**

- Increase disabled contrast while keeping it clearly non-clickable:

  ```tsx
  <button
    disabled
    className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 cursor-not-allowed"
  >
    Enrollment Closed
  </button>
  ```

- Replace “Apply Disabled” label with clearer state text:
  - “Enrollment Closed” or “Apply Unavailable”.
- Optionally, add caption explaining why it’s disabled:
  - “Enrollment is closed for this course; contact admin for exceptions.”

---

## 6. Enrollment Feedback: Native Alert Dialog

**Issue**  
Clicking the disabled/enrollment button triggers a browser-native `window.alert` (small HTML dialog: `intel.localhost:3000 says ...`). This feels inconsistent and low-fidelity compared to the rest of the UI.

**Probable Cause**

- Button `onClick` uses `alert("You are already signed in...")`.

**Suggestions**

- Replace native alert with in-app dialog:

  ```tsx
  const [showEnrollInfo, setShowEnrollInfo] = React.useState(false);

  <button
    disabled={!canApply}
    onClick={() => !canApply && setShowEnrollInfo(true)}
  >
    Enrollment Info
  </button>

  <Dialog open={showEnrollInfo} onOpenChange={setShowEnrollInfo}>
    <DialogContent>
      <h2>Enrollment Info</h2>
      <p>You are already signed in. Please contact an admin to enroll in this batch course.</p>
      <Button onClick={() => setShowEnrollInfo(false)}>OK</Button>
    </DialogContent>
  </Dialog>
  ```

- Alternatively, use a toast/inline banner on the card with the same message.

---

## 7. General Responsive UX Audit Tasks

To systematically catch similar issues:

- Test primary flows (Super Admin, Tenant Hub, Academy Landing, Course Grid, Lesson Player) at multiple breakpoints:
  - 360–400px (small phones), 412–430px (modern phones), 768–1024px (tablets), 1366px+ (laptops/desktops).
- For each:
  - Check navigation visibility (menus, logout, primary actions).
  - Look for overlapping elements and cut-off text.
  - Ensure disabled states are legible and explain “why”.
  - Verify that critical actions (Apply, Workspace, Mark as Complete) are reachable without awkward scrolling.

Document any new issues in this file using the same `Issue / Cause / Suggestions` format.

---

## 8. Academy Landing – Access Member Dashboard Button

**Issue**  
On the Intel CoE landing page, the “Access Member Dashboard” button does not perform any action when clicked. It neither navigates to a member dashboard nor shows feedback, even for signed-in users.

**Probable Cause**

- Button has no `onClick` handler or link.
- Or it is wired to a route/handler that is not implemented or is failing silently.

**Suggestions**

- Implement navigation to the appropriate member dashboard route, e.g.:

  ```tsx
  <Button onClick={() => router.push("/dashboard")} className="...">
    Access Member Dashboard
  </Button>
  ```

  or, if per-tenant/per-role:

  ```tsx
  const targetPath =
    userRole === "Student" ? "/student/dashboard" : "/faculty/dashboard";

  <Button onClick={() => router.push(targetPath)}>
    Access Member Dashboard
  </Button>;
  ```

- If access is limited (e.g., only enrolled students), add a guard:
  - Disable the button for non-enrolled users and show a caption: “Enroll in a course to access your member dashboard.”
  - Or open a dialog explaining why access is blocked.
- Add loading/error states if the navigation depends on an async check (e.g., verifying enrollment).

---

## 9. Super Admin – Registered Academy Domains Logos

**Issue**  
In the “Registered Academy Domains” section of the Super Admin console, several academy entries show only empty logo placeholders (blank circles) instead of their actual logo images. This occurs in both light and dark themes.

**Probable Cause**

- Tenant records may not have a `branding.logoUrl` set or it is pointing to an invalid/expired URL.
- The logo component may be using a background or mask that hides logos when they are light-colored, especially against dark backgrounds.
- Conditional rendering might be wrong (e.g., showing placeholder even when `logoUrl` exists).

**Suggestions**

- Verify tenant data:
  - Ensure each academy has a valid `branding.logoUrl` in the DB or JSON.
  - Fix any broken paths (local `/logos/...` vs remote `https://...`).
- Check logo rendering in the SuperAdminConsole:
  - Confirm the component uses `<img src={tenant.branding?.logoUrl} />` or equivalent when the field is present.
  - Add a fallback only when `logoUrl` is missing:

    ```tsx
    {
      tenant.branding?.logoUrl ? (
        <img
          src={tenant.branding.logoUrl}
          alt={tenant.name}
          className="w-8 h-8 rounded-full object-contain bg-card"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-700/40" />
      );
    }
    ```

- Adjust styles for dark mode:
  - Ensure logos are visible against dark backgrounds by adding a subtle `bg-card` or border behind the image.
  - Test light and dark mode to confirm light-colored logos don’t disappear.

---

## 10. Faculty – Real-time Proctoring Audit Center Confirmation UX

**Issue**  
When reviewing the feed in the Real-time Proctoring Audit Center, pressing the “Confirm Infraction” button triggers a browser-native `window.alert` dialog (e.g., `intel.localhost:3000 says ...`). This basic HTML dialog breaks visual consistency with the rest of the LMS interface.

**Probable Cause**

- The confirm handler uses `alert("Infraction flags confirmed for ...")` after updating flags or sending notifications.

**Suggestions**

- Replace native alert with a branded in-app notification:
  - Option A: Toast notification

    ```tsx
    const { pushNotification } = useUiStore(); // or your toast system

    const handleConfirmInfraction = async () => {
      await confirmInfractionAction(...);

      pushNotification({
        type: "success",
        title: "Infraction Confirmed",
        message: "Infraction flags were confirmed. A notification has been dispatched to the student's profile.",
      });
    };
    ```

  - Option B: Inline success banner within the audit modal
    - Show a dismissible banner at the top: “Infraction flags confirmed for [student]. Notification dispatched.”

- Ensure the “Confirm Infraction” button:
  - Shows loading state during the action.
  - Disables while processing to avoid duplicate submissions.
