'use strict';

let map;
let markers = []; // Array to store marker objects
let infoWindow;

// Function to initialize the Google Map - will be called by Google Maps script
window.initMap = function() {
    console.log("Google Maps script loaded, initializing map...");
    // Default center (will be updated by geolocation)
    const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York City as a fallback

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15, // Start with a reasonable zoom level
        center: defaultCenter,
        mapId: 'LOOTA_MAP_ID' // Optional: For Cloud-based map styling
    });

    infoWindow = new google.maps.InfoWindow();

    // Try HTML5 geolocation to center the map on the user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(pos);
                // Optionally add a marker for the user's current location (not a treasure pin)
                // new google.maps.Marker({
                //     position: pos,
                //     map: map,
                //     title: "Your Location",
                //     icon: { // Customize icon if desired
                //         path: google.maps.SymbolPath.CIRCLE,
                //         scale: 6,
                //         fillColor: "#4285F4",
                //         fillOpacity: 1,
                //         strokeWeight: 1,
                //         strokeColor: "#ffffff"
                //     }
                // });
            },
            () => {
                // Geolocation failed or was denied
                handleLocationError(true, infoWindow, map.getCenter());
            }
        );
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }

    // Add listener for map clicks to drop pins (markers)
    map.addListener('click', (event) => {
        addMarker(event.latLng);
    });

    // Add listener for the 'Encourage Looting' button
    const encourageButton = document.getElementById('encourage-button');
    if (encourageButton) {
        encourageButton.addEventListener('click', generateLootLink);
    } else {
        console.error("Encourage Looting button not found!");
    }
}

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

    // Optional: Add an info window to the marker or other interactions
    // marker.addListener('click', () => { /* ... */ });

    // Add listener for dragend to update position if marker is moved
    marker.addListener('dragend', () => {
        // No need to update the array directly,
        // we read positions when generating the link.
        console.log("Marker dragged to:", marker.getPosition().toJSON());
    });
}

// Function to generate the Loota link
function generateLootLink() {
    if (markers.length === 0) {
        alert("Please drop at least one treasure pin on the map first!");
        return;
    }

    // 1. Get coordinates from all markers
    const coordinates = markers.map(marker => {
        const pos = marker.getPosition();
        // Round coordinates to a reasonable precision (e.g., 6 decimal places)
        return {
            lat: parseFloat(pos.lat().toFixed(6)),
            lng: parseFloat(pos.lng().toFixed(6))
        };
    });

    // 2. Encode coordinates
    // Simple encoding: JSON stringify -> Base64 encode
    const coordinatesString = JSON.stringify(coordinates);
    const encodedCoordinates = btoa(coordinatesString); // Base64 encoding

    // 3. Construct the URL
    // Use the current page URL as the base for simplicity
    // In a real app, this might point to a dedicated viewer page like 'view.html'
    const baseUrl = window.location.origin + window.location.pathname;
    // Replace index.html with view.html or similar if needed
    // const viewerUrl = baseUrl.replace('index.html', 'ar-view.html'); // Example if using ar-view.html
    const fullUrl = `${baseUrl}?pins=${encodedCoordinates}`;

    // 4. Display the URL
    const resultUrlElement = document.getElementById('result-url');
    if (resultUrlElement) {
        resultUrlElement.textContent = fullUrl;
        resultUrlElement.href = fullUrl; // Make it clickable (optional)
        resultUrlElement.target = "_blank"; // Open in new tab (optional)
    } else {
        console.error("Result URL element not found!");
    }

    // Optional: Provide feedback
    console.log("Generated Loota URL:", fullUrl);
    console.log("Encoded Coordinates:", encodedCoordinates);
    // alert("Your Loota treasure hunt link has been generated!"); // Replaced by copy button feedback

    // Show the copy button
    const copyButton = document.getElementById('copy-button');
    if (copyButton) {
        copyButton.style.display = 'inline-block'; // Make it visible
        copyButton.textContent = 'Copy Link'; // Reset button text
        // Add listener if it doesn't exist or re-add if needed (simple approach)
        copyButton.onclick = () => copyToClipboard(fullUrl, copyButton);
    }
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
    const encodedPins = urlParams.get('pins');

    if (encodedPins) {
        console.log("Found encoded pins in URL:", encodedPins);
        try {
            // Decode Base64 -> JSON string -> JSON object
            const jsonString = atob(encodedPins);
            const coordinates = JSON.parse(jsonString);

            console.log("Decoded coordinates:", coordinates);

            // Clear existing markers if this page is primarily for viewing
            // markers.forEach(marker => marker.setMap(null));
            // markers = [];

            if (Array.isArray(coordinates) && coordinates.length > 0) {
                // Add markers for the received pins
                coordinates.forEach(coord => {
                    if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                        // Use a different marker appearance for received pins (optional)
                        new google.maps.Marker({
                            position: coord,
                            map: map,
                            // icon: 'path/to/viewer_icon.png' // Optional distinct icon
                        });
                    }
                });

                // Optionally adjust map bounds to fit received markers
                if (coordinates.length > 0) {
                    const bounds = new google.maps.LatLngBounds();
                    coordinates.forEach(coord => bounds.extend(coord));
                    map.fitBounds(bounds);
                    // Add a little padding if map zooms too tightly
                    if (map.getZoom() > 18) map.setZoom(18);
                }

                // Disable adding new markers if in "view" mode (optional)
                // google.maps.event.clearListeners(map, 'click');
                // document.getElementById('encourage-button').style.display = 'none'; // Hide button
                // document.querySelector('.intro-text').innerHTML = '<h2>Viewing a Treasure Hunt!</h2><p>These are the treasure locations someone shared with you.</p>'; // Change text

            } else {
                console.error("Decoded pins data is not a valid array or is empty.");
            }

        } catch (e) {
            console.error("Error decoding or parsing pins from URL:", e);
            alert("Could not load treasure hunt pins from the link. The link might be corrupted.");
        }
    } else {
        console.log("No pins found in URL, assuming creation mode.");
    }
}

// Modify initMap to call processIncomingPins after map is ready
function initMap() {
    // Default center (will be updated by geolocation)
    const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York City as a fallback

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15, // Start with a reasonable zoom level
        center: defaultCenter,
        mapId: 'LOOTA_MAP_ID' // Optional: For Cloud-based map styling
    });

    infoWindow = new google.maps.InfoWindow();

    // Try HTML5 geolocation (less critical if viewing pins)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                // Always center on the user's location initially
                map.setCenter(pos);
            },
            () => {
                handleLocationError(true, infoWindow, map.getCenter());
            }
        );
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }

    // Add listener for map clicks to drop pins (markers)
    // We might disable this later if viewing pins
    map.addListener('click', (event) => {
        addMarker(event.latLng);
    });

    // Add listener for the 'Encourage Looting' button
    const encourageButton = document.getElementById('encourage-button');
    if (encourageButton) {
        encourageButton.addEventListener('click', generateLootLink);
    } else {
        console.error("Encourage Looting button not found!");
    }

    // Process incoming pins AFTER map is initialized
    processIncomingPins();
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
document.addEventListener('DOMContentLoaded', loadGoogleMapsScript);
