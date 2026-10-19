# UX decision log

## 29 September 2026 - Studio onboarding sign-in confirmation

- **Decision:** The inbox confirmation ends after the email address. The primary action remains **Open sign-in link**.
- **Reason:** The action already makes the next step clear, so the extra sentence repeated it.
- **Scope:** Studio onboarding sign-in confirmation only.

## 29 September 2026 - First Client onboarding

- **Decision:** Explain that adding a company name opens a Client portal preview and does not notify the Client until invited.
- **Reason:** Studio owners need to know the action is safe before they add a real Client.
- **Scope:** First Client step in Studio onboarding.

## 29 September 2026 - Onboarding browser history

- **Decision:** Record each onboarding question and the first Client step in browser history. Return from the Client portal to the completed first Client step, with answers preserved.
- **Reason:** The global back arrow should retrace the owner journey instead of jumping to testing scenarios.
- **Scope:** Studio onboarding navigation and its Client portal handoff.

## 29 September 2026 - Studio-first onboarding (initial decision, superseded)

- **Decision:** After sign-in, ask for the owner's name and then the Studio name. Do not ask for a website or written Studio description during V1 onboarding. Keep three production questions on separate screens: concepts and scripts, shooting, and video types. The initial proposal included a branding review; the later V1 Studio setup completion decision below removes it.
- **Reason:** Reduce first-run effort while still capturing the Studio identity, production model and video types needed to configure the workspace. The first Client is created without an invitation, and the next action is starting a video.
- **Scope:** Studio onboarding, Studio profile identity and first video entry. Website analysis and client-facing Studio descriptions can be added later if they prove valuable.

## 29 September 2026 - V1 Studio setup completion

- **Decision:** After the three production questions, set up the Studio and continue directly to adding the first Client. Do not show a separate Studio review or collect branding in V1. Use the Studio name's initials until a logo is added later in settings.
- **Reason:** Website analysis is not part of V1, so there is no generated profile or branding for the owner to review. A review step would add work without helping them start their first video.
- **Scope:** Studio onboarding, initial Studio setup and the Studio header avatar fallback. Existing branding settings remain available after onboarding.

## 29 September 2026 - First video naming

- **Decision:** Keep the first video step to its name, the required project code, Cancel and Continue to Brief. Remove the introductory copy and repeated filename preview.
- **Reason:** Naming is the only decision required here. The unique project code remains visible before the editable name, as required by Brisk's naming convention.
- **Scope:** First video naming screen for Studio Staff and Clients.

## 29 September 2026 - Client project code prefix

- **Decision:** Generate the default Client project code prefix from the first five letters of the Client name, lower-case, followed by a three-digit sequence. Let Studio Staff adjust the prefix in Client details. Ignore spaces and punctuation; use fewer letters when the name is shorter.
- **Reason:** A recognisable Client prefix helps identify project codes in the video naming step and production files, while allowing Studios to use their own shorthand.
- **Scope:** New project codes from Studio and Client creation flows. Existing project codes stay as they are. Prefixes must be unique within a Studio.

## 29 September 2026 - First Client next step

- **Decision:** After adding the first Client, pause on a confirmation with **Start a video** and **Do this later**. Confirm that the Client will not be notified unless invited.
- **Reason:** The owner should choose whether to start a video now; adding a Client alone does not send an invitation or notify them.
- **Scope:** The first Client handoff in Studio onboarding.

## 29 September 2026 - Videos empty state with existing Clients

- **Decision:** Keep Clients and Videos as distinct lists. When no videos exist, Studio Staff with an active or inactive Client get a **Start a video** action; without a Client they get **Add Client**. Multi-Client Studios choose the Client before naming. Starting a Studio-side video does not invite or notify the Client.
- **Reason:** A Client is not a video. The empty state should reflect the records already present and offer the next action without implying a Client must be re-added.
- **Scope:** Studio Staff empty Videos state and path into video naming.

## 29 September 2026 - First-tour Client collaboration guidance

- **Decision:** Keep Client collaboration guidance off the Brief landing page. Add it to the first-use tour instead: explain that Studio Staff can complete the Brief for the Client or invite them to add details, and that the Client can access it once invited.
- **Reason:** The note is useful orientation, but it makes the working Brief screen feel too busy when shown inline.
- **Scope:** Future first-use tour for Studio Staff; no collaboration note on the Brief landing page.

## 29 September 2026 - Client portal video visibility

- **Decision:** Show every video in the portal's already-scoped project list, including in Studio preview. Do not narrow the list to the onboarding video based on Test mode. Client access remains limited to projects they are invited to.
- **Reason:** Studio preview should show the full Client relationship. Filtering only the rows made the total badges say five while the list showed one.
- **Scope:** Client dashboard project list and its status counts; access filtering remains in the portal data selector.

## 29 September 2026 - Client portal preview indicator

- **Decision:** Replace the small **Studio preview** badge with a full-width banner above the Client portal header. Identify the Client portal being previewed and provide **Back to Videos** to return to the Studio Videos page.
- **Reason:** The banner makes preview mode clear without adding persistent explanatory copy to the Client portal.
- **Scope:** Full-page and embedded Studio previews of the Client portal.

## 29 September 2026 - Brief conversation authorship

- **Decision:** Label answers entered by the current user as **You**. Keep **Client** for messages authored by the Client.
- **Reason:** In the Brief conversation, the Studio owner’s first answer was labelled **Client**, making it unclear who had supplied the information.
- **Scope:** Authorship labels in the Brief AI conversation. This does not change Brief access or who can edit answers.

## 29 September 2026 - Test mode role preview

- **Decision:** Changing the role from the Test mode toolbar keeps the current screen and scenario in place. On a project screen, the Client preview uses that project's Client context.
- **Reason:** Studio owners need to switch into the Client view to verify the same project's visibility and handoff without restarting the scenario.
- **Scope:** Compact role preview controls in Test mode and project-context Client preview identity. Existing project access checks remain in effect.

## 29 September 2026 - Invite Client from Brief send

- **Decision:** When Studio Staff sends a Brief to a Client without access to that project, open the existing invite flow with the Client and project preselected. After the invite is submitted, complete the Brief send. Keep the existing invitation and access-management routes available in Client and People settings.
- **Reason:** Resolve missing access at the moment the owner tries to share the Brief, without making them leave the production flow or adding a second access system.
- **Scope:** Studio Staff sending a Brief to a Client. Other Stage send actions and the existing settings routes are unchanged.

## 29 September 2026 - Client Brief review landing

