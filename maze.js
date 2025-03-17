// Global variables
let currentLevel = 1;
let maxLevel = 10;
let playerPosition = { row: 0, col: 0 };
let exitPosition = { row: 0, col: 0 };
let mazeGrid = [];
let moveCount = 0;
let soundEnabled = true;
let gamepadConnected = false;
let gamepadIndex = null;
let portals = {};
let currentCharacter = 'normal';
let timeRemaining = 60;
let timerInterval = null;
let score = 0;
let powerups = [];
let activePowerups = {};
let unlockedCharacters = ['normal'];
let unlockedPowerups = [];

// Audio elements
const moveSound = document.getElementById('move-sound');
const portalSound = document.getElementById('portal-sound');
const winSound = document.getElementById('win-sound');
const powerupSound = document.getElementById('powerup-sound');
const backgroundMusic = document.getElementById('background-music');
const soundToggle = document.getElementById('sound-toggle');

// DOM elements
const mazeContainer = document.getElementById('maze-container');
const levelDisplay = document.getElementById('level-display');
const timeDisplay = document.getElementById('time-display');
const scoreDisplay = document.getElementById('score-display');
const characterSelect = document.getElementById('character-select');
const powerupsList = document.getElementById('powerups-list');

// Portal colors
const portalColors = ['blue', 'red', 'purple', 'orange', 'yellow'];

// Character abilities
const characterAbilities = {
    normal: {
        description: "Standard ball with no special abilities",
        moveSpeed: 1
    },
    jumper: {
        description: "Can jump over walls once every 5 moves",
        moveSpeed: 1,
        specialAbility: "jump",
        cooldown: 5
    },
    ghost: {
        description: "Can pass through walls once every 8 moves",
        moveSpeed: 1,
        specialAbility: "phase",
        cooldown: 8
    },
    speedy: {
        description: "Moves twice as fast but can't use portals as effectively",
        moveSpeed: 2,
        portalPenalty: true
    }
};

// Power-up types
const powerupTypes = {
    time: {
        name: "Time Boost",
        description: "Adds 15 seconds to the timer",
        effect: function() {
            timeRemaining += 15;
            updateTimeDisplay();
        },
        color: "#00BCD4",
        unlockLevel: 2
    },
    speed: {
        name: "Speed Boost",
        description: "Doubles movement speed for 10 seconds",
        effect: function() {
            activePowerups.speed = true;
            setTimeout(() => {
                activePowerups.speed = false;
            }, 10000);
        },
        color: "#FFEB3B",
        unlockLevel: 3
    },
    reveal: {
        name: "Portal Reveal",
        description: "Reveals all portal connections for 5 seconds",
        effect: function() {
            activePowerups.reveal = true;
            revealPortalConnections();
            setTimeout(() => {
                activePowerups.reveal = false;
                hidePortalConnections();
            }, 5000);
        },
        color: "#9C27B0",
        unlockLevel: 4
    },
    shield: {
        name: "Time Shield",
        description: "Stops the timer for 5 seconds",
        effect: function() {
            activePowerups.shield = true;
            setTimeout(() => {
                activePowerups.shield = false;
            }, 5000);
        },
        color: "#4CAF50",
        unlockLevel: 5
    }
};

// Initialize the game
window.onload = function() {
    // Set up sound toggle
    soundToggle.addEventListener('click', toggleSound);
    
    // Start background music
    playBackgroundMusic();
    
    // Set up character selection
    characterSelect.addEventListener('change', changeCharacter);
    updateCharacterSelect();
    
    // Set up gamepad detection
    window.addEventListener('gamepadconnected', connectGamepad);
    window.addEventListener('gamepaddisconnected', disconnectGamepad);
    
    // Set up keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Start the game
    startGame();
    
    // Start gamepad polling
    requestAnimationFrame(pollGamepad);
};

