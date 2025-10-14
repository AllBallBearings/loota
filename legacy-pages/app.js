'use strict';

let map;
let markers = []; // Array to store marker objects for Geolocation
let infoWindow;

// New global variables for Proximity Hunt
let currentHuntType = 'geolocation'; // Default hunt type
let proximityMarkersData = []; // Stores { distanceFt, directionStr, x, y } for proximity markers
let currentProximityRadiusFt = 10; // Default radius in feet, now 10ft to match HTML slider default
let proximityCircleElement, proximityCircleRect, proximityCircleRadiusPx;
let mapAndListContainerElement, proximityViewContainerElement; // For toggling visibility
let proximityCoordinatesDisplayElement;
let deleteLastProximityButton, clearAllProximityButton;
let huntTypeRadios;
// let proximityRadiusRadios; // For the new radius controls - REMOVED
let proximityRadiusSlider; // For the new radius slider
let proximityRadiusDisplayElement; // To show the current radius value
const radiusMapping = [10, 50, 100]; // Maps slider values (0,1,2) to ft


// Function to initialize the Google Map - will be called by Google Maps script
window.initMap = function() {
    console.log("Google Maps script loaded, initializing map...");
    const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York City as a fallback

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 19,
        center: defaultCenter,
        mapId: 'LOOTA_MAP_ID'
    });

    infoWindow = new google.maps.InfoWindow();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(pos);
            },
            () => {
                handleLocationError(true, infoWindow, map.getCenter());
            }
        );
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }

    map.addListener('click', (event) => {
        if (currentHuntType === 'geolocation') { // Only add map markers if geolocation is active
            addMarker(event.latLng);
        }
    });

    // Note: Button listeners for map pins are already set up in DOMContentLoaded
    // Process incoming pins AFTER map is initialized (original logic had this in a redefined initMap)
    processIncomingPins();
};

// Function to handle geolocation errors
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? 'Error: The Geolocation service failed.'
            : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

// Function to add a marker (pin) to the map and store its coordinates
function addMarker(location) {
    // Create a new marker
    const marker = new google.maps.Marker({
        position: location,
        map: map,
        draggable: true, // Allow users to fine-tune position
        animation: google.maps.Animation.DROP,
        // icon: 'path/to/custom/treasure_icon.png' // Optional: Add a custom icon
    });

    // Add the marker to our array
    markers.push(marker);

    // Update coordinates display immediately
    updateCoordinatesDisplay();

    // Optional: Add an info window to the marker or other interactions
    // marker.addListener('click', () => { /* ... */ });

    // Add listener for dragend to update position if marker is moved
    marker.addListener('dragend', () => {
        // Update coordinates display when marker is dragged
        updateCoordinatesDisplay();
        // No need to update the array directly,
        // we read positions when generating the link.
        console.log("Marker dragged to:", marker.getPosition().toJSON());
    });
}

// Function to update the coordinates display in real-time
function updateCoordinatesDisplay(marker) {
    const pos = marker.getPosition();
    const coordText = `Latitude: ${pos.lat().toFixed(6)}, Longitude: ${pos.lng().toFixed(6)}`;
    
    const coordinatesDisplay = document.getElementById('coordinates-display');
    if (coordinatesDisplay) {
        coordinatesDisplay.innerHTML += `<div>${coordText}</div>`;
    } else {
        console.error("Coordinates display element not found!");
    }
}