- **Decision:** When a Client opens a Brief that is waiting on their review and contains Brief details, land them on **Review your brief** with the existing approval actions available. Keep the Brief intake screen for Clients who are starting a new Brief.
- **Reason:** A Client following a Studio's review request needs to assess the submitted Brief and decide whether to approve it, rather than begin a second Brief.
- **Scope:** Client view of the Brief Stage when the Brief is waiting on that Client.

## 29 September 2026 - Brief review notifications

- **Decision:** Record Stage review requests, reminders and updates in the recipient's notification bell and project Chat, and record Client Brief approvals for Studio Staff in both places, using the existing access-scoped recipient and conversation patterns.
- **Reason:** The Client and Studio need a shared project record of the review handoff and approval.
- **Scope:** Stage review handoffs across project Stages and Client Brief approval. Existing Settings invitation routes remain available.

## 30 September 2026 - Preview Client app from Client settings

- **Decision:** Put **Preview as Client** in the Client profile actions. It switches to that Client's role and opens their Client app view, including their project visibility and Chat. Keep the existing preview banner and tooltip visible only in Studio-side preview, hidden in Client role mode. Keep **Go to Client portal** as navigation from Studio context, and remove the Brief-only preview action.
- **Reason:** The Client profile gives the preview a clear Client context; Studio Staff can inspect the experience the selected Client would see without confusing portal navigation with role preview.
- **Scope:** Client profile, Client portal role preview and its banner exit.

## 30 September 2026 - Client preview explanation

- **Decision:** Add a tooltip to the Client preview banner label explaining that Brisk is being viewed from that Client's perspective and that the visible projects and chats reflect their access.
- **Reason:** The banner identifies preview mode and the Client, while the tooltip explains what the view represents without adding always-visible copy.
- **Scope:** Client portal preview banner.

## 30 September 2026 - Brief Details summary layout

- **Decision:** Present all Main Video Details in one table-like row with the same field headings used by Additional versions. Show the value when known and a clickable **+ Add [field]** action when empty. Remove the separate **Needs confirmation** grouping and required/optional labels.
- **Reason:** Details and Additional versions contain comparable production specifications, but the previous chip grouping made Details harder to scan and implied a priority distinction the owner did not need to manage here.
- **Scope:** Main Video Details section of the Brief summary; existing actions still take the user to the relevant Brief editing step.

## 30 September 2026 - Brief Additional Versions column order

- **Decision:** Keep Deliverable first, then order the available production fields as Duration, Deadline, Platform, Format and Captions. Use this order in both the Additional Versions summary and the Brief deliverables editor.
- **Reason:** Align version details with the main Brief Details scan order, while retaining Deliverable as the identifying column for each cutdown.
- **Scope:** Brief deliverables editor and Additional Versions summary table. In the summary, use shared column widths and positions across Details and Additional Versions. Shoot mode and Brand kit occupy the final two Details tracks and are not applicable to additional versions.

## 30 September 2026 - Brief summary section hierarchy

- **Decision:** Keep a bordered card around Main Video Details. Remove the enclosing card border and the divider beneath the heading from Additional Versions. Retain its numbered heading and the column-heading divider.
- **Reason:** The main video specification is primary; additional versions are supporting cuts and should not compete visually with it.
- **Scope:** Brief summary only. The deliverable editor and data remain unchanged.

## 30 September 2026 - Brief unconfirmed detail count

- **Decision:** Base Main Video Details confirmation state on the confidence of the source that supplies each displayed value. Visibly mark populated AI guesses for review as well as counting them; keep empty fields as **+ Add** actions.
- **Reason:** The summary showed a platform from the main deliverable but counted a separate empty Platform field, so the unconfirmed count was higher than the visible empty fields.
- **Scope:** Brief summary field states and the unconfirmed detail count.

## 30 September 2026 - Send Brief recipient suggestions

- **Decision:** Open project-member mention suggestions above the message editor in the Send Brief dialog so the full list remains visible within the dialog.
- **Reason:** The dropdown opened below the editor and was clipped by the dialog's scroll boundary, hiding recipient options.
- **Scope:** Project-member mention picker in the shared Stage send confirmation dialog.

## 30 September 2026 - V1 Studio branding

- **Decision:** Keep Studio logo upload and Client portal preview in Studio settings. Remove Studio colour customisation and the paid white-label branding controls. Client portals use Brisk's standard purple accent.
- **Reason:** A logo is enough Studio identity for V1; colour settings add decisions and portal variations that are not needed yet.
- **Scope:** Studio branding settings and Client portal appearance. Existing saved colour data remains intact for possible future use.

## 30 September 2026 - Studio Setup settings

- **Decision:** Show Studio name, logo, video types and the default Client Brief as four concise settings cards. Edit each in a focused dialog. Keep one Client portal preview link that opens the full portal with its existing preview banner.
- **Reason:** These are the decisions a Studio needs for V1. Long profile and question lists make the overview difficult to scan.
- **Brief defaults:** Studio Staff can include or exclude standard questions and save their order for future project Briefs. New Briefs use that snapshot to omit excluded questions and order the relevant question steps and fields. Question wording remains fixed in V1. Existing project Briefs retain their own configuration.

## 30 September 2026 - Client portal project cards

- **Decision:** Use one full project-card layout for videos in both **To review** and **In progress**. Keep the same Flow icon sizes and dashed connectors at every Stage. Show a review action only when the Client needs to act; otherwise show the current progress status. Do not bring back the compact in-progress card variant.
- **Reason:** Two card sizes made the same project flow look inconsistent and hid useful controls in the sample portal preview.
- **Scope:** Client portal project cards. Compact Stage progress in the All videos table remains a separate table treatment.

## 16 October 2026 - Shared confirmation dialogs

- **Decision:** Use the approved compact confirmation pattern throughout the app, with an expanded variant for typed confirmation, messages, recipient choices and detailed impact warnings. The implementation and usage guidance live in the Brisk DS.
- **Appearance:** White surface, primary dark border, medium hard shadow, medium radius, concise heading and explanation, small DS action buttons. No decorative header icon, divider or extra close button. Destructive actions use the DS danger button variant.
- **Behaviour:** Preserve the existing action callbacks, validation, recovery details, storage-specific warnings and alternative actions. Escape and backdrop cancel; keyboard focus stays inside the modal and returns to its opener. Dropdown portals remain inside the active native dialog.
- **Scope:** People and Client archives/access removal, Brand Kit and Media deletion, Script/Storyboard version actions, Script rows, Shoot deletion and readiness, Brief/Edit approval, Masters deletion and draft discarding, project file locations, team assignment/invites, sharing, invoice review, plan/add-on/Stripe confirmations, onboarding, production-flow changes and in-app unsaved-settings navigation.
- **Exception:** Retain the synchronous native warning for browser history traversal and the browser-managed reload/tab-close warning in Studio Settings. These protect unsaved changes without changing navigation behaviour.
- **Verification:** Type check passed; 45 existing access, navigation, project-isolation and review-activity tests passed; 39 focused checks passed for modal callbacks/focus, typed safeguards, Media storage warnings, Shoot impact counts and async cancellation. All 18 affected route checks returned 200. Browser checks covered compact/expanded appearance, small-screen fit, name matching, Escape, focus return, sharing destinations/mentions, invoice recipient selection, plan Back/Cancel and unsaved-settings cancellation/discard.
- **Loading correction found during verification:** The root loading fallback previously rendered page content without AppShell's Shoot controls provider. It now waits for AppShell, preventing the provider error without changing the loaded screen.

