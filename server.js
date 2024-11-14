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
        
        // Create a timestamp in the format YYYY-MM-DD_HH-MM-SS (remove milliseconds and UTC 'Z')
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Generate the filename using the timestamp and cameraId
        const filename = path.join(capturesDir, `${cameraId}-${timestamp}.jpg`);
        
        // Write the capture to the file
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
    const captureDir = path.join(__dirname, 'captures');

    fs.readdir(capturesDir, (err, files) => {
        if (err) {
            console.error('Error reading captures directory:', err); // Log the error
            return res.status(500).json({ error: 'Error reading captures directory' });
        }

        // Filter for .jpg files if necessary
        const jpgFiles = files.filter(file => file.endsWith('.jpg'));
        res.json(jpgFiles); // Send the array of file names as JSON
    });
});

// Clear captures route
app.delete('/clear-captures', (req, res) => {
    const captureFolderPath = capturesDir;
    
    // Use fs to delete all files in the capture folder
    fs.readdir(captureFolderPath, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory: ' + err);
        }

        // Delete each file in the directory
        const deletePromises = files.map(file => {
            return fs.promises.unlink(path.join(captureFolderPath, file));
        });

        Promise.all(deletePromises)
            .then(() => {
                console.log('All capture files deleted.');
                res.status(200).send('All captures deleted successfully.');
            })
            .catch(err => {
                console.error('Error deleting files:', err);
                res.status(500).send('Error deleting capture files.');
            });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

module.exports = saveCapture;