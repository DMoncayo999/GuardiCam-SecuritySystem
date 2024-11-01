const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Define the captures directory path
const capturesDir = path.join(__dirname, 'captures');

// Create the captures directory if it doesn't exist
if (!fs.existsSync(capturesDir)) {
    fs.mkdirSync(capturesDir, { recursive: true });
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve images from the 'captures' directory
app.use('/captures', express.static(capturesDir));

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Save image capture function
const saveCapture = async (cameraId, url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(capturesDir, `${cameraId}-${timestamp}.jpg`);
        fs.writeFileSync(filename, response.data);
        console.log(`Saved capture: ${filename}`);
        return filename; // Return the saved filename
    } catch (error) {
        console.error(`Error saving capture from ${cameraId}:`, error);
        return null; // Return null if there is an error
    }
};

// Route to save capture on motion detection
app.get('/save-capture/:cameraId', async (req, res) => {
  const cameraId = req.params.cameraId;
  const cameraUrls = {
    "Camera1": 'http://192.168.1.100/capture',
    "Camera2": 'http://192.168.1.101/capture'
  };
  const url = cameraUrls[cameraId];

  if (url) {
      const savedFile = await saveCapture(cameraId, url);
      if (savedFile) {
          res.status(200).json({ filePath: savedFile }); // Send JSON response
      } else {
          res.status(500).json({ error: 'Error saving capture' });
      }
  } else {
      res.status(404).json({ error: 'Camera not found' });
  }
});

// Route to list saved captures
app.get('/list-captures', (req, res) => {
    fs.readdir(capturesDir, (err, files) => {
        if (err) {
            console.error('Error reading captures directory:', err); // Log the error
            return res.status(500).json({ error: 'Error reading captures directory' });
        }
        res.json(files); // Send the list of files as JSON
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

module.exports = saveCapture;