## 16 October 2026 - Shared editing dialogs

- **Decision:** Use the approved editing-dialog design throughout centred form dialogs. Remove the top-right X and keep an explicit footer exit. The React component and usage guidance live in Brisk DS.
- **Appearance:** Match the approved confirmation family: white, primary border, medium radius and hard shadow, consistent padding and heading, small DS footer buttons, no decorative dividers. Wider variants retain complex forms.
- **Behaviour:** Keep the original fields, validation, save/submit handlers, uploads, conditional sections, extra actions and unsaved-work guards. The body scrolls independently so the footer remains visible. Keyboard focus is contained and restored. Nested menus and confirmations remain available within native dialogs.
- **Coverage:** Shared Clients/settings/People/invitations/costs wrapper, Shoot editing wrapper, onboarding/Studio setup wrapper, Team role/stage/person editors, freelancer time entry, Brand Kit setup/voice/rename/font editors, Media import/move, Masters requests and selectors, Chat settings and call setup.
- **Separate patterns:** Contextual inline editors, anchored popovers, drawers, read-only previews, upload progress, celebrations and full-screen reviews retain their specialised layouts.

- **Verification:** Type check passed; 45 existing access/navigation/project-isolation/review-activity checks, 39 confirmation checks and 32 editing/picker checks passed. The form-field inventory matches the pre-change source. All 15 affected route checks returned 200. Browser checks confirmed desktop/mobile layouts, visible long-form actions, validation, Escape, focus return and nested-confirmation cancellation.

## 17 October 2026 - Shared dropdowns and selection pickers

- **Decision:** Tom approved the borderless search-row design and the recommended keyboard, selection and positioning refinements. Dropdowns now use `BriskSelect` in the Brisk DS, with the existing app import retained as a compatibility export.
- **Appearance:** One primary outer border and medium hard shadow; 12px menu radius, 8px field/option radius and 4px inset. Selected options retain the lavender fill and checkmark. Keyboard focus is distinct from selection and pointer hover. Compact contextual triggers retain their status, source, chip or Brand Kit content.
- **Coverage:** 139 call sites across 41 app files, including all 38 former native selects. Migrated the separate Team Add role menu, Videos filters, Client picker, Brief purpose/platform/format/duration/captions/Brand Kit/tone controls, Shoot day and contact pickers, Script sources and Chat outbound channel picker.
- **Functionality:** Kept stored values, callbacks, validation, custom roles, duplicate-Client checks, creation actions, descriptions/logos/format previews, None-caption exclusivity, the three-tone limit, minimum shoot-day selection and All days. Multi-selection changes remain immediate; Done closes the picker.
- **Behaviour:** Search defaults to lists with more than 15 choices, with explicit overrides for name/source searches. To Do puts Me first and sorts other names alphabetically. Menus fit the visible viewport, open above when appropriate and scroll long lists. Search inputs and footer actions sit outside the listbox. Escape closes the picker before an enclosing dialog; Tab preserves the opener's logical field order.
- **Live DS updates:** Narrowed the dev-server watch exclusion from the whole DS folder to its design exports and guidance. Shared React and CSS component changes now refresh during development without watching the large asset exports.
- **Scope:** Time/calendar entry, typed address/mention suggestions, colour selection, inline choice grids and rich media/source-browser dialogs remain specialised patterns. General navigation/action menus are separate from selection fields.
- **Verification:** Type check passed and all 14 affected route requests returned 200. Browser checks covered plain selection and cancellation, alphabetical Me picker, searchable multi-selection with restored values, Home in the search field, footer Tab/Enter, Escape within an invitation dialog, custom-role input and visible footer in a drawer, Client website search and duplicate warning, and menu fit at a 390px mobile viewport. No invitation, Client or project was created during verification. No browser errors or warnings were reported on the final checked profile. No production build was run.
- **DS record:** `Brisk DS/guidelines/components/dropdown.md` documents the variants, accessibility behaviour, examples and scope boundaries.

## 17 October 2026 - Shared labelled buttons

- **Decision:** Tom approved the existing DS button reference and authorised standardising ordinary labelled actions while preserving functionality. Use the shared DS `Button`, with primary, secondary, tertiary, ghost and danger variants and S/M/L sizes. Dialog footers remain small.
- **Appearance:** Purple primary, white secondary, dark border and 8px corners. Standard hover uses lavender fill, dark text and a medium hard shadow; pressed controls flatten the shadow. Keyboard focus has a visible focus-colour outline. Danger retains red styling, and disabled controls use the existing DS muted colours through named semantic tokens. Ghost actions keep their transparent resting treatment.
- **Implementation:** `Brisk DS/src/app/components/Button.tsx` and `Button.module.css` own the control and its states. Native attributes, refs, handlers, form submission, disabled conditions, ARIA descriptions and tooltips pass through. Consumer classes retain layout hooks, while the scoped DS rules own visual styling. Shoot's page-wide hover and focus suppression now excludes DS buttons. The disabled tokens live alongside the existing shared tokens in `styles/brisk-tokens.css`.
- **Coverage:** Migrated 285 ordinary labelled button call sites across 56 app files. There are now 631 shared DS Button call sites across 98 app files. Coverage includes Client and People actions, Brief, Shoot, Masters, Media and batch actions, Chat, comments, Brand Kits, project files and team controls, time entry, settings and onboarding. Conditional Client archive/restore, invoice review and Masters primary actions retain their existing conditions.
- **Scope:** Navigation links, icon-only controls, grouped sharing/review controls, tabs, segmented controls, selection choices, calendars/time controls, media/player controls, drag handles, clickable cards and contextual menu rows retain their specialised patterns. Existing upload-menu trigger and retry buttons use the DS while the upload flow itself remains intact. No new packages or application-state architecture were introduced.
- **Preservation evidence:** A recoverable source checkpoint was captured before editing. A TypeScript syntax-tree comparison against it found no changes to application code beyond the button tags, presentation props and required imports across all 56 changed TSX files. This includes unchanged callbacks, labels, children, disabled conditions, event handling, validation and all other native props. Storage keys, data models, permissions and providers were not edited.
- **Verification:** Type checking and whitespace checks passed. All 22 distinct checked local routes returned 200, including focused follow-up requests after the final migrations. Browser checks covered project-form validation and cancellation, focus return and Escape, the exact lavender hover and hard shadow, visible keyboard focus, danger confirmation and cancellation, Masters disabled actions and creation, native form submission with save/refresh/reopen, and Staff/Freelancer/Client role views. Freelancer project access remained restricted. The Client portal and naming form were checked at a verified 390 x 844 CSS viewport; primary/secondary actions fit without clipped labels and Cancel returned to the portal without creating a video.
- **Verification cleanup:** The temporary default-message edit survived refresh and was restored to its original value, confirmed by another refresh. Masters' Add deliverable action created one empty verification row immediately; Tom approved removing it, and a refresh confirmed the original empty Masters state. No uploads were attached. The original Client role and normal viewport were restored. A stale local development-server loading state cleared after restarting the server. No production build was run.
- **Limits:** These are representative browser checks and a source-preservation comparison, not exhaustive proof of every workflow. Full uploads/downloads, external playback and every review/approval journey were not exercised. The separate narrow-screen Chat layout issue is unchanged. No performance improvement is claimed.
- **DS record:** `Brisk DS/guidelines/components/buttons.md` documents variants, sizes, states, native behaviour, layout hooks and scope boundaries. Supporting checkpoint and screenshots are under `/private/tmp/brisk-labelled-buttons-2026-10-17.gDzBH9/`. Existing unrelated working-tree changes remain uncommitted and intact.

