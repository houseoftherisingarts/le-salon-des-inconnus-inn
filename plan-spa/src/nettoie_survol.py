# Efface les bâches bleues (détectées par couleur, dilatées) et la grange (rectangle) par clonage décalé + fondu.
import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); W, H = im.size
arr = np.asarray(im).astype(np.float32)
r,g,b = arr[...,0],arr[...,1],arr[...,2]
blue = (b>r+40)&(b>g+10)&(b>50)
blue[:int(0.4*H)] = False
lab,n = ndimage.label(ndimage.binary_dilation(blue,iterations=3))
zones = []
for i in range(1,n+1):
    ys,xs = np.nonzero(lab==i)
    if len(xs) < 150: continue
    cy = ys.mean()/H
    dx,dy = (-0.026,0.0) if cy > 0.75 else (0.0,-0.045)   # toit du perron : on copie le toit à gauche; sinon la forêt au-dessus
    zones.append((lab==i, dx, dy, 14))
# grange verte et bois
m = np.zeros((H,W),bool); m[int(0.666*H):int(0.737*H), int(0.476*W):int(0.518*W)] = True
zones.append((m, 0.0, -0.075, 18))
out = arr.copy()
for mask, dx, dy, dil in zones:
    mk = ndimage.binary_dilation(mask, iterations=dil).astype(np.float32)
    mk = cv2.GaussianBlur(mk, (0,0), 6)[...,None]
    M = np.float32([[1,0,-dx*W],[0,1,-dy*H]])
    srcimg = cv2.warpAffine(out, M, (W,H), borderMode=cv2.BORDER_REFLECT)
    out = out*(1-mk) + srcimg*mk
Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save(dst, quality=95)
print('ok', dst, len(zones), 'zones')
