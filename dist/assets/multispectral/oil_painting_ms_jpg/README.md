# Deriving D65 RGB Coefficients from CIE Standards

This document explains the process of deriving RGB coefficients for multispectral image visualization using the CIE standard D65 illuminant.

## Process Overview

The following steps convert spectral data to sRGB values for display on standard monitors:

1. Start with D65 Spectral Power Distribution (SPD)
2. Apply CIE Color Matching Functions (CMFs)
3. Calculate D65 White Point in XYZ
4. Transform XYZ to sRGB
5. Calculate Per-Wavelength RGB Contributions
6. Handle Negative Values
7. Normalize Channel Weights

## Detailed Steps

### 1. Start with D65 Spectral Power Distribution (SPD)

The D65 illuminant represents standard daylight with a correlated color temperature of 6504K. The CIE defines this as a standardized table of relative power values.

For multispectral imaging, we typically use the range 400nm-700nm at 10nm intervals (31 bands).

### 2. Apply CIE Color Matching Functions (CMFs)

Use the CIE 1931 2° Standard Observer color matching functions: x̄(λ), ȳ(λ), z̄(λ)

These functions represent how the standard human observer perceives each wavelength. For each wavelength λ, multiply the D65 SPD value by each CMF value:

```
X(λ) = D65(λ) × x̄(λ)
Y(λ) = D65(λ) × ȳ(λ)
Z(λ) = D65(λ) × z̄(λ)
```

### 3. Calculate D65 White Point in XYZ

Sum the products across all wavelengths to get D65 white point coordinates:

```
X_D65 = ∑X(λ)
Y_D65 = ∑Y(λ)
Z_D65 = ∑Z(λ)
```

Normalize by Y_D65 to get relative values (Y=1.0 or Y=100 by convention).

### 4. Transform XYZ to sRGB

Use the standard XYZ to sRGB transformation matrix defined by IEC 61966-2-1:

```
[ R ]   [ 3.2404542  -1.5371385  -0.4985314 ] [ X ]
[ G ] = [-0.9692660   1.8760108   0.0415560 ] [ Y ]
[ B ]   [ 0.0556434  -0.2040259   1.0572252 ] [ Z ]
```

### 5. Calculate Per-Wavelength RGB Contributions

For each wavelength λ, convert its XYZ contribution to RGB:

```
R(λ) = 3.2404542×X(λ) - 1.5371385×Y(λ) - 0.4985314×Z(λ)
G(λ) = -0.9692660×X(λ) + 1.8760108×Y(λ) + 0.0415560×Z(λ)
B(λ) = 0.0556434×X(λ) - 0.2040259×Y(λ) + 1.0572252×Z(λ)
```

### 6. Handle Negative Values

The transformation yields negative RGB values for some wavelengths. For display purposes, we set negative values to zero (clamp).

This is physically correct: negative values mean that wavelength would need to be added to the test color in color matching experiments.

### 7. Normalize Channel Weights

Sum the positive values for each channel separately. Divide each wavelength's contribution by its channel's total.

This ensures that each channel (R, G, B) sums to 1.0, preserving overall brightness.

## Reference Data

### CIE 1931 2° Standard Observer and D65 Data

