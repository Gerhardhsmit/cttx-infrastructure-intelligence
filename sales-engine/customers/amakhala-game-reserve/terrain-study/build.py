import json,base64
m=json.load(open('metrics.json')); t=open('template.html').read()
def b64(f,mt): return f"data:{mt};base64,"+base64.b64encode(open(f,'rb').read()).decode()
fmt=lambda ll:f"{ll[0]:.5f}, {ll[1]:.5f}"
rows="".join(f"<tr><td>{k}</td><td>{v['frm']}</td><td class='num'>{v['km']:.1f} km</td><td><span class='pill'>{'Clear' if v['clear'] else 'Blocked'}</span></td></tr>" for k,v in m['lodges'].items())
rep={"{{MAP}}":b64('map.jpg','image/jpeg'),"{{PROF1}}":b64('profiles_backbone.png','image/png'),"{{PROF2}}":b64('profiles_lodges.png','image/png'),
"{{COV}}":f"{m['coverage_pct']:.0f}","{{AREA}}":f"{m['area_km2']:.0f}","{{UPKM}}":f"{m['uplink']['km']:.1f}","{{BBKM}}":f"{m['backbone']['km']:.1f}",
"{{H1E}}":f"{m['sites']['High Site South']['elev']:.0f}","{{H2E}}":f"{m['sites']['High Site North']['elev']:.0f}","{{ROWS}}":rows,
"{{H1LL}}":fmt(m['sites']['High Site South']['latlon']),"{{H2LL}}":fmt(m['sites']['High Site North']['latlon']),"{{RLL}}":fmt(m['relay']['latlon']),"{{ULL}}":fmt(m['uplink']['latlon'])}
for k,v in rep.items(): t=t.replace(k,v)
assert '{{' not in t
open('amakhala-network.html','w').write(t)
open('amakhala-network-standalone.html','w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t.replace('</style>','</style></head><body>',1)+'</body></html>')
print(len(t)//1024,'KB')
