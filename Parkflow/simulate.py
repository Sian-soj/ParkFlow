import cv2
import numpy as np
import json
import sys
import os

# -------------------------------------------------------------------
# Parking space configuration
# -------------------------------------------------------------------
PARKING_SPOTS = [
    (0, 60, 87, 160),
    (87, 60, 87, 160),
    (174, 60, 87, 160),
    (261, 60, 87, 160),
    (348, 60, 87, 160),
    (435, 60, 87, 160),
    (522, 60, 87, 160),
]

INDEX_FILE = "sim_index.txt"

def get_current_index():
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, "r") as f:
            try:
                return int(f.read().strip())
            except:
                return 0
    return 0

def save_index(index):
    # Bound the index between 0 and 7 to prevent breaking
    index = max(0, min(7, index))
    with open(INDEX_FILE, "w") as f:
        f.write(str(index))
    return index

def check_parking_spaces(image_path, spots):
    """
    Reads an image and processes it to find empty parking spaces.
    Overrides the output with our simulated logical "booked" slots.
    """
    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"Could not read image at {image_path}"}

    imgGray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    imgBlur = cv2.GaussianBlur(imgGray, (3, 3), 1)
    imgThreshold = cv2.adaptiveThreshold(imgBlur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                         cv2.THRESH_BINARY_INV, 25, 16)
    imgMedian = cv2.medianBlur(imgThreshold, 5)
    kernel = np.ones((3, 3), np.uint8)
    imgDilate = cv2.dilate(imgMedian, kernel, iterations=1)

    free_spaces = 0
    total_spaces = len(spots)

    for pos in spots:
        x, y, w, h = pos
        imgCrop = imgDilate[y:y+h, x:x+w]
        count = cv2.countNonZero(imgCrop)

        if count < 900:
            free_spaces += 1

    # --- SIMULATION LOGIC OVERRIDE ---
    # In a real MVP without multiple images, we can simulate the increment/decrement 
    # by just mathematically offsetting the physical camera count.
    
    physical_occupied = total_spaces - free_spaces
    simulated_additional_cars = get_current_index()
    
    # Calculate final simulated state:
    logical_occupied = min(total_spaces, physical_occupied + simulated_additional_cars)
    logical_free = total_spaces - logical_occupied

    return {
        "total_slots": total_spaces,
        "free_slots": logical_free,
        "occupied_slots": logical_occupied,
        "_debug_physical": physical_occupied,
        "_debug_simulated_arriving": simulated_additional_cars
    }

if __name__ == "__main__":
    # Command examples:
    # python simulate.py          # Just reads camera
    # python simulate.py arrival  # Simulates resident booking a visitor token
    # python simulate.py depart   # Simulates visitor leaving the gate
    
    command = "status"
    if len(sys.argv) >= 2:
        command = sys.argv[1].lower()
        
    current_index = get_current_index()
    
    if command == "arrival":
        save_index(current_index + 1)
    elif command in ["depart", "departure"]:
        save_index(current_index - 1)
    elif command == "reset":
        save_index(0)

    # Automatically use the base image for camera checking
    result_data = check_parking_spaces("parkLot.jpg", PARKING_SPOTS)
    
    print(json.dumps(result_data, indent=2))
