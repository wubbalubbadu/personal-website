import json,copy,subprocess,xml.etree.ElementTree as E
from pathlib import Path
pieces=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import fs from 'node:fs';import {splitBook} from './tools/book-split.mjs';console.log(JSON.stringify(splitBook(fs.readFileSync('public/music/reichert-op-5/source.musicxml','utf8'))))"],text=True))
# Original book order: each major key followed by its relative minor.
keys=[(0,'C','A',0,0),(-1,'F','D',5,3),(-2,'B♭','G',-2,-1),(-3,'E♭','C',3,2),(-4,'A♭','F',-4,-2),(-5,'D♭','B♭',1,1),(-6,'G♭','E♭',6,4),(5,'B','G♯',-1,-1),(4,'E','C♯',4,2),(3,'A','F♯',-3,-2),(2,'D','B',2,1),(1,'G','E',-5,-3)]
steps='CDEFGAB';pcs=[0,2,4,5,7,9,11]
book='reichert-op-5';catalog=json.load(open('content/music-catalog.json'));catalog=[x for x in catalog if x.get('book',{}).get('id')!=book]
for p in pieces:
 root=E.fromstring(p['xml']);part=root.find('part');ms=part.findall('measure');n=p['number']
 if n==2:
  major=copy.deepcopy(ms[:9]);minor=copy.deepcopy(ms[8:17])
  for ending in [major[-1],minor[-1]]:
   notes=ending.findall('note')
   for note in notes[2:]:ending.remove(note)
  opening=minor[0];notes=opening.findall('note')
  for note in notes[:2]:opening.remove(note)
  for d in opening.findall('direction'):opening.remove(d)

 else:major=copy.deepcopy(ms[:len(ms)//2]);minor=copy.deepcopy(ms[len(ms)//2:])
 division=root.findtext('.//divisions');time=copy.deepcopy(root.find('.//time'));clef=copy.deepcopy(root.find('.//clef'))
 for child in list(part):part.remove(child)
 sections=[];counter=0
 for fifths,maj,minr,chrom,dia in keys:
  for mode,source,label in [('major',major,maj),('minor',minor,minr)]:
   label=label.lower() if mode=='minor' else label
   sid=f'{fifths}-{mode}';sections.append({'id':sid,'label':label+' '+mode})
   for j,original in enumerate(source):
    m=copy.deepcopy(original);counter+=1;m.set('number',str(counter));m.set('id',sid)
    for el in list(m):
     if el.tag=='print' or el.tag=='direction' and el.find('.//words') is not None:m.remove(el)
    for el in m.findall('.//accidental'):
     for note in m.findall('note'):
      if el in list(note):note.remove(el)
    attrs=m.find('attributes')
    if attrs is not None:m.remove(attrs)
    if j==0:
     pr=E.Element('print',{'new-system':'yes'});m.insert(0,pr)
     attrs=E.Element('attributes');E.SubElement(attrs,'divisions').text=division;k=E.SubElement(attrs,'key');E.SubElement(k,'fifths').text=str(fifths);E.SubElement(k,'mode').text=mode
     attrs.append(copy.deepcopy(time));attrs.append(copy.deepcopy(clef));m.insert(1,attrs)
     d=E.Element('direction',{'placement':'above'});dt=E.SubElement(d,'direction-type');E.SubElement(dt,'words').text=label+' '+mode;m.insert(2,d)
    for pitch in m.findall('note/pitch'):
     old=steps.index(pitch.findtext('step'));octv=int(pitch.findtext('octave'));alter=int(pitch.findtext('alter','0'));newdi=octv*7+old+dia;newstep=newdi%7;newoct=newdi//7
     target=octv*12+pcs[old]+alter+chrom;newalter=target-(newoct*12+pcs[newstep]);pitch.find('step').text=steps[newstep];pitch.find('octave').text=str(newoct)
     a=pitch.find('alter')
     if a is not None:pitch.remove(a)
     if newalter:E.SubElement(pitch,'alter').text=str(newalter)
     # MusicXML pitch order is step, alter, octave.
     pitch[:]=sorted(list(pitch),key=lambda e:['step','alter','octave'].index(e.tag))
    part.append(m)
 for credit in root.findall('credit'):root.remove(credit)
 work=E.SubElement(root,'work');E.SubElement(work,'work-title').text=f'No. {n}'
 path=f'/music/{book}/no-{n:02}.musicxml';Path('public'+path).write_text('<?xml version="1.0" encoding="utf-8"?>\n'+E.tostring(root,encoding='unicode'))
 catalog.append({'id':f'{book}-no-{n:02}','title':f'No. {n}','composer':'Mathieu-André Reichert','tags':['Exercise'],'status':'published','scorePath':path,'viewerPath':f'/flute-studio/music/{book}-no-{n:02}','book':{'id':book,'number':n,'opening':'All keys','time':p['time']},'keySections':sections})
Path('content/music-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
books=json.load(open('content/music-books.json'));books=[b for b in books if b['id']!=book];books.append({'id':book,'title':'7 Daily Exercises, Op. 5','composer':'Mathieu-André Reichert','tags':['Exercise']});Path('content/music-books.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n')
