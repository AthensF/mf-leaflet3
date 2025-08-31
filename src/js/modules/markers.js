// Marker creation and management

// Helper to extract zipcode from address
function getZip(address) {
    const zipMatch = address.match(/\b\d{5}\b/);
    return zipMatch ? zipMatch[0] : 'Unknown';
}

// Create cluster marker
export function createClusterMarker(cluster, map, onClusterClick) {
    const count = cluster.stations.length;
    const size = Math.min(50, Math.max(30, 20 + count * 2));
    
    const clusterIcon = L.divIcon({
        html: `<div class="cluster-marker" style="width:${size}px;height:${size}px;">${count}</div>`,
        className: 'cluster-div-icon',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });

    const marker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon });
    
    marker.on('click', () => {
        if (cluster.stations.length === 1) {
            onClusterClick(cluster.stations[0], 'select');
        } else {
            const bounds = L.latLngBounds([
                [cluster.bounds.minLat, cluster.bounds.minLng],
                [cluster.bounds.maxLat, cluster.bounds.maxLng]
            ]);
            map.fitBounds(bounds.pad(0.1));
        }
    });

    marker.on('mouseover', () => {
        const zips = new Set(cluster.stations.map(s => getZip(s.address)));
        const zipList = Array.from(zips).join(', ');
        const content = window.innerWidth > 768 
            ? `<strong>${count} Incidents Reported</strong><br>Zipcodes: ${zipList}<br><button onclick="navigator.clipboard.writeText('${zipList}'); console.log('Zipcodes copied to clipboard');" style="margin-top:5px; padding:4px 8px; background:#b2bbc3; color:white; border:none; border-radius:3px; cursor:pointer; font-size:12px;" onmouseover="this.style.background='#8e949a'" onmouseout="this.style.background='#b2bbc3'" onmousedown="this.style.background='#7d848a'" onmouseup="this.style.background='#b2bbc3'">Copy Zipcodes for Google / Facebooks ads</button>`
            : `<strong>${count} Incidents Reported</strong><br>Zoom in for more ...`;
        L.popup()
            .setLatLng([cluster.lat, cluster.lng])
            .setContent(content)
            .openOn(map);
    });

    return marker;
}

// Create individual station marker
export function createStationMarker(station, selectedStation, onStationClick) {
    const isSelected = selectedStation && selectedStation.id === station.id;
    const isOccupied = station.status === 'occupied';
    
    let markerClass = 'station-marker';
    if (isSelected) markerClass += ' selected';
    else if (isOccupied) markerClass += ' occupied';
    
    const stationIcon = L.divIcon({
        html: `<div class="${markerClass}"></div>`,
        className: 'station-div-icon',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    const marker = L.marker([station.lat, station.lng], { icon: stationIcon });
    
    marker.on('click', () => {
        onStationClick(station);
    });

    return marker;
}

// Show station popup
export function showStationPopup(station, map) {
    const isComplaint = station._meta && station._meta.type && station._meta.date;
    const content = isComplaint
        ? `
            <div style="min-width: 220px;">
                <strong>${station.name}</strong><br>
                <small>${station.address}</small><br>
                <div style="margin-top:6px; font-size: 12px; color: #4a5568;">
                    <div><strong>Type:</strong> ${station._meta.type}</div>
                    <div><strong>Date:</strong> ${new Date(station._meta.date).toLocaleString()}</div>
                </div>
            </div>
        `
        : `
            <div style="min-width: 200px;">
                <strong>${station.name}</strong><br>
                <small>${station.address}</small><br>
                <span style="color: ${station.status === 'available' ? '#28a745' : '#dc3545'};">
                    ${station.availablePorts}/${station.ports} ports available
                </span><br>
                <span style="background: ${station.type === 'DC Fast' ? '#28a745' : '#ffc107'}; color: ${station.type === 'DC Fast' ? 'white' : 'black'}; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                    ${station.type}
                </span>
            </div>
        `;

    L.popup()
        .setLatLng([station.lat, station.lng])
        .setContent(content)
        .openOn(map);
}