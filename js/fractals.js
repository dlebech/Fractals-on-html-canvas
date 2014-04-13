/**
 * Fractals for html canvas.
 * Copyright 2014 David Volquartz Lebech
 * Licensed under MIT.
 */

window.requestAnimationFrame = 
    window.requestAnimationFrame || 
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

var SimulationType = {
    Random: { name: 'Random particles', useBounds: false },
    RandomBound: { name: 'Random bound particles', useBounds: true },
    DeterminedBound: { name: 'Determined bound particles', useBounds: true }
}

// Width and height of canvas
var cwidth = 400;
var cheight = 400;
var pxPoints = cwidth * cheight;

// Directions of a particle [right,left, up, down]
var directions = [1, -1, -cwidth, cwidth]; 
var ctx = null;        // The drawing context
var thegrid = null;    // The grid... a digital frontier :-)
var particles = null;  // Particle array.
var inactiveParticles = null; // Inactive particles. For convenience.
var targetActiveParticles = 20; // Target number of active particles.
var maxActiveParticles = 200;   // Maximum number of active particles.
var maxParticles = 10000;       // Maximum number of particles
var bounds = null;   // Bounds of the fractal
var boundWidth = 10; // The width of the bounds of the fractal.

// Simulation type, random is default.
var simulationType = SimulationType.RandomBound;

// Controls
var running = false;
var lastTimestamp = null;
var stepsPerSecond = 100;

// Initializes the canvas element with some particles.
function init() {
	var canvas = document.getElementById('fractal-canvas');
	if (canvas.getContext) {
		ctx = canvas.getContext('2d');
		running = false;

		// Initialize an empty grid and particle array.
		thegrid = [];
		for (var i = 0; i < pxPoints; i++)
			thegrid[i] = null;
		particles = [];
        inactiveParticles = [];

		// Create an initial, immobile particle in the center.
		createParticle(false, Math.round(thegrid.length/2 + cwidth/2));

        // Determine the starting number of active particles.
        // For simulations using bounds, this number is quite low but is
        // dynamically altered. For simulations without bounds, a much larger
        // number is used because the number is not dynamic.
        if (simulationType.useBounds) {
            targetActiveParticles = 20;
            maxActiveParticles = 500;
        }
        else {
            targetActiveParticles = 1000;
            maxActiveParticles = 1000;
        }
	}
}

// Runs a single simulation step.
function simulationStep(timestamp) {
    if (running) {
        if (lastTimestamp == null)
            lastTimestamp = timestamp;

        // Determine how many times to move the particles based on the elapsed
        // time (which is in milliseconds).
        var elapsedCycles = Math.ceil((timestamp - lastTimestamp) / 1000 * stepsPerSecond);

    	for (var i = 0; i < elapsedCycles; i++) {
            if (simulationType.useBounds)
                bounds = findBounds();
            spawnParticles();
    		moveParticles();
    	}
        drawParticles();

        lastTimestamp = timestamp;

        requestAnimationFrame(simulationStep);
    }
}

/**
 * Reset the simulation
 */
function resetSim() {
    init();
}

/**
 * Starts the simulation
 */
function startSim() {
	running = true;
    requestAnimationFrame(simulationStep);
}

function pauseSim() {
    running = false;
}


/**
 * Draws all objects on the canvas.
 */
function drawParticles() {
	// Clear the drawing area
	ctx.clearRect(0, 0, cwidth, cheight);

	// Fill with white background
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, cwidth, cheight);

	// Draw all particles as single pixels.
	var imgData = ctx.createImageData(cwidth, cheight);
	for (var i = 0; i < particles.length; i++) {
		particles[i].draw(imgData.data);
	}
    ctx.putImageData(imgData, 0, 0);
}

/**
 * Moves every particle
 */
function moveParticles() {
	// Let the particles walk around 
	for (var i = 0; i < particles.length; i++) {
		particles[i].move();
	}
}

function spawnParticles() {
    // If the simulation type uses bounds, dynamically increase (or decrease)
    // the target number of particles to create.
    if (simulationType.useBounds && targetActiveParticles < maxActiveParticles) {
        boundsArea = (bounds[1]-bounds[0]) * (bounds[3]-bounds[2]);
        targetActiveParticles = Math.round(boundsArea/20);
    }

    // Create active particles if the limit has not been reached
    // Notice that createParticle is not one hundred percent certain to create
    // a particle. That's ok though. We are in no rush to create particles.
    var activeParticles = particles.length - inactiveParticles.length;
	for (var i = 0; i < targetActiveParticles-activeParticles; i++) {
        createParticle(true);
    }
}

/**
 * Returns two dimensional coordinates,
 * based on a one-dimensional position.
 */
function posToCoor(pos)
{
	x = pos % cwidth;
	y = Math.floor(pos / cheight);
	return [x,y];
}

/**
 * Return single dimensional position,
 * based on a two-dimensional coordinate
 */
function coorToPos(x, y) {
    return y * cwidth + x;
}

/**
 * Represents a single, small particle.
 * The color is an array consisting of four values for
 * red, green, blue and alpha, e.g. [0,120,255,255]
 */
