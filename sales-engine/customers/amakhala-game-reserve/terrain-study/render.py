exec(open('analyse.py').read().split("sx=LX")[0])
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, matplotlib.patheffects as pe
from matplotlib.colors import ListedColormap
Ti=Transformer.from_crs(32735,4326,always_xy=True)
relay=(333.5,408719.83,6292446.43)
H1,H2=hs
names={}
# name high sites by position
def ll(x,y): lo,la=Ti.transform(x,y); return round(la,5),round(lo,5)
print('HS',H1,ll(H1[1],H1[2]),H2,ll(H2[1],H2[2]),'relay',ll(relay[1],relay[2]),'upl',ll(upl[1],upl[2]))
sites={"H1":H1,"H2":H2}
# assign lodges to best HS
assign={}
for k,p in LX.items():
    if k=="Safari Lodge": assign[k]=("R",profile((relay[1],relay[2]),p,MAST,CPE)); continue
    opts=[(n,profile((s[1],s[2]),p,MAST,CPE)) for n,s in sites.items()]
    opts=[o for o in opts if o[1]['clear']]; assign[k]=min(opts,key=lambda o:o[1]['D'])
bb=profile((H1[1],H1[2]),(H2[1],H2[2]),MAST,MAST)
upi=int(np.argmin([profile((upl[1],upl[2]),(s[1],s[2]),UPL,MAST)['D'] for s in hs]))
upp=profile((upl[1],upl[2]),(hs[upi][1],hs[upi][2]),UPL,MAST)
rs=[ (n,profile((relay[1],relay[2]),(s[1],s[2]),MAST,MAST)) for n,s in sites.items()]
rs=min([r for r in rs if r[1]['clear']],key=lambda r:r[1]['D'])
print('uplink->',upi,upp['D'],upp['ratio'],'bb',bb['D'],bb['ratio'],'relay->',rs[0],rs[1]['D'],rs[1]['ratio'])
for k,(n,p) in assign.items(): print(k,n,round(p['D']),round(p['ratio'],2))
# coverage viewshed at 90m, rx 3m
step=3; Hs,Ws=H//step,Wd//step
gx=b[0]+(np.arange(Ws)*step+1.5)*res; gy=b[3]-(np.arange(Hs)*step+1.5)*res
GX,GY=np.meshgrid(gx,gy); cov=np.zeros(GX.shape,bool)
for s,hgt in [(H1,MAST),(H2,MAST),(relay,MAST)]:
    x1,y1=s[1],s[2]; za=z(np.array(x1),np.array(y1))+hgt
    D=np.hypot(GX-x1,GY-y1); n=120; ok=np.ones(GX.shape,bool)
    zb=z(GX,GY)+3
    for t in np.linspace(0.02,0.98,n):
        xs=x1+(GX-x1)*t; ys=y1+(GY-y1)*t
        d1=D*t/1000; d2=D*(1-t)/1000
        los=za+(zb-za)*t; f1=17.32*np.sqrt(np.maximum(d1*d2,1e-9)/(F*np.maximum(D/1000,1e-3)))
        ok&=(los-(z(xs,ys)+d1*d2/(12.742*K)))>=0.6*f1
    cov|=ok&(D<12000)