| λ (nm) | D65 SPD   | x̄(λ)    | ȳ(λ)    | z̄(λ)    |
|--------|-----------|---------|---------|---------|
| 400    | 82.7549   | 0.0143  | 0.0004  | 0.0679  |
| 410    | 91.4860   | 0.0435  | 0.0012  | 0.2074  |
| 420    | 93.4318   | 0.1344  | 0.0040  | 0.6456  |
| 430    | 86.6823   | 0.2839  | 0.0116  | 1.3856  |
| 440    | 104.7653  | 0.3483  | 0.0230  | 1.7471  |
| 450    | 117.0080  | 0.3362  | 0.0380  | 1.7721  |
| 460    | 117.4099  | 0.2908  | 0.0600  | 1.6692  |
| 470    | 114.8602  | 0.1954  | 0.0910  | 1.2876  |
| 480    | 115.3918  | 0.0956  | 0.1390  | 0.8130  |
| 490    | 112.3655  | 0.0320  | 0.2080  | 0.4652  |
| 500    | 106.2158  | 0.0049  | 0.3230  | 0.2720  |
| 510    | 100.0000  | 0.0093  | 0.5030  | 0.1582  |
| 520    | 96.3342   | 0.0633  | 0.7100  | 0.0782  |
| 530    | 92.5592   | 0.1655  | 0.8620  | 0.0422  |
| 540    | 88.8342   | 0.2904  | 0.9540  | 0.0203  |
| 550    | 85.4367   | 0.4334  | 0.9950  | 0.0087  |
| 560    | 84.5627   | 0.5945  | 0.9950  | 0.0039  |
| 570    | 82.3229   | 0.7621  | 0.9520  | 0.0021  |
| 580    | 80.2810   | 0.9163  | 0.8700  | 0.0017  |
| 590    | 78.2841   | 1.0263  | 0.7570  | 0.0011  |
| 600    | 77.1938   | 1.0622  | 0.6310  | 0.0008  |
| 610    | 75.9478   | 1.0026  | 0.5030  | 0.0003  |
| 620    | 74.7746   | 0.8544  | 0.3810  | 0.0000  |
| 630    | 73.5880   | 0.6424  | 0.2650  | 0.0000  |
| 640    | 73.0553   | 0.4479  | 0.1750  | 0.0000  |
| 650    | 71.8295   | 0.2835  | 0.1070  | 0.0000  |
| 660    | 73.0465   | 0.1649  | 0.0610  | 0.0000  |
| 670    | 72.2856   | 0.0874  | 0.0320  | 0.0000  |
| 680    | 71.6085   | 0.0468  | 0.0170  | 0.0000  |
| 690    | 69.8902   | 0.0227  | 0.0082  | 0.0000  |
| 700    | 70.8090   | 0.0114  | 0.0041  | 0.0000  |

### Final D65 CIE-Standard RGB Weights

```json
{
  "d65_cie_standard": {
    "red": [
      0.000721, 0.002399, 0.007376, 0.013453, 0.017101, 0.012679,
      0.001547, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000,
      0.000000, 0.000000, 0.000000, 0.000000, 0.024529, 0.060757,
      0.096147, 0.124246, 0.140095, 0.138050, 0.119855, 0.090468,
      0.063426, 0.039777, 0.023631, 0.012421, 0.006600, 0.003128,
      0.001593
    ],
    "green": [
      0.000000, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000,
      0.000000, 0.003829, 0.022300, 0.040713, 0.062274, 0.090093,
      0.117466, 0.129218, 0.128323, 0.118330, 0.104464, 0.082534,
      0.057178, 0.031879, 0.011397, 0.000000, 0.000000, 0.000000,
      0.000000, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000,
      0.000000
    ],
    "blue": [
      0.005107, 0.017245, 0.054813, 0.109079, 0.166030, 0.187692,
      0.176763, 0.132343, 0.082163, 0.043153, 0.020066, 0.005545,
      0.000000, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000,
      0.000000, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000,
      0.000000, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000,
      0.000000
    ]
  }
}
```

## Key Properties of the Resulting Weights

The CIE-derived coefficients have these important characteristics:

1. **Spectral Separation**: 
   - Red channel weights are concentrated in long wavelengths (560-620nm)
   - Green channel weights are focused in middle wavelengths (480-570nm)
   - Blue channel weights are mainly in short wavelengths (400-490nm)

2. **Numerical Patterns**:
   - Peak wavelengths match human perception: R~600nm, G~530nm, B~450nm
   - Zero values in regions outside each channel's sensitivity
   - No negative values in the final normalized weights

3. **Scientific Validity**:
   - Based on standardized human color perception measurements
   - Properly accounts for the D65 illuminant's spectral distribution
   - Correctly transforms through CIE XYZ color space to sRGB display space

## Shader Implementation Notes

For accurate rendering of multispectral data, the shader should:

1. Read JPG values (which are in sRGB color space)
2. Convert to linear space before applying spectral weights
3. Apply the weighted sum using the coefficients above 

This ensures colorimetrically accurate visualization of multispectral data.
