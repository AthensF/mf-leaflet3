// Main application entry point
import { chargingStations } from './data/stations.js';
import { clusterStations, CLUSTER_CONFIG } from './modules/clustering.js';
import { createClusterMarker, createStationMarker, showStationPopup } from './modules/markers.js';
import { createStationListItem, MobilePanel, updateToggleButtons, updateZoomInfo } from './modules/ui.js';

class ChargingStationApp {
    constructor() {
        this.map = null;
        this.currentMarkers = [];
        this.selectedStation = null;
        this.forceIndividualView = false;
        this.mobilePanel = null;
        
        this.init();
    }

    init() {
        console.log('🚀 Initializing ChargePoint-style app with clustering + responsive sidebar');
        
        this.initMap();
        this.setupMobilePanel();
        this.setupEventListeners();
        this.updateMarkers();
        this.updateStationLists();
        
        setTimeout(() => {
            console.log('✅ App initialized successfully!');
            console.log('📊 Features enabled:');
            console.log(`   • Zoom-based clustering (transitions at zoom ${CLUSTER_CONFIG.minZoomForIndividual})`);
            console.log('   • Responsive sidebar (desktop) / slide-up panel (mobile)');
            console.log('   • Station selection sync between map and list');
            console.log('   • Manual clustering toggle buttons');
            console.log('   • Touch/swipe gestures for mobile panel');
            console.log('📱 Try resizing window or using mobile view to test responsiveness');
            console.log('🔍 Zoom in/out or use toggle buttons to see clustering behavior');
        }, 100);
    }

    initMap() {
        // Initialize the map
        this.map = L.map('map').setView([42.3655, -71.1018], 10);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    setupMobilePanel() {
        this.mobilePanel = new MobilePanel('mobilePanel', 'panelHandle');
    }

    setupEventListeners() {
        // Map events
        this.map.on('zoomend moveend', () => {
            this.updateMarkers();
            this.updateStationLists();
        });
        
        // View toggle buttons
        document.getElementById('desktopClusteredBtn')?.addEventListener('click', () => this.toggleViewMode(false));
        document.getElementById('desktopIndividualBtn')?.addEventListener('click', () => this.toggleViewMode(true));
        document.getElementById('mobileClusteredBtn')?.addEventListener('click', () => this.toggleViewMode(false));
        document.getElementById('mobileIndividualBtn')?.addEventListener('click', () => this.toggleViewMode(true));
        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.map.invalidateSize();
        });
    }

    selectStation(station) {
        this.selectedStation = station;
        this.updateMarkers();
        this.updateStationLists();
        
        // Show popup
        showStationPopup(station, this.map);
    }

    updateMarkers() {
        // Clear existing markers
        this.currentMarkers.forEach(marker => this.map.removeLayer(marker));
        this.currentMarkers = [];

        const currentZoom = this.map.getZoom();
        
        // Get stations within current view (optimization)
        const bounds = this.map.getBounds();
        const visibleStations = chargingStations.filter(station => 
            bounds.contains([station.lat, station.lng])
        );

        // Cluster the stations
        const clusters = clusterStations(visibleStations, currentZoom, this.forceIndividualView, this.map);
        
        // Add markers to map
        clusters.forEach(cluster => {
            let marker;
            if (cluster.type === 'individual') {
                marker = createStationMarker(cluster.station, this.selectedStation, (station) => this.selectStation(station));
            } else {
                marker = createClusterMarker(cluster, this.map, (station, action) => {
                    if (action === 'select') {
                        this.selectStation(station);
                    }
                });
            }
            
            this.currentMarkers.push(marker);
            marker.addTo(this.map);
        });

        // Update zoom info displays
        updateZoomInfo(currentZoom);
        
        console.log(`Zoom ${currentZoom}: Showing ${clusters.length} markers (${clusters.filter(c => c.type === 'cluster').length} clusters, ${clusters.filter(c => c.type === 'individual').length} individual)`);
    }

    updateStationLists() {
        const currentZoom = this.map.getZoom();
        const shouldShowClustered = !this.forceIndividualView && currentZoom < CLUSTER_CONFIG.minZoomForIndividual;
        
        let stationListHTML;
        
        if (shouldShowClustered) {
            // Get current visible bounds
            const bounds = this.map.getBounds();
            const visibleStations = chargingStations.filter(station => 
                bounds.contains([station.lat, station.lng])
            );
            
            const clusters = clusterStations(visibleStations, currentZoom, this.forceIndividualView, this.map);
            const clusterCount = clusters.filter(c => c.type === 'cluster').length;
            const individualCount = clusters.filter(c => c.type === 'individual').length;
            
            if (clusters.length === 0) {
                stationListHTML = '<div class="loading">No stations in current view</div>';
            } else {
                stationListHTML = `
                    <div style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                        Showing ${clusterCount} clusters and ${individualCount} individual stations
                    </div>
                `;
                
                clusters.forEach(cluster => {
                    if (cluster.type === 'cluster') {
                        const availableCount = cluster.stations.filter(s => s.status === 'available').length;
                        stationListHTML += `
                            <div class="station-item" style="background: #f0f8ff; border-left: 4px solid #2c5aa0;">
                                <div class="station-name">📍 ${cluster.stations.length} Stations Cluster</div>
                                <div class="station-address">${availableCount} available, ${cluster.stations.length - availableCount} occupied</div>
                                <div class="station-details">
                                    <span style="font-size: 11px; color: #718096;">Click cluster on map to zoom in</span>
                                </div>
                            </div>
                        `;
                    } else {
                        stationListHTML += createStationListItem(cluster.station, this.selectedStation);
                    }
                });
            }
        } else {
            // Show all individual stations
            stationListHTML = `
                <div style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                    Showing all ${chargingStations.length} individual stations
                </div>
            ` + chargingStations.map(station => createStationListItem(station, this.selectedStation)).join('');
        }
        
        const desktopList = document.getElementById('desktopStationList');
        const mobileList = document.getElementById('mobileStationList');
        
        if (desktopList) desktopList.innerHTML = stationListHTML;
        if (mobileList) mobileList.innerHTML = stationListHTML;
        
        // Add click listeners
        document.querySelectorAll('.station-item').forEach(item => {
            const stationId = item.dataset.stationId;
            if (stationId) {
                item.addEventListener('click', (e) => {
                    const station = chargingStations.find(s => s.id === parseInt(stationId));
                    if (station) {
                        this.selectStation(station);
                        this.map.setView([station.lat, station.lng], Math.max(this.map.getZoom(), 15));
                    }
                });
            }
        });
    }

    toggleViewMode(forceIndividual) {
        this.forceIndividualView = forceIndividual;
        updateToggleButtons(forceIndividual);
        this.updateMarkers();
        this.updateStationLists();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChargingStationApp();
});