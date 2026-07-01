# Paper Holder

Laser cutting a little storage case for paper and a pen or two.

## Requirements

- Python 3

## Usage

`python -m http.server 8536`

## Notes
Your browser will only remember your settings if you visit the exact same URL. 127.0.0.1:8536 will not have any application data if you first visited localhost:8536 for example.

## To do
- 10KB website
- Let me import/export my settings to a file
- 3d printed pen pocket insert, with thumb slots
- let me set constraints. total thickness must be between 20 and 25. max width and height is 12"x19"
- show grain direction with a jpeg wood grain scan or generated
- Add gradual steps to the thumb reliefs so they enlarge every layer you go upwards
    - doing so will mean that there will be no duplicate parts. labeling them properly is very important
- run the exported files into deepnest.io program?
- add veneers. I want to veneer
  - the back and front? of the back.
  - front and back? of the front
  - maybe the sides faces
  - veneers need to be ~11" x 15" for it to be seamless
  - include veneer in the thickness calculation. add variable for the vener thickness.

If i veneered the front of the cover would I apply it after the live hinge is cut or before?

make the outer thumb relief get bigger as the layer gets closer to the top

what if i put labels for the parts on the waste (like a thumb relief) or on the wood surrounding it that will be left on the laser table (and i when removing them can transfer by drawing on the backside the part name.)

do the small cuts before doing the large cutout to prevent shifts.
- how does the epilog software optimize these?

make the spine wider since the living hinge starting right after the leather would be odd and possibly impact the opening action.

FIGURE OUT HOW TO ADD METAL FOR THE MAGNETS
- i think i will do a 
- phillipine peso coin in the cover?
  - 1 cent: 15mm x 1.54mm x 1.9g
  - 5 cent: 16mm x 1.60mm x 2.2g
  - 25 cent: 20mm x 1.65mm x 3.6g

roundover edges by spine? or i increase leather spine wrap allowance from 5mm

clean off using ISA
verify the kerf using my 25mm square cutout

etch the design with higher power or lower speed than the recommended ones for wood.

only the internal parts need to be deepnest optimized.

label my oak boards for what pieces I plan to use them for.

flatten my boards the night before I go laser cutting

Order I should cut the parts
- internal parts (v1 took 10m41s - but didn't fully cut since board was bowed)
- back
- cover
- roundover the two edges of the assembly's spine
- leather spine test (verify the correct width and hole spacing fits)
- leather spine ()

export the SVG for the back and cover from my website with a document size of 24"x12" or 24"x18"

i only need the 12" laser. but it has a different wattage, so that would change all my settings.

All parts for a given layer should be from the same sheet of plywood so it is as even as possible.

export SVG with 0.001" stroke width in black and no fill.

leather 2: 100s20p etch. 80p10s500f cut

TODO: use 2mm living hinge setting?

should i glue the leather to the plywood?

make dovetail pin less tiny
is dovetail better than a finger joint in this application? or am i just being fancy...

make the bottom cutout for the pen narrow since it only needs to accomodate around half of the pen's total diameter

add labels for the top pieces TO THE SURROUNDING AREA. OUTSIDE THE CUTTING BOUNDARY.

I could laser etch something onto the back piece. maybe under the pen slot or paper slot? or some kind of border design in the paper slot that is shown when its empty?

pen relief only needs to be cut from the top internal layer, and maybe the second to top.

replace caliper battery or get dial/vernier calipers
measure my new plywood thickness, 1/8" dowel true diameter.

## v2 changes
Move chicago bolts closer to the top and bottom
- 25mm to 14mm. NOTE: it is around 10mm to the long edge, so maybe using 10mm would make it look even.

Move pen thumb relief up, to grab pen clip
- Moved the relief offset from 0 to 41mm
