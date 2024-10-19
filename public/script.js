document.addEventListener('DOMContentLoaded', () => {
    let previousFrame1 = null; // Initialize previousFrame1
    let previousFrame2 = null; // Initialize previousFrame2


    // Function to load the saved description from localStorage
    function loadDescription(cameraId) {
        const description = localStorage.getItem(`${cameraId}-description`);
        const descriptionInput = document.getElementById(`${cameraId}-description`);

        console.log(`Loading description for ${cameraId}: ${description}`); // Debug log

        if (description && descriptionInput) {
            descriptionInput.value = description; // Load the saved description
        }
    }

    
    // Function to refresh the camera feed by forcing the image to reload
    function refreshFeed(cameraId) {
        console.log(`Refreshing ${cameraId}`);  // To verify the function is being called
        let img = document.getElementById(cameraId);
        img.src = img.src + '?' + new Date().getTime(); // Add timestamp to force reload
    }

    // Function to save the description to localStorage
    function saveDescription(cameraId) {
        const descriptionInput = document.getElementById(`${cameraId}-description`);

        if (descriptionInput) {
            localStorage.setItem(`${cameraId}-description`, descriptionInput.value); // Save the new description
            console.log(`Saved description for ${cameraId}: ${descriptionInput.value}`); // Debug log
        }
    }

    // Function to format time as HH:MM:SS
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Function to update the timestamp
    function updateTime() {
        const currentTime = new Date();

        // Update the time for Camera 1
        const cam1TimeSpan = document.getElementById('cam1-time');
        if (cam1TimeSpan) {
            cam1TimeSpan.textContent = `${formatTime(currentTime)}`;
        }

        // Update the time for Camera 2
        const cam2TimeSpan = document.getElementById('cam2-time');
        if (cam2TimeSpan) {
            cam2TimeSpan.textContent = `${formatTime(currentTime)}`;
        }
    }

    // Call updateTime() initially to show the current time on page load
    updateTime();

    // Keep updating the timestamp every few seconds (e.g., every 3 seconds)
    setInterval(updateTime, 3000);


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
                reject('Image failed to load');
            };
        });
    }

    // Function to detect motion in camera feeds
    function detectMotion() {
        Promise.all([
            refreshImage('cam1', 'canvas1'),
            refreshImage('cam2', 'canvas2')
        ]).then(([currentFrame1, currentFrame2]) => {
            // Ensure there is a previous frame to compare with
            if (previousFrame1 && previousFrame2) {
                let motion1 = compareFrames(currentFrame1, previousFrame1, 'canvas1');
                let motion2 = compareFrames(currentFrame2, previousFrame2, 'canvas2');

                if (motion1) {
                    notifyMotion('Motion detected on Camera 1');
                }
                if (motion2) {
                    notifyMotion('Motion detected on Camera 2');
                }
            }

            // Update previous frames for the next comparison
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


    // Function to notify when motion is detected (browser notifications)
    function notifyMotion(message) {
        console.log(message); // Log to the console

        // Browser notification (if allowed)
        if (Notification.permission === 'granted') {
            new Notification(message);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(message);
                }
            });
        }
    }
    // Run the motion detection every 2 seconds
    setInterval(detectMotion, 2000);

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