## 19 October 2026 - Strengthened DS Input and ordinary Client-form pilot

- **Decision:** Tom authorised strengthening the existing DS Input and using it for ordinary Client forms, preserving functionality and leaving specialised controls unchanged. No Textarea, Checkbox, Radio or Toggle implementation is included.
- **Shared implementation:** `Brisk DS/src/app/components/Input.tsx` now accepts native React input attributes and a native ref, with DS S/M/L sizing retained. Existing change/blur handlers are composed with the typing indicator; other handlers pass through. Controlled and uncontrolled values, disabled/read-only states, numeric constraints, input modes, native form participation and caller-provided ARIA/data attributes are supported. No value transformation or new application validation is added.
- **Appearance and accessibility:** `Input.module.css` uses existing semantic tokens for the dark border, white fill, small radius, lavender hover, small hard shadow, blue focus ring, purple typing ring, red error border and muted disabled state. Error fields retain visible focus. Labels have associated ids; hints have stable ids appended to existing descriptions, and errors expose `aria-invalid`. Start/end icon spacing is independent. `labelSuffix` retains Required/Optional copy without introducing native required validation.
- **Pilot coverage:** Seven native ordinary fields now use the shared Input: four in Add Client, two in Client profile details and Project name in Start project. The existing Client code field uses the same strengthened implementation. Form layout, optional/required copy, autofocus, values, callbacks, duplicate detection, code sanitisation and save conditions remain intact.
- **Specialised controls preserved:** Client search, Client selection and its inline creation/duplicate choices, primary-contact selection, project-access checkboxes and both logo uploads are unchanged. Their existing CSS is retained. No other app consumer was migrated and no storage keys, data models, permissions or providers were edited.
- **Preservation evidence:** A pre-change source archive is under `/private/tmp/brisk-input-pilot-2026-10-19.RqFMo5/`. Syntax-tree comparisons confirmed all 96 callback/value/native-behaviour attributes in the two changed Client files match the checkpoint. Specialised input subtrees and the picker, duplicate-matching, access and archive functions also match.
- **Verification:** Type checking and whitespace checks passed. Nine representative route requests returned 200, including Clients, the Loom profile, existing personal/Studio settings, onboarding, Client video naming, People and Brand Kit consumers. Twenty-seven isolated checks using existing dependencies passed for native attributes, refs, event composition, controlled/uncontrolled values, disabled/read-only values, unique labels, error/hint associations and native form submission. No test files, packages or test infrastructure were added.
- **Browser checks:** Confirmed Add Client autofocus, initial disabled action, duplicate detection without creation, email type/value handling, tab order, Cancel/Escape and focus return. Client code conflicts still disable Save; sanitisation is unchanged and the error hint is associated with the input. A temporary Website change survived saving and refresh, then the original Website was restored and confirmed after another refresh. Start project still blocks blank names, enables its action for a name and retains the nested Client picker; Escape closes the picker before the dialog. Studio Freelancer and Client views still deny Client management. A pre-existing Client video-naming draft survived refresh unchanged. Add Client fits a measured 390 x 844 CSS viewport with its footer visible; desktop fields share the same DS border and spacing.
- **Limits and cleanup:** No new Clients, projects or uploads were created. Upload selection, actual new-record creation and every existing Input consumer were not exhaustively exercised. The original Client preview and normal viewport were restored. No production build was run. Shared usage guidance is in `Brisk DS/guidelines/components/inputs.md`.

## 19 October 2026 - Team invitation input batch

- **Decision:** Tom authorised pushing the verified Input pilot and standardising ordinary Team invitation and simple Shoot setup fields in separate verified batches. The pilot commit `167aaac` was pushed to the existing branch and its remote hash confirmed before continuing.
- **Live-flow finding:** Project Team uses `TeamPanel` and `RoleEditorModal`, which open the shared `InvitePersonModal`. Email, Name and Custom role already import the DS Input. The older `InvitePersonPicker` has no runtime consumer. Do not migrate that unused picker and report it as a live improvement. Role-hour and project-rate editors, radio choices, selection lists and invitation messages remain outside this ordinary-field batch.
- **Verification:** Type checking passed and Videos, People and Studio Team route requests returned 200. From the Loom Team panel, the Shooter role opened the live freelancer invitation with its project and role preselected. Email/Name/Custom role exposed the DS input marker and associated hints. Invalid email kept Next disabled; valid local verification details advanced to access selection. Custom role editing and Back retained the draft identity fields; Cancel closed the invitation. No invitation was sent, no assignment changed and no person was created. The application source is unchanged for this batch; the existing controls already meet the requested shared-component standard.

## 19 October 2026 - Ordinary Shoot contact fields

