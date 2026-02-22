import cv2
import numpy as np

img = cv2.imread('parkLot.jpg')
imgGray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
imgBlur = cv2.GaussianBlur(imgGray, (3, 3), 1)
imgThreshold = cv2.adaptiveThreshold(imgBlur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY_INV, 25, 16)
imgMedian = cv2.medianBlur(imgThreshold, 5)
kernel = np.ones((3, 3), np.uint8)
imgDilate = cv2.dilate(imgMedian, kernel, iterations=1)

W = 612
H = 283
w = W // 7
h = 160
y = 60

with open("out2.txt", "w", encoding="utf-8") as f:
    for i in range(7):
        x = i * w
        imgCrop = imgDilate[y:y+h, x:x+w]
        count = cv2.countNonZero(imgCrop)
        f.write(f"Spot {i+1} (x={x}, y={y}, w={w}, h={h}): {count} pixels\n")
