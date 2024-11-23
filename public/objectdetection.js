let isDetectionEnabled = true; // Enable detection by default
let detectionModel = null;
let canvasInitialized1 = false; // Track if canvas size for Camera 1 has been set
let canvasInitialized2 = false; // Track if canvas size for Camera 2 has been set
let detectionActive = false; // Control for detection loop
let detectionInterval = 800; // Detection interval in milliseconds
let lastDetections = {}; // Store the last detection results for each camera

// Load the COCO-SSD model
async function loadModel() {
    try {
        detectionModel = await cocoSsd.load();
        console.log("Object detection model loaded.");
    } catch (error) {
        console.error("Error loading object detection model:", error);
    }
}

// Dynamically resize the canvas to fit the image's aspect ratio and parent container
function resizeCanvasToFitScreen(canvas, image) {
    const parent = canvas.parentElement;
    const aspectRatio = image.width / image.height;

    if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetWidth / aspectRatio;
    }
}

// Perform object detection on the given canvas
async function runObjectDetection(canvasId, imageId, cameraId) {
    const canvas = document.getElementById(canvasId);
    const image = document.getElementById(imageId);

    if (!canvas || !image) {
        console.error(`Canvas or image element with IDs '${canvasId}', '${imageId}' not found.`);
        return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
        console.error("Failed to get canvas context.");
        return;
    }

    // Dynamically adjust the canvas size to match the image
    if (cameraId === "Camera1" && !canvasInitialized1) {
        resizeCanvasToFitScreen(canvas, image);
        canvasInitialized1 = true;
    } else if (cameraId === "Camera2" && !canvasInitialized2) {
        resizeCanvasToFitScreen(canvas, image);
        canvasInitialized2 = true;
    }

    // Clear the canvas and redraw the image
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (!detectionModel) {
        console.error("Detection model not loaded.");
        return;
    }

    try {
        const detections = await detectionModel.detect(image);

        // Draw predictions if any are detected
        detections.forEach(detection => {
            const [x, y, width, height] = detection.bbox;
            context.strokeStyle = "#00FF00"; // Green rectangles
            context.lineWidth = 2;
            context.strokeRect(x, y, width, height);

            context.fillStyle = "#00FF00";
            context.font = "16px Arial";
            context.fillText(detection.class, x, y > 10 ? y - 5 : y + 15);
        });

        // Store detections for this camera
        lastDetections[cameraId] = detections;
    } catch (error) {
        console.error("Error during object detection:", error);
    }
}

// Start the continuous detection loop
function startDetectionLoop() {
    if (detectionActive) return; // Avoid starting multiple loops
    detectionActive = true;

    const detectionLoop = async () => {
        if (!isDetectionEnabled) return;

        await runObjectDetection("objectDetectionCanvas1", "cam1", "Camera1"); // Camera 1
        await runObjectDetection("objectDetectionCanvas2", "cam2", "Camera2"); // Camera 2

        if (detectionActive) {
            setTimeout(detectionLoop, detectionInterval); // Loop with interval
        }
    };

    detectionLoop();
}

// Stop the detection loop
function stopDetectionLoop() {
    detectionActive = false; // Stop the detection loop
}

// Setup detection for multiple canvases and the toggle button
function setupDetection() {
    const toggleButton = document.getElementById("toggle-detection");
    toggleButton.addEventListener("click", () => {
        isDetectionEnabled = !isDetectionEnabled;
        toggleButton.textContent = isDetectionEnabled
            ? "Disable Object Detection"
            : "Enable Object Detection";

        console.log(`Object detection ${isDetectionEnabled ? "enabled" : "disabled"}`);

        if (isDetectionEnabled) {
            startDetectionLoop();
        } else {
            stopDetectionLoop();
        }
    });

    startDetectionLoop(); // Start detection when the page loads
}

// Initialize everything when the page loads
window.onload = async () => {
    await loadModel(); // Load the model on page load
    setupDetection(); // Set up detection and toggle button
};