// Start or restart the game
function startGame() {
    // Reset move count
    moveCount = 0;
    
    // Reset time
    timeRemaining = 60 + (currentLevel * 5);
    updateTimeDisplay();
    
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Start the timer
    timerInterval = setInterval(updateTimer, 1000);
    
    // Generate maze for current level
    generateMaze(currentLevel);
    
    // Update level display
    updateLevelDisplay();
    
    // Update score display
    updateScoreDisplay();
    
    // Update powerups display
    updatePowerupsDisplay();
}

// Generate a maze based on the current level
function generateMaze(level) {
    // Clear previous maze
    mazeContainer.innerHTML = '';
    
    // Set maze size based on level (increasing difficulty)
    const size = 7 + Math.min(level, 8) * 2;
    
    // Create empty grid
    mazeGrid = [];
    for (let row = 0; row < size; row++) {
        mazeGrid[row] = [];
        for (let col = 0; col < size; col++) {
            // Default all cells to walls
            mazeGrid[row][col] = 1;
        }
    }
    
    // Generate maze using recursive backtracking
    // Start at a random position
    const startRow = Math.floor(Math.random() * Math.floor(size / 2)) * 2 + 1;
    const startCol = Math.floor(Math.random() * Math.floor(size / 2)) * 2 + 1;
    
    // Mark start position as path
    mazeGrid[startRow][startCol] = 0;
    
    // Generate paths
    generatePaths(startRow, startCol, size);
    
    // Set player position at the start
    playerPosition = { row: 1, col: 1 };
    mazeGrid[1][1] = 0; // Ensure start is a path
    
    // Set exit position at the opposite corner
    exitPosition = { row: size - 2, col: size - 2 };
    mazeGrid[exitPosition.row][exitPosition.col] = 0; // Ensure exit is a path
    
    // Reset portals
    portals = {};
    
    // Add portals based on level
    addPortals(level, size);
    
    // Add powerups based on level
    addPowerups(level, size);
    
    // Render the maze
    renderMaze();
}

// Generate maze paths using recursive backtracking
function generatePaths(row, col, size) {
    // Define possible directions: [row, col]
    const directions = [
        [-2, 0],  // Up
        [2, 0],   // Down
        [0, -2],  // Left
        [0, 2]    // Right
    ];
    
    // Shuffle directions for randomness
    shuffleArray(directions);
    
    // Try each direction
    for (let i = 0; i < directions.length; i++) {
        const newRow = row + directions[i][0];
        const newCol = col + directions[i][1];
        
        // Check if the new position is within bounds and is a wall
        if (newRow > 0 && newRow < size - 1 && newCol > 0 && newCol < size - 1 && mazeGrid[newRow][newCol] === 1) {
            // Create a path by breaking the wall between current and new position
            mazeGrid[row + directions[i][0] / 2][col + directions[i][1] / 2] = 0;
            mazeGrid[newRow][newCol] = 0;
            
            // Continue from the new position
            generatePaths(newRow, newCol, size);
        }
    }
}

// Add portals to the maze
function addPortals(level, size) {
    // Number of portal pairs increases with level
    const numPortalPairs = Math.min(2 + Math.floor(level / 2), 5);
    
    // Add regular portal pairs
    for (let i = 0; i < numPortalPairs; i++) {
        const color = portalColors[i % portalColors.length];
        
        // Create portal pair
        const portal1 = findRandomEmptyCell(size);
        let portal2;
        
        // Make sure portal2 is not too close to portal1
        do {
            portal2 = findRandomEmptyCell(size);
        } while (
            Math.abs(portal1.row - portal2.row) + Math.abs(portal1.col - portal2.col) < size / 3 ||
            (portal1.row === exitPosition.row && portal1.col === exitPosition.col) ||
            (portal2.row === exitPosition.row && portal2.col === exitPosition.col) ||
            (portal1.row === playerPosition.row && portal1.col === playerPosition.col) ||
            (portal2.row === playerPosition.row && portal2.col === playerPosition.col)
        );
        
        // Add portals to the portals object
        const portalId1 = `${portal1.row},${portal1.col}`;
        const portalId2 = `${portal2.row},${portal2.col}`;
        
        portals[portalId1] = {
            color: color,
            destination: portal2,
            type: 'regular'
        };
        
        portals[portalId2] = {
            color: color,
            destination: portal1,
            type: 'regular'
        };
    }
    
    // Add rainbow portal after level 3
    if (level >= 3) {
        const rainbowPortal = findRandomEmptyCell(size);
        const rainbowPortalId = `${rainbowPortal.row},${rainbowPortal.col}`;
        
        // Create destinations for the rainbow portal
        const destinations = {};
        portalColors.forEach(color => {
            // Find portals of this color
            for (const portalId in portals) {
                if (portals[portalId].color === color && portals[portalId].type === 'regular') {
                    destinations[color] = {
                        row: parseInt(portalId.split(',')[0]),
                        col: parseInt(portalId.split(',')[1])
                    };
                    break;
                }
            }
        });
        
        portals[rainbowPortalId] = {
            color: 'rainbow',
            destinations: destinations,
            type: 'rainbow'
        };
    }
}

