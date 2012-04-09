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
var numParticles = 1000; // Number of active particles
var maxParticles = 50000; // Maximum number of particles

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

		// Create an initial, immobile particle.
		createParticle(false, Math.round(thegrid.length/2 + cwidth/2));

		// Create all other particles
		for (var i = 0; i < numParticles; i++)
			createParticle(true);
	}
}

var running = false;
function startSim() {
	// Update particles every 1 milliseconds.
	running = true;
    runSim();
}

function runSim() {
    if (running) {
    	// To speed up the process of moving particles without freezing the browser,
    	// a few moves are made before a short wait.
    	for (var i = 0; i < computationsPerAnimation; i++) {
    		moveParticles();
    	}
    
        drawParticles();

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
 * Represents a single, small particle.
 * The color is an array consisting of four values for
 * red, green, blue and alpha, e.g. [0,120,255,255]
 */
function Particle(pos, color) {
	this.pos = pos;
	this.color = color;
	this.active = true;

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
				var hasMoved = false;
				var triesLeft = 5; // Ensure we do not get stuck in the loop :-)
	
				while (!hasMoved && triesLeft > 0)
				{
					var randomIndex = Math.floor(Math.random() * directions.length);
					var newPos = this.pos + directions[randomIndex];
					if (checkPos(this.pos, newPos) && !thegrid[newPos]) {
						thegrid[newPos] = this;
						thegrid[this.pos] = null;
						this.pos = newPos;
						hasMoved = true;
					}
					triesLeft = triesLeft - 1;
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
			if (particles.length < maxParticles)
				createParticle(true);
		}
	}
}

function checkPos(oldPos, newPos) {
	if (newPos < 0 || newPos >= pxPoints)
		return false;
	return true;
}

/**
 * Creates a particle at a random location
 * and adds it to the particle array.
 */
function createParticle(active, pos) {
	var foundSpot = false;
    if (pos == null) {
    	while (!foundSpot) {
    		pos = Math.floor((Math.random()*thegrid.length));
		    if (!thegrid[pos])
                foundSpot = true;
    	}
    }
    var color = [0,0,0,255];
	var particle = new Particle(pos, color);
	thegrid[pos] = particle;
	particle.active = active;
	particles.push(particle);
}