from shapely.geometry import MultiPoint
from matplotlib.path import Path as MPath
hull=MultiPoint(list(LX.values())+[(H1[1],H1[2]),(H2[1],H2[2]),(relay[1],relay[2])]).convex_hull.buffer(2000)
hp=MPath(np.array(hull.exterior.coords))
fm=hp.contains_points(np.c_[GX.ravel(),GY.ravel()]).reshape(GX.shape)
pct=cov[fm].mean()*100; area=fm.sum()*(step*res)**2/1e6
print('coverage %.1f%% of %.0f km2'%(pct,area))
# ---------- MAP ----------
img=np.load('tci.npy').transpose(1,2,0).astype(float)
img=np.clip((img/255.0-0.02)*1.9,0,1)**0.85
ext=[b[0],b[2],b[1],b[3]]
fig,ax=plt.subplots(figsize=(14,11.2),dpi=130)
iy,ix=np.mgrid[0:img.shape[0],0:img.shape[1]]
inside=hp.contains_points(np.c_[(b[0]+ix.ravel()*10+5),(b[3]-iy.ravel()*10-5)]).reshape(ix.shape)
img=np.where(inside[...,None],img,img*0.5+0.02)
ax.imshow(img,extent=ext)
hx,hy=hull.exterior.xy; ax.plot(hx,hy,color='#F4F1E8',lw=1.2,ls=(0,(2,2)),alpha=.9,zorder=4)
ov=np.zeros(cov.shape+(4,)); ov[cov&fm]=[0.36,0.93,0.86,0.34]
ax.imshow(ov,extent=[gx[0]-45,gx[-1]+45,gy[-1]-45,gy[0]+45],interpolation='nearest')
def line(a,c,col,lw,ls='-'):
    ax.plot([a[0],c[0]],[a[1],c[1]],color=col,lw=lw,ls=ls,solid_capstyle='round',path_effects=[pe.Stroke(linewidth=lw+2.4,foreground='#0b1410'),pe.Normal()],zorder=5)
U=(upl[1],upl[2]); P1=(H1[1],H1[2]); P2=(H2[1],H2[2]); R=(relay[1],relay[2])
line(U,(hs[upi][1],hs[upi][2]),'#F2B233',3.2,(0,(6,3)))
line(P1,P2,'#F2B233',3.6)
rsP=P1 if rs[0]=="H1" else P2
line(rsP,R,'#F2B233',2.4)
for k,(n,p) in assign.items():
    src=R if n=="R" else (P1 if n=="H1" else P2); line(src,LX[k],'#FFFFFF',1.3)
def lab(x,y,t,dx=8,dy=8,fs=10,w='normal',col='white'):
    ax.annotate(t,(x,y),xytext=(dx,dy),textcoords='offset points',color=col,fontsize=fs,fontweight=w,family='DejaVu Sans',path_effects=[pe.withStroke(linewidth=3,foreground='#0b1410')],zorder=9)
for k,p in LX.items():
    ax.scatter(*p,s=46,c='white',edgecolors='#0b1410',linewidths=1.2,zorder=8); lab(*p,k,6,-14 if k in("Bukela Game Lodge","Bush Lodge") else 6,9)
hn={"H1":"High Site North","H2":"High Site South"}
# decide north/south
if H1[2]<H2[2]: hn={"H1":"High Site South","H2":"High Site North"}
for key,s in sites.items():
    ax.scatter(s[1],s[2],marker='^',s=190,c='#F2B233',edgecolors='#0b1410',linewidths=1.5,zorder=9); lab(s[1],s[2],f"{hn[key]}  {s[0]:.0f} m",10,6,11,'bold','#F2B233')
