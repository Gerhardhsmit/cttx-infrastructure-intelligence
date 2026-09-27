import rasterio, numpy as np
from rasterio.warp import transform_bounds, reproject, Resampling
from rasterio.windows import from_bounds
from rasterio.merge import merge
import os
os.environ['CURL_CA_BUNDLE']='/root/.ccr/ca-bundle.crt'
W,S,E,N=25.93,-33.61,26.23,-33.39
url='/vsicurl/https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/35/H/MC/2026/8/S2A_35HMC_20260805_0_L2A/TCI.tif'
with rasterio.open(url) as src:
    b=transform_bounds('EPSG:4326',src.crs,W,S,E,N)
    win=from_bounds(*b,src.transform)
    img=src.read(window=win)
    tr=src.window_transform(win); crs=src.crs
print(img.shape,crs,b)
np.save('tci.npy',img)
# DEM mosaic -> reproject to UTM grid at 30m over same bounds
srcs=[rasterio.open(f) for f in ['Copernicus_DSM_COG_10_S34_00_E025_00_DEM.tif','Copernicus_DSM_COG_10_S34_00_E026_00_DEM.tif']]
mos,mtr=merge(srcs,bounds=(W-0.02,S-0.02,E+0.02,N+0.02))
res=30
w=int((b[2]-b[0])/res); h=int((b[3]-b[1])/res)
from rasterio.transform import from_origin
dtr=from_origin(b[0],b[3],res,res)
dem=np.zeros((h,w),np.float32)
reproject(mos[0],dem,src_transform=mtr,src_crs='EPSG:4326',dst_transform=dtr,dst_crs=crs,resampling=Resampling.bilinear)
np.save('dem.npy',dem); np.save('bounds.npy',np.array(b))
print(dem.shape,dem.min(),dem.max())