// Add powerups to the maze
function addPowerups(level, size) {
    // Reset powerups
    powerups = [];
    
    // Add powerups based on level
    const availablePowerups = Object.keys(powerupTypes).filter(type => 
        powerupTypes[type].unlockLevel <= level && unlockedPowerups.includes(type)
    );
    
    if (availablePowerups.length > 0) {
        // Add 1-3 powerups depending on level
        const numPowerups = Math.min(Math.floor(level / 2), 3);
        
        for (let i = 0; i < numPowerups; i++) {
            const type = availablePowerups[Math.floor(Math.random() * availablePowerups.length)];
            const position = findRandomEmptyCell(size);
            
            // Make sure it's not on a portal, exit, or player
            const posId = `${position.row},${position.col}`;
            if (portals[posId] || 
                (position.row === exitPosition.row && position.col === exitPosition.col) ||
                (position.row === playerPosition.row && position.col === playerPosition.col)) {
                continue;
            }
            
            powerups.push({
                type: type,
                position: position
            });
        }
    }
    
    // Check for unlockable powerups
    for (const type in powerupTypes) {
        if (powerupTypes[type].unlockLevel === level && !unlockedPowerups.includes(type)) {
            unlockedPowerups.push(type);
        }
    }
}

// Find a random empty cell in the maze
function findRandomEmptyCell(size) {
    let row, col;
    do {
        row = Math.floor(Math.random() * (size - 2)) + 1;
        col = Math.floor(Math.random() * (size - 2)) + 1;
    } while (
        mazeGrid[row][col] !== 0 || 
        (row === playerPosition.row && col === playerPosition.col) ||
        (row === exitPosition.row && col === exitPosition.col) ||
        portals[`${row},${col}`] !== undefined ||
        powerups.some(p => p.position.row === row && p.position.col === col)
    );
    
    return { row, col };
}

// Render the maze on the screen
function renderMaze() {
    // Clear previous maze
    mazeContainer.innerHTML = '';
    
    // Set grid size
    mazeContainer.style.gridTemplateRows = `repeat(${mazeGrid.length}, 40px)`;
    mazeContainer.style.gridTemplateColumns = `repeat(${mazeGrid[0].length}, 40px)`;
    
    // Create cells
    for (let row = 0; row < mazeGrid.length; row++) {
        for (let col = 0; col < mazeGrid[row].length; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // Add appropriate class based on cell type
            if (mazeGrid[row][col] === 1) {
                cell.classList.add('wall');
            } else {
                cell.classList.add('path');
            }
            
            // Add to maze container
            mazeContainer.appendChild(cell);
        }
    }
    
    // Add portals
    for (const portalId in portals) {
        const [row, col] = portalId.split(',').map(Number);
        const portalInfo = portals[portalId];
        
        const portalIndex = row * mazeGrid[0].length + col;
        const portalCell = mazeContainer.children[portalIndex];
        
        const portalElement = document.createElement('div');
        portalElement.className = `portal portal-${portalInfo.color}`;
        portalCell.appendChild(portalElement);
    }
    
    // Add powerups
    for (const powerup of powerups) {
        const { row, col, type } = powerup.position.row !== undefined ? 
            { row: powerup.position.row, col: powerup.position.col, type: powerup.type } : 
            { row: powerup.row, col: powerup.col, type: powerup.type };
        
        const powerupIndex = row * mazeGrid[0].length + col;
        const powerupCell = mazeContainer.children[powerupIndex];
        
        const powerupElement = document.createElement('div');
        powerupElement.className = `powerup powerup-${type}`;
        powerupCell.appendChild(powerupElement);
    }
    
    // Add exit portal
    const exitIndex = exitPosition.row * mazeGrid[0].length + exitPosition.col;
    const exitCell = mazeContainer.children[exitIndex];
    
    const exitElement = document.createElement('div');
    exitElement.className = 'portal exit-portal';
    exitCell.appendChild(exitElement);
    
    // Add player
    addPlayer();
}

