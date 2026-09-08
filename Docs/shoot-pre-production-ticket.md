# Shoot - Pre-production workspace

> Refine the canonical Shoot experience so Studio Staff, Filmmakers and Clients can prepare a shoot in one clear Pre-production workspace. Reuse the current Shot List, Interview Questions, Plan the Day, Schedule and Call Sheet components and data. Do not rebuild Shoot as a parallel implementation.

**Repository:** `brisk-prototype`  
**Branch:** `codex/unified-brisk-prototype`

## Reference and scope

This ticket applies to projects whose recommended or Studio-adjusted production flow includes the top-level **Shoot** Stage.

It refines only the **Pre-production** experience inside Shoot. The production-flow templates, Storyboard Stage, Animation Stage and the order of top-level Stages are outside this ticket.

Reuse the existing mocked local state and useful working controls. Restructuring the current Shoot components is expected, but do not create a second Shoot route, repository or branch.

## Outcome

- Replace the current Shoot dashboard and separate Creative Plan and Plan the Day cards with one working Pre-production workspace.
- Keep Quick Start permanently available as the optional Brisk-assisted entry and update surface.
- Keep the Shot List, Interview Questions, Visual References, people, days, locations, Schedule, notes, documents and Call Sheet connected.
- Open the generated Shot List immediately after Brisk builds a starting plan.
- Return users to their last-opened section, while allowing them to revisit Quick Start at any time.
- Keep the experience approachable for Clients and Filmmakers while allowing the Studio to choose whether each person has view-only or editing access.
- Maintain one live, WYSIWYG Call Sheet that updates automatically from Pre-production and can be edited by people with permission.

## Shoot structure

Inside the existing top-level Shoot Stage, the production order remains:

**Pre-production → On Set**

Use a persistent left-hand local navigation on desktop. Do not duplicate this navigation with top tabs, large navigation cards or a global bottom stepper.

This ticket implements and refines **Pre-production**. On Set remains visible as the next substage and is not otherwise redesigned. The existing Call Sheet becomes the single Call Sheet view used from Pre-production, On Set and shared links.

On mobile, replace the left navigation with the established Brisk section selector above the content.

## Left-hand navigation

Use the left sidebar as the single source of local navigation inside Shoot. Show the selected content in the main area to its right.

### START

- **Quick Start** - the permanent, optional Brisk-assisted planning surface

### WHAT TO CAPTURE

- **Shot List** - default working view after Quick Start
- **Interview Questions** - shown only when interviews are relevant
- **Visual References**

### PLAN THE DAY

- **Dates**
- **Locations**
- **People**
- **Schedule**
- **Notes**
- **Documents**

### ON SET

- **Call Sheet** - the one live Call Sheet, shown according to the viewer's permissions

Navigation behaviour:

- Keep the sidebar visible while working on desktop.
- Keep Quick Start visible permanently.
- On a person's first visit, open Quick Start by default.
- On later visits, open the last-used section. The person can still return to Quick Start at any time.
- Use a clear selected state plus useful counts or labels such as “13 shots”, “4 people” or “Not confirmed”. Do not use completion ticks.
- Allow users to open any section available to them and work in any order.
- Do not add a dashboard between Shoot and the working content.
- Use contextual **Back** and **Continue** actions only inside Quick Start or the guided Plan the Day questions. Do not add another persistent stepper.
- Keep On Set and the Call Sheet available at all times. Do not add a Complete Pre-production action or navigation gate.

## Permanent Quick Start

Quick Start is always available from the local navigation. It is a lightweight way to build or update the production plan, not a one-time wizard.

- Ask no more than **two questions** each time it is opened.
- Pre-populate answers from the available Brief, Script and existing project information.
- Ask only for useful information that remains missing or unconfirmed.
- Allow every answer to be skipped or set to **Not confirmed yet**.
- Do not require completion before opening the rest of Pre-production.
- Never generate automatically. Wait for the person to choose the primary action.

Typical questions include:

1. **What are you planning to capture?**
   - Interviews
   - Scripted scenes
   - B-roll or general coverage
   - Event or documentary coverage
   - A mixture
2. **What do you already know about the shoot?**
   - Date
   - Location
   - Not confirmed yet

The exact questions can change when Brisk already knows an answer. For an interview-led film where no pre-shoot Script exists, use the Brief and ask for likely interviewees or the most useful missing production detail.

When the plan is empty, use:

**Build my starting plan with Brisk**

When content already exists, use:

**Update my plan with Brisk**

Quiet secondary action:

- **Open Pre-production without generating**

After the initial action, Brisk creates and displays:

