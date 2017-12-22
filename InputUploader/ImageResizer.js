// Create an immediately invoked functional expression to wrap our code
(function() {	
	/**
	*	constructor | ResizeImage
	*
	*	@description
	*		Constructor to set all the risizer tool.
	*	@param
	*		options | Options - optional options list
	*/
	this.ImageResizer = function() {
		
		this.tempImg = null;
		this.original = null;
		this.resized = null;
		this.callback = function(){};

		// Define option defaults
		var defaults = {
			quality: 0.90,
			dataurl: false,
			maxHeight: 1080,
			maxWidth: 1920,
			supported: ['jpg','jpeg','png'],
		}
		
		// Create options by extending defaults with the passed in arugments
		if (arguments[1] && typeof arguments[1] === "object") {
			this.options = extendDefaults(defaults, arguments[1]);
		}
		else {
			this.options = defaults;
		}
		
		// Check browser compatibility
		if (!browserCompatibility()) {
			throw "Compatibility error";
		}
	}
	
	/**
	*	Public | resize
	*
	*	@description
	*		Main function to resize the image.
	*	@param
	*		img | File - the image file to be resized
	*		callback | Function - a call function to be called once finished.
	*/
	ImageResizer.prototype.resize = function (img, callback) {
		// Reset global variables 
		this.tempImg = new Image();
		this.resized = null;
		this.original = img;
		this.callback = callback;
		
		// Check if the file is supported by the resizer
		if (!isSupported.call(this)){
			this.callback(false);
			return;
		}
		
		var reader = new FileReader();
		var dataurl;
		var that = this;
		
		reader.onload = function(e) {
			// Wait for the the image to load the source before using it.
			that.tempImg.onload = function(){
				var dataurl = canvasResize.call(that);
				
				if (that.options.dataurl) {
					that.callback(dataurl);
				}
				else {
					var blob = dataURItoBlob(dataurl);
					that.resized = blobToFile(blob, that.original);
					
					that.callback(that.resized);
				}
			};
			
			// Set the image source to the file content
			that.tempImg.src = e.target.result;
		}

		reader.readAsDataURL(this.original);
	}
	
	/**
	*	Private | isImage
	*
	*	@description
	*		Checks the passed file type against the allowed image types. 
	*	@return 
	*		Bool - is the file supported
	*/
	function isSupported() {		
		var imageTypes = this.options.supported.join("|");
		var regex = new RegExp('.(' + imageTypes + ')$', 'i'); 
		return (this.original.name.match(regex) != null);
	}
	
	/**
	*	Private | canvasResize
	*
	*	@description
	*		Canvas resize the image
	*	@return 
	*		dataURI - the resized image 
	*/
	function canvasResize() {
		// Set up a canvas and load
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");
		//ctx.drawImage(this.tempImg, 0, 0);

		var MAX_WIDTH = this.options.maxWidth;
		var MAX_HEIGHT = this.options.maxHeight;
		var width = this.tempImg.width;
		var height = this.tempImg.height;

		if (width > height) {
			if (width > MAX_WIDTH) {
				var ratio = MAX_WIDTH / width;
				height *= ratio;
				width = MAX_WIDTH;
			}
		} 
		else {
			if (height > MAX_HEIGHT) {
				var ratio = MAX_HEIGHT / height;
				width *= ratio;
				height = MAX_HEIGHT;
			}
		}
		canvas.width = width;
		canvas.height = height;

		ctx.drawImage(this.tempImg, 0, 0, width, height);

		dataurl = canvas.toDataURL("image/jpeg", this.options.quality);
		
		return dataurl;
	}
	
	/**
	*	Private | blobToFile
	*
	*	@description
	*		Utility method to turn a Blob to a File object
	*	@param
	*		blob | Blob - blob created from the original
	*		original | File - the original file
	*	@return 
	*		File 
	*/
	function blobToFile(blob, original) {
		blob.lastModifiedDate = new Date();
		
		var fileName = original.name.match(/(.*)\.[^.]+$/)[1];
		blob.name = fileName + "." + blob.type.split('/')[1];
		
		return blob;
	}
	
	/**
	*	Private | dataURItoBlob
	*
	*	@description
	*		Utility method to turn a dataURI to a blob
	*	@param
	*		dataURI - a dataURI to turn into a blob
	*	@return 
	*		Blob 
	*/
	function dataURItoBlob(dataURI) {
		// convert base64 to raw binary data held in a string
		// doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
		var byteString = atob(dataURI.split(',')[1]);

		// separate out the mime component
		var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

		// write the bytes of the string to an ArrayBuffer
		var ab = new ArrayBuffer(byteString.length);

		// create a view into the buffer
		var ia = new Uint8Array(ab);

		// set the bytes of the buffer to the correct values
		for (var i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}

		// write the ArrayBuffer to a blob, and you're done
		var blob = new Blob([ab], {type: mimeString});
		
		return blob;
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
	*	Private | browserCompatibility
	*
	*	@description
	*		Utility method to check browser compatibility
	*	@return 
	*		Bool - is compatible
	*/
	function browserCompatibility() {
		var elem = document.createElement('canvas');
		return !!(elem.getContext && elem.getContext('2d'));
	}
	
}());
