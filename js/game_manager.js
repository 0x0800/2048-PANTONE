function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

/*   this.inputManager.on("crowd", this.crowd.bind(this)); */
  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  //this.undoStack = [];

  this.setup();
  
}

// Set Captions
function caption(exp) {
  var caption = [];
  caption[2]    = 'grey';
  caption[4]    = 'turquoise';
  caption[8]    = 'brown';
  caption[16]   = 'magenta';
  caption[32]   = 'yellow';
  caption[64]   = 'cyan';
  caption[128]  = 'green';
  caption[256]  = 'orange';
  caption[512]  = 'lime';
  caption[1024] = 'navy';
  caption[2048] = 'pinky';

  return caption[exp];
}

// Set Prices
function prezzo(exp) {
  var prezzo = [];
  for (var i = 0; i < 12; i++) {
    var ele = Math.pow(2, i);
    prezzo[ele] = ele;
  }

  return prezzo[exp];
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Crowd board
GameManager.prototype.crowd = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.grid        = new Grid(this.size);
  this.score       = 0;
  this.level       = 2;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;
  this.actuate();
  var counter = 0;
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 4; j++) {
      counter++;
      var value = Math.pow(2, counter);
      var tile = new Tile({ x: j, y: i }, value);
      if (value <= 2048) this.grid.insertTile(tile);    
    }
  }
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won && !this.keepPlaying)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.level       = previousState.level;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.seed        = previousState.seed;
    this.undoStack   = previousState.undoStack;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.level       = 2;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.seed        = Math.random();
    this.undoStack   = [];

    // Add the initial tiles
    this.addStartTiles();
  }
  
  // Fill legend
  this.fillLegend();

  // Update the actuator
  this.actuate();
};

// Fill legend
GameManager.prototype.fillLegend = function () {
  
  var legend = document.getElementsByClassName("tile-legend");
  for (var i = 1; i <= 11; i++) {
    var exp = Math.pow(2, i);
    var row = document.createElement("div");
    var grid = document.createElement("div");
    var cell = document.createElement("div");
    var img = document.createElement("img");
    var p = document.createElement("p");
    row.classList.add('legend-row');    
    grid.classList.add('legend-grid');
    cell.classList.add('legend-cell');
    cell.classList.add('cell-' + exp);
    img.src = "style/img/" + exp + ".jpg";
    cell.appendChild(img);
    grid.appendChild(cell);
    row.appendChild(grid);
    p.innerHTML = caption(exp);
    row.appendChild(p);

    legend[0].appendChild(row);
  }
  
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    Math.seedrandom(this.seed);
    for (var i=0; i<this.score; i++) {
      Math.random();
    }
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }
  if (this.storageManager.getBestLevel() < this.level) {
    this.storageManager.setBestLevel(this.level);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    level:      this.level,
    over:       this.over,
    won:        this.won,
    seed:       this.seed,
    bestScore:  this.storageManager.getBestScore(),
    bestLevel:  this.storageManager.getBestLevel(),
    terminated: this.isGameTerminated(),
    undoStack:  this.undoStack
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    level:       this.level,
    over:        this.over,
    won:         this.won,
    seed:        this.seed,
    keepPlaying: this.keepPlaying,
    undoStack:   this.undoStack
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left, -1 undo
  var self = this;
  
  if (direction == -1) {
    if (this.undoStack.length > 0) {
      var prev = this.undoStack.pop();

      this.grid.build();
      this.score = prev.score;
      for (var i in prev.tiles) {
        var t = prev.tiles[i];
        var tile = new Tile({x: t.x, y: t.y}, t.value);
        tile.previousPosition = {
          x: t.previousPosition.x,
          y: t.previousPosition.y
        };
        this.grid.cells[tile.x][tile.y] = tile;
      }
      this.over = false;
      this.won = false;
      this.keepPlaying = false;
      this.actuator.continueGame();
      this.actuate();
    }
    return;
  }
  
  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var undo       = {score: this.score, tiles: []};

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          
          // We need to save tile since it will get removed
          undo.tiles.push(tile.save(positions.next));
          
          //var merged = new Tile(positions.next, prezzo[tile.value]);
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += prezzo(merged.value);
          if (merged.value > self.level) self.level = merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          
          // Save backup information
          undo.tiles.push(tile.save(positions.farthest));
          
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }
    
    // Save state
    this.undoStack.push(undo);

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