// Function to generate the Loota link
function generateLootLink() {
    let encodedDataString;
    let urlParamsString;
    let dataToEncode;

    if (currentHuntType === 'geolocation') {
        if (markers.length === 0) {
            alert("Please drop at least one treasure pin on the map first!");
            return;
        }
        // Corrected map callback for geolocation
        dataToEncode = markers.map(marker => {
            const pos = marker.getPosition();
            // Ensure lat/lng are numbers
            const lat = parseFloat(pos.lat().toFixed(6));
            const lng = parseFloat(pos.lng().toFixed(6));
            // Check for NaN just in case
            if (isNaN(lat) || isNaN(lng)) {
                console.error("Invalid coordinate found:", pos.lat(), pos.lng());
                return null; // Mark as null to filter out later
            }
            // Return the valid coordinate object
            return { lat, lng };
        }).filter(coord => coord !== null); // Remove any null entries if NaN occurred

        if (dataToEncode.length === 0 && markers.length > 0) {
             alert("Failed to process marker coordinates. Please check console.");
             return;
        }

        // Stringify and encode
        try {
            const jsonString = JSON.stringify(dataToEncode);
            encodedDataString = btoa(jsonString);
            urlParamsString = `hunt_type=geolocation&data=${encodedDataString}`;
        } catch (e) {
            console.error("Error encoding geolocation data:", e);
            alert("Failed to generate link due to encoding error.");
            return;
        }
        updateCoordinatesDisplay();

    } else if (currentHuntType === 'proximity') {
        if (proximityMarkersData.length === 0) {
            alert("Please place at least one proximity marker first!");
            return;
        }
        // Create the array of {dist, dir} objects, ensuring validity
        dataToEncode = proximityMarkersData.map(m => {
             // Check if distance is valid number and direction is string
             if (typeof m.distanceFt !== 'number' || isNaN(m.distanceFt) || typeof m.directionStr !== 'string') {
                 console.error("Invalid proximity marker data found:", m);
                 return null; // Mark as null to filter out
             }
            return {
                dist: m.distanceFt,
                dir: m.directionStr
            };
        }).filter(marker => marker !== null); // Remove invalid entries

        if (dataToEncode.length === 0 && proximityMarkersData.length > 0) {
             alert("Failed to process proximity marker data. Please check console.");
             return;
        }

        // Stringify and encode
        try {
            const jsonString = JSON.stringify(dataToEncode);
            encodedDataString = btoa(jsonString);
            urlParamsString = `hunt_type=proximity&data=${encodedDataString}`;
        } catch (e) {
            console.error("Error encoding proximity data:", e);
            alert("Failed to generate link due to encoding error.");
            return;
        }
        updateProximityMarkerDisplay();

    } else {
        console.error("Unknown hunt type selected.");
        return;
    }

    // Construct the URL (points to ar-view.html as per original plan)
    // Ensure pathname correctly points to the directory if index.html is not explicitly in URL
    let basePath = window.location.pathname;
    if (basePath.endsWith('index.html')) {
        basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
    } else if (!basePath.endsWith('/')) {
        basePath += '/';
    }
    const viewerPage = 'ar-view.html'; // Or whatever the viewing page is
    const fullUrl = `${window.location.origin}${basePath}${viewerPage}?${urlParamsString}`;
    
    const resultUrlElement = document.getElementById('result-url');
    if (resultUrlElement) {
        resultUrlElement.textContent = fullUrl;
        resultUrlElement.href = fullUrl;
        resultUrlElement.target = "_blank";
    } else {
        console.error("Result URL element not found!");
    }

    console.log("Generated Loota URL:", fullUrl);
    console.log("Encoded Data:", encodedDataString);

    const copyButton = document.getElementById('copy-button');
    if (copyButton) {
        copyButton.style.display = 'inline-block';
        copyButton.textContent = 'Copy Link';
        copyButton.onclick = () => copyToClipboard(fullUrl, copyButton);
    }
}

// Function to update the coordinates display with all current markers
function updateCoordinatesDisplay() {
    const coordinatesDisplay = document.getElementById('coordinates-display');
    if (coordinatesDisplay) {
        const coordText = markers.map((marker, index) => {
            const pos = marker.getPosition();
            return `Pin ${index + 1}: Latitude: ${pos.lat().toFixed(6)}, Longitude: ${pos.lng().toFixed(6)}`;
        }).join('<br>');
        coordinatesDisplay.innerHTML = coordText;
    } else {
        console.error("Coordinates display element not found!");
    }
}

// Function to handle deleting the last pin
function deleteLastPin() {
    if (markers.length > 0) {
        const lastMarker = markers.pop();
        lastMarker.setMap(null); // Remove from map
        updateCoordinatesDisplay(); // Update display
        console.log("Last pin deleted.");
    } else {
        console.log("No pins to delete.");
    }
}

// Function to handle clearing all pins
function clearAllPins() {
    markers.forEach(marker => marker.setMap(null)); // Remove all from map
    markers = []; // Clear array
    updateCoordinatesDisplay(); // Update display
    console.log("All pins cleared.");
}

