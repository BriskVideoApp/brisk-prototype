from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json
ROOT = Path(__file__).resolve().parent
AUDIT = ROOT.parent.parent
ORANGE = '#e67e22'
INK = '#17191c'
MUTED = '#535b66'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def font(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)
def canvas(w,h,title,subtitle):
 im=Image.new('RGB',(w,h),'white');d=ImageDraw.Draw(im)
 d.text((28,20),title,font=font(24,True),fill=INK)
 d.text((28,54),subtitle,font=font(14),fill=MUTED)
 return im,d
panels=[]
def add(im,d,file,x,y,rects=()):
 crop=Image.open(ROOT/file).convert('RGB');im.paste(crop,(x,y))
 for rx,ry,rw,rh in rects:
  d.rectangle((x+rx-4,y+ry-4,x+rx+rw+4,y+ry+rh+4),outline=ORANGE,width=3)
 return {'cropFile':file,'nativePixels':list(crop.size),'placedAt':[x,y],'scale':1,'outlineRegionsInCropXYWH':[list(q) for q in rects]}
def save(im,file,title,sources,placements,notes):
 im.save(ROOT/file)
 originals=[]
 for full,rect in sources:
  p=AUDIT/'evidence'/full
  originals.append({'file':'../../evidence/'+full,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'cropXYWH':rect})
 panels.append({'file':file,'title':title,'kind':'Annotated genuine current evidence, not a proposal or verified fix','pixelPolicy':'Every screenshot crop is pasted at original pixel scale (1 image pixel = 1 panel pixel); no resizing, reconstruction or generative image tool. Orange outlines identify regions with no fill. Full original screenshots retained.','fullOriginals':originals,'placements':placements,'notes':notes})

im,d=canvas(846,620,'A10 - Media inspector header is obscured','Responsive comparison. Both crops retain native pixel scale; viewport widths intentionally differ.')
d.text((28,86),'Affected: 1133px / Studio Staff',font=font(16,True),fill=INK)
d.text((445,86),'Wider current: 1440px / Studio Staff',font=font(16,True),fill=INK)
p=[add(im,d,'A10-current-hidden-inspector-header.png',28,118,[(13,0,360,64)]),add(im,d,'A10-reference-visible-inspector-header.png',445,118,[(13,119,360,62)])]
d.text((28,520),'Orange: global band covering Filename / Close.',font=font(14),fill=INK)
d.text((28,542),'Pointer activation opens Ask Brisk (E045); keyboard Close still works.',font=font(14),fill=INK)
d.text((28,576),'Right: current wider context, not an approved replacement. Full originals linked in index.html.',font=font(13),fill=MUTED)
save(im,'A10-inspector-header-comparison.png','A10 Media inspector header',[('E044-media-inspector-hidden-close.jpg',[760,0,373,380]),('E011-media-keyboard-after.jpg',[1067,0,373,380])],p,'Different viewport widths are labelled. The reference demonstrates visible identity/Close, not approval of the entire 1440 layout. E045/E046 provide behavioural results separately.')

im,d=canvas(1192,650,'A12 - Short production values disappear in closed fields','Current responsive comparison. Native pixels retained; no field values were changed.')
d.text((28,88),'1133px / Studio Staff / Deliverables',font=font(16,True),fill=INK)
p=[add(im,d,'A12-current-deliverables-1133.png',28,120,[(236,80,548,40)])]
d.text((28,321),'All five controls truncate. Duration opens to the full existing 3 mins (E115).',font=font(14),fill=INK)
d.text((28,367),'1440px / Studio Staff / same existing row',font=font(16,True),fill=INK)
p.append(add(im,d,'A12-reference-deliverables-1440.png',28,399,[(319,80,760,40)]))
d.text((28,600),'Short duration and format fit here; long Captions still truncates. This current view is not a separately approved design.',font=font(14),fill=MUTED)
save(im,'A12-brief-editor-comparison.png','A12 Brief closed-field scanability',[('BRIEF-deliverables-1133.jpg',[272,364,829,183]),('BRIEF-deliverables-1440.jpg',[272,364,1136,183])],p,'Same pixel scale and existing data. Wider viewport is a responsive comparison, not approval. Scope is closed-field readability; value recovery is available.')

