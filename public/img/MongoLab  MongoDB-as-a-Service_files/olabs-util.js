/******************************************************************************
* olabs-util.js
*
* William Shulman
*
* 09.18.2010
*/

/******************************************************************************
 * getUrlParams
 */
function getUrlParams() {
    var result = {};

    var startIndex = window.location.href.indexOf('?') + 1;
    if (startIndex > 0) {
        var params = window.location.href.slice(startIndex).split('&');
        if (params && params != "") {
            for(var i = 0; i < params.length; i++) {
                var param = params[i].split('=');
                result[param[0]] = param[1];
            }
        }
    }
    return(result);
}

/******************************************************************************
 * serializeUrlParams
 */
function serializeUrlParams(params) {
    var result = "?";
    var first = true;
    if (params) {
        for (param in params) {
            if (!first) {
                result += "&";
            }
            result += param + "=" + params[param];
            first = false;
        }
    }
    return(result);
}

function makeXdrSuccessHandler(xdr, success, error) {
  return function() {
    var response = xdr.responseText;
    if(response) {
      success($.parseJSON(response));
    } else {
      error();
    }
  };
}

function getJson(url, success, error) {
    if($.browser.msie && window.XDomainRequest) {
      var xdr = new XDomainRequest();
      xdr.open("get", url);
      if(success) {
        xdr.onload = makeXdrSuccessHandler(xdr, success, error);
      }
      if(error) {
        xdr.onerror = error;
      }
      xdr.onprogress = function() {};
      xdr.timeout = 20000;
      xdr.ontimeout = error;
      setTimeout(function() { xdr.send(); }, 0);
    } else {
      $.get(url, null, null, "json").success(success).error(error);
    }
}

