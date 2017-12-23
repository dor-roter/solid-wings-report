var malfunctionDescription; 
var MAX_TOTAL_FILE_SIZE = '8Mb';
var FD_SUPPORT = true;
var AJAX_SUPPORT = true;

if (typeof window.XMLHttpRequest === 'undefined') {
	AJAX_SUPPORT = false;
}

$(document).ready(function(){
	// Configure the malfunction description image uploader.
	malfunctionDescription = new InputUploader({
		context: $("#inptUpldr")[0],
		width: 452,
		height: 104,
		maxFiles: 3,
		resize: {maxHeight: 1080, maxWidth: 1920},
		limitSize: MAX_TOTAL_FILE_SIZE,
		limitAlert: function() {
			swal({
				title: 'Files Are Too Large',
				html: 'We are sorry! your files have passed the total <b>' + MAX_TOTAL_FILE_SIZE + '</b> files size limit, please select a smaller file.',
				type: 'warning',
			});
		},
	});
	

	// If formData object isn't supported don't allow image upload.
	if(typeof window.FormData === 'undefined') {
		malfunctionDescription.simplfy(true);
		FD_SUPPORT = false;
	}
	
	
	// Configure the range values.
	setRangeLabelValue ($("#urgencyLevel"));
	
	// On any ajax stop cancel the swal2 loader.
	$(document).ajaxStop(function () {
		swal.hideLoading();
	});
});

// ------------ Functions ------------

function setRangeLabelValue (input) {
	var value = $(input).val();
	if (value == "1")
		value = "Low";
	else if (value == "10")
		value = "High";
	
	$(input).next("span").text(value);
}

function disregardTime(checked) {
	if (checked) {
		$("#preferedTime").css({pointerEvents :"none", opacity: "0.4"});
		$("#daySelectorWrapper").css({pointerEvents :"none", opacity: "0.4"});
	}
	else {
		$("#preferedTime").css({pointerEvents :"auto", opacity: "1"});
		$("#daySelectorWrapper").css({pointerEvents :"auto", opacity: "1"});
	}
}

function getPreferedDays() {
	availabilityDays = [];
	selectedDays = $("#daySelectorWrapper input:checked");
	
	for (i = 0; i < selectedDays.length; i++) {
		availabilityDays.push($(selectedDays[i]).val());
	}
	return availabilityDays;
}

function formDataSubmit (recaptchaResponse) {
	var formData = new FormData();
	
	formData.append("address", $("#address").val());
	formData.append("apartmentNumber", $("#apartmentNumber").val());
	
	formData.append("residentName", $("#residentName").val());
	formData.append("contactInfo", $("#contactInfo").val());
	
	var numberOnly = false;
	// if not a single letter - assume phone number
	if (!$("#contactInfo").val().match(/[a-z]/i))
	{ 
		var numberOnly = true;
	}
	formData.append("numberOnly", numberOnly);
	
	formData.append("malfunctionLocation", $("#malfunctionLocation").val());
	
	formData.append("asSoonAsPossible", "" + $("#asSoonAsPossible").prop("checked")); // convert to string
	if (!$("#asSoonAsPossible").prop("checked")) {
		formData.append("preferedDays", getPreferedDays());
		formData.append("fromTime", $("#fromPreferedTime").val());
		formData.append("toTime", $("#toPreferedTime").val());
	}
	
	var malfDesc = malfunctionDescription.value();
	formData.append("malfunctionDescription", malfDesc.text);
	
	for (i = 0; i < malfDesc.files.length; i++) {
		formData.append('malfunctionImages[]', malfDesc.files[i], malfDesc.files[i].name);
	}
	
	var whenAndHow = $("#whenAndHow").val();
	if ($("#whenAndHow").val() == "")
		whenAndHow = " N/A ";
	formData.append("whenAndHow", whenAndHow);
	
	formData.append("urgencyLevel", $("#urgencyLevel").val());
	
	formData.append("recaptchaResponse", recaptchaResponse);
	
	$.ajax({
		url: "sendReport.php",
		method: "POST",
		data: formData,
		processData: false,
		contentType: false,
		beforeSend: function () {
			// If there are files to be uploaded initialize progress bar.
			if (malfDesc.files.length) {
				progressBar();
			}
			else {
				showSendingModal();
			}
		},
		xhr: function () {
			var xhr = new window.XMLHttpRequest();
			// Listen to the objects progress change
			xhr.upload.addEventListener("progress", handleProgress, false);
			return xhr;
		},
	}).done(function( data ) {
		sendingCompleted(data);
	});
}