// Add player to the maze
function addPlayer() {
    const playerIndex = playerPosition.row * mazeGrid[0].length + playerPosition.col;
    const playerCell = mazeContainer.children[playerIndex];
    
    const playerElement = document.createElement('div');
    playerElement.className = `player ${currentCharacter}`;
    playerCell.appendChild(playerElement);
}

// Handle keyboard input
function handleKeyPress(event) {
    // Get current player position
    let newRow = playerPosition.row;
    let newCol = playerPosition.col;
    
    // Determine new position based on key pressed
    switch(event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            newRow--;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            newRow++;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            newCol--;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            newCol++;
            break;
        case ' ':
            // Space bar activates special ability
            useSpecialAbility();
            return;
        default:
            return; // Ignore other keys
    }
    
    // Try to move player
    movePlayer(newRow, newCol);
}

// Use character's special ability
function useSpecialAbility() {
    const ability = characterAbilities[currentCharacter].specialAbility;
    
    if (!ability) return; // No special ability for this character
    
    // Check if ability is on cooldown
    const cooldown = characterAbilities[currentCharacter].cooldown;
    if (moveCount % cooldown !== 0) return;
    
    switch(ability) {
        case 'jump':
            // Show jump target selector
            showJumpTargetSelector();
            break;
        case 'phase':
            // Enable phasing through walls for the next move
            activePowerups.phasing = true;
            // Visual feedback
            const playerElement = document.querySelector('.player');
            playerElement.style.opacity = '0.5';
            setTimeout(() => {
                playerElement.style.opacity = '1';
                activePowerups.phasing = false;
            }, 3000);
            break;
    }
}

// Show jump target selector
function showJumpTargetSelector() {
    // Highlight cells within jump range (2 cells)
    const directions = [
        [-2, 0], // Up
        [2, 0],  // Down
        [0, -2], // Left
        [0, 2]   // Right
    ];
    
    // Add click event to cells within jump range
    for (const dir of directions) {
        const targetRow = playerPosition.row + dir[0];
        const targetCol = playerPosition.col + dir[1];
        
        // Check if target is within bounds and is a path
        if (targetRow >= 0 && targetRow < mazeGrid.length &&
            targetCol >= 0 && targetCol < mazeGrid[0].length &&
            mazeGrid[targetRow][targetCol] === 0) {
            
            const targetIndex = targetRow * mazeGrid[0].length + targetCol;
            const targetCell = mazeContainer.children[targetIndex];
            
            // Highlight the cell
            targetCell.style.boxShadow = 'inset 0 0 10px #2196F3';
            targetCell.style.cursor = 'pointer';
            
            // Add click event
            targetCell.addEventListener('click', function jumpHandler() {
                // Remove highlights and event listeners
                removeJumpHighlights();
                
                // Jump to the target
                movePlayer(targetRow, targetCol, true);
                
                // Remove this event listener
                targetCell.removeEventListener('click', jumpHandler);
            });
        }
    }
    
    // Add cancel option on right click
    document.addEventListener('contextmenu', cancelJump);
}

// Remove jump highlights
function removeJumpHighlights() {
    const cells = mazeContainer.children;
    for (let i = 0; i < cells.length; i++) {
        cells[i].style.boxShadow = '';
        cells[i].style.cursor = '';
    }
    
    // Remove cancel option
    document.removeEventListener('contextmenu', cancelJump);
}

