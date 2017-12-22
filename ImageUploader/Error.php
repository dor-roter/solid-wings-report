<?php
	namespace ImageUpload;
	
	Class Error
	{
		public $title;
		public $message;
		public $cause;
		
		function __construct($title = "error", $message = "An error accured!", $cause = "")
		{
			$this->title = "Error: " . $title;
			$this->message = $message;
			$this->cause = $cause;
		}
		
		public function fatal()
		{
			die("Fatal Error! \t" . $this->message);
		}
		
		/** TODO: notify webmaster */
	}
?>