- The initial Shot List
- Interview Questions when relevant
- Provisional Talent or subjects
- Known locations
- Unassigned or unscheduled shots ready for the Schedule

Open directly on the generated Shot List. Do not add a suggestions-review or confirmation screen.

Keep a permanent **Generate with Brisk** control in the Pre-production header while the plan is empty. Change its label to **Update with Brisk** when content exists, but keep the control in the same position. It opens Quick Start rather than starting a separate flow.

## Generate and update behaviour

- Use the available Brief and/or Script to populate relevant Interview Questions and the Shot List.
- Populate known Talent, subjects, locations and priorities when that information exists.
- Leave unknown logistics as **Not confirmed yet**. Do not invent production details.
- Insert initial generated content directly into the editable working views.
- Show a concise result message, for example: “Brisk suggested 6 interview questions and 13 shots from your Brief and Script.”
- **Update with Brisk** never edits, deletes or reorders existing content.
- Updates add new rows marked **Suggested**, with direct **Keep** and **Remove** actions.
- Repeated updates must not add equivalent suggestions. Compare normalised question or shot text together with the selected subject before inserting a suggestion.
- Keeping a suggestion converts it to normal working content. Removing it deletes only that suggestion.

For the front-end prototype, generation is deterministic mocked behaviour based on the project and its production type. A real AI service is out of scope.

## Shot List refinement

Reuse the existing Shot List data and useful controls, but remove the current four-step Creative Plan wizard.

Remove these blocking steps:

- Choosing between Brisk suggestions and starting manually
- Reviewing suggested shots before reaching the working list
- Completing essential details for every shot as a separate step
- Reviewing a duplicate summary before returning to Shoot
- The numbered 1-4 stepper

The Shot List itself is the editing and review surface.

Show these fields by default:

- Description
- Talent or subject
- Optional location
- Priority

Behaviour:

- Add, remove and reorder shots directly.
- Use automatic shot numbering.
- Support inline editing where practical.
- Clicking a row may open a compact detail drawer. Do not open a multi-step flow.
- Place shot size, camera movement, shot category and shot-specific reference images under **More details**.
- Show a small thumbnail or image indicator when a shot has a reference attached.
- Remove **Captured** from the Pre-production Shot List. Shot check-off belongs in On Set.
- A shot may be completely unassigned to a shoot day.
- A shot may be assigned to a shoot day but remain untimed.
- Neither state blocks navigation or Call Sheet access.

## Interview Questions

Show Interview Questions beneath Shot List in the left navigation, not as another workflow step.

- Derive interview relevance from the project's canonical production-flow recommendation or explicit Brief answer. Do not maintain a separate competing relevance flag.
- Use a simple reorderable list rather than a card for every question.
- Each row contains the question and a **For** field.
- Allow inline editing, adding, deleting and reordering.
- Hide the destination when interviews are not relevant.
- Brisk may generate starting questions from the available Brief and/or Script.

### Shared people and shoot assignments

Use one person identity and allow it to have multiple shoot assignments.

The **For** picker must allow users to:

- Select an existing Studio or Client contact
- Select Talent already added elsewhere in Pre-production
- Add a name as provisional Talent
- Choose **Not confirmed yet**

Do not require email, call time or logistics while writing questions.

- Talent added through Interview Questions automatically appears in People with **Details needed**.
- Talent added through People is immediately available in the Interview Questions picker.
- Prevent duplicate identities by using the source contact ID first, then normalised email, then normalised name when no stronger identifier exists.
- Store Crew, Talent and Client contact as shoot assignments, not duplicate people.
- Allow the same person to have more than one assignment when necessary.
- Each assignment may have its own shoot-specific role, attendance days and call-time override.
- If Brisk knows only the role, allow a provisional label such as “CEO interviewee”.

## Visual References

- Show **Visual References** beneath Shot List and Interview Questions in the left navigation.
- Open overall references as a simple gallery in the main content area.
- Keep shot-specific references under that shot's More details.
- Allow people with edit access to upload, paste or remove references.

## Plan the Day refinement

Reuse the current question-based Plan the Day builder because its questions provide useful structure. Present Plan the Day as a group within Pre-production, not as a separate Shoot module.

Keep the existing five question screens and show them directly under Plan the Day in the left navigation:

**Dates → Locations → People → Schedule → Notes**

- Use the left navigation as the section navigator. Do not add a second local stepper.
- Show the current question title clearly in the main content area.
- Allow people with edit access to move forwards and backwards with contextual actions or open any question directly from the sidebar.
- Each question supports **Not confirmed yet** where relevant and **Skip for now**.
- First-time users can follow the guided order. Returning users open their last-used section.

### Dates

