/* jslint browser: true */
/* global CodeMirror */
var currentLanguage = '';
var estimator = new LanguageEstimator();

var myCodeMirror;

var loadview = document.getElementById("loadview");
if (loadview) {
	myCodeMirror = CodeMirror(document.querySelector("core-header-panel"), {
		theme: "light",
		value: decodeURIComponent(loadview.value),
		lineWrapping: true,
		lineNumbers: true,
		styleActiveLine: true,
		matchBrackets: true,
		autofocus: true,
		viewportMargin: Infinity,
		makeLinksClickable: true
	});
	if (window.location.hash) {
		jumpToLine(window.location.hash.substring(1));
	}
} else {
	myCodeMirror = CodeMirror(document.querySelector("core-header-panel"), {
		theme: "light",
		lineWrapping: true,
		styleActiveLine: true,
		matchBrackets: true,
		viewportMargin: 5000,
		lineNumbers: true,
		autofocus: true,
		makeLinksClickable: true
	});
}
var mSelector = document.querySelector("meta[name='syntax-language']").getAttribute("data");
if (mSelector !== "auto" && mSelector) loadLanguage(mSelector);

myCodeMirror.getWrapperElement().addEventListener("paste", function(e) {
	var languageSelector = document.getElementById("languages");
	var oldContents = myCodeMirror.getValue();
	var pasteAttempts = 0;
	var pasteTimer = setInterval(function() {
		pasteAttempts++;
		if (pasteAttempts > 60) clearInterval(pasteAttempts);
		var textEditorContents = myCodeMirror.getValue();
		if (textEditorContents !== oldContents) {
			clearInterval(pasteTimer);
			jumpToLine(1);
			if (languageSelector.value == "auto") {
				var getLanguage = estimator.estimateLanguage(myCodeMirror.getValue());
				if (getLanguage !== null) {
					currentLanguage = getLanguage;
					languageSelector.options[languageSelector.selectedIndex].text = "Auto (" + getOptionTextByValue(languageSelector.options, getLanguage) + ")";
					loadLanguage(getLanguage);
				} else {
					document.querySelector(".balloon.language").classList.add("active");
				}
			}
		}
	}, 50);
});


function getOptionTextByValue(options, value) {
	for (var i = 0, len = options.length; i < len; i++) {
		if (options[i].value == value) return options[i].text;
	}
	return null;
}

function loadLanguage(language) {
	var languageSelector = document.getElementById("languages");
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "api/language/get?lang=" +language, true);
	xhr.withCredentials = true;
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			var response = JSON.parse(xhr.responseText);

			if (response[0].experimental) {
				if (!confirm("Support for this language is still experimental and may not behave as expected. Use at your own risk.")) {
					languageSelector.value = "text";
					return;
				}
			}
			if (!response.error) {
				var body=document.body;
				var modes = document.querySelectorAll("[rel='syntax']");
				for (var j = 0, jlen = modes.length; j < jlen; j++) {
					body.removeChild(modes[j]);
				}
				for (var i = 0, len = response[0].modes.length; i < len; i++) {
					var script= document.createElement('script');
					script.type= 'text/javascript';
					script.setAttribute("rel", "syntax");
					script.onload = function() {
						myCodeMirror.setOption("mode", response[0].MIME);
					};
					script.src= 'static/js/mode/' + response[0].modes[i] + '/' + response[0].modes[i] + '.js';
					body.appendChild(script);
				}
			} else {
				alert("Error: " + response.error.message);
			}
		}
	};
	xhr.send();
}


/*document.getElementById("languages").addEventListener("change", function(e) {
	document.querySelector(".balloon").classList.remove("active");
	currentLanguage = e.target.value;
	createCookie("language", e.target.value, 3652);
	loadLanguage(e.target.value);
}, false);*/


function onExpireChange(e) {
	createCookie("expires", e.target.value);
}

function onThemeSwitch(e) {
	var newTheme = e.target.checked ? "light" : "dark";
	var stylesheet = document.createElement('link');
	var head = document.getElementsByTagName('head')[0];
	stylesheet.setAttribute("href", "static/css/theme/" + newTheme + ".css");
	stylesheet.setAttribute("rel", "stylesheet");
	stylesheet.setAttribute("data-rel", "theme");
	stylesheet.setAttribute("type", "text/css");
	head.removeChild(head.querySelector("[data-rel='theme']"));
	head.appendChild(stylesheet);
	myCodeMirror.setOption("theme", newTheme);
	document.body.className = newTheme;
	createCookie("theme", newTheme, 3652);
}

/*var submitButton = document.getElementById("submitButton");
submitButton.addEventListener("click", function(e) {
	if (myCodeMirror.getValue().length == 0) {
		alert("The paste can not be empty.");
		return;
	}
	if (!readCookie("terms")) {
		submitButton.disabled = true;
		document.querySelector(".balloon.terms").classList.add("active");
		document.querySelector(".balloon.terms input").addEventListener("change", function() {
			createCookie("terms", true, 3652);
			submitButton.disabled = false;
			document.querySelector(".balloon.terms").classList.remove("active");
		}, false);
		return;
	}
	var pasteLanguage = (currentLanguage !== "auto" ? currentLanguage : "text");
	var expireTime = document.getElementById("expires").value;
	var encryptionKey = document.getElementById("encrypt").value;
	var selfDestruct = document.getElementById("self_destruct").checked;
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "api/post" + e.target.value, true);
	xhr.withCredentials = true;
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			var response = JSON.parse(xhr.responseText);
			if (!response.error) {
				var redirectLink = window.location = response.result.url;
				if (encryptionKey) redirectLink += "?key=" + encodeURIComponent(response.result.key);
				window.location = redirectLink;
			} else {
				alert("Error: " + response.error);
			}
		}
	};
	var data = new FormData();
	data.append("data", encodeURIComponent(myCodeMirror.getValue()));
	data.append("lang", pasteLanguage);
	data.append("expires", expireTime);
	if (selfDestruct) data.append("self_destruct", 1);
	if (encryptionKey) data.append("encrypt", encryptionKey);
	xhr.send(data);
}, false);*/


function jumpToLine(line) {
	if (line && !isNaN(Number(line))) {
		myCodeMirror.setCursor(Number(line-1),0);
		myCodeMirror.focus();
		var cursor = document.querySelector(".CodeMirror-cursor");
		cursor.scrollIntoView();
    }
}

function createCookie(name, value, expires, path, domain) {
	var cookie = name + "=" + value + ";";
	if (expires) {
		if(expires instanceof Date) {
			if (isNaN(expires.getTime())) {
				expires = new Date();
			}
		} else {
			expires = new Date(new Date().getTime() + parseInt(expires, 10) * 1000 * 60 * 60 * 24);
		}
		cookie += "expires=" + expires.toGMTString() + ";";
	}
	if (path) cookie += "path=" + path + ";";
	if (domain) cookie += "domain=" + domain + ";";
	document.cookie = cookie;
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}
