import cv2
import numpy as np
import json
import sys

# -------------------------------------------------------------------
# Parking space configuration
# -------------------------------------------------------------------
# You need the coordinates of each parking space for your specific camera angle.
# Format is: (x, y, width, height)
# In a real environment, you often create a separate script where you click 
# on the video frame to save these coordinates to a file (e.g., positions.json)
PARKING_SPOTS = [
    (0, 60, 87, 160),
    (87, 60, 87, 160),
    (174, 60, 87, 160),
    (261, 60, 87, 160),
    (348, 60, 87, 160),
    (435, 60, 87, 160),
    (522, 60, 87, 160),
]

def check_parking_spaces(image_path, spots):
    """
    Reads an image and processes it to find empty parking spaces based on 
    pixel density in predefined bounding boxes.
    """
    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"Could not read image at {image_path}"}

    # 1. Convert to grayscale for easier processing
    imgGray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Add some blur to remove noise
    imgBlur = cv2.GaussianBlur(imgGray, (3, 3), 1)

    # 3. Apply Adaptive Thresholding
    # This turns the image binary (black and white). Cars have many edges/features,
    # so they will appear as dense white pixels. Empty road/asphalt will be mostly black.
    imgThreshold = cv2.adaptiveThreshold(imgBlur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                         cv2.THRESH_BINARY_INV, 25, 16)
    
    # 4. Clean up the noise
    imgMedian = cv2.medianBlur(imgThreshold, 5)
    kernel = np.ones((3, 3), np.uint8)
    imgDilate = cv2.dilate(imgMedian, kernel, iterations=1)

    free_spaces = 0
    total_spaces = len(spots)

    for pos in spots:
        x, y, w, h = pos

        # Crop the image to just the boundary of the current parking space
        imgCrop = imgDilate[y:y+h, x:x+w]

        # Count the number of non-zero (white) pixels in this region
        count = cv2.countNonZero(imgCrop)

        # If the pixel count is below a certain threshold, the spot is empty.
        # Note: You MUST tune this threshold (e.g., 900) based on your camera resolution,
        # distance from the ground, and size of the bounding box.
        if count < 900:
            color = (0, 255, 0) # Green for FREE
            thickness = 5
            free_spaces += 1
        else:
            color = (0, 0, 255) # Red for OCCUPIED
            thickness = 2

        # Optional: strictly for visualizing/debugging
        cv2.rectangle(img, (pos[0], pos[1]), (pos[0] + pos[2], pos[1] + pos[3]), color, thickness)

    # Optional: Save the annotated image to see if the boxes/thresholds are correct
    # cv2.imwrite("debug_output.jpg", img)

    return {
        "total_slots": total_spaces,
        "free_slots": free_spaces,
        "occupied_slots": total_spaces - free_spaces
    }

if __name__ == "__main__":
    # Example command line usage: python read.py image.jpg
    if len(sys.argv) < 2:
        image_file = "image.png"
    else:
        image_file = sys.argv[1]
    
    # Run the model
    result_data = check_parking_spaces(image_file, PARKING_SPOTS)
    
    # Output only JSON so that your Node.js backend can read it easily
    print(json.dumps(result_data))