// Cancel jump
function cancelJump(event) {
    event.preventDefault();
    removeJumpHighlights();
}

// Handle gamepad connection
function connectGamepad(event) {
    gamepadConnected = true;
    gamepadIndex = event.gamepad.index;
    console.log("Gamepad connected:", event.gamepad.id);
}

// Handle gamepad disconnection
function disconnectGamepad(event) {
    if (event.gamepad.index === gamepadIndex) {
        gamepadConnected = false;
        gamepadIndex = null;
        console.log("Gamepad disconnected");
    }
}

// Poll gamepad for input
function pollGamepad() {
    if (gamepadConnected) {
        const gamepad = navigator.getGamepads()[gamepadIndex];
        if (gamepad) {
            // Check d-pad or left analog stick
            let newRow = playerPosition.row;
            let newCol = playerPosition.col;
            let moved = false;
            
            // D-pad
            if (gamepad.buttons[12].pressed) { // Up
                newRow--;
                moved = true;
            } else if (gamepad.buttons[13].pressed) { // Down
                newRow++;
                moved = true;
            } else if (gamepad.buttons[14].pressed) { // Left
                newCol--;
                moved = true;
            } else if (gamepad.buttons[15].pressed) { // Right
                newCol++;
                moved = true;
            }
            
            // Left analog stick (with deadzone)
            const deadzone = 0.5;
            if (!moved) {
                if (gamepad.axes[1] < -deadzone) { // Up
                    newRow--;
                    moved = true;
                } else if (gamepad.axes[1] > deadzone) { // Down
                    newRow++;
                    moved = true;
                } else if (gamepad.axes[0] < -deadzone) { // Left
                    newCol--;
                    moved = true;
                } else if (gamepad.axes[0] > deadzone) { // Right
                    newCol++;
                    moved = true;
                }
            }
            
            // Special ability button (A button)
            if (gamepad.buttons[0].pressed) {
                useSpecialAbility();
            }
            
            // Only move if position changed
            if (moved && (newRow !== playerPosition.row || newCol !== playerPosition.col)) {
                movePlayer(newRow, newCol);
                
                // Add a small delay to prevent too rapid movement
                setTimeout(() => {
                    requestAnimationFrame(pollGamepad);
                }, 200);
                return;
            }
        }
    }
    
    // Continue polling
    requestAnimationFrame(pollGamepad);
}

// Move player to new position if valid
function movePlayer(newRow, newCol, isJumping = false) {
    // Check if the new position is valid
    const isValidMove = isJumping || activePowerups.phasing || (
        newRow >= 0 && newRow < mazeGrid.length && 
        newCol >= 0 && newCol < mazeGrid[0].length && 
        mazeGrid[newRow][newCol] === 0
    );
    
    if (isValidMove) {
        // Remove player from current position
        const currentIndex = playerPosition.row * mazeGrid[0].length + playerPosition.col;
        const currentCell = mazeContainer.children[currentIndex];
        const playerElement = currentCell.querySelector('.player');
        currentCell.removeChild(playerElement);
        
        // Update player position
        playerPosition.row = newRow;
        playerPosition.col = newCol;
        
        // Add player to new position
        const newIndex = playerPosition.row * mazeGrid[0].length + playerPosition.col;
        const newCell = mazeContainer.children[newIndex];
        const newPlayerElement = document.createElement('div');
        newPlayerElement.className = `player ${currentCharacter}`;
        newCell.appendChild(newPlayerElement);
        
        // Add jumping animation
        newPlayerElement.classList.add('jumping');
        setTimeout(() => {
            newPlayerElement.classList.remove('jumping');
        }, 200);
        
        // Play move sound
        playMoveSound();
        
        // Increment move count
        moveCount++;
        
        // Check for powerups
        checkForPowerup();
        
        // Check if player is on a portal
        const portalId = `${newRow},${newCol}`;
        if (portals[portalId]) {
            // Play portal sound
            playPortalSound();
            
            // Handle portal based on type
            if (portals[portalId].type === 'regular') {
                // Regular portal - transport to destination
                setTimeout(() => {
                    transportPlayer(portals[portalId].destination);
                }, 300);
            } else if (portals[portalId].type === 'rainbow') {
                // Rainbow portal - show selection UI
                setTimeout(() => {
                    showPortalSelection(portals[portalId].destinations);
                }, 300);
            }
        }
        
        // Check if player reached the exit
        checkWinCondition();
    }
}

