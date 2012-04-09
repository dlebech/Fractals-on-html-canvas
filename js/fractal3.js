/**
 * This code is in the Public Domain. Use it for what ever you like.
 */

// Width and height of canvas
var cwidth = 400;
var cheight = 400;
var pxPoints = cwidth * cheight;

var directions = [1, -1, -cwidth, cwidth]; // Directions of a particle
var ctx = null; // The drawing context
var thegrid = null; // The grid... a digital frontier :-)
var particles = null;
var curActiveParticles = 0; // Number of active particles
var targetActiveParticles = 20;
var maxActiveParticles = 200; // Maximum number of active particles.
var maxParticles = 5000; // Maximum number of particles
var bounds = null;
var boundWidth = 10;

function init() {
	var canvas = document.getElementById('fractal-canvas');
	if (canvas.getContext) {
		ctx = canvas.getContext('2d');
		running = false;

		// Initialize an empty grid and particle array.
		thegrid = [];
		for (i = 0; i < pxPoints; i++)
			thegrid[i] = null;
		particles = [];

		// Create an initial, immobile particle in the center.
		createParticle(false, Math.round(thegrid.length/2 + cwidth/2));
	}
}

var running = false;
var lastTime = null;

function startSim() {
	running = true;
    lastTime = new Date();
    runSim();
}

function runSim() {
    if (running) {
    	for (var i = 0; i < computationsPerAnimation; i++) {
            bounds = findBounds();
            spawnParticles();
          	moveParticles();
        }

        drawParticles();

        if (particles.length > maxParticles)
            running = false;

        window.requestAnimFrame(runSim);
    }
}

/**
 * Draws all objects on the canvas.
 */
function drawParticles() {
	// Clear the drawing area
	ctx.clearRect(0,0,cwidth,cheight);

	// Fill with white background
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0,0,cwidth,cheight);

	// Draw all particles
	for (var i = 0; i < particles.length; i++) {
		particles[i].draw();
	}
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
    if (targetActiveParticles < maxActiveParticles) {
        boundsArea = (bounds[1]-bounds[0]) * (bounds[3]-bounds[2]);
        targetActiveParticles = Math.round(boundsArea/20);
    }

    // Create active particles if the limit has not been reached
    // Notice that createParticle is not one hundred percent certain to create a particle.
    // That's ok though. We are in no rush to create particles.
	for (var i = 0; i < targetActiveParticles-curActiveParticles; i++) {
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
function Particle(pos, color) {
	this.pos = pos;
	this.color = color;
	this.active = true;
    this.hasMoved = false;
    this.direction = Math.round(Math.random() * 3);

	/**
	 * Draws the particle. It's just a point on the grid.
	 */
	this.draw = function() {
		var imgData = ctx.createImageData(1,1);
		var pixel = imgData.data;
		for (j = 0; j < pixel.length; j++) {
			pixel[j] = this.color[j];
		}
		var coor = posToCoor(this.pos);
		ctx.putImageData(imgData, coor[0], coor[1]);
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
				var triesLeft = 5; // Ensure we do not get stuck in the loop :-)
	
				while (!this.hasMoved && triesLeft > 0)
				{
					var newPos = this.pos + directions[this.direction];
                    this.changePos(newPos);
					triesLeft--;
				}

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
                // If the particle didn't move, it could be deadlocked with another particle.
                // In that case, the particle should change direction.
                else {
                    this.direction = Math.round(Math.random() * 3);
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
			if (checkPos(this.pos, newPos) && thegrid[newPos] && !thegrid[newPos].active)
				canSettleDown = true;
		}
		if (canSettleDown) {
			this.active = false;
            curActiveParticles--;
		}
	}
}

function checkPos(oldPos, newPos) {
	if (newPos < 0 || newPos >= pxPoints)
		return false;
	return true;
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
 * Creates a particle at a possibly specific location
 * and adds it to the particle array.
 */
function createParticle(active, pos) {
	var color = [0,0,0,255];
    if (pos == null) {
        pos = findPositionInBounds();
    }

    if (pos != null && !thegrid[pos]) {
        var particle = new Particle(pos, color);
    	thegrid[pos] = particle;
    	particle.active = active;
    	particles.push(particle);
        if (active)
            curActiveParticles++;
    }
}

function findBounds() {
    var minx = cwidth, maxx = 0, miny = cheight, maxy = 0;
    for (var i = 0; i < particles.length; i++) {
        // Only find bounds for non-active particles
        if (!particles[i].active) {
            var coor = posToCoor(particles[i].pos);
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
    }

    // Add some pixels to the bound
    minx -= boundWidth;
    maxx += boundWidth;
    miny -= boundWidth;
    maxy += boundWidth;
    return [minx, maxx, miny, maxy];
}
