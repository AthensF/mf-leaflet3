// Marker creation and management

// Helper to extract zipcode from address
function getZip(address) {
    const zipMatch = address.match(/\b\d{5}\b/);
    return zipMatch ? zipMatch[0] : 'Unknown';
}

// Custom tooltip functions
window.showTooltip = function(element, text) {
    const existingTooltip = document.getElementById('custom-tooltip');
    if (existingTooltip) existingTooltip.remove();
    
    const tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    tooltip.innerText = text;
    tooltip.style.position = 'absolute';
    tooltip.style.background = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.zIndex = '10000';
    tooltip.style.pointerEvents = 'none';
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
};

window.hideTooltip = function() {
    const tooltip = document.getElementById('custom-tooltip');
    if (tooltip) tooltip.remove();
};

window.copyZipcodes = function(zipList) {
    // Convert comma-separated to newline-separated for copying
    const newlineFormat = zipList.replace(/,\s*/g, '\n');
    navigator.clipboard.writeText(newlineFormat).then(() => {
        console.log('Zipcodes copied to clipboard');
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip) {
            tooltip.innerText = 'Copied!';
        } else {
            // If tooltip not visible, show it briefly
            const button = event.target;
            showTooltip(button, 'Copied!');
            setTimeout(() => hideTooltip(), 2000);
        }
    });
};

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
        
        // Always use icon button
        const buttonContent = '<span class="icon-span"><svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="copy" class="svg-inline--fa fa-copy" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="13" height="13"><path fill="currentColor" d="M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"></path></svg></span> Copy';
        const buttonStyle = 'margin-top:5px; padding:6px 8px; background:#b2bbc3; color:white; border:none; border-radius:3px; cursor:pointer; font-size:14px; transform:scale(1); transition:transform 0.2s;';
            
        const content = window.innerWidth > 768 
            ? `<strong>${count} Incidents Reported</strong><br>Zipcodes: ${zipList}<br><button onclick="copyZipcodes('${zipList}');" style="${buttonStyle}" onmouseover="this.style.background='#8e949a'; showTooltip(this, 'Copy zipcodes for Google Ads');" onmouseout="this.style.background='#b2bbc3'; hideTooltip();" onmousedown="this.style.background='#7d848a'; this.style.transform='scale(0.75)'" onmouseup="this.style.background='#b2bbc3'; this.style.transform='scale(1)'" title="Copy zipcodes for Google Ads">${buttonContent}</button>`
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