- **Coverage:** The live Shoot contact form now uses the DS Input for Name, Phone and Email. This covers Create new contact, Edit person and Confirm person details. Labels, optional-copy conditions, autofocus, tel/email types, draft updates, create/edit/confirm callbacks and cancellation are unchanged. No validation or field requirements were added.
- **Scope correction:** Runtime tracing confirmed that the older `ShootSetupBuilder` and `DayEditorPopover` have no consumers. The provisional two-field day-popover migration was not retained. Only the three live contact fields were changed. The entire day popover, address autocomplete, conditional role picker/custom-role input, time and day pickers, tables, inline entry, safety forms, uploads and other planning controls remain untouched. No unused files or functions were deleted.
- **Preservation evidence:** The pre-batch archive is `/private/tmp/brisk-input-batches-2026-10-19.9ftfbN/worktree.tar.gz`. A final syntax-tree comparison found all 1,727 callback/value/constraint/ARIA attributes in `ShootStagePage.tsx` unchanged. Only `PersonModal` differs; the other 193 named functions are identical to the checkpoint. No DS foundation, persistence key, data model, permission or provider was changed in this batch.
- **Verification:** Type checking and whitespace checks passed after the final scope correction. Five Shoot/adjacent route requests returned 200, in addition to the three earlier Team-batch requests. Twenty-four isolated checks using the actual Input and contact-form code confirmed create/edit/existing-contact payloads, native field types, autofocus and cancellation. Existing surrounding controls were stubbed only in that isolated check, with no application storage or records involved. No tests, packages or test infrastructure were added to the repository.
- **Browser checks:** Confirmed the three DS markers and tel/email types, editing, keyboard navigation into the unchanged time control, cancellation and the unchanged People picker. The contact form and footer fit a measured 390 x 844 CSS viewport with no horizontal overflow. Before/after desktop screenshots and the final mobile screenshot were captured. Studio Freelancer still sees Project unavailable for the Loom project. The original Client role, first setup question and normal viewport were restored. Final checked browser logs contained no warnings or errors.
- **Limits:** No invitation was sent and no contact, location, shoot day or project was created in the live prototype. Actual new-record persistence, every existing-contact journey and unrelated planning flows were not exhaustively exercised. The isolated callback checks and source comparison supplement, rather than replace, the representative browser checks. No production build was run.

## 19 October 2026 - Single-size shared checkboxes

- **Decision:** Tom approved Single DS size: a 20px square, larger clickable rows and consistent ordinary checkbox states. Strengthen the DS first, then migrate notifications and ordinary access lists in separate verified batches. No 24px DS size variant was added.
- **Foundation:** `Checkbox` now supplies the approved default check icon and mixed-state bar, retains them for disabled selections, sets the native `indeterminate` property alongside ARIA, exposes native attributes/events/refs and keeps the boolean `onChange(checked)` interface. Existing icon overrides remain supported. Space uses the native action; the existing DS Enter shortcut is retained and caller keyboard handlers can prevent it. Semantic-token CSS owns the 20px square, minimum 44px row, hover/pressed states and visible keyboard focus.
- **Notification batch:** `NotificationSettingsCheckbox` now delegates to the DS and keeps only its layout hook. Personal and Studio settings retain all original callbacks, role-specific options, category navigation, reminders, save/discard logic and storage keys. The locked security-email selection remains visible. Page implementation files are unchanged.
- **Access batch:** Ordinary Client/project options and select-all in `InvitePersonModal`, Client profile contact project access and the shared Client Team checklist now use the DS. The checklist also serves Invite colleague. Client Team's All current projects now displays mixed selection, without changing its all/none callbacks. Invitation select-all still operates over the full available option set when search filters visible rows; removing a Client still removes its dependent project selections. Existing labels, descriptions, selected-row treatments, scope, payloads and save/cancel actions remain.
- **Layout correction:** The invitation list's bounded grid initially compressed the new minimum-height rows, pushing descriptions outside the cards. `grid-auto-rows: max-content` preserves the full two-line row height while retaining the existing list scrolling and mobile footer.
- **Specialised implementations unchanged:** Team assignment selection, Brief choice cards, Shoot planning/completion controls, Brand Kit/Media/Masters asset selection, multi-select internals and notification-connection switches were not migrated. Their source files, data models, permissions and storage implementations are unchanged. Existing DS consumers naturally receive the strengthened shared foundation.
- **Verification:** Type checking and whitespace checks passed for each batch. Sixteen isolated foundation checks passed for native attributes/ref cleanup, form participation, boolean callbacks, controlled/local values, mixed/disabled marks and Enter handling. Forty-one isolated access and source-preservation checks passed against pre- and post-migration functions, including filtered select-all scope, empty search, unrelated project ids and save/cancel payloads. No test files, dependencies or infrastructure were added to the repository. The checkpoint and isolated checks are under `/private/tmp/brisk-checkbox-batches-2026-10-19.nnDilK/`.
- **Browser checks:** Existing Brief settings verified Space/Enter, 20px square, 44px row and focus ring, followed by Cancel. Studio notifications verified draft selection without unintended navigation, Cancel and category navigation; personal notifications verified draft/discard and the locked tick. Client access verified draft toggle, cancellation and reopening with the original selections. Invitations verified mixed states, Client/project dependencies, full-scope select-all under search, send-button gating and Back retention without sending. Client Team verified all/none/partial selections, cancellation, original access and reuse in Invite colleague. The Freelancer Client-profile restriction remained intact. Notifications, contact access, invitation access and Client Team access fit a measured 390px viewport, with 20px squares and visible dialog footers.
- **Limits and cleanup:** No notification preferences or access changes were saved, and no invitations or records were created. Live persistence was not retested because its code is unchanged; isolated checks verified the existing payloads. Existing specialised flows were not exhaustively exercised. Seven affected/adjacent route requests returned 200, including Studio setup, personal/Studio/category notifications, People, Client profile and Client Team; Studio Team also returned 200. The original Client role and normal viewport were restored. No production build was run.

## 19 October 2026 - Flagged for the later screen-by-screen polish pass

- **Open: Brief Brand kit selector.** Tom flagged the Step 5 selector as awkward one-off UI and asked to defer it until after shared-control standardisation. The large colour strip, long description, Change kit action and chevron compete inside one field. Review a compact selected-kit preview with one clear Change kit action and move detailed colours/descriptions into the picker. Show meaningful options before implementation. This is a recorded follow-up, not approval to change the selector now.

## 19 October 2026 - Shared radio foundation and verified pilot

