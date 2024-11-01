document.addEventListener('DOMContentLoaded', () => {
    let previousFrame1 = null; // Previous frame for Camera 1
    let previousFrame2 = null; // Previous frame for Camera 2

    let lastMotionTime = 0; // Last motion detection time
    const motionCooldown = 3000; // Cooldown period of 3 seconds

     // Clear all captures functionality
     document.getElementById('clear-all-captures').addEventListener('click', async () => {
        const confirmDelete = confirm("Are you sure you want to delete all captures?");
        if (confirmDelete) {
            try {
                const response = await fetch('/clear-captures', {
                    method: 'DELETE' // Use DELETE method for deleting files
                });

                if (response.ok) {
                    // Clear the saved captures display in the user interface
                    document.getElementById('saved-captures').innerHTML = '';
                    console.log('All captures deleted successfully.');
                } else {
                    console.error('Failed to clear captures:', response.statusText);
                }
            } catch (error) {
                console.error('Error clearing captures:', error);
            }
        }
    });

    // Function to load the saved description from localStorage
    function loadDescription(cameraId) {
        const description = localStorage.getItem(`${cameraId}-description`);
        const descriptionInput = document.getElementById(`${cameraId}-description`);
        if (description && descriptionInput) {
            descriptionInput.value = description; // Load the saved description
        }
    }

    
    // Function to refresh the camera feed by forcing the image to reload
    function refreshFeed(cameraId) {
        const img = document.getElementById(cameraId);
        img.src = `${img.src.split('?')[0]}?${new Date().getTime()}`; // Add timestamp to force reload
    }

    // Function to save the description to localStorage
    function saveDescription(cameraId) {
        const descriptionInput = document.getElementById(`${cameraId}-description`);
        if (descriptionInput) {
            localStorage.setItem(`${cameraId}-description`, descriptionInput.value); // Save the new description
        }
    }


    // Function to format time as HH:MM:SS
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Function to update the timestamp
    function updateTime() {
        const currentTime = new Date();
        const cam1TimeSpan = document.getElementById('cam1-time');
        const cam2TimeSpan = document.getElementById('cam2-time');
        if (cam1TimeSpan) cam1TimeSpan.textContent = formatTime(currentTime);
        if (cam2TimeSpan) cam2TimeSpan.textContent = formatTime(currentTime);
    }

    updateTime();
    setInterval(updateTime, 3000); // Update timestamp every 3 seconds


    // Function to refresh the camera feed and draw on canvas, returns a Promise with ImageData
    function refreshImage(cameraId, canvasId) {
        return new Promise((resolve, reject) => {
            let img = document.getElementById(cameraId);
            let canvas = document.getElementById(canvasId);
            let context = canvas.getContext('2d');

            // Set CORS to anonymous if the image is from another origin
            img.crossOrigin = 'anonymous';

            // Force the image to refresh by adding a timestamp to the URL
            img.src = img.src.split('?')[0] + '?' + new Date().getTime();

            // Once the image is loaded, draw it on the canvas
            img.onload = function () {
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    resolve(imageData);  // Return the ImageData once the image is drawn
                } catch (error) {
                    console.error('Error accessing image data:', error); // Log error
                    reject('Security error or CORS issue');
                }
            };
    
            // Handle image load error
            img.onerror = function () {
                console.error(`Error loading image for ${cameraId}`); // Log to console
                reject('Image failed to load'); // Reject the promise
                return null; // You can also return a specific value
            };
        });
    }


    // Function to detect motion in camera feeds
    function detectMotion() {
        Promise.all([
            refreshImage('cam1', 'canvas1'),
            refreshImage('cam2', 'canvas2')
        ]).then(([currentFrame1, currentFrame2]) => {
            if (previousFrame1 && previousFrame2) {
                let motion1 = compareFrames(currentFrame1, previousFrame1, 'canvas1');
                let motion2 = compareFrames(currentFrame2, previousFrame2, 'canvas2');

                if (motion1) handleMotionDetected('Camera1');
                if (motion2) handleMotionDetected('Camera2');
            }

            previousFrame1 = currentFrame1;
            previousFrame2 = currentFrame2;
        }).catch(error => {
            console.error('Error detecting motion:', error);
        });
    }


    // Compare two frames pixel by pixel, highlight motion on the canvas
    function compareFrames(currentFrame, previousFrame, canvasId) {
        let motionThreshold = 50; // Sensitivity threshold
        let diffCount = 0;
        let canvas = document.getElementById(canvasId);
        let context = canvas.getContext('2d');
        context.beginPath(); // Start drawing highlights for motion
        
        for (let i = 0; i < currentFrame.data.length; i += 4) {
            let rDiff = Math.abs(currentFrame.data[i] - previousFrame.data[i]);
            let gDiff = Math.abs(currentFrame.data[i + 1] - previousFrame.data[i + 1]);
            let bDiff = Math.abs(currentFrame.data[i + 2] - previousFrame.data[i + 2]);

            if (rDiff > motionThreshold || gDiff > motionThreshold || bDiff > motionThreshold) {
                diffCount++;
                // Highlight the motion on the canvas by drawing small rectangles
                let x = (i / 4) % canvas.width;
                let y = Math.floor((i / 4) / canvas.width);
                context.rect(x, y, 1, 1); // Draw a small rectangle at the pixel
            }
        }

        context.strokeStyle = 'red'; // Color for motion highlights
        context.stroke(); // Draw all motion areas
        return diffCount > 1000; // Motion detected if enough pixels have changed
    }


    // Manages cooldown for motion events
    async function handleMotionDetected(cameraId) {
        const currentTime = Date.now(); // Get current time

        // Check if enough time has passed since the last motion detection
        if (currentTime - lastMotionTime < motionCooldown) {
        return; // Exit if still in cooldown period
        }

    // Update the last motion time
    lastMotionTime = currentTime;

        try {
            // Notify about motion detection
            saveMotionEvent(cameraId); // notify about motion
    
            // Send a request to save the capture
            const response = await fetch(`/save-capture/${encodeURIComponent(cameraId)}`);
            
            // Check if the response is okay (status in the range 200-299)
            if (!response.ok) {
                throw new Error(`Failed to save capture: ${response.statusText}`);
            }
            
            // Parse the response directly as JSON
            const data = await response.json();
        
            console.log('Capture saved:', data.filePath);
            } catch (error) {
            console.error('Error:', error);
        }
    }

    // logs a timestamped notification in the designated notification-panel
    function saveMotionEvent(cameraId) {
        const timestamp = new Date().toLocaleString();
        const notificationPanel = document.getElementById('notification-panel');
    
        // Create a message element
        const message = document.createElement('p');
        message.textContent = `Motion detected on ${cameraId} at ${timestamp}`;
    
        // Clear existing messages to avoid overflow
        notificationPanel.innerHTML = ''; // Optional: Clear old messages
        notificationPanel.appendChild(message);
    
        // Show the notification panel
        notificationPanel.style.display = 'block'; // Show the notification
    
        // Automatically hide after a delay
        setTimeout(() => {
            notificationPanel.style.display = 'none'; // Hide the notification after delay
        }, 5000); // Adjust duration as needed
    }

     // Fetch saved captures and display them
     async function loadSavedCaptures() {
        try {
            console.log('Fetching saved captures...');
            const response = await fetch('/list-captures');
            if (!response.ok) {
                throw new Error('Failed to load captures: ' + response.statusText);
            }
            const files = await response.json(); // Ensure this is valid JSON
            console.log('Files retrieved:', files); // Log the files retrieved

            const savedCapturesList = document.getElementById('saved-captures');
            savedCapturesList.innerHTML = ''; // Clear the list before adding new items
    
            files.forEach(file => {
                const listItem = document.createElement('li');
                // Create a link to view the image
                const link = document.createElement('a');
                link.href = `/captures/${file}`; // URL to the image
                link.textContent = file; // Set the filename as link text
                link.target = '_blank'; // Open in a new tab
                listItem.appendChild(link);
                savedCapturesList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading captures:', error);
        }
    }
    
    // Load saved captures on page load
    loadSavedCaptures();
    
    // Run the motion detection every 1 seconds
    setInterval(detectMotion, 1000);

    // Load saved descriptions for both cameras on page load
    loadDescription('cam1');
    loadDescription('cam2');

    // Event listeners to save description when input is changed
    document.getElementById('cam1-description').addEventListener('input', () => {
        saveDescription('cam1');
    });

    document.getElementById('cam2-description').addEventListener('input', () => {
        saveDescription('cam2');
    });

    // Event listeners for the refresh buttons
    document.getElementById('refresh-cam1').addEventListener('click', () => {
        refreshFeed('cam1');
    });

    document.getElementById('refresh-cam2').addEventListener('click', () => {
        refreshFeed('cam2');
    });
});