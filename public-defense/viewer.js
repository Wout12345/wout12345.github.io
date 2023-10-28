import { load_slide_data } from "./slide_data.js";

// GLOBAL VARIABLES
var slide_data = load_slide_data();

// GLOBAL STATE
var current_image_index = 0;
var current_target_image_index_in_pause_array = 0;
var current_animation_direction = 0; // -1 for backward, 1 for forward, 0 means no current animation
var last_image_refresh_start_time = 0;

// HELPERS

function getImagePath(index) {
	return `${slide_data.slides_dir}${index}.png`;
}

// In seconds
function time_now() {
	return Date.now()/1000;
}

// PRE-LOADING IMAGES
// Should improve performance and stability, as long as we have enough memory to keep all images in RAM all the time ...

var images = []; // The pre-loaded images need to be stored somewhere in the global scope to keep them alive
function preload() {
	var preload_start = time_now();
	for (var i = 0; i <= slide_data.pause_image_indices[slide_data.pause_image_indices.length - 1]; i++) {
		images[i] = new Image();
		images[i].src = getImagePath(i);
	}
	console.log("Finished preloading all images, took " + (time_now() - preload_start) + " seconds");
}

// SLIDE NAVIGATION LOGIC

// https://stackoverflow.com/questions/11722400/programmatically-change-the-src-of-an-img-tag
function forward() {
	updateTargetImage(1);
}

function backward() {
	updateTargetImage(-1);
}

// direction: +1 for forward, -1 for backward
// This function is only called from the forward and backward events, not during animations
function updateTargetImage(direction) {
	
	var new_target_image_index_in_pause_array = current_target_image_index_in_pause_array + direction;
	if (new_target_image_index_in_pause_array < 0 || new_target_image_index_in_pause_array >= slide_data.pause_image_indices.length) {
		// Do not go out-of-bounds
		return;
	}
	
	// First update target and then see how we update image index
	current_animation_direction = direction;
	if ((slide_data.pause_image_indices[current_target_image_index_in_pause_array] - current_image_index)*current_animation_direction >= 1) {
		// If we are continuing in the same direction, reset current image index to start of new animation, even if another animation was still running
		// This will always be followed by another image index update later, so no need to refresh image now
		current_image_index = slide_data.pause_image_indices[current_target_image_index_in_pause_array]; 
	}
	current_target_image_index_in_pause_array = new_target_image_index_in_pause_array;
	updateImageAndCheckIfTargetReached();
	
}

// This function is called both during animations and for standard forward/backward events
function updateImageAndCheckIfTargetReached() {
	
	if (current_animation_direction == 0) {
		// This animation was cancelled by other events during the timer
		return;
	}
	
	//console.log("current_image_index: " + current_image_index)
	//console.log("current_target_image_index: " + slide_data.pause_image_indices[current_target_image_index_in_pause_array])
	//console.log("current_animation_direction: " + current_animation_direction)
	
	// Update image
	current_image_index += current_animation_direction;
	refreshImage();
	
	// Check target
	var current_target_image_index = slide_data.pause_image_indices[current_target_image_index_in_pause_array];
	if (current_animation_direction > 0 ? current_image_index >= current_target_image_index : current_image_index <= current_target_image_index) {
		// Animation over, reset animation direction
		current_animation_direction = 0;
	} else {
		// Animation ongoing, maintain animation direction and set timer
		var time_taken_since_start_of_last_refresh = time_now() - last_image_refresh_start_time; // To compensate for image loading times
		var framerate_interval = 1.0/slide_data.fps;
		setTimeout(updateImageAndCheckIfTargetReached, (framerate_interval - time_taken_since_start_of_last_refresh)*1000); // Time is in milliseconds
	}
	
}

// Updates the image based on the global variable current_image_index
function refreshImage() {
	//console.log(time_now() - last_image_refresh_start_time);
	last_image_refresh_start_time = time_now();
	document.getElementById("image").src = images[current_image_index].src;
	/*var domImgObj = document.getElementById("image");
	var imgObj = images[current_image_index];
	imgObj.id = domImgObj.id; // necessary for future swap-outs
	document.getElementById("image-container").replaceChild(imgObj, domImgObj);*/
}

// INPUT HANDLING

document.onkeydown = checkKey;
document.onclick = checkClick;

// https://stackoverflow.com/questions/5597060/detecting-arrow-key-presses-in-javascript
function checkKey(e) {
	e = e || window.event;
	if (e.keyCode == '38' || e.keyCode == '37' || e.keyCode == '33') {
		// up arrow, left arrow, page up
		backward();
	} else if (e.keyCode == '40' || e.keyCode == '39' || e.keyCode == '34') {
		// down arrow, right arrow, page down
		forward();
	}
}

function checkClick(e) {
	e = e || window.event;
	if (e.button == 0) {
		// LMB
		forward();
	} else if (e.button == 2) {
		// RMB: do nothing for now
	}
}

// ON LOAD
preload();
refreshImage();