// Function to copy text to clipboard
function copyToClipboard(text, buttonElement) {
    if (!navigator.clipboard) {
        // Fallback for older browsers (less common now)
        alert("Clipboard API not available. Please copy the link manually.");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        // Success feedback
        buttonElement.textContent = 'Copied!';
        setTimeout(() => {
            buttonElement.textContent = 'Copy Link'; // Reset after 2 seconds
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert("Failed to copy the link. Please copy it manually.");
    });
}


// Function to process incoming pins from URL parameters
function processIncomingPins() {
    const urlParams = new URLSearchParams(window.location.search);
    const huntTypeParam = urlParams.get('hunt_type');
    const encodedData = urlParams.get('data'); // Common parameter for data
    const legacyEncodedPins = urlParams.get('pins'); // For backward compatibility

    if (huntTypeParam === 'proximity' && encodedData) {
        console.log("Found proximity hunt data in URL:", encodedData);
        try {
            const jsonString = atob(encodedData);
            const proximityData = JSON.parse(jsonString);
            console.log("Decoded proximity data:", proximityData);
            // Future: Display these on ar-view.html or creation page.
        } catch (e) {
            console.error("Error decoding or parsing proximity data from URL:", e);
            alert("Could not load proximity treasure hunt data from the link. The link might be corrupted.");
        }
    } else if ((huntTypeParam === 'geolocation' && encodedData) || legacyEncodedPins) {
        const dataToProcess = encodedData || legacyEncodedPins;
        const dataType = encodedData ? "data" : "pins (legacy)";
        console.log(`Found geolocation ${dataType} in URL:`, dataToProcess);
        try {
            const jsonString = atob(dataToProcess);
            const coordinates = JSON.parse(jsonString);
            console.log("Decoded geolocation coordinates:", coordinates);

            if (Array.isArray(coordinates) && coordinates.length > 0) {
                // Ensure map is initialized before adding markers
                if (map) {
                    coordinates.forEach(coord => {
                        if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                            new google.maps.Marker({
                                position: coord,
                                map: map,
                            });
                        }
                    });
                    if (coordinates.length > 0) {
                        const bounds = new google.maps.LatLngBounds();
                        coordinates.forEach(coord => bounds.extend(coord));
                        map.fitBounds(bounds);
                        if (map.getZoom() > 18) map.setZoom(18);
                    }
                } else {
                    // If map isn't ready, defer or store pins. For simplicity, log error.
                    console.error("Map not ready when processing incoming geolocation pins.");
                }
            } else {
                console.error("Decoded geolocation pins data is not a valid array or is empty.");
            }
        } catch (e) {
            console.error("Error decoding or parsing geolocation pins from URL:", e);
            alert("Could not load geolocation treasure hunt pins from the link. The link might be corrupted.");
        }
    } else {
        console.log("No hunt data found in URL, assuming creation mode.");
    }
}

