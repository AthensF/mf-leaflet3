// UI management and mobile panel functionality

// Create station list item HTML
export function createStationListItem(station, selectedStation) {
    const isSelected = selectedStation && selectedStation.id === station.id;
    const selectedClass = isSelected ? 'selected' : '';
    const isComplaint = station._meta && station._meta.type && station._meta.date;

    if (isComplaint) {
        const dateText = new Date(station._meta.date).toLocaleString();
        return `
            <div class="station-item ${selectedClass}" data-station-id="${station.id}">
                <div class="station-name">${station.name}</div>
                <div class="station-address">${station.address}</div>
                <div class="station-details">
                    <span class="station-type ${station._meta.type.toLowerCase().replace(/\s+/g, '-')}">${station._meta.type}</span>
                    <span class="station-distance">Date: ${dateText}</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="station-item ${selectedClass}" data-station-id="${station.id}">
            <div class="station-name">${station.name}</div>
            <div class="station-address">${station.address}</div>
            <div class="station-details">
                <span class="station-type ${station.type === 'Level 2' ? 'level2' : ''}">${station.type}</span>
                <span class="station-distance">${station.distance}</span>
            </div>
            <div class="station-status">
                <span class="status-${station.status}">
                    ${station.availablePorts}/${station.ports} ports ${station.status}
                </span>
            </div>
        </div>
    `;
}

// Mobile panel management
export class MobilePanel {
    constructor(panelId, handleId) {
        this.panel = document.getElementById(panelId);
        this.handle = document.getElementById(handleId);
        this.isExpanded = false;
        this.isDragging = false;
        this.startY = 0;
        this.currentY = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Touch events
        this.handle.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Mouse events for desktop testing
        this.handle.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Tap to toggle panel
        this.handle.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.toggle();
            }
        });
    }

    handleTouchStart(e) {
        this.startY = e.touches[0].clientY;
        this.isDragging = true;
        this.handle.style.cursor = 'grabbing';
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.currentY = e.touches[0].clientY;
        this.updatePanelPosition();
    }

    handleTouchEnd(e) {
        if (!this.isDragging) return;
        this.finalizeDrag();
    }

    handleMouseDown(e) {
        this.startY = e.clientY;
        this.isDragging = true;
        this.handle.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.currentY = e.clientY;
        this.updatePanelPosition();
    }

    handleMouseUp(e) {
        if (!this.isDragging) return;
        this.finalizeDrag();
    }

    updatePanelPosition() {
        const deltaY = this.currentY - this.startY;
        
        if (this.isExpanded) {
            if (deltaY > 0) {
                const translateY = Math.min(deltaY, window.innerHeight * 0.8 - 120);
                this.panel.style.transform = `translateY(${translateY}px)`;
            }
        } else {
            if (deltaY < 0) {
                const translateY = Math.max(window.innerHeight * 0.8 - 120 + deltaY, 0);
                this.panel.style.transform = `translateY(${translateY}px)`;
            }
        }
    }

    finalizeDrag() {
        this.isDragging = false;
        this.handle.style.cursor = 'grab';
        
        const deltaY = this.currentY - this.startY;
        const threshold = 50;
        
        if (Math.abs(deltaY) > threshold) {
            if (this.isExpanded && deltaY > 0) {
                this.collapse();
            } else if (!this.isExpanded && deltaY < 0) {
                this.expand();
            }
        }
        
        this.panel.style.transform = '';
    }

    expand() {
        this.isExpanded = true;
        this.panel.classList.add('expanded');
    }

    collapse() {
        this.isExpanded = false;
        this.panel.classList.remove('expanded');
    }

    toggle() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }
}

// Update button states
export function updateToggleButtons(forceIndividualView) {
    const buttons = [
        { clustered: 'desktopClusteredBtn', individual: 'desktopIndividualBtn' },
        { clustered: 'mobileClusteredBtn', individual: 'mobileIndividualBtn' }
    ];

    buttons.forEach(({ clustered, individual }) => {
        const clusteredBtn = document.getElementById(clustered);
        const individualBtn = document.getElementById(individual);
        
        if (forceIndividualView) {
            clusteredBtn?.classList.remove('active');
            individualBtn?.classList.add('active');
        } else {
            clusteredBtn?.classList.add('active');
            individualBtn?.classList.remove('active');
        }
    });
}

// Update zoom info displays
export function updateZoomInfo(zoom) {
    const zoomText = `Zoom: ${zoom}`;
    const elements = ['desktopZoomInfo', 'mapZoomInfo'];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = zoomText;
    });
}