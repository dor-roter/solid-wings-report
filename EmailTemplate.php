<?php
	/**
		@description
			emailTemplate creates and manages an email template.
		@param 
			$path_to_file - the path to the template file the email will be based off.
			$variables - the variables will be formated into the template based on the key name.
	*/
	class EmailTemplate 
	{
		var $variables = array();
		var $path_to_file= "";
		
		/**
			@description
				constructor method
			@param
				$path_to_file - the path to the template file
		*/
		function __construct($path_to_file)
		{
			if(!file_exists($path_to_file))
			{
				trigger_error('Template File not found!',E_USER_ERROR);
				return;
			}
			$this->path_to_file = $path_to_file;
		}
		
		/**
			@description
				overide "obj->key=value" into placing variables to be formated
			@param
				$key - the to be formatted key
				$val - the value that would be injected
		*/
		function __set($key, $val)
		{
			$this->variables[$key] = htmlspecialchars($val);	// prevent HTML injection
		}
	
		/**
			@description
				compiles the email template using the givven variables
			@return
				String - formated file with injected costume data
		*/
		function compile()
		{
			$template = file_get_contents($this->path_to_file);

			foreach($this->variables as $key => $value)
			{
				$template = str_replace('{{ '.$key.' }}', $value, $template);
			}
			
			// delete any left unformatted template
			$template = preg_replace('/{{(.*?)}}/', "", $template);

			return $template;
		}
	}
?>