function Particle(pos, color, direction) {
	this.pos = pos;
	this.color = color;
	this.active = true;
    this.hasMoved = false;
    this.direction = direction;

	/**
	 * Draws the particle. It's just a point on the grid.
	 */
	this.draw = function(data) {
        var byteOffset = this.pos*4;
		for (var i = 0; i < this.color.length; i++) {
			data[byteOffset+i] = this.color[i];
		}
	}

    this.changePos = function(newPos) {
		if (checkPos(this.pos, newPos) && !thegrid[newPos]) {
			thegrid[newPos] = this;
			thegrid[this.pos] = null;
			this.pos = newPos;
			this.hasMoved = true;
		}
    }

	/**
	 * Moves the particle one step.
	 */
	this.move = function() {
		// Only move if the particle is active
		if (this.active)
		{
			// First check if the particle can settle down
			this.settleDown();
	
			// If the particle is still active, move it
			if (this.active)
			{
				this.hasMoved = false;
				var triesLeft = 2; // Ensure we do not get stuck in the loop :-)
	
				while (!this.hasMoved && triesLeft > 0)
				{
                    var dirIndex = this.direction || Math.floor(Math.random() * directions.length);
					var newPos = this.pos + directions[dirIndex];
                    this.changePos(newPos);
					triesLeft--;
				}

                // Perform special checks for fractals with bounds.
                if (simulationType.useBounds) {
                    // If the particle moved, make sure it is within the bounds
                    // If it is not, reassign to a new location.
                    // Reassignment is done instead of removing and adding a new particle
                    // For the user, it will look the same.
                    if (this.hasMoved) {
                        var coor = posToCoor(this.pos);
                        if (coor[0] < bounds[0] ||
                            coor[0] > bounds[1] ||
                            coor[1] < bounds[2] ||
                            coor[1] > bounds[3]) {
                            var newPos = findPositionInBounds();
                            this.changePos(newPos);
                        }
                    }
                    // If the particle didn't move and it is a determined
                    // particle, it could be deadlocked with another particle.
                    // In that case, the particle should change direction.
                    else {
                        if (this.direction != null)
                            this.direction = Math.round(Math.random() * 3);
                    }
                }
			}
		}
	}

	/**
	 * Determines whether the particle can stop walking
	 * and settle down on a location.
	 * Notice that border conditions when moving left/right are not handled.
	 */
	this.settleDown = function() {
		canSettleDown = false;

		// Check in all directions of the grid
		for (var j = 0; j < directions.length; j++)
		{
			var newPos = this.pos + directions[j];
			if (checkPos(this.pos, newPos) && thegrid[newPos] && !thegrid[newPos].active) {
				canSettleDown = true;
                break;
            }
		}
		if (canSettleDown) {
			this.active = false;
            inactiveParticles.push(this);
		}
	}
}

function checkPos(oldPos, newPos) {
	if (newPos < 0 || newPos >= pxPoints)
		return false;
	return true;
}

/**
 * Creates a particle at the specified location or a random location, if no
 * positions is specified.
 */
function createParticle(active, pos) {
    // If no position is specified, try and find a spot. Only try once.
    if (pos == null) {
        if (simulationType == SimulationType.Random)
        	pos = Math.floor((Math.random()*thegrid.length));
        else
            pos = findPositionInBounds();
    }

    // If a position was found and the spot is empty, add the particle.
    if (pos != null && !thegrid[pos]) {
        var color = [0,0,0,255];
        var direction = null;
        if (simulationType == SimulationType.DeterminedBound)
            direction = Math.round(Math.random() * 3);
	    var particle = new Particle(pos, color, direction);
	    thegrid[pos] = particle;
	    particle.active = active;
	    particles.push(particle);
        if (!active)
            inactiveParticles.push(particle);
    }
}

/**
 * Finds a position that is within the bounds of the fractal.
 */
function findPositionInBounds() {
    // We would like the position to be on the edge of the bounds
    var x = 0, y = 0;
    var offsetShort = Math.random() * boundWidth;
    var offsetLong = 0;

    // Use left/right bound
    if (Math.round(Math.random()) == 0) {
        y = Math.random() * (bounds[3] - bounds[2]) + bounds[2];
        // Use left bound
        if (Math.round(Math.random()) == 0) {
            x = bounds[0] + offsetShort;
        }
        // Use right bound
        else {
            x = bounds[1] - offsetShort;
        }
    }
    // Use upper/lower bound
    else {
        x = Math.random() * (bounds[1] - bounds[0]) + bounds[0];
        // Use upper bound
        if (Math.round(Math.random()) == 0) {
            y = bounds[2] + offsetShort;
        }
        // Use lower bound
        else {
            y = bounds[3] - offsetShort;
        }
    }

    return coorToPos(Math.round(x), Math.round(y));
}

/**
 * Finds the bounds of the fractal.
 */
function findBounds() {
    var minx = cwidth, maxx = 0, miny = cheight, maxy = 0;
    // Find bounds non-active particles.  As the fractal becomes larger, this
    // function increases in complexity.
    for (var i = 0; i < inactiveParticles.length; i++) {
        var coor = posToCoor(inactiveParticles[i].pos);
        var x = coor[0];
        var y = coor[1];
    
        if (x < minx)
            minx = x;
        if (x > maxx)
            maxx = x;
        if (y < miny)
            miny = y;
        if (y > maxy)
            maxy = y;
    }

    // Add some pixels to the bound
    minx -= boundWidth;
    maxx += boundWidth;
    miny -= boundWidth;
    maxy += boundWidth;
    return [minx, maxx, miny, maxy];
}
