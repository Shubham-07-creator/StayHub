(function () {
    "use strict";

    function initMap() {
        const mapContainer = document.getElementById("map");
        if (!mapContainer) return;

        // Check if mapToken is available
        const token = (typeof mapToken !== "undefined" && mapToken) ? mapToken : "";
        if (!token) {
            console.warn("Mapbox access token is not configured.");
            mapContainer.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-4 text-center">
                    <i class="fa-solid fa-map-location-dot fs-1 text-danger mb-2"></i>
                    <h6 class="fw-bold mb-1">Interactive Map Unavailable</h6>
                    <p class="small mb-0 text-muted">Location: ${(typeof listing !== "undefined" && listing.location) ? listing.location : "Destination"}</p>
                </div>`;
            return;
        }

        // Wait for Mapbox GL JS if not loaded yet
        if (typeof mapboxgl === "undefined") {
            let retries = 0;
            const checkMapboxInterval = setInterval(function () {
                retries++;
                if (typeof mapboxgl !== "undefined") {
                    clearInterval(checkMapboxInterval);
                    renderMapbox();
                } else if (retries > 30) {
                    clearInterval(checkMapboxInterval);
                    console.error("Mapbox GL JS failed to load within 3 seconds.");
                }
            }, 100);
            return;
        }

        renderMapbox();

        function renderMapbox() {
            try {
                mapboxgl.accessToken = token;

                // Determine coordinates safely
                let coords = [77.2090, 28.6139]; // Default: New Delhi
                if (
                    typeof listing !== "undefined" &&
                    listing &&
                    listing.geometry &&
                    Array.isArray(listing.geometry.coordinates) &&
                    listing.geometry.coordinates.length >= 2 &&
                    !isNaN(listing.geometry.coordinates[0]) &&
                    !isNaN(listing.geometry.coordinates[1])
                ) {
                    coords = [Number(listing.geometry.coordinates[0]), Number(listing.geometry.coordinates[1])];
                }

                const map = new mapboxgl.Map({
                    container: "map",
                    style: "mapbox://styles/mapbox/streets-v12",
                    center: coords,
                    zoom: 12,
                    cooperativeGestures: true, // Prevents scroll hijacking on mobile/desktop
                });

                // Add standard navigation and fullscreen controls
                map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
                map.addControl(new mapboxgl.FullscreenControl(), "top-right");

                // Custom StayHub Branded Marker Element
                const el = document.createElement("div");
                el.className = "stayhub-map-marker";
                el.style.width = "40px";
                el.style.height = "40px";
                el.style.cursor = "pointer";
                el.innerHTML = `
                    <div style="
                        width: 38px;
                        height: 38px;
                        background: linear-gradient(135deg, #fe424d 0%, #ff5a5f 100%);
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        box-shadow: 0 4px 14px rgba(254, 66, 77, 0.45);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 2.5px solid #ffffff;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                    ">
                        <i class="fa-solid fa-house" style="transform: rotate(45deg); color: white; font-size: 14px;"></i>
                    </div>
                `;

                // Interactive Popup
                const title = (typeof listing !== "undefined" && listing.title) ? listing.title : "StayHub Stay";
                const location = (typeof listing !== "undefined" && listing.location) ? listing.location : "";
                const country = (typeof listing !== "undefined" && listing.country) ? listing.country : "";

                const popup = new mapboxgl.Popup({ offset: 25, closeButton: true })
                    .setHTML(`
                        <div style="padding: 6px; font-family: inherit;">
                            <h6 style="font-weight: 700; margin-bottom: 4px; font-size: 0.92rem; color: #1e293b;">${title}</h6>
                            <p style="font-size: 0.78rem; color: #64748b; margin: 0;">
                                <i class="fa-solid fa-location-dot text-danger me-1"></i> ${location}${country ? ', ' + country : ''}
                            </p>
                            <p style="font-size: 0.72rem; color: #10b981; font-weight: 600; margin-top: 5px; margin-bottom: 0;">
                                <i class="fa-solid fa-circle-check me-1"></i> Exact address provided after booking
                            </p>
                        </div>
                    `);

                new mapboxgl.Marker({ element: el })
                    .setLngLat(coords)
                    .setPopup(popup)
                    .addTo(map);

                // Auto-resize on container render
                map.on("load", function () {
                    map.resize();
                });

                window.addEventListener("resize", function () {
                    map.resize();
                });

            } catch (err) {
                console.error("Mapbox render error:", err);
                mapContainer.innerHTML = `
                    <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-4 text-center">
                        <i class="fa-solid fa-map-location-dot fs-1 text-danger mb-2"></i>
                        <h6 class="fw-bold mb-1">Location Map</h6>
                        <p class="small mb-0">${(typeof listing !== "undefined" && listing.location) ? listing.location : "Destination"}</p>
                    </div>`;
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMap);
    } else {
        initMap();
    }
})();
