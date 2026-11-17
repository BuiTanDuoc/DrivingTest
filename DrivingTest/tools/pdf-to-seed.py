import fitz, re, json, sys, os
PDF=sys.argv[1]; OUT=sys.argv[2]
os.makedirs(os.path.join(OUT,'images'),exist_ok=True)
d=fitz.open(PDF)
CRIT={19,20,21,22,23,24,25,26,27,28,30,32,34,35,47,48,52,53,55,58,63,64,65,66,67,68,70,71,72,73,74,85,86,87,88,89,90,91,92,93,97,98,102,117,163,165,167,197,198,206,215,226,234,245,246,252,253,254,255,260}
assert len(CRIT)==60
def topic(n):
    return 'rules' if n<=180 else 'ethics' if n<=205 else 'driving-skills' if n<=263 else 'vehicle' if n<=300 else 'signs' if n<=485 else 'scenarios'
labels=[]; qs=[]; cur=None; part=None; warns=[]
QRE=re.compile(r'^Câu\s*(\d+)\s*[.:]\s*'); ARE=re.compile(r'^(\d)\s*\.\s*')
def join(a,b):
    if not a: return b
    if not b: return a
    # mảnh chữ bị tách dòng (vd "đường b" + "ộ ...")
    if re.search(r'\s\w$',a) and re.match(r'^[ộơờởỡợôốồổỗớăắằẳẵặâấầẩẫậêếềểễệ]',b): return a+b
    return a+' '+b
for pn,p in enumerate(d):
    if pn<3: continue
    unders=[r['rect'] for r in p.get_drawings() if r.get('fill') and max(r['fill'])<0.3 and r['rect'].height<1.6 and r['rect'].width>3]
    items=[]
    for b in p.get_text('rawdict')['blocks']:
        if b['type']==1: items.append((b['bbox'][1],'img',fitz.Rect(b['bbox']),None)); continue
        for l in b['lines']:
            chars=[(c['c'],c['bbox'][0],c['bbox'][2],'Bold' in s['font']) for s in l['spans'] for c in s['chars']]
            raw=''.join(c[0] for c in chars)
            if not raw.strip(): continue
            nb=sum(1 for c in chars if c[0].strip() and c[3]); nn=sum(1 for c in chars if c[0].strip() and not c[3])
            bold=nb>nn
            # tách dòng chứa nhiều đáp án ("1. Biển 1.      2. Biển 2.")
            cuts=[0]+[m.start(1) for m in re.finditer(r'\s{3,}(\d\s*\.\s)',raw)]+[len(raw)]
            for i in range(len(cuts)-1):
                seg=chars[cuts[i]:cuts[i+1]]; t=''.join(c[0] for c in seg).strip()
                if not t: continue
                vis=[c for c in seg if c[0].strip()]
                rr=fitz.Rect(vis[0][1],l['bbox'][1],vis[-1][2],l['bbox'][3])
                items.append((l['bbox'][1],'txt',rr,(t,bold)))
    items.sort(key=lambda x:(round(x[0]),x[2].x0))
    for y,kind,r,data in items:
        if kind=='img':
            if cur is None: warns.append(f'p{pn+1}: image before any question'); continue
            cur['imgs'].append((pn,r)); continue
        t,bold=data
        if r.y1<60 and re.fullmatch(r'\d+',t): continue  # số trang
        if re.fullmatch(r'[\d\s]+',t):  # nhãn số dưới hình (1  2  3): gộp vào vùng cắt ảnh
            if cur and cur['imgs'] and cur['imgs'][-1][0]==pn and r.y0-cur['imgs'][-1][1].y1<25:
                cur['imgs'].append((pn,r)); labels.append(cur['number'])
            continue
        if t.startswith('CHƯƠNG') or (bold and t.isupper()): continue
        m=QRE.match(t)
        if m and bold:
            cur={'number':int(m.group(1)),'text':t[m.end():],'answers':[],'imgs':[],'page':pn+1}; qs.append(cur); continue
        if cur is None: continue
        a=ARE.match(t)
        if a and not bold and int(a.group(1))==len(cur['answers'])+1:
            cur['answers'].append({'text':t[a.end():],'ul':0}); part=cur['answers'][-1]
        elif cur['answers'] and not bold:
            part=cur['answers'][-1]; part['text']=join(part['text'],t)
        elif not cur['answers']:
            cur['text']=join(cur['text'],t); continue
        else:
            warns.append(f'Q{cur["number"]}: bold line after answers: {t[:50]}'); continue
        for u in unders:
            if r.y1-4<=u.y0<=r.y1+2 and min(u.x1,r.x1)-max(u.x0,r.x0)>2: part['ul']+=min(u.x1,r.x1)-max(u.x0,r.x0)
out=[]
for q in qs:
    n=q['number']; ul=[a['ul'] for a in q['answers']]
    if len(q['answers'])<2: warns.append(f'Q{n}: {len(q["answers"])} answers')
    marked=[i for i,v in enumerate(ul) if v>0]
    if len(marked)!=1: warns.append(f'Q{n}: underline on answers {[(i+1,round(ul[i])) for i in marked]}')
    correct=max(range(len(ul)),key=lambda i:ul[i]) if ul else -1
    img=None
    if q['imgs']:
        if len([1 for x in q['imgs'] if x[1].height>30])>1: warns.append(f'Q{n}: {len(q["imgs"])} images')
        pn,_=q['imgs'][0]; rect=fitz.Rect(q['imgs'][0][1])
        for pn2,r2 in q['imgs'][1:]:
            if pn2==pn: rect|=r2
        pix=d[pn].get_pixmap(clip=rect,dpi=144)
        fn=f'{n:03d}.webp'
        from PIL import Image
        Image.frombytes('RGB',(pix.width,pix.height),pix.samples if pix.n==3 else fitz.Pixmap(fitz.csRGB,pix).samples).save(os.path.join(OUT,'images',fn),'WEBP',quality=80,method=6); img=f'/images/questions/{fn}'
    clean=lambda s: re.sub(r'\(\s+','(',re.sub(r'\s+\)',')',re.sub(r'\s+',' ',s))).strip()
    out.append({'number':n,'topic':topic(n),'critical':n in CRIT,'imageUrl':img,
      'vi':{'text':clean(q['text']),'explanation':''},
      'answers':[{'correct':i==correct,'vi':clean(a['text'])} for i,a in enumerate(q['answers'])]})
nums=[q['number'] for q in out]
missing=sorted(set(range(1,601))-set(nums)); dup=sorted({x for x in nums if nums.count(x)>1})
out.sort(key=lambda q:q['number'])
json.dump(out,open(os.path.join(OUT,'questions.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=2)
print('questions',len(out),'missing',missing,'dup',dup,'withimg',sum(1 for q in out if q['imageUrl']),'crit',sum(q['critical'] for q in out))
print('\n'.join(warns)); print('label-merged', labels)