- **Approval:** Tom asked to implement the proposed radio recommendations after the read-only comparison. This authorises adding the missing React Radio to the DS using the proposed 20px treatment; it does not claim that the original kit specified this size or that Yura supplied a new asset. Existing named semantic tokens and the approved checkbox-family states are reused. No icon asset, library or data model was added.
- **Foundation:** `Brisk DS/src/app/components/Radio.tsx` is a stateless native radio wrapper with a 20px circle, minimum 44px target, visible focus, hover/pressed states and a selected dot retained when disabled. Native props, refs and events pass through without transforming values. The browser owns same-name grouping, arrow keys, Space, tab order and form reset. Existing fieldsets and legends remain; there is no mixed state, custom Enter shortcut or additional group-state API. `wrapperClassName` preserves the caller's row/card layout.
- **Invitation pilot:** `InvitePersonModal` now imports Radio for the three access-role cards. Names, stored values, role-switch callbacks, descriptions, selected-card treatment, email validation, Client/project branching, invitation payloads and Back/Cancel behaviour are unchanged. Existing DS checkboxes and all ordinary text fields remain intact.
- **Ordinary settings pilot:** Chat's default outgoing-route choices now use Radio. Existing source logos, available/connected-channel filtering, project-specific group names, native values, immediate `onProjectChange` callback and selection-card layout are preserved. Connector switches, configuration, messages and transmission behaviour are unchanged.
- **Scope correction:** Runtime tracing found no action opening the old Shoot access modal. The existing-plan replacement dialog is conditional on a previously attached plan, which the current Shoot entry point does not expose. Provisional edits to both paths were removed; the entire Shoot source and stylesheet match the checkpoint. They are not reported as migrated live improvements. Sharing/review submission, Brief choice cards, voice previews, icon/colour pickers and filters also remain unchanged for separate review.
- **Verification:** Type checking and whitespace checks passed for both batches. People, Studio Team, Shoot and Chat route checks returned 200. A syntax-tree comparison against `92d6467` confirmed all 1,358 existing callback/native-behaviour attributes and the other 201 named functions in invitations, Chat settings and Shoot are unchanged. No test files, packages, infrastructure or production build were added or run.
- **Browser checks:** Invitation roles were exclusive, native Arrow Down changed Staff to Freelancer, all circles measured 20px, the selected dot measured 8px and keyboard focus used the DS blue token. The initial Next action remained disabled until a valid email; Next retained the Freelancer-specific Client/project selection step, and Back retained the role and email. Cancel discarded the draft without sending. At a measured 390 x 844 viewport the invitation dialog had no horizontal overflow and its footer remained visible.
- **Chat checks:** Arrow Down selected WhatsApp and Arrow Up restored the original Brisk route, with only one selected radio. The restored value remained after refresh and reopening the dialog. Native group names/values, 20px circles, 44px rows and the focus ring were verified. On mobile the route cards stack within the existing scrollable dialog body and the footer remains visible. No connector switch or mapping was changed, and no message was sent.
- **Limits:** The conditional Shoot dialogs and specialised radio-like controls were not migrated or exhaustively exercised. Disabled selection, uncontrolled values and form-reset support follow the native implementation but were not separately exercised in live app forms. The original verification role and normal viewport were restored. The Brand kit selector is only flagged above, not changed.

## 19 October 2026 - Context-sized DS Textarea and ordinary message pilot

- **Approval:** Tom chose Context-sized fields and explicitly authorised the missing DS Textarea addition. One appearance is shared; native rows and existing layout constraints set height. No automatic growth or compulsory uniform height was introduced.
- **Foundation:** `Brisk DS/src/app/components/Textarea.tsx` and its scoped stylesheet own ordinary multi-line fields. Native attributes, refs and events pass through; change/blur compose with the typing indicator without transforming values. Associated labels, optional suffixes, stable hint descriptions and error semantics follow the strengthened Input family. The implementation uses Paragraph/S, existing padding/radius/colour/shadow tokens, lavender hover, visible blue focus, purple typing, visible error focus and muted disabled states. Native Enter remains a line break and vertical resizing is retained.
- **Pilot:** Default Submit message for Client and Studio destinations, Client notification Message templates and editable Studio notification Message templates now import the DS component. All three retain five rows, the 240-character limit and existing values/callbacks. The Submit field retains its required attribute and minimum height. Draft/save/restore behaviour, previews and variable resolution, subject/title/sign-off, selection, fixed-wording restrictions, role gating and storage keys are unchanged. All three live examples measured 126px high on desktop.
- **Preservation:** A source checkpoint is under `/private/tmp/brisk-textarea-pilot-2026-10-19.S3lc0e/`. A syntax-tree comparison found all 148 existing callback/value/native-behaviour attributes and six non-JSX named functions unchanged across the three consumer files. Only their field markup/imports and obsolete field styling changed. No data model, provider, access role or persistence implementation changed.
- **Verification:** Type checking and whitespace checks passed. Twenty-five isolated checks of the actual DS component passed for labels, descriptions, unique ids, native refs/attributes, controlled/read-only/disabled values, native form data/reset and change/blur composition. These checks live only in the temporary checkpoint directory; no tests, packages or infrastructure were added to the repository. Four affected route requests returned 200, including both Submit destinations.
- **Browser checks:** Confirmed DS markers, labels, rows, limits, retained heights, blue focus and purple typing. Enter inserts a line break. Blank Submit text keeps Save disabled, and the preview still resolves Stage/project variables. Client template Cancel and Studio notification Escape discard drafts; reopening retains the original text and returns focus to Edit message. Native typed input stops at 240 characters. Temporary Submit and Client template edits survived saving and refresh; original wording was restored through the UI and confirmed after another refresh. The Studio destination still uses its separate default. Freelancer Submit access remains available while Studio notification settings stay restricted; Client access to Studio settings remains restricted.
- **Mobile:** At a measured 390px viewport, the Submit field fits the page and both template dialogs have no horizontal overflow, with Cancel/Save visible. The original Client verification view and normal viewport were restored. Final checked browser logs contained no warnings or errors.
- **Scope and limits:** Studio instructions, People notes and the unused Studio description screen were not migrated. Chat/AI composers, Script, Brief, review and specialised Shoot editors are unchanged. No messages, invitations or records were sent/created and no notification preferences changed. Studio notification persistence, every category/template and every specialised workflow were not exhaustively exercised; their source preservation supplements representative checks. No production build was run. Usage guidance is in `Brisk DS/guidelines/components/textareas.md`.

## 19 October 2026 - Studio instructions Textarea batch