function submitReport(recaptchaResponse) {	
	// If AJAX noy supported use fallback.
	if (!AJAX_SUPPORT) {
		submitNonAjax_fallback(recaptchaResponse);
		return;
	}

	// If formData is supported use it.
	if(FD_SUPPORT) {
		formDataSubmit (recaptchaResponse);
		return;
	}
	
	var data = new Object();
	
	data.address = $("#address").val();
	data.apartmentNumber = $("#apartmentNumber").val();
	
	data.residentName = $("#residentName").val();
	data.contactInfo = $("#contactInfo").val();
	
	var numberOnly = false;
	// if not a single letter - assume phone number
	if (!data.contactInfo.match(/[a-z]/i))
	{ 
		var numberOnly = true;
	}
	data.numberOnly = numberOnly;
	
	data.malfunctionLocation = $("#malfunctionLocation").val();
	
	data.asSoonAsPossible = "" + $("#asSoonAsPossible").prop("checked"); // convert to string
	if (!$("#asSoonAsPossible").prop("checked")) {
		data.preferedDays = getPreferedDays();
		data.fromTime = $("#fromPreferedTime").val();
		data.toTime = $("#toPreferedTime").val();
	}
	
	var malfDesc = malfunctionDescription.value();
	data.malfunctionDescription = malfDesc.text;
	data.whenAndHow = $("#whenAndHow").val();
	if ($("#whenAndHow").val() == "")
		data.whenAndHow = " N/A ";
	data.urgencyLevel = $("#urgencyLevel").val();
	
	data.recaptchaResponse = recaptchaResponse;
	$.ajax({
		url: "sendReport.php",
		method: "POST",
		data: data,
		beforeSend: showSendingModal(),
	}).done(function( data ) {
		sendingCompleted(data);
	});
}

function formValidation() {
	var malfDesc = malfunctionDescription.value();
	
	notFilledInputs = new Array();
	
	if ($("#address").val() == "")
		notFilledInputs.push("Building Name / Address");
	if ($("#apartmentNumber").val() == "")
		notFilledInputs.push("Apartment Number");
	if ($("#residentName").val() == "")
		notFilledInputs.push("Resident Name");
	if ($("#contactInfo").val() == "")
		notFilledInputs.push("Contact Info");
	if (malfDesc.text == "")
		notFilledInputs.push("Malfunction Description");
	
	if (notFilledInputs.length > 0)
	{
		swal({
			title: 'Please Finish The Form!',
			html: "Please make sure to fill the following fields: <small>" + notFilledInputs.join(", ") + "</small>", 
			type: 'warning',
			confirmButtonColor: '#3085d6',
		});
		return false;
	}
	else
	{
		if (!$("#asSoonAsPossible").prop("checked"))
		{
			if ($("#daySelectorWrapper input:checked").toArray().length == 0 || $("#fromPreferedTime").val() == "" || $("#toPreferedTime").val() == "")
			{
				swal({
					  title: 'Please Finish The Form!',
					  html: "Please select either preferred <small>days and time</small> or <small>as soon as possible</small>", 
					  type: 'warning',
					  confirmButtonColor: '#3085d6',
				});
				return false;
			}
		}

	}
	
	if (malfDesc.files == "wait") {		
		swal({
			title: 'Processing Your Uploads...',
			html: "Please wait just a few more second, your uploads are still being resized.", 
			type: 'info',
			allowOutsideClick: false,
			allowEscapeKey: false, 
			allowEnterKey: false,
		});
		swal.showLoading();
		
		malfunctionDescription.onResizeEnd(function(){
			swal.close();
			formValidation();
		});
		
		return false;
	}

	// run captcha and continue submition
	grecaptcha.execute();
}

