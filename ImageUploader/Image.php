<?php
	namespace ImageUpload;
	
	Class Image
	{		
		private $file;
		private $name;
		private $type;
		private $tmpName;
		private $size;
		
		var $reprocessed;
		var $validation;
		
		/**
			@description
				constructor method, initialize returned object and stacks.
		*/
		public function __construct($file)
		{
			// Save original file.
			$this->file = $file;
			
			if (is_array($file['name'])) 
			{
				$this->name = $file['name'][0];
				$this->type = $file['type'][0];
				$this->tmpName = $file['tmp_name'][0];
				$this->size = $file['size'][0];
			}
			else
			{
				$this->name = $file['name'];
				$this->type = $file['type'];
				$this->tmpName = $file['tmp_name'];
				$this->size = $file['size'];
			}
			
			$this->reprocessed = false;
			$this->validation = array();
		}
		
		/* 
			@description
				validate the image file
			@param
				$maxSize - max allowed file size (M m | K k)
				$reprocess | Bool - should the image be reprocessed.
			@return
				Bool - is a safe validated image.
		*/
		public function validate($reprocess, $maxSize = '10M') 
		{			
			// Checks if $file['tmp_name'] is empty. This occurs when a file is bigger than allowed by the 'post_max_size' and/or 'upload_max_filesize' settings in php.ini
			if(empty($this->tmpName))
			{
				array_push($this->validation, "Exceeds servers maximum upload file size.");
			}
			
			if(!$this->typeValidation())
			{
				array_push($this->validation, "Not an image file.");
			}
			
			if(!$this->checkImgSize($maxSize))
			{
				array_push($this->validation, "Costume " . $maxSize . " file size limit exceeded.");
			}
			
			// reprocess the image in order to remove embedded malicious code if asked to
			if ($reprocess)
			{
				if ($this->reprocessImg())
				{
					$this->reprocessed = true;
				}
				else
				{
					array_push($this->validation, "Failed reprocessing.");
				}
			}
			
			if (count($this->validation) > 0)
			{
				return false;
			}
			return true;
		}
						
		/*
			@description
				validate the file as image type, preform both mime type and extention check,
				then, make sure extention and mime correlate.
			@return
				Bool - is allowed image extention
		*/
		public function typeValidation ()
		{
			$mime = $this->checkMimeTypeImg($this->tmpName);
			if ($mime)
			{
				$extention =  $this->getFileExtention();
				switch ($extention)
				{
					case 'jpeg':
					case 'jpg': 
						return $mime == IMAGETYPE_JPEG;
					case 'png':
						return $mime == IMAGETYPE_PNG;
					case 'gif':
						return $mime == IMAGETYPE_GIF;
				}
			}
			return false;
		}
		
		/*
			@description
				get the file extention.
			@return
				String - the file extention.
		*/
		private function getFileExtention()
		{
			// Use temp to get var as a refrence for end()
			$tmp = explode(".", $this->name);
			return strtolower(end($tmp));
		}
		
		/*
			@description
				preform file mime type check for either gif, jpeg or png.
			@return
				int - the file mime type code or false if not image.
		*/
		private function checkMimeTypeImg()
		{
			$mime = exif_imagetype($this->tmpName);
			
			// if mime type not either gif, jpeg or png
			if ($mime != IMAGETYPE_GIF &&
					$mime != IMAGETYPE_JPEG && 
							$mime != IMAGETYPE_PNG)
			{
				return false;
			}
			
			return $mime;
		}
		
		/* 
			@description
				check if the image isn't too large.
			@param
				$max - the image max allowed size (K k | M m) 
			@return
				Bool - is allowed size
		*/
		private function checkImgSize($max)
		{
			$sizeUnit = substr($max, -1);	// get unit
			$max_size = (int)substr($max, 0, -1);	// get max size
			
			switch($sizeUnit)
			{
				case 'k':
				case 'K':
					$max_size *= 1024;	// covert to Bytes
					break;
				case 'm':
				case 'M':
					$max_size *= 1024;	// covert to KB
					$max_size *= 1024;	// covert to Bytes
					break;
				default:
					$max_size = 1024000;	// 1MB
			}

			if($this->size > $max_size)
			{
				return false;
			}
			return true;
		}
		
		/* 
			@description
				reprocess the image to get rid of embedded malicious code.
			@return
				Bool - is successfully reprocessed 
		*/
		private function reprocessImg() 
		{ 
			$extention = exif_imagetype($this->tmpName);	// could use getImageSize() 
			$allowedTypes = array(IMAGETYPE_GIF, IMAGETYPE_JPEG, IMAGETYPE_PNG); 
			
			if (!in_array($extention, $allowedTypes)) 
			{ 
				return false; 
			} 
			
			switch ($extention) 
			{ 
				case IMAGETYPE_GIF : 
					$img = imageCreateFromGif($this->tmpName); 
					imagegif ($img, $this->tmpName);
					break; 
				case IMAGETYPE_JPEG : 
					$img = imageCreateFromJpeg($this->tmpName); 
					imagejpeg($img, $this->tmpName, JPG_QLTY);
					break; 
				case IMAGETYPE_PNG : 
					$img = imageCreateFromPng($this->tmpName); 
					imagepng ($img, $this->tmpName, PNG_QLTY);
					break; 
			} 
			
			return true;
		}

	}
?>