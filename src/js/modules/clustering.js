// Clustering configuration and algorithms

export const CLUSTER_CONFIG = {
    minZoomForIndividual: 13,
    clusterRadius: 80,
    maxClusterSize: 50
};

// Distance calculation functions
export function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng1-lng2) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

export function getPixelDistance(map, lat1, lng1, lat2, lng2) {
    const point1 = map.latLngToLayerPoint([lat1, lng1]);
    const point2 = map.latLngToLayerPoint([lat2, lng2]);
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

// Main clustering algorithm
export function clusterStations(stations, zoom, forceIndividualView, map) {
    // Force individual view or high zoom level
    if (forceIndividualView || zoom >= CLUSTER_CONFIG.minZoomForIndividual) {
        return stations.map(station => ({
            type: 'individual',
            station: station,
            lat: station.lat,
            lng: station.lng
        }));
    }

    const clusters = [];
    const processed = new Set();

    stations.forEach((station, index) => {
        if (processed.has(index)) return;

        const cluster = {
            type: 'cluster',
            stations: [station],
            lat: station.lat,
            lng: station.lng,
            bounds: {
                minLat: station.lat,
                maxLat: station.lat,
                minLng: station.lng,
                maxLng: station.lng
            }
        };

        // Find nearby stations to cluster
        stations.forEach((otherStation, otherIndex) => {
            if (otherIndex === index || processed.has(otherIndex)) return;

            const pixelDistance = getPixelDistance(
                map,
                station.lat, station.lng,
                otherStation.lat, otherStation.lng
            );

            if (pixelDistance <= CLUSTER_CONFIG.clusterRadius && 
                cluster.stations.length < CLUSTER_CONFIG.maxClusterSize) {
                
                cluster.stations.push(otherStation);
                processed.add(otherIndex);
                
                // Update cluster bounds
                cluster.bounds.minLat = Math.min(cluster.bounds.minLat, otherStation.lat);
                cluster.bounds.maxLat = Math.max(cluster.bounds.maxLat, otherStation.lat);
                cluster.bounds.minLng = Math.min(cluster.bounds.minLng, otherStation.lng);
                cluster.bounds.maxLng = Math.max(cluster.bounds.maxLng, otherStation.lng);
            }
        });

        // Calculate cluster center (centroid)
        if (cluster.stations.length > 1) {
            const totalLat = cluster.stations.reduce((sum, s) => sum + s.lat, 0);
            const totalLng = cluster.stations.reduce((sum, s) => sum + s.lng, 0);
            cluster.lat = totalLat / cluster.stations.length;
            cluster.lng = totalLng / cluster.stations.length;
        }

        clusters.push(cluster);
        processed.add(index);
    });

    return clusters;
}