'use strict';

let map;
let markers = [];
let infoWindow;
let currentHuntType = 'geolocation';
let proximityMarkersData = [];
let currentProximityRadiusFt = 10;
let proximityCircleElement, proximityCircleRect, proximityCircleRadiusPx;
let mapAndListContainerElement, proximityViewContainerElement;
let proximityCoordinatesDisplayElement;
let deleteLastProximityButton, clearAllProximityButton;
let huntTypeRadios;
let proximityRadiusSlider;
let proximityRadiusDisplayElement;
const radiusMapping = [10, 50, 100];

window.initMap = function() {
    console.log("Google Maps script loaded, initializing map...");
    const defaultCenter = { lat: 40.7128, lng: -74.0060 };

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 19,
        center: defaultCenter,
        mapId: 'LOOTA_MAP_ID',
        styles: [
            {
                featureType: "all",
                elementType: "labels.text.fill",
                stylers: [{ color: "#1a237e" }]
            },
            {
                featureType: "all",
                elementType: "labels.text.stroke",
                stylers: [{ color: "#ffffff" }, { weight: 2 }]
            },
            {
                featureType: "water",
                elementType: "geometry.fill",
                stylers: [{ color: "#b3e5fc" }]
            },
            {
                featureType: "landscape",
                elementType: "geometry.fill",
                stylers: [{ color: "#e8f5e9" }]
            }
        ]
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
        if (currentHuntType === 'geolocation') {
            addMarker(event.latLng);
        }
    });

    processIncomingPins();
};

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? 'Error: The Geolocation service failed.'
            : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

function addMarker(location) {
    const marker = new google.maps.Marker({
        position: location,
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#ffd700",
            fillOpacity: 0.8,
            strokeColor: "#ffa500",
            strokeWeight: 2
        }
    });

    markers.push(marker);
    updateCoordinatesDisplay();

    marker.addListener('dragend', () => {
        updateCoordinatesDisplay();
        console.log("Marker dragged to:", marker.getPosition().toJSON());
    });
}

function updateCoordinatesDisplay() {
    const coordinatesDisplay = document.getElementById('coordinates-display');
    if (coordinatesDisplay) {
        if (markers.length === 0) {
            coordinatesDisplay.innerHTML = '<p style="text-align: center; padding: 10px;">No pins placed yet. Click on the map to add treasure locations!</p>';
            return;
        }
        const coordText = markers.map((marker, index) => {
            const pos = marker.getPosition();
            return `<div class="coordinate-item">Pin ${index + 1}: Latitude: ${pos.lat().toFixed(6)}, Longitude: ${pos.lng().toFixed(6)}</div>`;
        }).join('');
        coordinatesDisplay.innerHTML = coordText;
    } else {
        console.error("Coordinates display element not found!");
    }
}

function deleteLastPin() {
    if (markers.length > 0) {
        const lastMarker = markers.pop();
        lastMarker.setMap(null);
        updateCoordinatesDisplay();
        console.log("Last pin deleted.");
    } else {
        console.log("No pins to delete.");
    }
}

function clearAllPins() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    updateCoordinatesDisplay();
    console.log("All pins cleared.");
}