- Preserve multiple shoot days.
- Capture the date, general call time and expected wrap for each day.
- Allow days to remain unconfirmed.

### Locations

- Preserve multiple locations and day assignment.
- Capture location name, address, map link, parking and access details.
- Show weather for each shoot day once its date and primary location are confirmed.
- Use deterministic mocked weather in the front-end prototype. Do not add a real weather integration.

### People

- Search existing Studio and Client contacts.
- Prevent duplicate person identities while allowing multiple shoot assignments.
- Support Crew, Talent and Client contact assignments.
- Capture a shoot-specific role for each assignment.
- Default assignments to the day's general call time and all shoot days.
- Ask for call-time or attendance-day overrides only when needed.
- Keep shared contact-detail visibility explicit and off by default for personal details.

### Schedule

- Preserve the existing day-based Schedule builder.
- Group Schedule entries visibly by shoot day.
- Show a global **Unassigned shots** group for Shot List items without a shoot day.
- Show **Unscheduled shots** within each day for assigned shots without a start time.
- Allow shots to remain in either group without blocking navigation or Call Sheet access.
- Allow dragging or adding shots into the Schedule.
- Preserve entry types such as Shot, Setup, Travel, Lunch and Break.
- Keep advanced entry controls under **More options**.
- Use **Add schedule item** because the action creates more than shots.

### Notes

Keep optional sections collapsed under **Add notes for the day**:

- Equipment
- Wardrobe
- Catering
- Access
- Safety
- Weather considerations
- Client-visible notes
- Internal Studio notes

Store these sections against the selected shoot day. Internal Studio notes never appear to Clients, external recipients or anyone without Studio-internal access.

## Using an existing shoot plan

Keep **Use an existing shoot plan** separate from supporting documents.

- Make it available from Quick Start and as a persistent secondary action in the Pre-production header.
- Allow PDF upload, spreadsheet upload, share link, or separate Shot List and Call Sheet files.
- Ask whether it covers the Creative Plan, Plan the Day or both.
- Mark the relevant navigation groups as **Existing plan attached** without deleting any native content.
- Keep native planning sections available so the Studio can restore or build them later.
- An uploaded Call Sheet accompanies the native live Call Sheet as an attached reference. It never becomes, replaces or creates another Brisk Call Sheet.
- Show an attached Call Sheet beside the live Call Sheet with its own **Open** action.
- Provide **Open**, **Replace** and **Request review** actions.
- V1 displays and shares the existing plan. AI extraction is out of scope.

## Supporting shoot documents

Show **Documents** beneath Notes in the left navigation. Within Documents, provide **Add supporting document**.

Allow people with edit access to:

- Upload a PDF
- Upload a spreadsheet
- Paste a share link
- Open, download or remove an attached document

Supporting documents are reference material only. They never mark a planning area as covered and do not replace, populate, hide or override native Pre-production content.

## One live Call Sheet

Maintain one Call Sheet object and one Call Sheet experience. Do not create working, published or unpublished versions.

- Pre-production data updates the Call Sheet immediately.
- Edits made directly in the Call Sheet by someone with permission update the same underlying Pre-production data.
- **Open Call Sheet** from Pre-production, On Set and shared links opens the same current Call Sheet.
- Do not use **Preview Call Sheet**, because there is no separate preview version.
- The visible controls and editing state depend on the person's permissions.
- View-only recipients always see the current Call Sheet but cannot alter it.
- People with edit access use the same layout with editing controls enabled.
- Share, Request Review and Approve Shoot operate on the current Call Sheet. They do not publish or copy it.
- A shared Call Sheet updates automatically when permitted people change its data.
- Remove the narrow Call Sheet side preview.
- Remove all “unpublished changes” language and behaviour.
- Keep Share, Request Review and Approve Shoot on the Call Sheet rather than throughout the other Pre-production sections.
- If an approved Call Sheet receives a material edit to important visible information, clear its approval and show **Changes made - approval required again**. Internal Studio notes, automatic weather updates, on-set completion tracking, hidden technical metadata and inconsequential formatting corrections preserve approval. This does not create another Call Sheet version.

## Open navigation and readiness warnings

- Pre-production has no completion gate and no Complete Pre-production action.
- On Set and the Call Sheet remain available at all times.
- All permitted changes autosave and update the same Call Sheet.
- Missing information appears as **Not confirmed** rather than blocking navigation.
- The left navigation shows counts or information states instead of completion ticks.
- Overall Shoot statuses describe the workflow and never control navigation.

Only check readiness when someone chooses **Share Call Sheet**, **Request Review**, **Approve Shoot** or **Start shoot**.

Check for:

- Shoot date
- General call time
- Primary location and address
- On-the-day contact and phone number

