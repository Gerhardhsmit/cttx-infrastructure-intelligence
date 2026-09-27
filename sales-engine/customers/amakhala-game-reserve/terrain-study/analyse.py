import numpy as np, json
from pyproj import Transformer
dem=np.load('dem.npy'); b=np.load('bounds.npy'); res=30
H,Wd=dem.shape
T=Transformer.from_crs(4326,32735,always_xy=True)
def xy(lat,lon): return T.transform(lon,lat)
def rc(x,y): return (b[3]-y)/res,(x-b[0])/res
def z(x,y):
    r,c=rc(x,y); r=np.clip(r,0,H-1.001); c=np.clip(c,0,Wd-1.001)
    r0=np.floor(r).astype(int); c0=np.floor(c).astype(int); fr=r-r0; fc=c-c0
    return (dem[r0,c0]*(1-fr)*(1-fc)+dem[r0+1,c0]*fr*(1-fc)+dem[r0,c0+1]*(1-fr)*fc+dem[r0+1,c0+1]*fr*fc)
F=5.8; K=4/3
def profile(a,bb,ha,hb,n=None):
    (x1,y1),(x2,y2)=a,bb; D=np.hypot(x2-x1,y2-y1)
    n=n or max(60,int(D/15)); t=np.linspace(0,1,n)
    xs=x1+(x2-x1)*t; ys=y1+(y2-y1)*t; g=z(xs,ys); d=t*D
    d1=d/1000; d2=(D-d)/1000
    bulge=d1*d2/(12.742*K)  # m
    za=g[0]+ha; zb=g[-1]+hb; los=za+(zb-za)*t
    f1=17.32*np.sqrt(np.maximum(d1*d2,1e-9)/(F*max(D/1000,1e-6)))
    clr=los-(g+bulge)
    ratio=np.min((clr/np.maximum(f1,1e-6))[2:-2]) if n>4 else 1
    return dict(D=D,d=d,g=g,bulge=bulge,los=los,f1=f1,clear=bool(ratio>=0.6),ratio=float(ratio),minclr=float(np.min(clr[2:-2])))
lodges={"Safari Lodge":(-33.50352,26.02922),"Bush Lodge":(-33.539637,26.034739),"Leeuwenbosch":(-33.536636,26.068419),
"Bukela Game Lodge":(-33.53470,26.08611),"Hlosi Game Lodge":(-33.550574,26.105461),"Quatermain's Camp":(-33.50169,26.11689),
"HillsNek Safari Camp":(-33.51274,26.14171),"Woodbury Lodge":(-33.50815,26.15307)}
LX={k:xy(*v) for k,v in lodges.items()}
MAST=18; CPE=8; UPL=30
# candidate high sites: local maxima in reserve footprint
from scipy.ndimage import maximum_filter
mx=maximum_filter(dem,size=21)
x0,y0=xy(-33.47,26.00); x1,y1=xy(-33.58,26.18)
cands=[]
for r,c in zip(*np.where((dem==mx))):
    x=b[0]+(c+.5)*res; y=b[3]-(r+.5)*res
    if x0<=x<=x1 and y1<=y<=y0: cands.append((float(dem[r,c]),x,y))
cands.sort(reverse=True); cands=cands[:60]
print(len(cands),'cands; top',cands[:3])
def served(s):
    return {k for k,p in LX.items() if profile((s[1],s[2]),p,MAST,CPE)['clear'] and np.hypot(p[0]-s[1],p[1]-s[2])<12000}
S={i:served(c) for i,c in enumerate(cands)}
best=None
for i in S:
  for j in S:
    if j<=i: continue
    if np.hypot(cands[i][1]-cands[j][1],cands[i][2]-cands[j][2])<2500: continue
    bb=profile((cands[i][1],cands[i][2]),(cands[j][1],cands[j][2]),MAST,MAST)
    if not bb['clear']: continue
    sc=(len(S[i]|S[j]),cands[i][0]+cands[j][0])
    if best is None or sc>best[0]: best=(sc,i,j)
print(best)
(_,i,j)=best; hs=[cands[i],cands[j]]
# Paterson candidate uplink: highest ground within 2.5km of town
px,py=xy(-33.4333,25.9667)
rr,cc=np.mgrid[0:H,0:Wd]; X=b[0]+(cc+.5)*res; Y=b[3]-(rr+.5)*res
m=np.hypot(X-px,Y-py)<2500; k=np.argmax(np.where(m,dem,-1)); upl=(float(dem.flat[k]),float(X.flat[k]),float(Y.flat[k]))
# which HS gets uplink
up=[profile((upl[1],upl[2]),(h[1],h[2]),UPL,MAST) for h in hs]
print('uplink',upl,[ (u['clear'],round(u['ratio'],2),round(u['D'])) for u in up])
json.dump(dict(hs=hs,served=[sorted(S[i]),sorted(S[j])],upl=upl,upclear=[u['clear'] for u in up],uprat=[u['ratio'] for u in up]),open('result.json','w'))
print(sorted(S[i]),sorted(S[j]), set(LX)-(S[i]|S[j]))
sx=LX["Safari Lodge"]
print('safari->upl',profile(sx,(upl[1],upl[2]),CPE,UPL)['ratio'])
for k,p in LX.items():
    if k!="Safari Lodge": print('safari->',k,round(profile(sx,p,CPE,CPE)['ratio'],2))
for c in cands[:60]:
    pr=profile((c[1],c[2]),sx,MAST,CPE)
    if pr['clear'] and (profile((c[1],c[2]),(hs[0][1],hs[0][2]),MAST,MAST)['clear'] or profile((c[1],c[2]),(hs[1][1],hs[1][2]),MAST,MAST)['clear']): print('3rd cand',c, round(pr['D']))
