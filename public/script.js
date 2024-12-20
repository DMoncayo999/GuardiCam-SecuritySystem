document.addEventListener('DOMContentLoaded', () => {
    /******************************
     * Global Variables and Setup
     ******************************/
    let previousFrame1 = null; // Previous frame for Camera 1
    let previousFrame2 = null; // Previous frame for Camera 2

    let lastMotionTime = 0;    // Last motion detection time
    const motionCooldown = 3000; // Cooldown period of 3 seconds
    let isSavingEnabled = true; // Variable to track saving state

    /******************************
     * Utility Functions
     ******************************/

    // Format time as HH:MM:SS
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Update and display current time for cameras
    function updateTime() {
        const currentTime = new Date();
        const cam1TimeSpan = document.getElementById('cam1-time');
        const cam2TimeSpan = document.getElementById('cam2-time');
        if (cam1TimeSpan) cam1TimeSpan.textContent = formatTime(currentTime);
        if (cam2TimeSpan) cam2TimeSpan.textContent = formatTime(currentTime);
    }

    // Force refresh the camera feed
    function refreshFeed(cameraId) {
        const img = document.getElementById(cameraId);
        img.src = `${img.src.split('?')[0]}?${new Date().getTime()}`;
    }

    // Load and save camera descriptions using localStorage
    function loadDescription(cameraId) {
        const description = localStorage.getItem(`${cameraId}-description`);
        const descriptionInput = document.getElementById(`${cameraId}-description`);
        if (description && descriptionInput) {
            descriptionInput.value = description;
        }
    }

    function saveDescription(cameraId) {
        const descriptionInput = document.getElementById(`${cameraId}-description`);
        if (descriptionInput) {
            localStorage.setItem(`${cameraId}-description`, descriptionInput.value);
        }
    }


    // Log a timestamped notification in the notification panel
    function saveMotionEvent(cameraId) {
        const timestamp = new Date().toLocaleString();
        const notificationPanel = document.getElementById('notification-panel');
        notificationPanel.innerHTML = `<p>Motion detected on ${cameraId} at ${timestamp}</p>`;
        notificationPanel.style.display = 'block';
        setTimeout(() => {
            notificationPanel.style.display = 'none';
        }, 5000);
    }

    /******************************
     * Motion Detection Functions
     ******************************/

    // Refresh camera feed and return ImageData
    function refreshImage(cameraId, canvasId) {
        return new Promise((resolve, reject) => {
            const img = document.getElementById(cameraId);
            const canvas = document.getElementById(canvasId);
            const context = canvas.getContext('2d');
            img.crossOrigin = 'anonymous';
            img.src = `${img.src.split('?')[0]}?${new Date().getTime()}`;
            img.onload = () => {
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    resolve(imageData);
                } catch (error) {
                    console.error('Error accessing image data:', error);
                    reject('Security error or CORS issue');
                }
            };
            img.onerror = () => reject('Image failed to load');
        });
    }


    // Compare frames for motion detection
    function compareFrames(currentFrame, previousFrame, canvasId) {
        const motionThreshold = 50; // Sensitivity threshold
        const canvas = document.getElementById(canvasId);
        const context = canvas.getContext('2d');
        let diffCount = 0;

        context.beginPath();
        for (let i = 0; i < currentFrame.data.length; i += 4) {
            const rDiff = Math.abs(currentFrame.data[i] - previousFrame.data[i]);
            const gDiff = Math.abs(currentFrame.data[i + 1] - previousFrame.data[i + 1]);
            const bDiff = Math.abs(currentFrame.data[i + 2] - previousFrame.data[i + 2]);
            if (rDiff > motionThreshold || gDiff > motionThreshold || bDiff > motionThreshold) {
                diffCount++;
                const x = (i / 4) % canvas.width;
                const y = Math.floor((i / 4) / canvas.width);
                context.rect(x, y, 1, 1);
            }
        }
        context.strokeStyle = 'red';
        context.stroke();
        return diffCount > 1000;
    }


    // Handle motion detection
    async function handleMotionDetected(cameraId) {
        const currentTime = Date.now();
        if (currentTime - lastMotionTime < motionCooldown) return;
        lastMotionTime = currentTime;

        if (isSavingEnabled) {
            try {
                const response = await fetch(`/save-capture/${encodeURIComponent(cameraId)}`);
                if (!response.ok) throw new Error(`Failed to save capture: ${response.statusText}`);
            } catch (error) {
                console.error('Error saving capture:', error);
            }
        }
        saveMotionEvent(cameraId);
    }


    // Detect motion in camera feeds
    function detectMotion() {
        Promise.all([
            refreshImage('cam1', 'canvas1'),
            refreshImage('cam2', 'canvas2')
        ]).then(([currentFrame1, currentFrame2]) => {
            if (previousFrame1 && previousFrame2) {
                if (compareFrames(currentFrame1, previousFrame1, 'canvas1')) handleMotionDetected('Camera1');
                if (compareFrames(currentFrame2, previousFrame2, 'canvas2')) handleMotionDetected('Camera2');
            }
            previousFrame1 = currentFrame1;
            previousFrame2 = currentFrame2;
        }).catch(error => console.error('Error detecting motion:', error));
    }


    /******************************
     * UI and Event Listeners
     ******************************/

    // Modal Elements and Functions
    const modal = document.getElementById("confirmation-modal");
    const confirmButton = document.getElementById("confirm-delete");
    const cancelButton = document.getElementById("cancel-delete");

    // Function to open the modal
    function openModal() {
        modal.style.display = "flex"; // Show the modal
    }

    // Function to close the modal
    function closeModal() {
        modal.style.display = "none"; // Hide the modal
    }

    // Toggle capture saving functionality
    const toggleButton = document.getElementById("toggle-saving");
    toggleButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/toggle-capture-saving', { method: 'POST' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            isSavingEnabled = data.captureSavingEnabled;

            toggleButton.textContent = isSavingEnabled ? 'Saving Captures' : 'Stop Saving Captures';
            toggleButton.classList.toggle('active', isSavingEnabled);
            toggleButton.classList.toggle('inactive', !isSavingEnabled);
        } catch (error) {
            console.error("Error toggling capture saving state:", error);
        }
    });

    // Clear all saved captures
    document.getElementById('clear-all-captures').addEventListener('click', () => {
        openModal(); // Open the modal instead of using `confirm`
    });

    // Confirm delete action
    confirmButton.addEventListener("click", async () => {
        try {
            const response = await fetch('/clear-captures', { method: 'DELETE' });
            if (!response.ok) throw new Error(response.statusText);
            document.getElementById('saved-captures').innerHTML = '';
            closeModal(); // Close the modal after successful deletion
        } catch (error) {
            console.error('Error clearing captures:', error);
        }
    });

    // Cancel delete action
    cancelButton.addEventListener("click", closeModal);

    // Event listeners for refresh buttons
    document.getElementById('refresh-cam1').addEventListener('click', () => refreshFeed('cam1'));
    document.getElementById('refresh-cam2').addEventListener('click', () => refreshFeed('cam2'));

    // Save descriptions on input change
    document.getElementById('cam1-description').addEventListener('input', () => saveDescription('cam1'));
    document.getElementById('cam2-description').addEventListener('input', () => saveDescription('cam2'));

    // Load saved captures on page load
    async function loadSavedCaptures() {
        try {
            const response = await fetch('/list-captures');
            if (!response.ok) throw new Error(response.statusText);
            const files = await response.json();
            const savedCapturesList = document.getElementById('saved-captures');
            savedCapturesList.innerHTML = '';
            files.forEach(file => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = `/captures/${file}`;
                link.textContent = file;
                link.target = '_blank';
                listItem.appendChild(link);
                savedCapturesList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading captures:', error);
        }
    }

    
    /******************************
     * Initialization
     ******************************/

    // Load descriptions and captures on page load
    loadDescription('cam1');
    loadDescription('cam2');
    loadSavedCaptures();

    // Update time and detect motion periodically
    updateTime();
    setInterval(updateTime, 3000);
    setInterval(detectMotion, 1000);
    setInterval(loadSavedCaptures, 3000);
});