im,d=canvas(1192,660,'A12 - A short format word breaks inside the summary','Current responsive comparison. Approved table order and hierarchy should remain.')
d.text((28,88),'1133px / Studio Staff / Main Video Details',font=font(16,True),fill=INK)
p=[add(im,d,'A12-current-summary-1133.png',28,120,[(486,129,60,49)])]
d.text((28,353),'Landscape breaks inside the word in the current narrow Format track.',font=font(14),fill=INK)
d.text((28,399),'1440px / Studio Staff / same existing value',font=font(16,True),fill=INK)
p.append(add(im,d,'A12-reference-summary-1440.png',28,431,[(660,109,108,43)]))
d.text((28,625),'No exact approved narrow-table replacement exists. Full genuine screenshots are linked in index.html.',font=font(14),fill=MUTED)
save(im,'A12-brief-summary-comparison.png','A12 Brief summary word wrapping',[('BRIEF-summary-1133.jpg',[272,472,829,215]),('BRIEF-summary-1440.jpg',[272,472,1136,178])],p,'The current wider value is readable; the reference does not reopen approved table hierarchy or establish every field fits.')

im,d=canvas(680,354,'A07 - Sticky date covers current message text','1133px / Studio Staff / Project Chat. No approved sticky-date reference exists.')
p=[add(im,d,'A07-current-chat-date-overlap.png',28,100,[(42,27,568,42)])]
d.text((28,280),'Orange surrounds the message/date overlap band without covering the text.',font=font(14),fill=INK)
d.text((28,308),'Current evidence only. The static chevron has no date action.',font=font(14),fill=MUTED)
save(im,'A07-chat-date-annotation.png','A07 Chat date overlap',[('D-R005-staff-1133.jpg',[489,196,620,155])],p,'Single annotated current crop, not a before/after proposal. Current wider clear-gap screenshot is not an approved sticky-date replacement.')

im,d=canvas(846,560,'B01 / A02 - Team person selection versus shared Checkbox','Both captures: 1133px desktop. Native pixels retained; contextual layouts intentionally differ.')
d.text((28,87),'Current Team / Studio Staff / Freelancers',font=font(16,True),fill=INK)
p=[add(im,d,'A02-current-team-selection.png',28,119,[(17,44,205,60)])]
d.text((28,292),'The person name is outside the checkbox label; accessible person name is absent.',font=font(14),fill=INK)
d.text((28,337),'Current approved DS Checkbox consumer / Studio Notifications',font=font(16,True),fill=INK)
p.append(add(im,d,'A02-reference-notification-checkbox.png',28,369,[(17,27,210,34)]))
d.text((28,537),'DS reference illustrates labelled composition, not approval to copy its entire layout.',font=font(13),fill=MUTED)
save(im,'B01-A02-team-checkbox-comparison.png','B01/A02 Team Checkbox',[('E008-team-freelancers-1133.jpg',[175,489,790,156]),('D-R040-staff-1133.jpg',[280,612,790,156])],p,'Team accessible-name defect is verified through DOM/source, not visible pixels alone. DS target/focus rules are textual/source authority; do not infer target size from this crop alone.')

(ROOT/'panels.json').write_text(json.dumps({'method':'Local Pillow composition of genuine screenshot crops with outline annotations. No generated/recreated UI, no screenshot resizing and no application changes.','panels':panels},indent=2)+'\n')
html=['<!doctype html><html lang="en"><meta charset="utf-8"><title>Annotated Brisk audit evidence</title><style>body{font:16px Arial,sans-serif;margin:32px auto;max-width:1240px;padding:0 24px;color:#17191c}section{margin:32px 0 56px}img{max-width:100%;height:auto;border:1px solid #ddd}a{color:#5e1fc8}small{display:block;line-height:1.6}p{line-height:1.5}</style><h1>Annotated current evidence</h1><p>Genuine prototype screenshots. Orange outlines identify affected regions without a filled overlay. Screenshot crops retain their original pixel scale in the PNG files; the browser may scale the preview to fit. Open an image for native resolution. These panels are evidence, not proposed UI or verified fixes.</p>']
for p in panels:
 html.append('<section><h2>'+p['title']+'</h2><a href="'+p['file']+'" target="_blank"><img src="'+p['file']+'" alt="'+p['title']+'"></a><p>'+p['notes']+'</p><small>Full original screenshots: ')
 html.append(' | '.join('<a href="'+o['file']+'" target="_blank">'+Path(o['file']).name+'</a>' for o in p['fullOriginals']))
 html.append('</small></section>')
html.append('<p><a href="panels.json">Provenance and crop coordinates</a></p></html>')
(ROOT/'index.html').write_text(''.join(html))
print('Created',len(panels),'annotated panels with provenance and full-original links.')