// Check if player has collected a powerup
function checkForPowerup() {
    for (let i = 0; i < powerups.length; i++) {
        if (powerups[i].position.row === playerPosition.row && 
            powerups[i].position.col === playerPosition.col) {
            
            // Play powerup sound
            playPowerupSound();
            
            // Apply powerup effect
            const powerupType = powerups[i].type;
            powerupTypes[powerupType].effect();
            
            // Remove powerup from the board
            const powerupIndex = playerPosition.row * mazeGrid[0].length + playerPosition.col;
            const powerupElement = mazeContainer.children[powerupIndex].querySelector('.powerup');
            if (powerupElement) {
                powerupElement.parentNode.removeChild(powerupElement);
            }
            
            // Remove from powerups array
            powerups.splice(i, 1);
            
            // Add points
            score += 50;
            updateScoreDisplay();
            
            break;
        }
    }
}

// Transport player to destination
function transportPlayer(destination) {
    // Remove player from current position
    const currentIndex = playerPosition.row * mazeGrid[0].length + playerPosition.col;
    const currentCell = mazeContainer.children[currentIndex];
    const playerElement = currentCell.querySelector('.player');
    currentCell.removeChild(playerElement);
    
    // Update player position
    playerPosition.row = destination.row;
    playerPosition.col = destination.col;
    
    // Add player to new position
    const newIndex = playerPosition.row * mazeGrid[0].length + playerPosition.col;
    const newCell = mazeContainer.children[newIndex];
    const newPlayerElement = document.createElement('div');
    newPlayerElement.className = `player ${currentCharacter}`;
    newCell.appendChild(newPlayerElement);
    
    // Add special portal animation
    newPlayerElement.style.transform = 'scale(0)';
    setTimeout(() => {
        newPlayerElement.style.transform = 'scale(1)';
    }, 100);
    
    // Check if player reached the exit after transport
    checkWinCondition();
}

// Show portal selection UI for rainbow portal
function showPortalSelection(destinations) {
    // Create portal selection overlay
    const selectionOverlay = document.createElement('div');
    selectionOverlay.className = 'portal-selection';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Select a Portal';
    selectionOverlay.appendChild(title);
    
    // Add portal options
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'portal-options';
    
    for (const color in destinations) {
        const option = document.createElement('div');
        option.className = `portal-option portal-${color}`;
        option.addEventListener('click', () => {
            // Remove overlay
            document.body.removeChild(selectionOverlay);
            
            // Transport to selected portal
            transportPlayer(destinations[color]);
        });
        optionsContainer.appendChild(option);
    }
    
    selectionOverlay.appendChild(optionsContainer);
    document.body.appendChild(selectionOverlay);
}

// Reveal portal connections
function revealPortalConnections() {
    for (const portalId in portals) {
        if (portals[portalId].type === 'regular') {
            const [row, col] = portalId.split(',').map(Number);
            const portalIndex = row * mazeGrid[0].length + col;
            const portalElement = mazeContainer.children[portalIndex].querySelector('.portal');
            
            // Add connection indicator
            const destination = portals[portalId].destination;
            const destIndex = destination.row * mazeGrid[0].length + destination.col;
            const destElement = mazeContainer.children[destIndex].querySelector('.portal');
            
            portalElement.style.border = '3px solid white';
            destElement.style.border = '3px solid white';
        }
    }
}

// Hide portal connections
function hidePortalConnections() {
    const portalElements = document.querySelectorAll('.portal');
    portalElements.forEach(element => {
        element.style.border = '';
    });
}

