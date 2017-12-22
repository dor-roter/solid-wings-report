<?php	
	// Set used namespaces for included classes.
	use PHPMailer\PHPMailer\PHPMailer;
	use PHPMailer\PHPMailer\Exception;
	use ImageUpload\ImageUpload;

// --------------- Pre-checks and Validations ---------------

	// Verify all needed headers
	verifyPostData();
	
	// Get all configs
	$configs = include('config.php');
	
	// Verify reCaptcha
	$reCaptcha_secret = $configs['reCaptcha_secret'];
	$recaptchaResponse = $_POST["recaptchaResponse"];
	$remoteip = $_SERVER['REMOTE_ADDR'];
	
	require_once('reCaptcha/autoload.php');
	$recaptcha = new \ReCaptcha\ReCaptcha($reCaptcha_secret);
	$resp = $recaptcha->verify($recaptchaResponse, $remoteip);
	
	if (!$resp->isSuccess())
	{
		die("error: reCaptcha validation");
	}
	
	// Check if there is an ongoing maintenance
	if ($configs['maintenance'] === '1')
	{
		die("maintenance");
	}
	
	// Add this request to the log
	logRequest($remoteip, $_POST['residentName'], $_POST['contactInfo']);
		
// ----------------------- Main -----------------------

	// Includes
	include_once "EmailTemplate.php";
	include_once "ImageUploader/ImageUpload.php";
	include_once "ImageUploader/config.php";
	// phpMailer
	include_once 'phpMailer/Exception.php';
	include_once 'phpMailer/PHPMailer.php';
	include_once 'phpMailer/SMTP.php';
	
	// Get the costume message.
	$message = prepareTemplate($configs)->compile();
	
	$mail = new PHPMailer();                              // Passing `true` enables exceptions
	try {
		$mail->setFrom($configs['emailer_from'], $configs['emailer_from_name']);
		$mail->addReplyTo($configs['emailer_replyTo']);
		
		//Recipients
		foreach ($configs['emailer_recipients'] as $recipient) {
			$mail->addAddress($recipient);
		}
		
		// Attachments
		if (isset($_FILES['malfunctionImages']))
		{	
			$uploader = new ImageUpload;
			$namingFormat = str_replace(" ", "-", $_POST['address']) . '_' . str_replace(" ", "-", $_POST['apartmentNumber']);
			$result = $uploader->uploadImages($_FILES['malfunctionImages'], $namingFormat);
			foreach ($result->uploaded as $file) {
				$mail->addAttachment($file);
			}
		}

		//Content
		$mail->isHTML(true);                                  
		$mail->Body    = $message;
		$mail->Subject = $configs['emailer_subject'];
		$mail->AltBody = 'Please use an email client that supports HTML mails.';
		
		$mail->send();
		
		// If not sent by ajax show special success message
		if(empty($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) != 'xmlhttprequest')
		{    
		     echo "Thank You! <br> Your message had been sent.";
		}
		else
		{
			echo 'ok';
		}
	} catch (Exception $e) {
		echo 'Error - Message could not be sent.';
		echo 'Mailer Error: ' . $mail->ErrorInfo;
	}
	
	
	
	
	
	
	/**
	*#########################################*
	*#########################################*
	*#############	Functions	##############*
	*#########################################*
	*#########################################*
	*/
	
	// check POST request & all data sent else kill
	function verifyPostData()
	{
		if(intval($_SERVER['CONTENT_LENGTH'])>0 && count($_POST)===0){
			echo 'Error: PHP discarded POST data because of request exceeding post_max_size.';
			die();
		}
		if ($_SERVER['REQUEST_METHOD'] != 'POST' || !isset($_POST['address']) || !isset($_POST['apartmentNumber']) || !isset($_POST['malfunctionLocation']) || 
				!isset($_POST['whenAndHow']) || !isset($_POST['malfunctionDescription']) || !isset($_POST['residentName']) || !isset($_POST['contactInfo']) || !isset($_POST['urgencyLevel']) 
					||!isset($_POST['asSoonAsPossible']) || !isset($_POST["recaptchaResponse"])) 
		{
			echo "error: post data";
			die();
		}	
	}
	
	// preform reCaptcha validation for the client and return state
	function reCaptcha($secret, $response, $remoteip) 
	{
		require_once "reCaptchaValidation.php";
		
		$reCaptcha = new reCaptchaValidation($secret, $response, $remoteip);
		return $reCaptcha->validate();
	}
	
	// Create the email template and fill it up
	function prepareTemplate($configs)
	{		
		/* prepare the template */
		$template = new EmailTemplate($configs['emailer_template']);
			$template->logo = $configs['logo_small']; 							// insert logo address
			$template->backgroundImage = $configs['email_background'];			// insert background image address
			
			$template->address = $_POST['address'];
			$template->apartmentNumber = $_POST['apartmentNumber'];
			$template->malfunctionLocation = $_POST['malfunctionLocation'];
			$template->whenAndHow = $_POST['whenAndHow'];
			$template->malfunctionDescription = $_POST['malfunctionDescription'];
			$template->residentName = $_POST['residentName'];
			$template->contactInfo = $_POST['contactInfo'];
			$template->urgencyLevel = $_POST['urgencyLevel'];
			$template->urgencyMeter = 100 - 10*$_POST['urgencyLevel']; 
		
		
		// handle "as soon as possible" prefered time selection
		if ($_POST['asSoonAsPossible'] == "true")
		{
			$template->preferedDays = "As soon as possible";
		}
		else
		{
			// If preferedDays passed as array
			if (is_array($_POST['preferedDays']))
			{
				$template->preferedDays = implode(", ",$_POST['preferedDays']);
			}
			else
			{
				$template->preferedDays = $_POST['preferedDays'];
			}
			
			$template->preferedTime = $_POST['fromTime'] . " - " . $_POST['toTime'];
		}		
			
		// adjust phone number style as needed
		if (isset($_POST['numberOnly']) && $_POST['numberOnly'] == true)
			$template->numberOnlyCss = "font-size: 0.9em;font-weight: 200;padding-left: 15px;color: #424242;";
		else
			$template->numberOnlyCss = "";

		return $template;
	}
	
	// add this request to the log for security and debuging
	function logRequest($remoteip, $name, $contact)
	{
		$file = 'log.txt';
		$logEntery = 	"ip: " . $remoteip . PHP_EOL .
				"timestamp: " . date("d/m/Y H:i:s") . " UTC" . PHP_EOL .
				"user name: " .  $name . PHP_EOL .
				"user contact: " .  $contact . PHP_EOL .
				" ---------------------------------------------- " . PHP_EOL;
		
		file_put_contents($file, $logEntery, FILE_APPEND);
	}
?>