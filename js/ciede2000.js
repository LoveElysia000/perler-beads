// CIEDE2000 color difference — ES module
// Reference: ISO/CIE 11664-6:2014

function srgbToXyz(r, g, b) {
  const toLinear = (c) => {
    c /= 255;
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  };
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);
  return [
    rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750,
    rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041
  ];
}

function xyzToLab(x, y, z) {
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fy = f(y / yn);
  return [
    116 * fy - 16,
    500 * (f(x / xn) - fy),
    200 * (fy - f(z / zn))
  ];
}

export function rgbToLab(r, g, b) {
  const [x, y, z] = srgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

export function ciede2000(r1, g1, b1, r2, g2, b2) {
  const [L1, a1, b1_] = rgbToLab(r1, g1, b1);
  const [L2, a2, b2_] = rgbToLab(r2, g2, b2);

  const C1 = Math.sqrt(a1 * a1 + b1_ * b1_);
  const C2 = Math.sqrt(a2 * a2 + b2_ * b2_);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1_ * b1_);
  const C2p = Math.sqrt(a2p * a2p + b2_ * b2_);

  let h1p = Math.atan2(b1_, a1p) * (180 / Math.PI);
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2_, a2p) * (180 / Math.PI);
  if (h2p < 0) h2p += 360;

  const dL = L2 - L1;
  const dC = C2p - C1p;

  let dh;
  if (C1p * C2p === 0) {
    dh = 0;
  } else {
    let diff = h2p - h1p;
    if (Math.abs(diff) > 180) diff = diff > 0 ? diff - 360 : diff + 360;
    dh = 2 * Math.sqrt(C1p * C2p) * Math.sin((diff * Math.PI / 180) / 2);
  }

  const Lbar = (L1 + L2) / 2;
  const CbarP = (C1p + C2p) / 2;

  let hbarP;
  if (C1p * C2p === 0) {
    hbarP = h1p + h2p;
  } else {
    let diff = Math.abs(h1p - h2p);
    hbarP = diff > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;
  }

  const T = 1
    - 0.17 * Math.cos((hbarP - 30) * Math.PI / 180)
    + 0.24 * Math.cos(2 * hbarP * Math.PI / 180)
    + 0.32 * Math.cos((3 * hbarP + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hbarP - 63) * Math.PI / 180);

  const dTheta = 30 * Math.exp(-Math.pow((hbarP - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(CbarP, 7) / (Math.pow(CbarP, 7) + Math.pow(25, 7)));

  const SL = 1 + (0.015 * Math.pow(Lbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar - 50, 2));
  const SC = 1 + 0.045 * CbarP;
  const SH = 1 + 0.015 * CbarP * T;
  const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC;

  const termL = dL / SL;
  const termC = dC / SC;
  const termH = dh / SH;

  return Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
}