// Check if player has reached the exit
function checkWinCondition() {
    if (playerPosition.row === exitPosition.row && playerPosition.col === exitPosition.col) {
        // Stop the timer
        clearInterval(timerInterval);
        
        // Play win sound
        playWinSound();
        
        // Calculate score bonus based on time and level
        const timeBonus = timeRemaining * 5;
        const levelBonus = currentLevel * 100;
        const totalBonus = timeBonus + levelBonus;
        score += totalBonus;
        
        // Show level complete message
        showLevelComplete(totalBonus);
    }
}

// Show level complete message
function showLevelComplete(bonus) {
    const levelComplete = document.createElement('div');
    levelComplete.className = 'level-complete';
    
    const message = document.createElement('h2');
    message.textContent = `Level ${currentLevel} Complete!`;
    levelComplete.appendChild(message);
    
    const timeInfo = document.createElement('p');
    timeInfo.textContent = `Time Remaining: ${timeRemaining} seconds`;
    levelComplete.appendChild(timeInfo);
    
    const movesInfo = document.createElement('p');
    movesInfo.textContent = `Moves: ${moveCount}`;
    levelComplete.appendChild(movesInfo);
    
    const bonusInfo = document.createElement('p');
    bonusInfo.textContent = `Bonus: ${bonus} points`;
    levelComplete.appendChild(bonusInfo);
    
    const scoreInfo = document.createElement('p');
    scoreInfo.textContent = `Total Score: ${score}`;
    levelComplete.appendChild(scoreInfo);
    
    // Check for unlockable characters
    if (currentLevel === 2 && !unlockedCharacters.includes('jumper')) {
        unlockedCharacters.push('jumper');
        const unlockInfo = document.createElement('p');
        unlockInfo.textContent = `🎉 Unlocked: Jumper Ball Character!`;
        unlockInfo.style.color = '#2196F3';
        levelComplete.appendChild(unlockInfo);
    } else if (currentLevel === 4 && !unlockedCharacters.includes('ghost')) {
        unlockedCharacters.push('ghost');
        const unlockInfo = document.createElement('p');
        unlockInfo.textContent = `🎉 Unlocked: Ghost Ball Character!`;
        unlockInfo.style.color = '#9C27B0';
        levelComplete.appendChild(unlockInfo);
    } else if (currentLevel === 6 && !unlockedCharacters.includes('speedy')) {
        unlockedCharacters.push('speedy');
        const unlockInfo = document.createElement('p');
        unlockInfo.textContent = `🎉 Unlocked: Speedy Ball Character!`;
        unlockInfo.style.color = '#FFEB3B';
        levelComplete.appendChild(unlockInfo);
    }
    
    // Check for unlockable powerups
    for (const type in powerupTypes) {
        if (powerupTypes[type].unlockLevel === currentLevel && !unlockedPowerups.includes(type)) {
            unlockedPowerups.push(type);
            const unlockInfo = document.createElement('p');
            unlockInfo.textContent = `🎉 Unlocked: ${powerupTypes[type].name} Power-up!`;
            unlockInfo.style.color = powerupTypes[type].color;
            levelComplete.appendChild(unlockInfo);
        }
    }
    
    const nextButton = document.createElement('button');
    
    // Check if this is the final level
    if (currentLevel >= maxLevel) {
        nextButton.textContent = 'Play Again';
        nextButton.onclick = function() {
            // Reset to level 1
            currentLevel = 1;
            document.body.removeChild(levelComplete);
            startGame();
        };
    } else {
        nextButton.textContent = 'Next Level';
        nextButton.onclick = function() {
            // Advance to next level
            currentLevel++;
            document.body.removeChild(levelComplete);
            startGame();
        };
    }
    
    levelComplete.appendChild(nextButton);
    document.body.appendChild(levelComplete);
    
    // Update character select after unlocking new characters
    updateCharacterSelect();
}

// Update level display
function updateLevelDisplay() {
    levelDisplay.textContent = `Level: ${currentLevel}`;
}

// Update time display
function updateTimeDisplay() {
    timeDisplay.textContent = `Time: ${timeRemaining}s`;
    
    // Add warning class if time is low
    if (timeRemaining <= 10) {
        timeDisplay.classList.add('time-warning');
    } else {
        timeDisplay.classList.remove('time-warning');
    }
}

