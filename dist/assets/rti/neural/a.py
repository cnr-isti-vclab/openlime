import numpy as np
import cv2 as cv

mask = np.random.random((320,320))
mask = np.round(mask) * 255
cv.imwrite('mask.jpg', mask.astype('uint8'))