function submitNonAjax_fallback(recaptchaResponse) {
	var numberOnly = false;
	// if not a single letter - assume phone number
	if (!$("#contactInfo").val().match(/[a-z]/i))
	{ 
		var numberOnly = true;
	}
	
	var tempForm = $("<form action='sendReport.php' method='POST' id='tempForm' style='display: none;'></form>");	
	
	tempInput = $("<input type='text' name='address' />").val( $("#address").val() );
	tempForm.append(tempInput);
	tempInput = $("<input type='text' name='apartmentNumber' />").val( $("#apartmentNumber").val() );
	tempForm.append(tempInput);
	tempInput = $("<input type='text' name='residentName' />").val( $("#residentName").val() );
	tempForm.append(tempInput);
	tempInput = $("<input type='text' name='contactInfo' />").val( $("#contactInfo").val() );
	tempForm.append(tempInput);
	tempInput = $("<input type='checkbox' name='numberOnly' />").prop("checked", numberOnly);
	tempForm.append(tempInput);
	tempInput = $("<input type='text' name='malfunctionLocation' />").val( $("#malfunctionLocation").val() );
	tempForm.append(tempInput);
	tempInput = $("<input type='text' name='asSoonAsPossible' />").val( "" + $("#asSoonAsPossible").prop("checked") );
	tempForm.append(tempInput);
			
	if (!$("#asSoonAsPossible").prop("checked")) {
		tempInput = $("<input type='text' name='preferedDays' />").val( getPreferedDays() );
		tempForm.append(tempInput);
		tempInput = $("<input type='text' name='fromTime' />").val( $("#fromPreferedTime").val() );
		tempForm.append(tempInput);
		tempInput = $("<input type='text' name='toTime' />").val( $("#toPreferedTime").val() );
		tempForm.append(tempInput);
	}
	
	tempInput = $("<textarea name='malfunctionDescription'></textarea>").val( malfunctionDescription.value().text );
	tempForm.append(tempInput);
	
	var whenAndHow = $("#whenAndHow").val();
	if ($("#whenAndHow").val() == "") {
		whenAndHow = " N/A ";
	}
	tempInput = $("<textarea name='whenAndHow'></textarea>").val( whenAndHow );
	tempForm.append(tempInput);
	
	tempInput = $("<input type='text' name='urgencyLevel' />").val( $("#urgencyLevel").val() );
	tempForm.append(tempInput);
	tempInput = $("<input type='text' name='recaptchaResponse' />").val( recaptchaResponse );
	tempForm.append(tempInput);
	
	$(document.body).append(tempForm);
	tempForm.submit();
}

/* 
*	Sending ajax request completion handler.
*	Check for return statuse and act accordingly.
*/
function sendingCompleted(data) {
	// If ecounterd errors sending emails
	if (data.toLowerCase().includes("error"))			
	{
		if (data.includes("post_max_size")) {
			swal('Oops...', 'The images size was too large. Please use smaller images.', 'error');
		}
		else {
			swal('Oops...', 'Something went wrong! Please try again.', 'error');
		}
	}
	else
	{
		// If ongoing maintenance
		if (data.includes("maintenance"))			
		{
			swal('Oops...', 'We are sorry! there\'s an ongoing maintenance, please try again later.', 'error');
		}
		else
		{
			swal({
				  title: 'Report Submitted!',
				  html: "Thank you for filling this form. <br/> <small>Your report have been sent to our maintenance team and will be taken care of as soon as possible.</small>", 
				  type: 'success',
				  confirmButtonColor: '#3085d6',
			});
			
			// reset form
			malfunctionDescription.clear();
			disregardTime(false);
			$("select")[0].selectedIndex = 0;
			$("input[type=text]").val("");
			$("input[type=time]").val("");
			$("input[type=checkbox]").prop("checked", false);
			$("textarea").val("");
		}
	}
	
	//debuging info
	console.log(data);
}

/* 
*	Initialize the progress bar modal.
*/
function progressBar() {
	var progressBar = '<div class="progress">';
		progressBar +=	'<span class="progress-bar"><span class="progress-in" style="width: 0%"></span></span>';
	progressBar +=	'</div>';
	
	swal({
		title: 'Uplaoding',
		html: "Please wait, uploading your images..." + "<br>" + progressBar, 
		imageUrl: 'Images/upload_icon.png',
		imageHeight: 100,
		imageWidth: 100,
		allowOutsideClick: false,
		allowEscapeKey: false, 
		allowEnterKey: false,
	});
	swal.showLoading();
	
	var buttonWrapper = $(swal.getButtonsWrapper());
	var loader = buttonWrapper.find(".swal2-confirm");
	
	// Expand the loader size
	loader.height(50);
	loader.width(50);
	
	// Fit the progress bar value inside the loader.
	progressVal =	'<span class="progress-val">0%</span>';
	buttonWrapper.prepend(progressVal);	
}

/* 
*	Handle the progress change, update the bar accordingly.
*	on upload finish load the "sending" modal.
*/
function handleProgress(evt) {
	if (evt.lengthComputable) {
		var percent = evt.loaded / evt.total;
		percentComplete = parseInt(percent * 100) + "%";
		// Update the progress bar
		$(".progress-bar .progress-in").width(percentComplete);
		// Update the progress value
		$(".progress-val").html(percentComplete);	
		
		// On upload finish
		if (percent == 1) {
			showSendingModal();
		}
	}
}

/*
*	Initialize the "sending" modal.
*/
function showSendingModal() {
	swal.close();
	swal({
		title: 'Sending',
		text: "Just one more moment...", 
		imageUrl: 'Images/send_icon.png',
		imageHeight: 100,
		imageWidth: 100,
		allowOutsideClick: false,
		allowEscapeKey: false, 
		allowEnterKey: false,
	});
	swal.showLoading();
}


