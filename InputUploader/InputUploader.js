// TODO: handle mobile

// Create an immediately invoked functional expression to wrap our code
(function() {	
	// Set global instances counter
	var instances = 0;

	// Define our constructor
	this.InputUploader = function() {
		// Manage multiple instances
		instances++;
		this.instanceNum = instances;
		
		// Create global element references
		this.elm = null;
		this.uploadElm = null;
		this.inputText = null;
		this.inputFiles = null;
		this.previewGallery = null;
		
		// File uploader count
		this.fileCount = 0;
		this.filesStack = [];
		this.resizedStack = [];
		this.totalSize = 0;
		this.noFiles = true;
		
		// Resizing in progress flag
		this.resizeInProgress = false;
				
		// Define option defaults
		var defaults = {
			context: document.body,
			className: '',
			multiple: true,
			width: 450,
			height: 100,
			borderColor: '#a9a9a9',
			resize: false,		// {maxHeight: 1080, maxWidth: 1920, quality: 0.9}
			maxFiles: 5,
			accept: 'image/*',
			label: '<i class="fa fa-upload" aria-hidden="true"></i> Upload Image',
			limitSize: false,	// size + 'm/mb/k/kb/b'
			limitAlert: function() {
				alert("Total file size limit exceeded, please select smaller files.");
			},
		}
		
		// Create options by extending defaults with the passed in arugments
		if (arguments[0] && typeof arguments[0] === "object") {
			this.options = extendDefaults(defaults, arguments[0]);
		}
		else {
			this.options = defaults;
		}
		
		// Start the resizer if needed and possible
		initializeResizer.call(this);
		
		// .call(this) passes "this" namespace to the functions
		build.call(this);
		initializeEvents.call(this);
	}
		
	// Public methods

	
	/**
	*	Public | value 
	*
	*	@description
	*		Get the InputUploader value.
	*	@return
	*		obj - Includes the files and text.
	*/
	InputUploader.prototype.value = function() {
		var obj = {};
		
		if (limitTotalSize.call(this)) {			
			return false;
		}
		
		if (this.options.resize) {
			// waiting for a fileResize to finish
			if (this.resizeInProgress){
				obj.files = "wait";
			}
			else {
				obj.files = this.resizedStack;
			}
		}
		else {
			obj.files = this.filesStack;
		}
		
		obj.text = this.inputText.value;
		return obj;
	}
	
	/**
	*	Public | clear 
	*
	*	@description
	*		Clear and reset the object.
	*/
	InputUploader.prototype.clear = function() {
		this.filesStack = [];
		this.resizedStack = [];
		this.fileCount = 0;
		this.totalSize = 0;
		this.noFiles = true;
		this.previewGallery.innerHTML = "";
		this.inputText.value = "";
	}
	
	/**
	*	Public | simplfy 
	*
	*	@description
	*		Toggle clear and reset of the object into a simple input.
	*	@param
	*		simple | Bool - true to simplfy false to reset to normal.
	*/
	InputUploader.prototype.simplfy = function(simple) {
		// If requested to simplfy OR if passed without arguments toggle
		if ((simple || (typeof simple === 'undefined')) &&
						!this.elm.hasClass("inptUpldr-simplfy") ) {
			this.filesStack = [];
			this.previewGallery.innerHTML = "";
			
			this.elm.addClass("inptUpldr-simplfy");
		}
		else {
			this.elm.removeClass("inptUpldr-simplfy");
		}
	}
	
	/**
	*	Public | preview 
	*
	*	@description
	*		Re-create the files preview gallery based on the entire files stack.
	*/
	InputUploader.prototype.preview = function() {
		// Truncate previous gallery.
		this.previewGallery.innerHTML = '';

		var files = this.filesStack;
		for (i = 0; i < files.length; i++) {
			this.addPreview(files[i]);
		}
	}
	
	/**
	*	Public | addPreview 
	*
	*	@description
	*		Add another file thumbnail to the preview gallery.
	*	@param 
	*		file | obj - A file object as storred in "this.fliesStack"
	*/
	InputUploader.prototype.addPreview = function(file) {
		// Create another referrence to "this" namespace.
		var that = this;
		var gallery = this.previewGallery;

		reader  = new FileReader();
			
		reader.onloadend = function (e) {
			var thumbnailConatiner = buildPreviewElement(file.fileId, e.target.result);
		
			thumbnailConatiner.addEventListener("click", deleteEventHandler.bind(that, file.fileId, thumbnailConatiner));
			gallery.appendChild(thumbnailConatiner);
		}
			
		if (file) {
			reader.readAsDataURL(file);
		}
	}
	
	/**
	*	Public | uploadToggle 
	*
	*	@description
	*		Toggle the upload tab (expand/shrink).
	*/
	InputUploader.prototype.uploadToggle = function() {
		// If state indicator not defined yet.
		if (!this.uploadElm.hasAttribute("data-clicked")) {
			this.uploadElm.setAttribute("data-clicked", "0");  
		}
		
		// Toggle expand
		if (this.uploadElm.getAttribute("data-clicked") === "0") {
			this.uploadElm.addClass("inptUpldr-clicked");
			this.uploadElm.setAttribute("data-clicked", "1");
			
			// Change the delete thumbnail overlay style.
			this.previewGallery.addClass("inptUpldr-tumbnail-top-overlay");
		}
		// Toggle shrink
		else {
			this.uploadElm.removeClass("inptUpldr-clicked");
			this.uploadElm.setAttribute("data-clicked", "0");
			
			// Remove unique delete thumbnail overlay style.
			this.previewGallery.removeClass("inptUpldr-tumbnail-top-overlay");
		}
	}
	
	/**
	*	Public | uploadShrink 
	*
	*	@description
	*		Shrink the upload tab.
	*/
	InputUploader.prototype.uploadShrink = function() {
		this.uploadElm.removeClass("inptUpldr-clicked");
		this.uploadElm.setAttribute("data-clicked", "0");
			
		// Remove unique delete thumbnail overlay style.
		this.previewGallery.removeClass("inptUpldr-tumbnail-top-overlay");
	}
	
	/**
	*	Public | addFile 
	*
	*	@description
	*		Add a new file to the files stack, make sure maximum file count limit 
	*		is maintained by shifting the stack.
	*		
	*	@return 
	*		The added file complete object.
	*/
	InputUploader.prototype.addFile = function() {		
		var file = this.inputFiles.files[0];

		// Make sure there was an actual file before continuing (IE issue) 
		if (file == null) {
			return false;
		}
		
		// Check first -> casues entire array change
		// If over max file number limit, remove first.
		if (this.options.maxFiles <= this.filesStack.length) {
			// Subtract the first file size from total
			this.totalSize -= parseInt(this.filesStack[0].size);
			
			// If needed remove resized first file
			removeResizedFile.call(this, this.filesStack[0].fileId);
			
			// Remove the first file
			this.filesStack.shift();
		}
				
		// Set flag
		this.noFiles = false;		
		
		// Keep track of total file count for unique IDs.
		this.fileCount++;
		// Add file size to the total selcted files size.
		this.totalSize += parseInt(file.size);
		
		// Add a unique ID property to the file.
		file.fileId = this.fileCount;
		// Push new file into the stack.
		this.filesStack.push(file);
		
		// Reset input selector.
		this.inputFiles.value = "";
		
		// Resize images
		if (this.options.resize != false) {
			if (isImage(file)){
				// Set the resize in progress flag
				this.resizeInProgress = true;
				
				var that = this;
				this.resizer.resize(file, function(resizedFile) {
					resizedFile.fileId = file.fileId;
					that.resizedStack.push(resizedFile);
					
					// If all resizes finished
					if (that.resizedStack.length == that.filesStack.length) {
						// Unset the resize in progress flag
							that.resizeInProgress = false;
					}
				});
			}
			else {
				// If unable to resize just push the file as is.
				this.resizedStack.push(file);
			}
		}
		
		return file;
	}
	
	/**
	*	Public | removeFile 
	*
	*	@description
	*		Remove the selected file from the files stack, by the sent unqiue ID.
	*/
	InputUploader.prototype.removeFile = function(fileId) {
		var i = 0;
		var isFound = false;
		while (i < this.filesStack.length && !isFound) {
			// If sent file ID found
			if (this.filesStack[i].fileId == fileId) {
				// Subtract removed file file size from total
				this.totalSize -= parseInt(this.filesStack[i].size);
				// Remove the file
				this.filesStack.splice(i, 1);
				
				isFound = true;
			}
			
			i++;
		}
		
		// If resize is true search and remove this file from the resized stack as well.
		removeResizedFile.call(this, fileId);
		
		// If no files set flag
		if (!this.filesStack.length) {
			this.noFiles = true;
		}
	}
	
	/**
	*	Public | onResizeEnd (-require resize compatibility)
	*
	*	@description
	*		Watch the resize in progress flag and fire a callback on its change from true to false
	*	@param
	*		callback | Function 
	*/
	InputUploader.prototype.onResizeEnd = function(callback) {
		if (this.options.resize) {
			// defined in object-watch.js
			this.watch('resizeInProgress', function(){
				this.unwatch('resizeInProgress');
				
				// If in progress
				if (this.resizeInProgress == true) {
					this.resizeInProgress = false;
					callback();
				}			
			});
		}
		else {
			return false;
		}
	}
	
	/**
	*	Public | isResizing
	*
	*	@description
	*		Watch the resize in progress flag and fire a callback on its change from true to false
	*	@return
	*		Bool - is there a resizing in progress 
	*/
	InputUploader.prototype.isResizing = function(callback) {
		return this.resizeInProgress;
	} 
		
	
	// Private methods
	
	/**
	*	Private | removeResizedFile 
	*
	*	@description
	*		Removes a file with corresponding fild id from the resized files stack
	*	@param
	*		fileId | int - the to be deleted file ID
	*/
	function removeResizedFile(fileId) {
		if (this.options.resize != false) {
			var i = 0;
			var isFound = false;

			while (i < this.resizedStack.length && !isFound) {
			// If sent file ID found
				if (this.resizedStack[i].fileId == fileId) {
					// Remove the file
					this.resizedStack.splice(i, 1);
					
					isFound = true;
				}
				
				i++;
			}
		}
	}
	
	/**
	*	Private | isImage 
	*
	*	@description
	*		Utility method to check if a file is an image file
	*	@param
	*		file | File 
	*	@return
	*		Bool - true if is an image
	*/
	function isImage (file) {
		var imageTypes = "jpg|jpeg|png";
		var regex = new RegExp('.(' + imageTypes + ')$', 'i'); 
		return (file.name.match(regex) != null);
	}
	
	/**
	*	Private | limitTotalSize 
	*
	*	@description
	*		Check if total file size limit was passed.
	*	@return
	*		Bool - true if limited else false.
	*/
	function limitTotalSize () {
		var isLimited = false;
		
		if (this.options.limitSize !== false) {
			var maxSize = parseSize(this.options.limitSize);	// get size in bytes
			
			if (this.options.resize) {
				var total = getTotalSize(this.resizedStack);
				if (total >= maxSize) {
					isLimited = true;
				}
			}
			else {
				var total = this.totalSize;
				if (total >= maxSize) {
					isLimited = true;
				}
			}
		}
		
		if (isLimited) {
			this.options.limitAlert();
		}
		return isLimited;
	}
	
	/**
	*	Private | getTotalSize 
	*
	*	@description
	*		Utility method to get an array of files total size
	*	@return
	*		int - total files size.
	*/
	function getTotalSize(files) {
		var total = 0;
		for (i = 0; i < files.length; i++) {
			total += files[i].size;
		}
		return total;
	}
	
	/**
	*	Private | parseSize 
	*
	*	@description
	*		Utility method to parse the size from string to Bytes.
	*	@param
	*		size | String - the size in 'm'/'mb'/'k'/'kb' units
	*	@return
	*		int - the given size in Bytes.
	*/
	function parseSize(size) {
		// Returns two capture groups
		var parse = size.match(/^(\d+)(kb|k|mb|m|b)$/i);
		
		size = parseInt(parse[1]);	// get number size
		sizeUnit = parse[2].toLowerCase();	// get unit
			
		switch(sizeUnit) {
			case 'k':
			case 'kb':
				size *= 1024;	// covert to Bytes
				break;
			case 'm':
			case 'mb':
				size *= 1024;	// covert to KB
				size *= 1024;	// covert to Bytes
				break;
		}
		return size;
	}
	
	/**
	*	Private | isDescendant
	*
	*	@description
	*		Is the given elements are DOM descendants.
	*	@param 
	*		parent - DOM element
	*		child - DOM element
	*	@return
	*		Bool - Are the elements descendants
	*/
	function isDescendant(parent, child) {
		var node = child.parentNode;
		while (node != null) {
			if (node == parent) {
				return true;
			}
			node = node.parentNode;
		}
		return false;
	}

	/**
	*	Private | initializeEvents
	*
	*	@description
	*		Initialize the basic input event handler.
	*/
	function initializeEvents() {		
		var that = this;
		
		// Is the DOM input ready
		if (this.inputFiles) {
			this.inputFiles.addEventListener("change", inputEventHandler.bind(this));
		}
		
		if (this.uploadElm) {
			// Add eventListenr to clicks outside our element (possible blur).
			this.uploadElm.addEventListener("click", function() { 
				document.body.addEventListener("click", blurUploadElm);
				that.uploadToggle(); 
			});
		}
		
		// Private | If element is blurred including children shrink and remove listner.
		function  blurUploadElm(event) {
			if (!isDescendant(that.uploadElm, event.target)) {
				that.uploadShrink();
				document.body.removeEventListener("click", blurUploadElm);
			}
		}
	}
	
	/**
	*	Private | inputEventHandler
	*
	*	@description
	*		Handle the new file input event.
	*/
	function inputEventHandler() {
		// Add new file to stack from input
		var file = this.addFile();

		// If file add didn't get rejected
		if (file != false) {
			// If over max file limit, re-create preview
			if (this.options.maxFiles <= this.filesStack.length) {
				this.preview(file);
			}
			else {
				// Add file thumbnail to preview gallery
				this.addPreview(file);
			}
		}		
	}
	
	/**
	*	Private | deleteEventHandler
	*
	*	@description
	*		Handle file deletion event.
	*/
	function deleteEventHandler(id, elm) {
		//If thumbnail isn't being hovered over -> touch device -> don't delete until tab is expanded.
		if (elm.getElementsByTagName("img")[0].height < 30) {
			return;
		}
		
		// If not the last file
		if (this.filesStack.length > 1) {
			// Prevent eventListenrs from firing up and shrinking.
			event.preventDefault();
			event.stopPropagation();
		}
		
		// Remove the file itself.
		this.removeFile(id);
		
		// Remove the element from the preview gallery.
		elm.parentNode.removeChild(elm);
	}
	
	/**
	*	Private | extendDefaults
	*
	*	@description
	*		Utility method to extend defaults with user options.
	*	@return 
	*		The extended object.
	*/
	function extendDefaults(source, properties) {
		var property;
		for (property in properties) {
			if (properties.hasOwnProperty(property)) {
				source[property] = properties[property];
			}
		}
		return source;
	}
	
	/**
	*	Private | build
	*
	*	@description
	*		Utility method to build the element, then append it to the givven context.
	*/
	function build() {
		if (!isElement(this.options.context)) {
			throw 'Error: Context is not an existing DOM element!';
			return;
		}
		
		// Create a DocumentFragment to build onto
		var docFrag = document.createDocumentFragment();
		
		// Create container element
		this.elm = document.createElement("div");
		this.elm.className = "inptUpldr-wrapper " + this.options.className;
		this.elm.style.width = this.options.width + "px";
		this.elm.style.height = this.options.height + "px";
		this.elm.style.borderColor = this.options.borderColor;
		
		// Create upload element
		this.uploadElm = document.createElement("div");
		this.uploadElm.className = "inptUpldr-upload";
		
		// Create top shadowing
		var topShadow = document.createElement("div");
		topShadow.className = "inptUpldr-topShadow";
		this.uploadElm.appendChild(topShadow);
				
		this.inputFiles = document.createElement("input");
		var inputLabel = document.createElement("label");
		inputLabel.className = "inptUpldr-animate-short";
		inputLabel.innerHTML = this.options.label;
		
		// Set input attributes
		this.inputFiles.setAttribute("type", "file");
		this.inputFiles.setAttribute("accept", this.options.accept);
		
		var inputId = "inptUpldr-" + this.instanceNum;
		this.inputFiles.setAttribute("id", inputId);
		inputLabel.setAttribute("for", inputId);
		
		// Hide the input using container (Safari compatibility issue)
		var hideInputContainer = document.createElement("div");
		hideInputContainer.className = "inptUpldr-hideFileInput";
		
		hideInputContainer.appendChild(this.inputFiles);
		this.uploadElm.appendChild(inputLabel);
		this.uploadElm.appendChild(hideInputContainer);
		
		// Create preview gallery element
		this.previewGallery = document.createElement("div");
		this.previewGallery.className = "inptUpldr-previewGallery";
		this.uploadElm.appendChild(this.previewGallery);
		
		// Create border bottom element
		var borderSeperate = document.createElement("div");
		borderSeperate.className = "inptUpldr-borderSeperate";
		this.uploadElm.appendChild(borderSeperate);
		
		this.elm.appendChild(this.uploadElm);
		
		// Create text input element
		this.inputText = document.createElement("textarea");
		this.inputText.className = "inptUpldr-input scrollbar";
		this.elm.appendChild(this.inputText);
		
		// Append complete element to DocumentFragment
		docFrag.appendChild(this.elm);

		// Append DocumentFragment to the selected context
		this.options.context.appendChild(docFrag);
		
		// Set input height to total height minus minimum upload tab height and border.
		this.inputText.style.height = (this.options.height - this.uploadElm.offsetHeight - 2) + "px";
	}
	
	/**
	*	Private | buildPreviewElement
	*
	*	@description
	*		Utility method to build the file thumbnail preview element.
	*	@param
	*		fileId | int - the previewd file ID.
	*		imgSrc | string - the image source of the thumbnail.
	*	@return 
	*		DOM element - preview element ready to be appended.
	*/
	function buildPreviewElement(fileId, imgSrc) {
		var thumbnailConatiner = document.createElement("div");
		thumbnailConatiner.className = "inptUpldr-thumbnailContainer";
		var thumbnail = document.createElement("img");
		thumbnail.className = "inptUpldr-animate";
		var overlay = document.createElement("div");
		overlay.className = "inptUpldr-thumbnailOverlay";
		var icon = document.createElement("i");
		icon.className = "fa fa-trash-o";
		
		overlay.appendChild(icon);
		thumbnailConatiner.appendChild(thumbnail);
		thumbnailConatiner.appendChild(overlay);
		
		var dataId = document.createAttribute("data-id");
		dataId.value = fileId;
		thumbnail.setAttributeNode(dataId);
		thumbnail.src = imgSrc;
		
		return thumbnailConatiner;
	}
	
	/**
	*	Private | initializeResizer
	*
	*	@description
	*		If needed start the resizer, if not supported catch error and cancel resizing.
	*/
	function initializeResizer() {
		// Start resizer if available
		if (this.options.resize) {
			if (typeof ImageResizer != 'undefined') {
				try {
					this.resizer = new ImageResizer(this.options.resize);
				}
				catch(e) {
					this.options.resize = false;
				}
			}
			else {
				this.options.resize = false;
			}
		}
	}
	
	
	// Useful Utilty.
	
	/**
	*	Private | isElement
	*
	*	@description
	*		Utility method to return if an object is a DOM element.
	*	@param
	*		Object or string to be checked.
	*	@return 
	*		Bool | is a DOM element.
	*/	
	function isElement(o) {
		return (
			typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
			o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
		);
	}
	
	/**
	*	Private | removeClass
	*
	*	@description
	*		Utility method to remove a given class from a DOM element.
	*	@param
	*		removedClass | String - class to be removed.
	*/
	HTMLElement.prototype.removeClass = function (removedClass) {
		if (typeof this.className !== 'undefined') {
			// Whole world including the before whitespace but not after.
			var regex = new RegExp('(?:^|\\s)'+ removedClass +'(?!\\S)');
			var newClassName = this.className.replace(regex, '');
			this.className = newClassName;
		}
	}
	
	/**
	*	Private | addClass
	*
	*	@description
	*		Utility method to add a given class to a DOM element.
	*	@param
	*		addedClass | String - class to be added.
	*/
	HTMLElement.prototype.addClass = function (addedClass) {
		if (typeof this.className !== 'undefined') {
			this.className += (" " + addedClass);
		}
	}
	
	/**
	*	Private | hasClass
	*
	*	@description
	*		Utility method to return if a DOM element has a class.
	*	@param
	*		cls | String - class to be searched.
	*/
	HTMLElement.prototype.hasClass = function (cls) {
		if (this.className !== 'undefined') {
			// Whole world including the before whitespace but not after.
			var regex = new RegExp('(?:^|\\s)'+ cls +'(?!\\S)');
			return (this.className.match(regex) !== null);
		}
		return false;
	}
}());