- **Precondition:** The verified Textarea foundation and message pilot were pushed to the existing GitHub branch. The remote hash matched `54949966f07c1c02d806650939e718546c6e99e1` before this batch began.
- **Coverage:** Only the ordinary Studio instructions field in AI Playbook now imports Textarea. The 120px minimum, native two-row starting value, placeholder, absence of a character limit/requirement and original value/change callback are retained. Removed its redundant local visual styling, keeping the layout minimum. Uploads, reference links, AI prompt/composer, data models and providers are unchanged.
- **Preservation:** All 52 existing callback/value/native-behaviour attributes in the page match the pre-batch source. The explicit two rows retain the browser's former default. A recoverable checkpoint is under `/private/tmp/brisk-textarea-batches-2026-10-19.47bimI/`.
- **Verification:** Type checking and whitespace checks passed; AI Playbook returned HTTP 200. Browser checks confirmed the DS marker, unchanged 120px height, associated label, vertical resizing, native line break, blue focus and purple typing. Discard reverted a multi-line draft. A temporary saved instruction survived refresh, and the original was then saved back and confirmed after another refresh. Staff access remains available; Freelancer and Client views remain restricted. At 390px the field fits without page overflow. No references were added/removed and no AI request was sent. Final checked browser logs contained no warnings or errors. No production build was run.

## 19 October 2026 - People notes Textarea batch

- **Coverage:** The shared People profile Internal notes field now imports Textarea. Its 200px layout minimum, accessible name, placeholder, native two-row starting value, unbounded text, Save callback, private-copy message and notes/activity layout remain. Paragraph/S and DS padding/states replace the former local 16px text and hover/focus rules. The separate conditional inline profile editor and its styling are unchanged; it is not counted as migrated.
- **Preservation:** A syntax-tree comparison against the pushed pilot found all 378 existing callback/value/native-behaviour attributes and the other 30 named functions unchanged in `PersonProfilePage.tsx`. The People provider, contact-note path, role/visibility rules, data models and storage code are unchanged. The Studio batch independently retained all 52 existing behaviour attributes. The checkpoint is `/private/tmp/brisk-textarea-batches-2026-10-19.47bimI/`.
- **Existing limitation:** People notes are kept in the in-memory provider, not persistent browser storage. Save survives switching profile sections in the same session; a full refresh resets notes to mock data. This was confirmed in the existing provider and live verification, reported to Tom and deliberately preserved. No new persistence was added under this styling request.
- **Verification:** Type checking and whitespace checks passed. People directory and the affected profile route returned HTTP 200. Browser checks confirmed the DS marker, retained 200px height, native line breaks, vertical resize setting, blue focus/white fill and purple typing. Unsaved edits discard on section changes; saved multi-line text remains after switching Overview and back. The original note was then saved back and confirmed through another section switch. At a measured 390px viewport there was no horizontal page overflow, and Save remained reachable/visible by keyboard. Freelancer and Client views exposed no notes field. The normal viewport and original Client verification view were restored; checked browser logs contained no warnings or errors.
- **Scope and limits:** No records, invitations, uploads or AI requests were created/sent. Studio references and all specialised Chat/AI composers, Script, Brief, review, Shoot and inline profile editors remain unchanged. Client-contact and every Person type were not separately exercised; their unchanged provider paths and shared field implementation supplement representative checks. No tests, packages or infrastructure were added and no production build was run. This batch and Studio instructions are local commits, separate from the already-pushed pilot.

## 19 October 2026 - Single-size DS Toggle and Chat pilot

- **Approval:** After comparing the current Chat switch, Single standard size and a multi-size alternative, Tom chose the original single-size proposal with the DS blue keyboard-focus treatment. This approves the missing React Toggle addition using existing tokens. The 42 x 22px track retains Chat's existing dimensions; it is not claimed as a verified original-kit S/M/L measurement.
- **Foundation:** `Brisk DS/src/app/components/Toggle.tsx` is a stateless native checkbox with `role="switch"`. Native attributes, events and refs pass through, including controlled/uncontrolled selection, names/values, form participation, disabled values and descriptions. There is no added Enter shortcut, mixed state, application state or persistence. The native target covers a minimum 44px-high labelled row. Semantic tokens supply the dark border, white/purple track, 16px thumb, hard hover shadow, blue focus and pressed/disabled states. Disabled thumb position retains the selected state without fading the whole control.
- **Pilot:** Only WhatsApp and Slack's Use for this project switches in Project External Chat settings now import Toggle. The existing labels, enabled values, reconnect restriction and native event callbacks remain. Default-route radios, preferred-route fallback, connector configuration/mapping, messages, transmission and storage implementations are unchanged. The obsolete local switch styling was removed; the existing row layout hooks remain.
- **Preservation:** A source checkpoint is under `/private/tmp/brisk-toggle-pilot-2026-10-19.rzBb0u/`. A syntax-tree comparison confirmed all 61 existing behaviour attributes plus `updateEnabled` and `saveConfiguration` functions are unchanged. Checkbox type and switch role now belong to the DS wrapper; the decorative track remains hidden from accessibility APIs.
- **Verification:** Type checking and whitespace checks passed. Twenty-two isolated checks using the real component confirmed native props, refs, associated/ARIA labels, form data/reset, uncontrolled toggling, controlled selection, disabled state and native event/keyboard-handler pass-through. These checks are temporary only; no tests, dependencies or infrastructure were added to the repository. Chat and Studio integrations returned HTTP 200. No production build was run.
- **Browser checks:** Pointer and Space toggle WhatsApp, and keyboard navigation shows the DS blue ring plus hard shadow. Both tracks measured 42 x 22px with 44px-high native targets. Slack remains disabled/on when reconnect is required and has the new muted treatment. Turning off WhatsApp while it is preferred removes that route and selects Brisk; turning it back on restores its availability without changing Brisk's selection. Updates remain immediate after closing/reopening with Cancel, as before. Original WhatsApp/Slack flags and the Brisk preferred route were restored and confirmed after refresh. At 390px the dialog has no horizontal overflow, targets retain their height and Cancel remains visible. Freelancer and Client views expose no External Chat settings action. The original verification view and normal viewport were restored; final checked browser logs contained no warnings or errors.
- **Scope and limits:** No messages, invitations, uploads, mappings or connector accounts were created/sent/changed. Save-based forms, specialised controls, other DS controls and all unrelated editor/provider/data files are unchanged. Actual external integrations, every project's connectors and forced-colour modes were not exhaustively exercised. This is a verified front-end pilot, not a full accessibility conformance claim. Usage is documented in `Brisk DS/guidelines/components/toggles.md`.

## 19 October 2026 - Quiet, context-sized DS IconButton

