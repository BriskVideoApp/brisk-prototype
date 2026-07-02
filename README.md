# brisk-prototype
Front-end prototype for Brisk 

## Script tab prototype

Routes:

- Studio view: `/projects/mock-project/script`
- Customer view: `/projects/mock-project/script?role=customer`

Role switching is available from the quiet Studio / Customer toggle in the Script page header. Studio gets the AV Script / Simple Doc layout picker, internal comments, and the ChopChop AI panel. Customer is forced into AV Script mode and only sees external comments.

To trigger the approved-edit warning, use the `Approve script` button, then try to edit a row. Choose `Proceed with edit` to mock the snapshot, un-approve the script, and move the status to `Waiting on Customer`.

The formatting toolbar appears only after selecting text. It contains Undo, Redo, Bold, and Link.

To open the comments overview drawer, use the small comment icon in the sub-header. Row comments open from the soft comment marker in the right gutter, and new comments can be started by selecting text or using the hover comment icon.

To toggle `Show AI to customer`, density, redlines, or optional sub-tabs, open the `...` menu in the sub-header. Enabled Transcripts, Notes, and Storyboard links appear as plain text above the project title.