function generateLootLink() {
    let encodedDataString;
    let urlParamsString;
    let dataToEncode;

    if (currentHuntType === 'geolocation') {
        if (markers.length === 0) {
            alert("Please drop at least one treasure pin on the map first!");
            return;
        }
        dataToEncode = markers.map(marker => {
            const pos = marker.getPosition();
            const lat = parseFloat(pos.lat().toFixed(6));
            const lng = parseFloat(pos.lng().toFixed(6));
            if (isNaN(lat) || isNaN(lng)) {
                console.error("Invalid coordinate found:", pos.lat(), pos.lng());
                return null;
            }
            return { lat, lng };
        }).filter(coord => coord !== null);

        if (dataToEncode.length === 0 && markers.length > 0) {
             alert("Failed to process marker coordinates. Please check console.");
             return;
        }

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
        dataToEncode = proximityMarkersData.map(m => {
             if (typeof m.distanceFt !== 'number' || isNaN(m.distanceFt) || typeof m.directionStr !== 'string') {
                 console.error("Invalid proximity marker data found:", m);
                 return null;
             }
            return {
                dist: m.distanceFt,
                dir: m.directionStr
            };
        }).filter(marker => marker !== null);

        if (dataToEncode.length === 0 && proximityMarkersData.length > 0) {
             alert("Failed to process proximity marker data. Please check console.");
             return;
        }

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

    let basePath = window.location.pathname;
    if (basePath.endsWith('index.html')) {
        basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
    } else if (!basePath.endsWith('/')) {
        basePath += '/';
    }
    const viewerPage = 'ar-view.html';
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

function copyToClipboard(text, buttonElement) {
    if (!navigator.clipboard) {
        alert("Clipboard API not available. Please copy the link manually.");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        buttonElement.textContent = 'Copied!';
        setTimeout(() => {
            buttonElement.textContent = 'Copy Link';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert("Failed to copy the link. Please copy it manually.");
    });
}

function processIncomingPins() {
    const urlParams = new URLSearchParams(window.location.search);
    const huntTypeParam = urlParams.get('hunt_type');
    const encodedData = urlParams.get('data');
    const legacyEncodedPins = urlParams.get('pins');

    if (huntTypeParam === 'proximity' && encodedData) {
        console.log("Found proximity hunt data in URL:", encodedData);
        try {
            const jsonString = atob(encodedData);
            const proximityData = JSON.parse(jsonString);
            console.log("Decoded proximity data:", proximityData);
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
                if (map) {
                    coordinates.forEach(coord => {
                        if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                            new google.maps.Marker({
                                position: coord,
                                map: map,
                                icon: {
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 10,
                                    fillColor: "#ffd700",
                                    fillOpacity: 0.8,
                                    strokeColor: "#ffa500",
                                    strokeWeight: 2
                                }
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

function loadGoogleMapsScript() {
    if (window.google && window.google.maps) {
        console.log("Google Maps already loaded, initializing map...");
        initMap();
        return;
    }

    if (typeof GOOGLE_MAPS_API_KEY === 'undefined' || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" || GOOGLE_MAPS_API_KEY === "") {
        console.error("Google Maps API Key not found or not configured in config.js. Please set GOOGLE_MAPS_API_KEY.");
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Google Maps API Key is missing or invalid. Please configure it in config.js.</p>';
        }
        const controls = document.querySelector('.controls');
        if (controls) controls.style.display = 'none';
        const resultArea = document.getElementById('result-area');
        if (resultArea) resultArea.style.display = 'none';
        return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
        console.log("Google Maps script is already being loaded...");
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&mapId=LOOTA_MAP_ID`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.error("Failed to load the Google Maps script. Check API key, network connection, and console for errors from Google.");
        const mapContainer = document.getElementById('map-container');
         if (mapContainer) {
            mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Failed to load Google Maps. Check the console for details.</p>';
        }
    };

    document.body.appendChild(script);
    console.log("Attempting to load Google Maps script...");
}

document.addEventListener('DOMContentLoaded', () => {
    mapAndListContainerElement = document.querySelector('.map-and-list-container');
    proximityViewContainerElement = document.getElementById('proximity-view-container');
    proximityCircleElement = document.getElementById('proximity-circle');
    proximityCoordinatesDisplayElement = document.getElementById('proximity-coordinates-display');
    deleteLastProximityButton = document.getElementById('delete-last-proximity-button');
    clearAllProximityButton = document.getElementById('clear-all-proximity-button');
    huntTypeRadios = document.querySelectorAll('input[name="huntType"]');
    proximityRadiusSlider = document.getElementById('proximityRadiusSlider');
    proximityRadiusDisplayElement = document.getElementById('proximityRadiusDisplay');

    const encourageButton = document.getElementById('encourage-button');
    if (encourageButton) {
        encourageButton.addEventListener('click', generateLootLink);
    } else {
        console.error("Encourage Looting button not found!");
    }

    const deleteLastButton = document.getElementById('delete-last-button');
    if (deleteLastButton) {
        deleteLastButton.addEventListener('click', deleteLastPin);
    }
    const clearAllButton = document.getElementById('clear-all-button');
    if (clearAllButton) {
        clearAllButton.addEventListener('click', clearAllPins);
    }
    
    huntTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleHuntTypeChange);
    });

    if (proximityRadiusSlider) {
        proximityRadiusSlider.addEventListener('input', handleProximityRadiusChange);
    } else {
        console.error("Proximity radius slider not found!");
    }

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

    handleHuntTypeChange({ target: { value: document.querySelector('input[name="huntType"]:checked').value } });
    handleProximityRadiusChange();
    loadGoogleMapsScript();
});

function handleHuntTypeChange(event) {
    currentHuntType = event.target.value;
    console.log("Hunt type changed to:", currentHuntType);

    if (currentHuntType === 'geolocation') {
        mapAndListContainerElement.classList.remove('hidden-view');
        proximityViewContainerElement.classList.add('hidden-view');
        if (!map && typeof loadGoogleMapsScript === 'function') {
            loadGoogleMapsScript();
        }
    } else if (currentHuntType === 'proximity') {
        mapAndListContainerElement.classList.add('hidden-view');
        proximityViewContainerElement.classList.remove('hidden-view');
        
        // Force a reflow to ensure the proximity view is visible before calculating dimensions
        proximityViewContainerElement.offsetHeight;
        
        // Ensure the proximity circle is visible and properly sized
        proximityCircleElement.style.display = 'block';
        proximityCircleElement.style.visibility = 'visible';
        
        // Use setTimeout to ensure DOM updates have occurred
        setTimeout(() => {
            proximityCircleRect = proximityCircleElement.getBoundingClientRect();
            proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2;
            console.log("Proximity circle dimensions calculated:", {
                width: proximityCircleElement.offsetWidth,
                height: proximityCircleElement.offsetHeight,
                rect: proximityCircleRect,
                radiusPx: proximityCircleRadiusPx
            });
            
            // Draw the proximity circle after dimensions are calculated
            drawProximityCircle();
        }, 100);
    }
}

function handleProximityRadiusChange() {
    if (!proximityRadiusSlider || !proximityRadiusDisplayElement) {
        console.error("Slider or display element for radius not found.");
        return;
    }

    const sliderValue = parseInt(proximityRadiusSlider.value, 10);
    currentProximityRadiusFt = radiusMapping[sliderValue];
    
    proximityRadiusDisplayElement.textContent = `${currentProximityRadiusFt} ft`;
    console.log("Proximity radius changed to:", currentProximityRadiusFt, "ft (Slider value:", sliderValue + ")");

    if (proximityMarkersData.length > 0) {
        alert("Radius changed. Existing proximity markers have been cleared as their scale is now different.");
        clearAllProximityMarkers();
    }
    drawProximityCircle();
}

function drawProximityCircle() {
    if (!proximityCircleElement) return;

    const existingSvgs = proximityCircleElement.querySelectorAll('svg.measurement-ring, div.measurement-label');
    existingSvgs.forEach(el => el.remove());

    proximityCircleRect = proximityCircleElement.getBoundingClientRect();
    proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2;

    if (proximityCircleRadiusPx <= 0) {
        console.warn("Proximity circle has no dimensions, cannot draw rings.");
        return;
    }
    
    const numDisplayIntervals = 5; // Display 5 rings (4 intervals + the outer boundary)

    for (let i = 1; i <= numDisplayIntervals; i++) { // Loop to include the last ring
        const proportion = i / numDisplayIntervals;
        const intervalRadiusFt = currentProximityRadiusFt * proportion;
        const intervalRadiusPx = proximityCircleRadiusPx * proportion;

        // Skip drawing the outermost ring if it's the last one, as the border serves this purpose
        if (i === numDisplayIntervals && intervalRadiusPx === proximityCircleRadiusPx) {
            // Optionally, add a label for the max radius if desired, but no ring
            const label = document.createElement('div');
            label.classList.add('measurement-label');
            label.style.position = 'absolute';
            // Position label slightly inside the max radius for visibility
            const labelRadiusPx = intervalRadiusPx - (proximityCircleRadiusPx * 0.05); // 5% inside
            const angleForLabel = -45; // Place it at a 45-degree angle for example
            label.style.left = `${proximityCircleRadiusPx + labelRadiusPx * Math.cos(angleForLabel * Math.PI / 180) - 15}px`; // Adjust -15 for label width
            label.style.top = `${proximityCircleRadiusPx + labelRadiusPx * Math.sin(angleForLabel * Math.PI / 180) - 10}px`; // Adjust -10 for label height
            label.textContent = `${intervalRadiusFt.toFixed(0)}ft`;
            proximityCircleElement.appendChild(label);
            continue; 
        }
        
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        ring.classList.add('measurement-ring');
        ring.style.position = 'absolute';
        ring.style.left = '0';
        ring.style.top = '0';
        ring.style.width = '100%';
        ring.style.height = '100%';
        ring.style.pointerEvents = 'none';

        const circleEl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circleEl.setAttribute('cx', proximityCircleRadiusPx);
        circleEl.setAttribute('cy', proximityCircleRadiusPx);
        circleEl.setAttribute('r', intervalRadiusPx);
        ring.appendChild(circleEl);
        proximityCircleElement.appendChild(ring);

        const label = document.createElement('div');
        label.classList.add('measurement-label');
        label.style.position = 'absolute';
        label.style.left = `${proximityCircleRadiusPx + intervalRadiusPx * Math.cos(-45 * Math.PI / 180) - 15}px`; // Position at 45 deg for clarity
        label.style.top = `${proximityCircleRadiusPx + intervalRadiusPx * Math.sin(-45 * Math.PI / 180) - 10}px`;  // Position at 45 deg for clarity
        label.textContent = `${intervalRadiusFt.toFixed(0)}ft`;
        proximityCircleElement.appendChild(label);
    }
    console.log(`Drew ${numDisplayIntervals -1} concentric circles for ${currentProximityRadiusFt}ft radius.`);
}

function handleAddProximityMarker(event) {
    if (currentHuntType !== 'proximity' || !proximityCircleElement) return;

    // Get the circle's bounding rectangle and dimensions
    proximityCircleRect = proximityCircleElement.getBoundingClientRect();
    proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2;

    // Calculate click position relative to circle center
    const centerX = proximityCircleRect.left + proximityCircleRadiusPx;
    const centerY = proximityCircleRect.top + proximityCircleRadiusPx;
    
    // Get click coordinates relative to circle center
    const clickX = event.clientX - proximityCircleRect.left - proximityCircleRadiusPx;
    const clickY = event.clientY - proximityCircleRect.top - proximityCircleRadiusPx;

    // Calculate distance from center in pixels
    const distanceFromCenterPx = Math.sqrt(clickX * clickX + clickY * clickY);

    console.log('Click coordinates:', {
        clientX: event.clientX,
        clientY: event.clientY,
        circleRect: proximityCircleRect,
        clickX,
        clickY,
        distanceFromCenterPx,
        radiusPx: proximityCircleRadiusPx
    });

    if (distanceFromCenterPx > proximityCircleRadiusPx) {
        alert(`Marker is outside the ${currentProximityRadiusFt}ft radius!`);
        return;
    }

    const distanceFt = (distanceFromCenterPx / proximityCircleRadiusPx) * currentProximityRadiusFt;
    let angleDeg = (Math.atan2(clickX, -clickY) * (180 / Math.PI) + 360) % 360;

    let directionStr;
    let angleFromCardinal = 0;

    if (angleDeg === 0 || angleDeg === 360) directionStr = "N";
    else if (angleDeg === 90) directionStr = "E";
    else if (angleDeg === 180) directionStr = "S";
    else if (angleDeg === 270) directionStr = "W";
    else if (angleDeg > 0 && angleDeg < 90) {
        angleFromCardinal = angleDeg;
        directionStr = `N${angleFromCardinal.toFixed(0)}E`;
    } else if (angleDeg > 90 && angleDeg < 180) {
        angleFromCardinal = angleDeg - 90;
        directionStr = `E${angleFromCardinal.toFixed(0)}S`;
    } else if (angleDeg > 180 && angleDeg < 270) {
        angleFromCardinal = angleDeg - 180;
        directionStr = `S${angleFromCardinal.toFixed(0)}W`;
    } else if (angleDeg > 270 && angleDeg < 360) {
        angleFromCardinal = angleDeg - 270;
        directionStr = `W${angleFromCardinal.toFixed(0)}N`;
    }

    proximityMarkersData.push({
        distanceFt: parseFloat(distanceFt.toFixed(1)),
        directionStr: directionStr,
        x: clickX + proximityCircleRadiusPx,
        y: clickY + proximityCircleRadiusPx
    });

    const dot = document.createElement('div');
    dot.className = 'proximity-marker-dot';
    dot.style.left = `${clickX + proximityCircleRadiusPx}px`;
    dot.style.top = `${clickY + proximityCircleRadiusPx}px`;
    proximityCircleElement.appendChild(dot);

    updateProximityMarkerDisplay();
}

function updateProximityMarkerDisplay() {
    if (!proximityCoordinatesDisplayElement) return;

    if (proximityMarkersData.length === 0) {
        proximityCoordinatesDisplayElement.innerHTML = '<p style="text-align: center; padding: 10px;">No proximity markers placed yet. Click within the circle to add markers!</p>';
        return;
    }

    const markerListHtml = proximityMarkersData.map((marker, index) => {
        return `<div class="coordinate-item">Marker ${index + 1}: ${marker.distanceFt}ft, ${marker.directionStr}</div>`;
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
    updateProximityMarkerDisplay();
    console.log("All proximity markers cleared.");
}