- **Approval:** Tom chose quiet by default and context-sized buttons, and explicitly authorised the missing shared DS IconButton addition. This supersedes a general requirement to frame every ordinary icon action. The documented square/circle shapes and existing DS tokens remain; 32/40px is the approved prototype size mapping, not an independently verified original-kit matrix.
- **Foundation:** `IconButton.tsx` is a stateless native button. It defaults to quiet, square and compact. The visible surfaces are 32px with a 16px icon or 40px with a 20px icon, inside non-overlapping 44 x 44px native targets. The optional secondary treatment retains white fill and a dark border; circles are reserved for avatar-style use. Quiet hover uses a lavender fill without a frame or raised shadow. Keyboard focus uses the blue token plus the size-appropriate hard shadow; pressing flattens the shadow. Disabled appearance uses existing muted tokens.
- **Semantics:** An accessible action label is required. Native refs, events, disabled/form/ARIA attributes pass through without keyboard interception, permission logic, persistence or application state. The existing app tooltip defaults to the label without adding a duplicate accessible description. Position/alignment options keep trailing and popover-header tooltips inside their containers. Consumer classes are layout/visibility hooks only.
- **Verification:** Type checking covers the imported foundation through real pilot consumers. Live checks measured both visual sizes, 16/20px icons and 44px native targets, confirmed transparent borders/fill at rest, visible 4px blue keyboard focus and native Enter/Space activation. The notification demonstration's existing ref successfully focuses the actual native button. Appearance and native pass-through were also reviewed in source; secondary/circle/disabled variants were not separately exercised in application workflows. No tests, libraries or production build were added/run. Usage is documented in `Brisk DS/guidelines/components/icon-buttons.md`.

## 19 October 2026 - Ordinary Chat IconButton pilot

- **Coverage:** Header back, project member management, External Chat settings and Client settings now use the medium quiet control. Thread close and keyboard-shortcut-sheet close use compact quiet controls. Redundant back-button styling was removed and the broad Chat focus reset excludes the DS IconButton. Existing call-card icon styling remains for the specialised call controls.
- **Preservation:** All 396 existing behaviour attributes across the four migrated Chat consumer files are unchanged in a syntax-tree comparison, excluding presentation properties. The checkpoint is `/private/tmp/brisk-icon-button-pilot-2026-10-19.GaK2l8/before.tar.gz`. Message, composer, rail, call-launcher, recent-call and connector-settings source files are unchanged. No messages, invitations, access, routes, mappings or connector settings were saved/changed by verification.
- **Verification:** Type checking, whitespace checking and the Chat HTTP 200 check passed. Browser checks covered quiet rest appearance, measured target/icon sizes, tooltip visibility and blue keyboard focus; Enter opens External Chat settings and Cancel restores focus; Space opens People with access; the original thread-close, shortcut-close and Client-settings callbacks work; project back works by keyboard and pointer. Both close sizes remain native buttons. Staff, Freelancer and Client views retain their existing visibility rules for the checked project.
- **Mobile and limits:** At a measured 390px, the Client thread pane fits the viewport, its close target remains 44 x 44px and Space closes it. Studio Chat retains its pre-existing 960px minimum canvas below 1040px, so Studio content/actions are still clipped on phones. This separate, previously identified narrow-screen layout problem is not fixed or claimed as passing by this styling pilot. All DM/group navigation branches, embedded Chat contexts and every project were not exhaustively exercised. The original Client verification view and normal viewport were restored; checked browser logs contained no warnings or errors.

## 19 October 2026 - Notification popover IconButton pilot

- **Coverage:** The existing When this sends demonstration close button and recent-notification popover close button now use compact quiet IconButton. The demonstration retains its native ref, dismissal callback and trigger-focus return. The recent-notification close action retains its desktop-hidden/mobile-visible behaviour through a visibility-only wrapper. The bell trigger, unread badge, mobile navigation link, labelled Mark all as read action, notification items and providers are unchanged.
- **Preservation:** All 108 existing behaviour attributes in both notification consumer files are unchanged, excluding presentation properties. Together with Chat, the comparison preserves 504 existing behaviour attributes across six files. Seven checked specialised/provider files are byte-for-byte unchanged. No preferences, templates, notifications, read states or stored records were changed during verification.
- **Verification:** Type checking and whitespace checking passed; Chat, Work to review settings and Notifications returned HTTP 200. The demonstration opens with its real native close button focused; Space/Enter close it, Escape still dismisses it, and focus returns to Show when this sends. At a measured 390px, the demonstration popover and 44px close target fit without page overflow; its tooltip is aligned below the header to avoid clipping. The recent-notification close remains hidden on desktop, appears as a 44px target after resizing the open popover to mobile, and closes it by pointer. The ordinary mobile notification link remains available. Staff can open the demonstration; Freelancer and Client views remain restricted. Checked browser logs contained no warnings or errors, and the normal viewport and original verification view were restored.
- **Limits:** The current recent-notification fixture is empty, with Mark all as read disabled as before. Populated delivery actions, every notification category and external delivery were not exhaustively exercised. Their data/provider paths and labelled controls are unchanged. No tests or production build were run. Both verified pilot batches are saved locally, not pushed automatically.

## 19 October 2026 - Quiet-by-purpose DS foundations

- **Approval:** Tom chose Quiet by purpose and authorised shared DS additions for Client filters, notification filters and Chat Client settings Overview/People tabs. This explicitly approves quiet list filters and underlined content tabs as React extensions, rather than claiming the original kit exported these exact components or a 44px size matrix.
- **Foundation:** `FilterGroup.tsx` supplies a named group and native pressed-state FilterButton, with optional visible counts including zero. Native props, refs, events and form attributes pass through; type defaults to button. Consumers retain selection and callbacks. `Tabs.tsx` supplies a controlled horizontal tablist with stable ids, one selected tab stop, disabled-option skipping, linked active panel and automatic Left/Right/Home/End activation. Escape remains available to enclosing dialogs. No component owns application state, persistence, role gating or data calculations.
- **Appearance:** `QuietChoices.module.css` owns 44px targets, Label/S-semibold text, optional Label/XS counts, wrapping groups, quiet lavender selected filters, underlined selected tabs, lavender hover, blue focus with hard shadow, flattened pressed shadow and muted disabled states. Consumer classes retain layout only. No unused SegmentedControl or attached-panel variant was added.
- **Verification:** Type checking covers both foundations through their real consumers; route checks and whitespace checking pass. Browser checks exercised native filter Enter/Space, tab arrows/wrapping/Home/End, selected tab stops, panel linkage/focus, visible 4px blue focus, 44px targets and narrow-screen layouts. Disabled tabs, inherited RTL direction, root/button ref combinations and forced-colour modes were reviewed in source but not separately exercised in live application workflows. No tests, dependencies or production build were added/run. Usage is documented in `Brisk DS/guidelines/components/quiet-choices.md`.
