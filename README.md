# brisk-prototype
Front-end prototype for Brisk 

## Script tab prototype

Routes:

- Studio view: `/projects/mock-project/script`
- Customer view: `/projects/mock-project/script?role=customer`

Role switching is also available from the Script page header. Studio gets the layout picker, internal comments and the ChopChop AI panel. Customer is forced into AV Script mode and only sees external comments with All and Unresolved filters.

To trigger the approved-edit warning, approve the Script sub-tab or use the `Approve script` button, then try to edit a row. Choose `Proceed with edit` to mock the snapshot, un-approve the script, move the status to `Waiting on Customer` and pause downstream Edit and Masters stages.

To toggle `Show AI to customer`, open the ChopChop AI button in Studio view and use the header checkbox. The setting is mock-only in this prototype.

Comment rail reuse note: the Video Review rail is still embedded in `VideoReviewScreen`, so the Script tab uses `src/components/comment-rail/CommentRail.tsx` as a shared wrapper that keeps the same class names, layout and interaction treatment while swapping timecode anchors for row and selection anchors. A follow-up should extract the original Video Review rail into this shared folder fully.