// Function to dynamically load the Google Maps script
function loadGoogleMapsScript() {
    // Check if the config and key exist
    if (typeof GOOGLE_MAPS_API_KEY === 'undefined' || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" || GOOGLE_MAPS_API_KEY === "") {
        console.error("Google Maps API Key not found or not configured in config.js. Please set GOOGLE_MAPS_API_KEY.");
        // Display an error message to the user on the page
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Google Maps API Key is missing or invalid. Please configure it in config.js.</p>';
        }
        // Optionally hide other controls if the map can't load
        const controls = document.querySelector('.controls');
        if (controls) controls.style.display = 'none';
        const resultArea = document.getElementById('result-area');
        if (resultArea) resultArea.style.display = 'none';
        return; // Stop execution if key is missing
    }

    // Create the script tag
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&mapId=LOOTA_MAP_ID`; // Added mapId here too
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.error("Failed to load the Google Maps script. Check API key, network connection, and console for errors from Google.");
        const mapContainer = document.getElementById('map-container');
         if (mapContainer) {
            mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Failed to load Google Maps. Check the console for details.</p>';
        }
    };

    // Append the script tag to the document body
    document.body.appendChild(script);
    console.log("Attempting to load Google Maps script...");
}

// Load the script once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM element references
    mapAndListContainerElement = document.querySelector('.map-and-list-container');
    proximityViewContainerElement = document.getElementById('proximity-view-container');
    proximityCircleElement = document.getElementById('proximity-circle');
    proximityCoordinatesDisplayElement = document.getElementById('proximity-coordinates-display');
    deleteLastProximityButton = document.getElementById('delete-last-proximity-button');
    clearAllProximityButton = document.getElementById('clear-all-proximity-button');
    huntTypeRadios = document.querySelectorAll('input[name="huntType"]');
    // proximityRadiusRadios = document.querySelectorAll('input[name="proximityRadius"]'); // Get radius controls - REMOVED
    proximityRadiusSlider = document.getElementById('proximityRadiusSlider'); // Get slider
    proximityRadiusDisplayElement = document.getElementById('proximityRadiusDisplay'); // Get display span

    // Add listener for the 'Encourage Looting' button (common to both modes)
    const encourageButton = document.getElementById('encourage-button');
    if (encourageButton) {
        encourageButton.addEventListener('click', generateLootLink);
    } else {
        console.error("Encourage Looting button not found!");
    }

    // Add listeners for Geolocation pin controls
    const deleteLastButton = document.getElementById('delete-last-button');
    if (deleteLastButton) {
        deleteLastButton.addEventListener('click', deleteLastPin);
    }
    const clearAllButton = document.getElementById('clear-all-button');
    if (clearAllButton) {
        clearAllButton.addEventListener('click', clearAllPins);
    }
    
    // Add listeners for Hunt Type radio buttons
    huntTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleHuntTypeChange);
    });

    // Add listener for Proximity Radius slider
    if (proximityRadiusSlider) {
        proximityRadiusSlider.addEventListener('input', handleProximityRadiusChange);
    } else {
        console.error("Proximity radius slider not found!");
    }

    // Add listeners for Proximity marker controls
    if (proximityCircleElement) {
        proximityCircleElement.addEventListener('click', handleAddProximityMarker);
    } else {
        console.error("Proximity circle element not found!");
    }
    if (deleteLastProximityButton) {
        deleteLastProximityButton.addEventListener('click', deleteLastProximityMarker);
    } else {
        console.error("Delete Last Proximity button not found!");
    }
    if (clearAllProximityButton) {
        clearAllProximityButton.addEventListener('click', clearAllProximityMarkers);
    } else {
        console.error("Clear All Proximity button not found!");
    }

    // Initial setup based on default hunt type (geolocation)
    // Simulate a change event for hunt type and then for radius to draw initial circle if proximity is default
    handleHuntTypeChange({ target: { value: document.querySelector('input[name="huntType"]:checked').value } });
    handleProximityRadiusChange(); // Call this to draw the circle based on the default checked radius
    loadGoogleMapsScript(); // Load maps script by default
});


// Function to handle Proximity Radius change
function handleProximityRadiusChange() {
    if (!proximityRadiusSlider || !proximityRadiusDisplayElement) {
        console.error("Slider or display element for radius not found.");
        return;
    }

    const sliderValue = parseInt(proximityRadiusSlider.value, 10);
    currentProximityRadiusFt = radiusMapping[sliderValue];
    
    proximityRadiusDisplayElement.textContent = `${currentProximityRadiusFt} ft`;
    console.log("Proximity radius changed to:", currentProximityRadiusFt, "ft (Slider value:", sliderValue + ")");

    // Clear existing markers and alert user, as their positions would be misleading
    if (proximityMarkersData.length > 0) {
        alert("Radius changed. Existing proximity markers have been cleared as their scale is now different.");
        clearAllProximityMarkers(); // This already updates display and removes dots
    }
    drawProximityCircle();
}

// Function to draw the proximity circle with concentric rings and labels
function drawProximityCircle() {
    if (!proximityCircleElement) return;

    // Clear previous SVG elements (rings and labels)
    const existingSvgs = proximityCircleElement.querySelectorAll('svg.measurement-ring, div.measurement-label');
    existingSvgs.forEach(el => el.remove());

    proximityCircleRect = proximityCircleElement.getBoundingClientRect();
    proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2; // Physical radius in pixels

    if (proximityCircleRadiusPx <= 0) {
        console.warn("Proximity circle has no dimensions, cannot draw rings.");
        return;
    }
    
    const numIntervals = 10; // We want 10 intervals (e.g., 10ft, 20ft... or 1ft, 2ft...)
                           // The outermost ring is the main border, so we draw 9 inner rings.

    for (let i = 1; i < numIntervals; i++) { // 1 to 9 for inner rings
        const intervalRadiusFt = (currentProximityRadiusFt / numIntervals) * i;
        const intervalRadiusPx = (proximityCircleRadiusPx / numIntervals) * i;

        // Create SVG circle for the ring
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        ring.classList.add('measurement-ring');
        ring.style.position = 'absolute';
        ring.style.left = '0';
        ring.style.top = '0';
        ring.style.width = '100%';
        ring.style.height = '100%';
        ring.style.pointerEvents = 'none'; // So they don't interfere with clicks

        const circleEl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circleEl.setAttribute('cx', proximityCircleRadiusPx); // Center X
        circleEl.setAttribute('cy', proximityCircleRadiusPx); // Center Y
        circleEl.setAttribute('r', intervalRadiusPx);
        circleEl.setAttribute('stroke', 'rgba(0, 123, 255, 0.3)'); // Light blue, semi-transparent
        circleEl.setAttribute('stroke-width', '1');
        circleEl.setAttribute('fill', 'none');
        ring.appendChild(circleEl);
        proximityCircleElement.appendChild(ring);

        // Add measurement label (e.g., "10ft", "20ft")
        const label = document.createElement('div');
        label.classList.add('measurement-label');
        label.style.position = 'absolute';
        label.style.left = `${proximityCircleRadiusPx + intervalRadiusPx - 10}px`; // Position near the ring, adjust as needed
        label.style.top = `${proximityCircleRadiusPx - 10}px`; // Center vertically, adjust as needed
        label.style.fontSize = '10px';
        label.style.color = '#555';
        label.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        label.style.padding = '1px 3px';
        label.style.borderRadius = '3px';
        label.style.pointerEvents = 'none';
        label.textContent = `${intervalRadiusFt.toFixed(0)}ft`;
        proximityCircleElement.appendChild(label);
    }
    console.log(`Drew ${numIntervals -1} concentric circles for ${currentProximityRadiusFt}ft radius.`);
}


// Function to handle Hunt Type change
function handleHuntTypeChange(event) {
    currentHuntType = event.target.value;
    console.log("Hunt type changed to:", currentHuntType);

    if (currentHuntType === 'geolocation') {
        if (mapAndListContainerElement) mapAndListContainerElement.classList.remove('hidden-view');
        if (proximityViewContainerElement) proximityViewContainerElement.classList.add('hidden-view');
        if (!map && typeof loadGoogleMapsScript === 'function') {
            loadGoogleMapsScript();
        }
    } else if (currentHuntType === 'proximity') {
        if (mapAndListContainerElement) mapAndListContainerElement.classList.add('hidden-view');
        if (proximityViewContainerElement) proximityViewContainerElement.classList.remove('hidden-view');
        
        // Ensure circle dimensions are calculated and drawn when view becomes active
        // Use a timeout to ensure the element is visible and has dimensions
        setTimeout(() => {
            if (proximityViewContainerElement.offsetParent !== null) { // Check if visible
                proximityCircleRect = proximityCircleElement.getBoundingClientRect();
                proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2;
                console.log("Proximity circle dimensions calculated:", proximityCircleRect, proximityCircleRadiusPx);
                drawProximityCircle(); // Draw the circle with current/default radius
            }
        }, 0);
    }
}

// Core functions for Proximity Hunt
function handleAddProximityMarker(event) {
    if (currentHuntType !== 'proximity' || !proximityCircleElement) { 
        console.log("Proximity marker add skipped. Conditions not met:", currentHuntType, proximityCircleElement);
        return;
    }

    // Recalculate Rect and Radius on every click for robustness
    // Ensure the element is visible and has dimensions before proceeding
    if (proximityViewContainerElement.offsetParent === null) {
        console.warn("Proximity view is not visible. Cannot add marker.");
        // Attempt to make it visible and recalculate, or simply return
        // For now, just return to avoid errors if it's hidden unexpectedly.
        return;
    }

    proximityCircleRect = proximityCircleElement.getBoundingClientRect();
    if (!proximityCircleRect || !proximityCircleRect.width || proximityCircleRect.width === 0) {
        console.error("Proximity circle not visible or has no dimensions. Width:", proximityCircleRect ? proximityCircleRect.width : 'undefined');
        // Try to force a redraw/recalc if it seems off
        setTimeout(() => {
            if (proximityViewContainerElement.offsetParent !== null) {
                proximityCircleRect = proximityCircleElement.getBoundingClientRect();
                proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2;
                drawProximityCircle(); // Redraw to be sure
                console.log("Re-calculated proximity circle dimensions after delay:", proximityCircleRect, proximityCircleRadiusPx);
            }
        }, 50); // Short delay
        return; // Don't proceed with marker placement if dimensions are bad
    }
    proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2; 
    
    const clickX = event.clientX - proximityCircleRect.left;
    const clickY = event.clientY - proximityCircleRect.top;

    const relativeX = clickX - proximityCircleRadiusPx;
    const relativeY = clickY - proximityCircleRadiusPx;

    const distanceFromCenterPx = Math.sqrt(relativeX * relativeX + relativeY * relativeY);

    if (distanceFromCenterPx > proximityCircleRadiusPx) {
        alert(`Marker is outside the ${currentProximityRadiusFt}ft radius!`);
        return;
    }

    const distanceFt = (distanceFromCenterPx / proximityCircleRadiusPx) * currentProximityRadiusFt;

    let angleDeg = (Math.atan2(relativeX, -relativeY) * (180 / Math.PI) + 360) % 360;

    let directionStr;
    let angleFromCardinal = 0;

    if (angleDeg === 0 || angleDeg === 360) directionStr = "N";
    else if (angleDeg === 90) directionStr = "E";
    else if (angleDeg === 180) directionStr = "S";
    else if (angleDeg === 270) directionStr = "W";
    else if (angleDeg > 0 && angleDeg < 90) { // NxE
        angleFromCardinal = angleDeg;
        directionStr = `N${angleFromCardinal.toFixed(0)}E`; // Removed degree symbol
    } else if (angleDeg > 90 && angleDeg < 180) { // ExS
        angleFromCardinal = angleDeg - 90;
        directionStr = `E${angleFromCardinal.toFixed(0)}S`; // Removed degree symbol
    } else if (angleDeg > 180 && angleDeg < 270) { // SxW
        angleFromCardinal = angleDeg - 180;
        directionStr = `S${angleFromCardinal.toFixed(0)}W`; // Removed degree symbol
    } else if (angleDeg > 270 && angleDeg < 360) { // WxN
        angleFromCardinal = angleDeg - 270;
        directionStr = `W${angleFromCardinal.toFixed(0)}N`; // Removed degree symbol
    } else {
        // Fallback should ideally not happen with the checks above
        directionStr = `Angle ${angleDeg.toFixed(1)}`; 
    }
    
    console.log(`Angle: ${angleDeg}, RelX: ${relativeX}, RelY: ${relativeY}, Dir: ${directionStr}`);


    proximityMarkersData.push({
        distanceFt: parseFloat(distanceFt.toFixed(1)),
        directionStr: directionStr,
        x: clickX, 
        y: clickY
    });

    const dot = document.createElement('div');
    dot.className = 'proximity-marker-dot';
    dot.style.left = `${clickX}px`;
    dot.style.top = `${clickY}px`;
    proximityCircleElement.appendChild(dot);

    updateProximityMarkerDisplay();
}

function updateProximityMarkerDisplay() {
    if (!proximityCoordinatesDisplayElement) return;

    if (proximityMarkersData.length === 0) {
        proximityCoordinatesDisplayElement.innerHTML = '<p style="padding:10px; text-align:center;">No proximity markers placed yet.</p>';
        return;
    }

    const markerListHtml = proximityMarkersData.map((marker, index) => {
        return `<div style="padding: 2px 5px;">Marker ${index + 1}: ${marker.distanceFt}ft, ${marker.directionStr}</div>`;
    }).join('');
    proximityCoordinatesDisplayElement.innerHTML = markerListHtml;
}

function deleteLastProximityMarker() {
    if (proximityMarkersData.length > 0) {
        proximityMarkersData.pop(); 
        const dots = proximityCircleElement.querySelectorAll('.proximity-marker-dot');
        if (dots.length > 0) {
            proximityCircleElement.removeChild(dots[dots.length - 1]);
        }
        updateProximityMarkerDisplay();
        console.log("Last proximity marker deleted.");
    } else {
        console.log("No proximity markers to delete.");
    }
}

function clearAllProximityMarkers() {
    proximityMarkersData = []; 
    const dots = proximityCircleElement.querySelectorAll('.proximity-marker-dot');
    dots.forEach(dot => proximityCircleElement.removeChild(dot));
    updateProximityMarkerDisplay(); // Update to show "No markers"
    console.log("All proximity markers cleared.");
}
