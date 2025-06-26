// Global variables that your backend can access
var pianoAMap = [];//new Array(12).fill(null);
var pianoBMap = [];//new Array(12).fill(null);
var TET = 12;

const tetSlider = document.getElementById('tetSlider');
const tetDisplay = document.getElementById('tetDisplay');
const numbersContainer = document.getElementById('numbersContainer');

// Update TET and regenerate numbers
function updateTET() {
    TET = parseInt(tetSlider.value);
    tetDisplay.textContent = TET;
    generatePianoMaps();
    generateNumbers();
}

function generatePianoMaps() {
    pianoAMap = [];
    pianoBMap = [];
    rot = 1;
    for (let i = 0; i < 12; i++) {
        pianoAMap.push(Math.floor(TET * (i / 12.0)));
        pianoBMap.push(Math.floor(TET * ((i + rot) / 12.0)) - Math.floor(TET * rot / 12.0));
    }
    updateKeyDisplays();

    console.log("DONE LOADING PIANO MAPS");
    console.log("A: " + pianoAMap);
    console.log("B: " + pianoBMap);
}

// Generate number tokens
function generateNumbers() {
    numbersContainer.innerHTML = '';

    for (let i = 0; i < TET; i++) {
        const numberToken = document.createElement('div');
        numberToken.className = 'number-token';
        numberToken.textContent = i;
        numberToken.draggable = true;
        numberToken.dataset.number = i;

        numberToken.addEventListener('dragstart', handleDragStart);
        numberToken.addEventListener('dragend', handleDragEnd);

        numbersContainer.appendChild(numberToken);
    }
}

// Check if all keys are mapped
function checkAllKeysMapped() {
    let allMapped = true;

    document.querySelectorAll('.key').forEach(key => {
        const keyIndex = parseInt(key.dataset.index);
        const piano = key.closest('.piano').id;
        const isMapped = (piano === 'pianoA' && pianoAMap[keyIndex] !== null) ||
            (piano === 'pianoB' && pianoBMap[keyIndex] !== null);

        if (isMapped) {
            key.classList.remove('unmapped');
        } else {
            key.classList.add('unmapped');
            allMapped = false;
        }
    });

    return allMapped;
}

// Drag and drop handlers
let draggedNumber = null;

function handleDragStart(e) {
    draggedNumber = parseInt(e.target.dataset.number);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedNumber = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drop-zone');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drop-zone');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-zone');

    if (draggedNumber !== null) {
        const key = e.currentTarget;
        const keyIndex = parseInt(key.dataset.index);
        const piano = key.closest('.piano').id;

        // Assign number to this key (allow multiple keys to have same number)
        if (piano === 'pianoA') {
            pianoAMap[keyIndex] = draggedNumber;
        } else {
            pianoBMap[keyIndex] = draggedNumber;
        }

        updateKeyDisplay(key, draggedNumber);
        checkAllKeysMapped(); // Check if all keys are now mapped
    }
}

// Handle key clicks to remove mappings
function handleKeyClick(e) {
    const key = e.currentTarget;
    const keyIndex = parseInt(key.dataset.index);
    const piano = key.closest('.piano').id;

    if (piano === 'pianoA' && pianoAMap[keyIndex] !== null) {
        pianoAMap[keyIndex] = null;
        updateKeyDisplay(key, null);
        checkAllKeysMapped();
    } else if (piano === 'pianoB' && pianoBMap[keyIndex] !== null) {
        pianoBMap[keyIndex] = null;
        updateKeyDisplay(key, null);
        checkAllKeysMapped();
    }
}

function updateKeyDisplay(key, number) {
    const display = key.querySelector('.number-display');
    display.textContent = number !== null ? number : '';
}

// Initialize event listeners
function initializeEventListeners() {
    tetSlider.addEventListener('input', updateTET);

    // Add drag and drop listeners to all keys
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('dragover', handleDragOver);
        key.addEventListener('dragleave', handleDragLeave);
        key.addEventListener('drop', handleDrop);
        key.addEventListener('click', handleKeyClick);
    });
}

// Update all key displays
function updateKeyDisplays() {
    document.querySelectorAll('#pianoA .key').forEach(key => {
        const index = parseInt(key.dataset.index);
        updateKeyDisplay(key, pianoAMap[index]);
    });

    document.querySelectorAll('#pianoB .key').forEach(key => {
        const index = parseInt(key.dataset.index);
        updateKeyDisplay(key, pianoBMap[index]);
    });
}

// Initialize the interface
function initialize() {
    // You can populate these arrays with initial values from your backend
    // pianoAMap = [0,1,2,3,5,6,7,8,10,11,12,13]; // Example
    // pianoBMap = [0,1,2,3,5,6,7,8,10,11,12,13]; // Example

    updateTET();
    initializeEventListeners();

    updateKeyDisplays();

    // Check initial mapping state
    checkAllKeysMapped();
}

// Start the application
initialize();