If important information is missing, show a non-blocking warning that names it clearly.

Example:

> Some Call Sheet details are not confirmed: shoot date and on-the-day contact.

Actions:

- **Add details**
- **Continue anyway**

The person can always continue when they have permission to perform the original action.

## Access and permissions

Filmmakers and Clients use the same Pre-production workspace when the Studio grants access. Do not hard-code a reduced Client planning experience.

At the Shoot Stage level, Studio Staff can assign:

- **View only** - can open current non-private Pre-production information and the Call Sheet, comment, confirm requested details and approve when asked
- **Can edit** - has the same visibility and can add, edit, remove and reorder the complete Pre-production plan, including the Shot List, Interview Questions, people, Schedule, notes and documents
- **Can manage** - includes Can edit and allows the person to share the Call Sheet, request review, approve the Shoot, start the shoot and complete the shoot

Rules:

- Use Stage-level access rather than new per-field or per-section permission settings.
- Studio Staff control access for both Filmmakers and Clients.
- A Client with Can edit may help plan the complete shoot, including Crew logistics and Schedule order.
- Any Filmmaker or Client can be granted View only, Can edit or Can manage.
- A Filmmaker and a Client with the same access level receive the same Shoot capabilities.
- Existing contact-detail visibility controls still decide whether personal email and phone details appear.
- Internal Studio notes remain restricted to Studio-internal access.
- Only Studio Staff configure access levels and shared-link permissions.

## Acceptance criteria

- [ ] The canonical top-level Shoot Stage contains Pre-production and On Set. No parallel Shoot implementation or extra top-level Shoot Stage is introduced.
- [ ] The current Shoot dashboard and separate Creative Plan and Plan the Day cards are replaced by the working Pre-production workspace.
- [ ] Desktop uses one persistent left sidebar grouped into Start, What to Capture, Plan the Day and On Set. Mobile uses the established section selector. No duplicate top tabs, navigation cards or persistent bottom stepper are added.
- [ ] Quick Start remains permanently available. It asks no more than two relevant, pre-filled questions and never generates until the person chooses Build or Update.
- [ ] First-time visitors open Quick Start. Returning visitors open their last-used section and can revisit Quick Start at any time.
- [ ] Build creates editable shots, relevant Interview Questions and known project details directly in Pre-production without an intermediate review wizard.
- [ ] Update adds non-duplicate rows marked Suggested and never edits, deletes or reorders existing content. Suggested rows can be kept or removed directly.
- [ ] The generated Shot List opens by default and supports direct adding, editing, deleting and reordering. Default fields are Description, Talent or subject, optional Location and Priority. Technical fields and shot references remain under More details. Captured remains in On Set only.
- [ ] Interview Questions appear only when the canonical flow says interviews are relevant. They support direct editing and reordering and use shared person identities.
- [ ] One person identity can hold multiple shoot assignments without duplicate contact records.
- [ ] Overall Visual References open as a simple gallery. Shot-specific references remain attached to individual shots.
- [ ] Dates, Locations, People, Schedule and Notes remain available in any order, with Not confirmed yet and Skip for now where relevant.
- [ ] The Schedule distinguishes unassigned shots from day-assigned but untimed shots.
- [ ] Existing shoot plans can cover Creative Plan, Plan the Day or both. An uploaded Call Sheet accompanies but never replaces the native live Call Sheet. Supporting documents remain separate reference material and never cover native planning.
- [ ] There is one live WYSIWYG Call Sheet. All permitted edits update it immediately. There are no working, published or unpublished copies.
- [ ] Open Call Sheet always opens the same current Call Sheet. Editing controls are determined by access.
- [ ] Share, Request Review and Approve Shoot appear on the Call Sheet and operate on the current data without a publishing step.
- [ ] A material edit clears an existing Call Sheet approval without creating another version.
- [ ] Readiness warnings check only shoot date, general call time, primary location and address, and on-the-day contact and phone. Warnings are specific and non-blocking.
- [ ] Any Filmmaker or Client can receive the same View only, Can edit or Can manage Shoot access. Studio Staff configure access.
- [ ] Private contact details and Internal Studio notes remain protected by their existing visibility rules.
- [ ] The refined experience works on desktop and mobile, uses British English and contains no em dashes.

## Out of scope

- Redesigning the broader On Set or live-shoot helper experience
- Changing production-flow templates, Storyboard or Animation
- Versioned, working, published or unpublished Call Sheets
- AI extraction from existing plans or supporting documents
- Real AI, weather, mapping or backend integrations
- New per-field or per-section access settings
- A new repository, branch or duplicate Shoot implementation
- Refactoring unrelated parts of the app
