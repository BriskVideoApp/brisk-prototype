# Project naming conventions

Use a short, recognisable Client code so projects, edit versions, emails and invoices can be found together. These conventions describe the intended Brisk prototype behaviour. Keep the project code separate from the descriptive project name.

## Client and project codes

- Prefer a Client code of fewer than five characters when it clearly identifies the Client. A longer code is acceptable when a short one would be unclear.
- Give each new project a unique, three-digit sequence within its Client. The code is assigned once and remains stable when the project name changes.
- Display the project code before the editable project name. Use an underscore when the two are combined in a filename or subject.

| Client | Example Client code | Example first project code |
| --- | --- | --- |
| Australian Security Technology | `ast` | `ast001` |
| 350.org | `350rg` | `350rg001` |
| Sapphire | `saph` | `saph001` |

Example combined label: `saph001_Product launch`. Existing prototype projects retain their current codes until a separate migration is agreed.

## Edit versions

Start filenames with the project code and a short description of the video. Use `WIP` for work in progress and `Master` for the approved deliverable.

| Version | Meaning |
| --- | --- |
| `WIP1.1`, `WIP1.2`, `WIP1.3` | First cut, then further internal reviews before the Client sees it. |
| `WIP1_EXT` | First version shared with the Client. |
| `WIP2.1int`, `WIP2.2int` | Revised cut after Client feedback, under internal review. |
| `WIP2_ext` | Second version shared with the Client. Continue the number for later Client rounds. |
| `Master` | Approved video for the Client's audience. |

The external round number counts how many times the Client has seen the edit. Internal decimal revisions can advance without changing that external round.

## Email subjects

Begin the subject with the project code, a separator and the topic. Update vague incoming subjects when replying so the thread remains searchable. Examples: `saph002 | Reverse brief`, `saph002 | WIP001 review`, `saph002 | Master`.

## Invoices

Begin the invoice name with the project code or Client code and a clear charge description. For split invoices or separately billed extras, add a lower-case suffix to distinguish each invoice. Examples: `saph_Pro Membership`, `ast_Package Deposit`, `astPackage_a` for a deposit and `astPackage_b` for its balance.
