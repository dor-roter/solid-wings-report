<?php
	namespace ImageUpload;
	use StdClass;	
	
	include_once "Error.php";
	require_once "config.php";
	
	Class ImageUpload
	{
		private $error;
		private $uploaded;
		private $obj;
				
		private $folder = F_PATH;
		private $htaccess = H_FILE;
		
		/**
			@description
				constructor method, initialize returned object and stacks.
		*/
		public function __construct()
		{
			$this->uploaded = array();
			$this->error = array();
			
			$this->obj = new StdClass;
		}
		
		/* 
			@description
				securely upload all given images to the server.
			@param
				$files - $_FILES array
			@return
				Array | obj - rearranged array
		*/
		public function uploadImages($files, $naming = "") 
		{
			if ($this->htaccess)
			{
				if(!$this->createHtaccess())
				{
					array_push($this->error, "Unable to create htaccess file.");
					$this->obj->error = $this->error;
					$this->obj->success = false;
					return $this->obj;
				}
			}
			
			// Re-arranges the $_FILES array
			$files = $this->arrangeFilesArray($files);
			foreach($files as $file)
			{
				// Checks if $file['tmp_name'] is empty. This occurs when a file is bigger than allowed by the 'post_max_size' and/or 'upload_max_filesize' settings in php.ini
				if(!empty($file['tmp_name']))
				{
					if($this->imgTypeValidation($file['name'], $file['tmp_name']))
					{
						if($this->checkImgSize($file['size']))
						{
							// reprocess the image in order to remove embedded malicious code
							if ($this->reprocessImg($file['tmp_name']))
							{
								// Creates a file in the upload directory with a unique random name name
								$uploadfile = $this->unqiueTempImg($this->folder, $naming, "." . $this->getFileExtention($file['name']));
								
								// Moves the image to the created file
								if (move_uploaded_file($file['tmp_name'], $uploadfile)) 
								{
									// push file name 
									array_push($this->uploaded, $uploadfile);
								}
								else
								{
									unlink($file['tmp_name']);
									$eMessage = "Unable to move file: ". $file['name'] ." to target folder. The file is removed!";
									$error = new Error("Failed Move", $eMessage, $file['name']);
									array_push($this->error, $error);
								}
							}
							else
							{
								unlink($file['tmp_name']);
								$eMessage = "File: ". $file['name'] ." failed to reprocess.  The file is removed!";
								$error = new Error("Reprocessing Error", $eMessage, $file['name']);
								array_push($this->error, $error);
							}
						}
						else
						{
							$eMessage = "File: ". $file['name'] ." exceeds the maximum file size of: ". F_SIZE ."B. The file is removed!";
							$error = new Error("Large File - config", $eMessage, $file['name']);
							array_push($this->error, $error);
						}
					}
					else
					{
						unlink($file['tmp_name']);
						$eMessage = "File: ". $file['name'] ." is not an image. The file is removed!";
						$error = new Error("Unallowed File", $eMessage, $file['name']);
						array_push($this->error, $error);
					}
				}
				else
				{
					$eMessage = "File: ". $file['name'] ." exceeds the maximum file size that this server allowes to be uploaded!";
					$error = new Error("Large File - php", $eMessage, $file['name']);
					array_push($this->error, $error);
				}
			}
			
			// Checks if the error array is empty
			if (empty($this->error)) 
			{
				$this->obj->uploaded = $this->uploaded;
				$this->obj->success = true;
			} 
			else 
			{
				$this->error = array_unique($this->error);
				$this->obj->error = $this->error;
				$this->obj->success = false;
			}
			return $this->obj;
		}
		
		/* 
			@description
				Re-arranges the $_FILES array as per file array
			@param
				$files - $_FILES formated array
			@return
				Array | obj - rearranged array
		*/
		private function arrangeFilesArray($files)
		{
			$newArray = array();
			$file_count = count($files['name']);
			$file_keys = array_keys($files);

			for ($i = 0; $i < $file_count; $i++) 
			{
				foreach ($file_keys as $key) 
				{
					$newArray[$i][$key] = $files[$key][$i];
				}
			}

			return $newArray;
		}
		
		/* 
			@description
				Checks if the htaccess file exists in folder. If not, creates one with disable php rule
				and preventing direct access to folder to secure it from running malicious scripts.
			@return
				Bool - is htaccess set and ready
		*/
		private function createHtaccess()
		{
			$htaccessUrl = $this->folder."/.htaccess";
			$htaccessExist = file_exists($htaccessUrl);
			if (!$htaccessExist)
			{
				try 
				{
					$htaccess = fopen($htaccessUrl, "w");
					$addRule =	"<IfModule mod_php5.c>" . PHP_EOL .
									"php_flag engine off" . PHP_EOL .
								"</IfModule>" . PHP_EOL;
					$addRule .= PHP_EOL;
					$addRule .= "Order Allow,Deny" . PHP_EOL .
								"Deny from all" . PHP_EOL;
					$addRule .= PHP_EOL;
					$addRule .=	"Options -Indexes" . PHP_EOL;
					fwrite($htaccess, $addRule);
					fclose($htaccess);
					
					return true;
				} 
				catch (Exception $e) 
				{
					return false;
				}
			}
			
			return true;
		}
		
		/*
			@description
				validate the file as image type, preform both mime type and extention check,
				then, make sure extention and mime correlate.
			@param
				$name - the file name
				$tmpName - the file temporary location (url)
			@return
				String - the file extention
		*/
		private function imgTypeValidation ($name, $tmpName)
		{
			$mime = $this->checkMimeTypeImg($tmpName);
			if ($mime)
			{
				$extention =  $this->getFileExtention($name);
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
			@param
				$name - the file name
			@return
				String - the file extention.
		*/
		private function getFileExtention($name)
		{
			// Use temp to get var as a refrence for end()
			$tmp = explode(".", $name);
			return strtolower(end($tmp));
		}
		
		/*
			@description
				preform file mime type check for either gif, jpeg or png.
			@param
				$tmpName - the file temporary location (url)
			@return
				int - the file mime type code or false if not image.
		*/
		private function checkMimeTypeImg($tmpName)
		{
			$mime = exif_imagetype($tmpName);
			
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
				$size - the image size
			@return
				Bool - is allowed size
		*/
		private function checkImgSize($size)
		{
			$sizeUnit = substr(F_SIZE, -1);	// get unit
			$max_size = (int)substr(F_SIZE, 0, -1);	// get max size
			
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

			if($size > $max_size)
			{
				return false;
			}
			return true;
		}
	
		/* 
			@description
				create a uniquly named file. 
			@param
				$path - path for the new file to be created in
				$name - a special prefix / name to be added
				$suffix - the file suffix
			@return
				file 
		*/
		private function unqiueTempImg($path, $name = "", $suffix = ".tmp")
		{
			$uniqeName = "img_" . $name . "_" . time().uniqid(rand());
			do {
				$file = $path."/". $uniqeName . $suffix;
				$fp = @fopen($file, 'x');
			}
			while(!$fp);

			fclose($fp);
			return $file;
		}
	
		/* 
			@description
				reprocess the image to get rid of embedded malicious code.
			@param
				$imgUrl - path for the new file to be created in
			@return
				Bool - is successfully reprocessed 
		*/
		private function reprocessImg($imgUrl) 
		{ 
			$extention = exif_imagetype($imgUrl);	// could use getImageSize() 
			$allowedTypes = array(IMAGETYPE_GIF, IMAGETYPE_JPEG, IMAGETYPE_PNG); 
			
			if (!in_array($extention, $allowedTypes)) 
			{ 
				return false; 
			} 
			
			switch ($extention) 
			{ 
				case IMAGETYPE_GIF : 
					$img = imageCreateFromGif($imgUrl); 
					imagegif ($img, $imgUrl);
					break; 
				case IMAGETYPE_JPEG : 
					$img = imageCreateFromJpeg($imgUrl); 
					imagejpeg($img, $imgUrl, JPG_QLTY);
					break; 
				case IMAGETYPE_PNG : 
					$img = imageCreateFromPng($imgUrl); 
					imagepng ($img, $imgUrl, PNG_QLTY);
					break; 
			} 
			
			return true;
		}

		/*
			// preserve rotation of jpeg files after reprocessing
			private function imagecreatefromjpegexif($filename)
			{
				$img = imagecreatefromjpeg($filename);
				$exif = exif_read_data($filename);
				if ($img && $exif && isset($exif['Orientation']))
				{
					$ort = $exif['Orientation'];

					if ($ort == 6 || $ort == 5)
						$img = imagerotate($img, 270, null);
					if ($ort == 3 || $ort == 4)
						$img = imagerotate($img, 180, null);
					if ($ort == 8 || $ort == 7)
						$img = imagerotate($img, 90, null);

					if ($ort == 5 || $ort == 4 || $ort == 7)
						imageflip($img, IMG_FLIP_HORIZONTAL);
				}
				return $img;
			}
		*/
	}
?>