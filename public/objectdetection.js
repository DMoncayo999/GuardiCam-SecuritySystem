let isDetectionEnabled = true;// Enable detection by default
let detectionModel = null;

// Load the COCO-SSD model
async function loadModel() {
    try {
        detectionModel = await cocoSsd.load();
        console.log("Object detection model loaded.");
    } catch (error) {
        console.error("Error loading object detection model:", error);
    }
}


// Perform object detection on the given canvas
async function runObjectDetection(canvasId, imageId) {
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

    // Set canvas size only if it's not already set
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = image.width;
        canvas.height = image.height;
    }

    // Clear the canvas and redraw the image
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    if (!detectionModel) return;

    try {
        const predictions = await detectionModel.detect(image);
        // Draw bounding boxes and labels
        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            context.strokeStyle = "#00FF00"; // Green rectangles
            context.lineWidth = 2;
            context.strokeRect(x, y, width, height);

            context.fillStyle = "#00FF00";
            context.font = "16px Arial";
            context.fillText(prediction.class, x, y > 10 ? y - 5 : y + 15);
        });
    } catch (error) {
        console.error("Error during object detection:", error);
    }
}


// Setup detection for multiple canvases and the toggle button
function setupDetection() {
    // Toggle button functionality
    document.getElementById("toggle-detection").addEventListener("click", () => {
        isDetectionEnabled = !isDetectionEnabled;

        const button = document.getElementById("toggle-detection");
        button.textContent = isDetectionEnabled ? "Disable Object Detection" : "Enable Object Detection";

        console.log(`Object detection ${isDetectionEnabled ? "enabled" : "disabled"}`);
    });

    // Start the continuous detection loop
    setInterval(() => {
        if (isDetectionEnabled) {
            runObjectDetection('canvas1', 'cam1'); // Camera 1
            runObjectDetection('canvas2', 'cam2'); // Camera 2
        }
    }, 1000); // Runs every second
}

// Continuous detection (can be used or removed based on your design preference)
function continuousDetection() {
    setInterval(() => {
        if (isDetectionEnabled) {
            runObjectDetection('canvas1', 'cam1'); // Camera 1
            runObjectDetection('canvas2', 'cam2'); // Camera 2
        }
    }, 1000); // Runs every second
}

// Initialize everything when the page loads
window.onload = async () => {
    await loadModel(); // Load the model on page load
    setupDetection(); // Set up detection and toggle button
};