ax.scatter(*R,marker='^',s=110,c='#F2B233',edgecolors='#0b1410',zorder=9); lab(*R,"Safari relay",8,-12,9.5,'bold','#F2B233')
ax.scatter(*U,marker='s',s=120,c='#F2B233',edgecolors='#0b1410',zorder=9); lab(*U,"Candidate carrier uplink\n(Paterson high ground)",10,-4,10.5,'bold','#F2B233')
pxx,pyy=xy(-33.4333,25.9667); lab(pxx,pyy,"Paterson",-30,-18,10,'normal','#DDE6E0')
ax.set_xlim(b[0]+500,b[2]-300); ax.set_ylim(b[1]+300,b[3]-300); ax.set_xticks([]); ax.set_yticks([])
for s in ax.spines.values(): s.set_visible(False)
# scale bar
sx0=b[0]+1500; sy0=b[1]+1300
ax.plot([sx0,sx0+5000],[sy0,sy0],color='white',lw=4,path_effects=[pe.withStroke(linewidth=6,foreground='#0b1410')]); lab(sx0,sy0,"5 km",0,8,10,'bold')
ax.annotate('N',xy=(b[2]-1600,b[3]-1400),xytext=(b[2]-1600,b[3]-3400),color='white',fontsize=14,ha='center',fontweight='bold',arrowprops=dict(arrowstyle='-|>',color='white',lw=2),path_effects=[pe.withStroke(linewidth=3,foreground='#0b1410')])
plt.subplots_adjust(0,0,1,1); fig.savefig('map.jpg',dpi=130,pil_kwargs={'quality':84}); plt.close()
# ---------- PROFILES ----------
INK='#1b2620'; GR='#8a968f'
def prof(ax,p,ha,hb,ta,tb,big=True):
    d=p['d']/1000; g=p['g']+p['bulge']
    ax.fill_between(d,g.min()-20,g,color='#6f8a5e',alpha=.9,lw=0)
    ax.plot(d,p['los'],color='#D48F10',lw=1.6)
    ax.fill_between(d,p['los']-p['f1'],p['los']+p['f1'],color='#F2B233',alpha=.22,lw=0)
    ax.plot(d,p['los']-0.6*p['f1'],color='#D48F10',lw=.8,ls=':')
    ax.set_xlim(0,d[-1]); ax.set_ylim(g.min()-20,max(p['los'].max(),g.max())+25)
    for s in ['top','right']: ax.spines[s].set_visible(False)
    for s in ['left','bottom']: ax.spines[s].set_color(GR)
    ax.tick_params(colors='#4a564f',labelsize=8 if not big else 9); ax.set_xlabel('km',color='#4a564f',fontsize=8)
    ax.set_ylabel('m ASL',color='#4a564f',fontsize=8)
    st='CLEAR' if p['clear'] else 'BLOCKED'
    ax.set_title(f"{ta} → {tb}   {p['D']/1000:.1f} km · {'Fresnel zone clear' if p['clear'] else 'obstructed'}",fontsize=10 if big else 8.5,color=INK,loc='left',fontweight='bold')
links=[(upp,"Carrier uplink",hn[['H1','H2'][upi]]),(bb,hn['H1'],hn['H2']),(rs[1],"Safari relay",hn[rs[0]])]
fig,axs=plt.subplots(3,1,figsize=(11,8.4),dpi=130)
for a,(p,ta,tb) in zip(axs,links): prof(a,p,0,0,ta,tb)
plt.tight_layout(); fig.savefig('profiles_backbone.png',transparent=False,facecolor='white'); plt.close()
fig,axs=plt.subplots(4,2,figsize=(11,10),dpi=130)
for a,(k,(n,p)) in zip(axs.flat,assign.items()): prof(a,p,0,0,("Safari relay" if n=="R" else hn[n]),k,False)
plt.tight_layout(); fig.savefig('profiles_lodges.png',facecolor='white'); plt.close()
out=dict(coverage_pct=pct,area_km2=area,sites={hn[k]:dict(elev=s[0],latlon=ll(s[1],s[2])) for k,s in sites.items()},relay=dict(elev=relay[0],latlon=ll(relay[1],relay[2])),uplink=dict(elev=upl[0],latlon=ll(upl[1],upl[2]),to=hn[['H1','H2'][upi]],km=upp['D']/1000,ratio=upp['ratio'],minclr=upp['minclr']),
backbone=dict(km=bb['D']/1000,ratio=bb['ratio'],minclr=bb['minclr']),relaylink=dict(to=hn[rs[0]],km=rs[1]['D']/1000,ratio=rs[1]['ratio'],minclr=rs[1]['minclr']),
lodges={k:dict(frm=("Safari relay" if n=="R" else hn[n]),km=p['D']/1000,ratio=p['ratio'],clear=p['clear'],minclr=p['minclr']) for k,(n,p) in assign.items()})
json.dump(out,open('metrics.json','w'),indent=1); print(json.dumps(out,indent=1))
