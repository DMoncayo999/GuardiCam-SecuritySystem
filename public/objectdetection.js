let isDetectionEnabled = true; // Enable detection by default
let detectionModel = null;
let canvasInitialized1 = false; // Track whether canvas size for Camera 1 has been set
let canvasInitialized2 = false; // Track whether canvas size for Camera 2 has been set
let detectionActive = false; // Control for detection loop
let lastLogTime = 0; // For logging frequency control

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
function resizeCanvasToFitScreen(canvas, image, canvasInitializedFlag) {
    if (canvasInitializedFlag) return true; // Only resize once
    const parent = canvas.parentElement;
    const aspectRatio = image.width / image.height;

    if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetWidth / aspectRatio;
    }
    return true; // Set the flag to true after resizing
}

// Perform object detection on the given canvas
async function runObjectDetection(canvasId, imageId, canvasInitializedFlag) {
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
    if (!canvasInitializedFlag) {
        canvasInitializedFlag = resizeCanvasToFitScreen(canvas, image, canvasInitializedFlag);
    }

    // Clear the canvas and redraw the image
    context.clearRect(0, 0, canvas.width, canvas.height);
    try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
    } catch (drawError) {
        console.error(`Error drawing image ${imageId} onto canvas ${canvasId}:`, drawError);
        return;
    }

    if (!detectionModel) {
        console.error("Detection model not loaded.");
        return;
    }

    try {
        const predictions = await detectionModel.detect(image);

        // Draw predictions if any are detected
        if (predictions.length > 0) {
            predictions.forEach(prediction => {
                const [x, y, width, height] = prediction.bbox;
                context.strokeStyle = "#00FF00"; // Green rectangles
                context.lineWidth = 2;
                context.strokeRect(x, y, width, height);

                context.fillStyle = "#00FF00";
                context.font = "16px Arial";
                context.fillText(prediction.class, x, y > 10 ? y - 5 : y + 15);
            });
        }
    } catch (error) {
        console.error("Error during object detection:", error);
    }
}

// Start the continuous detection loop
function startDetection() {
    if (detectionActive) return; // Avoid starting multiple loops
    detectionActive = true;

    const detectionLoop = async () => {
        if (!detectionActive || !isDetectionEnabled) return; // Exit loop if disabled
        await runObjectDetection('objectDetectionCanvas1', 'cam1', canvasInitialized1); // Camera 1
        await runObjectDetection('objectDetectionCanvas2', 'cam2', canvasInitialized2); // Camera 2
        requestAnimationFrame(detectionLoop);
    };

    detectionLoop();
}

// Stop the detection loop
function stopDetection() {
    detectionActive = false; // Stop the detection loop
}

// Setup detection for multiple canvases and the toggle button
function setupDetection() {
    const toggleButton = document.getElementById("toggle-detection");
    toggleButton.addEventListener("click", () => {
        isDetectionEnabled = !isDetectionEnabled;
        toggleButton.textContent = isDetectionEnabled ? "Disable Object Detection" : "Enable Object Detection";
        console.log(`Object detection ${isDetectionEnabled ? "enabled" : "disabled"}`);
        if (isDetectionEnabled) {
            startDetection();
        } else {
            stopDetection();
        }
    });

    startDetection(); // Start detection when the page loads
}

// Initialize everything when the page loads
window.onload = async () => {
    await loadModel(); // Load the model on page load
    setupDetection(); // Set up detection and toggle button
};