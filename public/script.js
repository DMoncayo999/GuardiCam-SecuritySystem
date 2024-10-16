document.addEventListener('DOMContentLoaded', () => {
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