// Update score display
function updateScoreDisplay() {
    scoreDisplay.textContent = `Score: ${score}`;
}

// Update timer
function updateTimer() {
    // Don't decrease time if time shield is active
    if (activePowerups.shield) return;
    
    if (timeRemaining > 0) {
        timeRemaining--;
        updateTimeDisplay();
    } else {
        // Time's up - game over
        clearInterval(timerInterval);
        showGameOver();
    }
}

// Show game over screen
function showGameOver() {
    const gameOver = document.createElement('div');
    gameOver.className = 'level-complete';
    
    const message = document.createElement('h2');
    message.textContent = 'Game Over - Time's Up!';
    message.style.color = '#F44336';
    gameOver.appendChild(message);
    
    const scoreInfo = document.createElement('p');
    scoreInfo.textContent = `Final Score: ${score}`;
    gameOver.appendChild(scoreInfo);
    
    const levelInfo = document.createElement('p');
    levelInfo.textContent = `You reached level ${currentLevel}`;
    gameOver.appendChild(levelInfo);
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Try Again';
    restartButton.onclick = function() {
        // Reset score
        score = 0;
        
        // Reset to current level
        document.body.removeChild(gameOver);
        startGame();
    };
    
    gameOver.appendChild(restartButton);
    document.body.appendChild(gameOver);
}

// Update character select dropdown
function updateCharacterSelect() {
    // Clear existing options
    characterSelect.innerHTML = '';
    
    // Add options for unlocked characters
    for (const character of unlockedCharacters) {
        const option = document.createElement('option');
        option.value = character;
        option.textContent = character.charAt(0).toUpperCase() + character.slice(1) + ' Ball';
        if (character === currentCharacter) {
            option.selected = true;
        }
        characterSelect.appendChild(option);
    }
}

// Change character
function changeCharacter() {
    currentCharacter = characterSelect.value;
    
    // Update player appearance
    const playerElement = document.querySelector('.player');
    if (playerElement) {
        playerElement.className = `player ${currentCharacter}`;
    }
}

// Update powerups display
function updatePowerupsDisplay() {
    // Clear existing powerups
    powerupsList.innerHTML = '';
    
    // Add unlocked powerups
    for (const type of unlockedPowerups) {
        const powerupItem = document.createElement('div');
        powerupItem.className = 'powerup-item';
        powerupItem.style.backgroundColor = powerupTypes[type].color;
        powerupItem.title = powerupTypes[type].name + ': ' + powerupTypes[type].description;
        
        // Add click handler for manual activation (future feature)
        powerupItem.addEventListener('click', () => {
            // Could implement manual powerup activation here
        });
        
        powerupsList.appendChild(powerupItem);
    }
}

// Play move sound
function playMoveSound() {
    if (soundEnabled) {
        moveSound.currentTime = 0;
        moveSound.play();
    }
}

// Play portal sound
function playPortalSound() {
    if (soundEnabled) {
        portalSound.currentTime = 0;
        portalSound.play();
    }
}

// Play win sound
function playWinSound() {
    if (soundEnabled) {
        winSound.currentTime = 0;
        winSound.play();
    }
}

// Play powerup sound
function playPowerupSound() {
    if (soundEnabled) {
        powerupSound.currentTime = 0;
        powerupSound.play();
    }
}

// Play background music
function playBackgroundMusic() {
    if (soundEnabled) {
        backgroundMusic.volume = 0.3;
        backgroundMusic.play();
    } else {
        backgroundMusic.pause();
    }
}

// Toggle sound on/off
function toggleSound() {
    soundEnabled = !soundEnabled;
    
    if (soundEnabled) {
        soundToggle.textContent = '🔊 Sound: ON';
        playBackgroundMusic();
    } else {
        soundToggle.textContent = '🔇 Sound: OFF';
        backgroundMusic.pause();
    }
}

// Utility function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Initialize unlocked powerups with the first one
if (unlockedPowerups.length === 0) {
    unlockedPowerups.push('time');
}
