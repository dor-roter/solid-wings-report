<?php

##################################################
#              Folder configuration              #
##################################################
# R_PATH:	The absolute path. Don't change this #
#			unless you know what you're doing!	 #
# F_PATH:	The folder to store images			 #
#												 #
#			INFO: This folder is relative to the #
#			location of your form upload		 #
#			handler. (eg: sendReport.php)		 #
# H_FILE:	Change this to 'true' if you want    #
#			to create/use a .htaccess file to    #
#			protect your images folder.			 #
#												 #
#			WARNING: htaccess files are not 100% #
#			reliable! It's STRONGLY advised to   #
#			use a folder outside of your		 #
#			document root instead! This option   #
#			is only there for those who are		 #
#			unable to do so and therefor have no #
#			other choice but to rely on			 #
#			htaccess!							 #
##################################################

define("F_PATH", "../Uploads");
define("H_FILE", true);

##################################################
#              File configuration                #
##################################################
# F_SIZE:	The maximum file size in KB or MB	 #
#			Example: 512K / 2M					 #
#												 #
#			WARNING: Make sure to check the		 #
#			values of 'post_max_size' and		 #
#			'upload_max_filesize' in your		 #
#			php.ini file! This setting should	 #
#			not be larger than either of those!	 #
#												 #
# JPG_QLTY:	The jpg/jpeg files compression 		 #
#			quality.							 #
#												 #
# PNG_QLTY:	The png files compression quality.	 #
##################################################

define("F_SIZE", "8M");
define("JPG_QLTY", 75);		// jpg compression quality
define("PNG_QLTY", 4);		// png compression quality

?>
