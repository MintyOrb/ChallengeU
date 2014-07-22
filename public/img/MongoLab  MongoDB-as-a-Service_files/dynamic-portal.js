/**
 * User: robert
 * Date: 1/2/13
 * Time: 11:42 AM
 */
function apiQueryParams(apiKey, mode) {
  var queryParams = {"apiKey": apiKey};
  if (mode) queryParams["mode"] = mode;
  return queryParams;
}

function pollDatabaseStatus(dbName, rowId, statusUrl, retries, noLinks) {
  $("#"+rowId).removeClass('link');
  $("#"+rowId).addClass('nolink');
  getJson(statusUrl,
    function(data) {
      if(isDatabaseUnderConstruction(data)) {
        var error = getConstructionError(data);
        if(error) {
          handleDatabaseConstructionError(rowId, error);
          stopDatabasePolling(rowId);
        } else {
          updateDatabaseLoadingIndicator(rowId, data, function() { pollDatabaseStatus(dbName, rowId, statusUrl, null, noLinks); });
        }
      } else {
        makeDatabaseRowPopulator(rowId, noLinks)(data);
        stopDatabasePolling(rowId);
      }
    },
    function() {
      if(retries && retries >= 3) {
        makeDatabaseRowPopulator(rowId, noLinks)(null);
      } else {
        pollDatabaseStatus(dbName, rowId, statusUrl, (retries || 0) + 1, noLinks);
      }
    });
}

function isDatabaseUnderConstruction(status) {
  return status && (("underConstruction" in status && status["underConstruction"]) ||
    ("loggedState" in status && status["loggedState"] && status["loggedState"] != "provisioned"));
}

function getConstructionError(status) {
  return status && "constructionError" in status && status["constructionError"];
}

function updateDatabaseLoadingIndicator(rowId, data, next) {
  // update feedback message
  showAllFeedback(rowId, data.progress, next);
}

function showAllFeedback(rowId, messages, next) {
  var $feedback = $("#"+rowId+" .loadingDatabase .loading");
  var $lastActivityTime = $("#"+rowId+" .loadingDatabase .lastActivityTime");
  if( ! $lastActivityTime.html() ) {
    var seedTime = new Date().getTime();
    if(messages && messages.length > 0) {
      var lastMsgTime = messages[messages.length-1].ts["$date"];
      if(lastMsgTime < seedTime) {
        seedTime = lastMsgTime;
      }
    }
    $lastActivityTime.html(seedTime - 5000);
  }
  if(messages && messages.length > 0) {
    var m = messages.shift();
    var t = m.ts && m.ts["$date"];
    if( t > $lastActivityTime.html() ) {
      var message = m.message;
      if($feedback.html() != message) {
        $feedback.animate({"opacity":0}, 500, function() {
          $feedback.html(message);
          $feedback.animate({"opacity":1}, 500, function() {
            $lastActivityTime.html(t);
            setTimeout(function() { showAllFeedback(rowId, messages, next)}, 2000);
          });
        });
        return;
      }
    }
    showAllFeedback(rowId, messages, next);
    return;
  }
  setTimeout(next, 3000);
}

function stopDatabasePolling(rowId) {
  // linkify the row
  $("#"+rowId).addClass('link');
  $("#"+rowId).removeClass('nolink');
  $("#"+rowId+" .actionBtns").show();
  $("#"+rowId).effect("highlight", {color: "#A6CBE1"}, 3000);
}
function populateDatabasesTable(apiKey, tableId, cluster, server, connection, systemDbs, flush, enableEarlyLinks, noLinks) {
  var dbNamesUrl = getRootApiUrl()+makeBaseEntityUrl(cluster, server, connection);
  var params = apiQueryParams(apiKey, flush && "flush");
  if(systemDbs) {
    params["systemOnly"] = true;
  } else {
    params["userOnly"] = true;
  }
  if(!cluster && !server && !connection) {
    params["multiTenantOnly"] = true;
  }
  dbNamesUrl += "/databases"+serializeUrlParams(params);
  getJson(dbNamesUrl,
    function(data) {
      $("#"+tableId+"-loading").hide();
      if(data && data.length > 0) {
        populateDatabasesTableRows(apiKey, tableId, data, cluster, server, connection, flush, enableEarlyLinks, noLinks);
      } else {
        $("#"+tableId+"-none").slideDown();
      }
    },
    function() {
      $("#"+tableId+"-loading").hide();
      $("#"+tableId+"-error").slideDown();
    }
  );
}

function populateDatabasesTableRows(apiKey, tableId, names, cluster, server, connection, flush, enableEarlyLinks, noLinks) {
  var $tbody = $("#"+tableId+" tbody");
  var rowIdPrefix = tableId+"-tr-";

  $tbody.empty();
  for(var i in names) {
    var name = names[i];
    var rowId = rowIdPrefix + i;
    $tbody.append('<tr id="'+rowId+'" class="databaseTableDataRow" clusterId="'+cluster+'" serverId="'+server+'" connectionId="'+connection+'"></tr>');
    var $row = $("#"+rowId);
    $row.append('<td class="databaseName">'+name+'</td>');
    if(!cluster && !server && !connection) {
      $row.append('<td class="planName loadingDatabaseComplete"></td>');
      $row.append('<td class="cloudName loadingDatabaseComplete"></td>');
    }
    $row.append('<td class="number numObjects loadingDatabaseComplete"></td>');
    $row.append('<td class="number size loadingDatabaseComplete"></td>');
    $row.append('<td class="number fileSize loadingDatabaseComplete"></td>');
    $row.append('<td colspan="100" class="loadingDatabase"><div class="loadingWheel"></div><span class="loading">Loading...</span><span class="lastActivityTime" style="display:none"></span></td>');
    $row.append('<td colspan="100" class="loadingDatabaseFailed" style="display:none"><span class="loadingError">too busy/slow to respond</span></td>');
    // make row clickable before loading if desired
    if(enableEarlyLinks && !noLinks) {
      linkifyDatabaseRow(rowId);
    }
  }
  // color the rows
  $("#"+tableId+" tr.databaseTableDataRow:even").addClass("even");
  $("#"+tableId+" tr.databaseTableDataRow:odd").addClass("odd");

  // cluster puck databases should not look linkable
  $("div.cluster-summary.link #"+tableId+" tr.databaseTableDataRow:hover").addClass("nolink");
  $("div.cluster-summary.link #"+tableId+" tr.databaseTableDataRow").addClass("nolink");

  // attach contextual help
  bindSpecificHelp( $(".size"), 'data plus indexes' );
  bindSpecificHelp( $(".fileSize"), 'File Size' );
  // show the table
  $("#"+tableId+"-div").slideDown();
  var queryString = serializeUrlParams(apiQueryParams(apiKey, flush && "flush"));
  for(i in names) {
    name = names[i];
    rowId = rowIdPrefix + i;
    var dbStatusUrl = getRootApiUrl()+makeBaseEntityUrl(cluster, server, connection);
    dbStatusUrl += "/databases/"+escape(name)+"/status"+queryString;
    var resultHandler = null;
    if(connection) {
      resultHandler = makeDatabaseRowPopulator(rowId, noLinks);
    } else {
      resultHandler = makePollingDatabaseRowPopulator(rowId, name, dbStatusUrl, noLinks);
    }
    getJson(dbStatusUrl, resultHandler, resultHandler);
  }
}

function makePollingDatabaseRowPopulator(rowId, name, statusUrl, noLinks) {
  return function(data) {
    if(isDatabaseUnderConstruction(data)) {
      var error = getConstructionError(data);
      if(error) {
        handleDatabaseConstructionError(rowId, error);
      } else {
        $("#"+rowId+" .loadingDatabase .loading").html("Thanks for your patience as we work on your database...")
        // turn on loading wheel
        var opts = { lines: 9,  length: 0,  width: 2,  radius: 5,  corners: 1,  rotate: 0,  color: '#A6CBE1',  speed: 1,  trail: 40,  className: 'spinner' };
        new Spinner(opts).spin($("#"+rowId+" .loadingDatabase .loadingWheel")[0]);
        pollDatabaseStatus(name, rowId, statusUrl, null, noLinks);
      }
    } else {
      makeDatabaseRowPopulator(rowId, noLinks)(data);
    }
  };
}

function makeDatabaseRowPopulator(rowId, noLinks) {
  return function(data) {
    if(data && data["stats"]) {
      populateDbStatsRow(
        rowId,
        data["plan"] ? data["plan"]["name"] : "",
        data["cloud"] ? data["cloud"]["name"] : "",
        data["stats"]["objects"],
        data["prettyStats"]["prettyFullSize"],
        data["prettyStats"]["prettyFileSize"]);
    } else {
      $("#"+rowId+" .loadingDatabase").hide();
      $("#"+rowId+" .loadingDatabaseFailed").show();
    }
    if(!noLinks) {
      linkifyDatabaseRow(rowId);
    }
  };
}

var CONSTRUCTION_ERROR_CONTENTS = {
  "text search not enabled": "The source database contains a text index, which is not supported by the selected plan.  Please select an Experimental Sandbox database if you'd like to use text indexes.",
  "create collection invalid size spec": '<p>An error occurred while cloning data from the source database:</p><p style="font-family:monospace">create collection invalid size spec</p><p>This is caused by a known incompatibility in collection metadata between MongoDB v2.4 and older versions: <a href="https://jira.mongodb.org/browse/SERVER-9501" target="_blank">SERVER-9501</a>  For more information, including viable workarounds, please refer to the linked issue.</p>'
}

function getConstructionErrorMesage(msg) {
  if(msg) {
    for(var key in CONSTRUCTION_ERROR_CONTENTS) {
      if(msg.indexOf(key) >= 0) {
        return CONSTRUCTION_ERROR_CONTENTS[key];
      }
    }
  }
  return null;
}

function makeConstructionErrorDialogContent(dialogId, message) {
  if(message) {
    return '<span class="ui-icon ui-icon-alert"></span>'+
      '<span class="constructionErrorMessage">'+message+'</span>'+
      '<p>Please contact <a href="javascript:mailto();" style="text-decoration:underline">support@mongolab.com</a>'+
      ' with questions if you think you\'ve resolved the problem and would like us to try re-running the operation.'+
      '  If you\'d like to remove this subscription, please '+
      '<a href="javascript:submitConstructionDeleteForm(\''+dialogId+'\');" class="link">click here</a>.';
  } else {
    return '<span class="ui-icon ui-icon-alert"></span>'+
      '<span class="constructionErrorMessage">An unexpected error occurred while building your subscription.</span>'+
      '<p>Please contact <a href="javascript:mailto();" style="text-decoration:underline">support@mongolab.com</a>'+
      ' for assistance and more information.'+
      '  If you\'d like to remove this subscription, please '+
      '<a href="javascript:submitConstructionDeleteForm(\''+dialogId+'\');" class="link">click here</a>.';
  }
}

function makeDbConstructionErrorDialogOpener(rowId, message) {
  return function() {
    var $row = $("#"+rowId);
    var $body = $("body");
    var dialogId = rowId+"_deleteError";
    var $dialog = $("#"+dialogId);
    if(!$dialog.length) {
      // build dialog (basically a modified delete dialog)
      $body.append('<form action="/delete" method="POST" id="'+dialogId+'" title="Error" style="display:none;"></form>');
      $dialog = $("#"+dialogId);
      // add dialog content
      $dialog.append(makeConstructionErrorDialogContent(dialogId, message));
      // add hidden fields for delete
      var db = $row.find(".databaseName").html();
      $dialog.append('<input type="hidden" name="db" value="'+db+'"/>');
      initMsgDialog("#"+dialogId, 458);
    }
    openDialog("#"+dialogId);
  }
}

function submitConstructionDeleteForm(dialogId) {
  $("#"+dialogId).submit();
}

function handleDatabaseConstructionError(rowId, error) {
  var $row = $("#"+rowId);
  var msg = getConstructionErrorMesage(error.message);
  $row.append('<td colspan="100" class="constructionError" style="display:none"><span class="errorData">Error creating database.  Click here for more info.</span></td>');
  $row.click(makeDbConstructionErrorDialogOpener(rowId, msg));
  $row.addClass("link");
  $row.find(".loadingDatabase").hide();
  $row.find(".constructionError").show();
}

function linkifyDatabaseRow(rowId) {
  var $row = $("#"+rowId);
  if(!$row.hasClass("link")) {
    $row.click(makeDatabaseRowClickHandler(rowId));
    $row.addClass("link");
  }
}

function makeDatabaseRowClickHandler(rowId) {
  var $row = $("#"+rowId);
  var cluster = $row.attr("clusterId");
  var server = $row.attr("serverId");
  var connection = $row.attr("connectionId");
  var dbName = $row.find(".databaseName").html();
  var url = makeBaseEntityUrl(cluster, server, connection)+"/databases/"+escape(dbName);
  return function() {
    location.href = url;
  }
}

function makeBaseEntityUrl(cluster, server, connection) {
  var url = "";
  if(connection) {
    url += "/connections/"+connection;
    if(cluster && server) {
      url += "/servers/"+server;
    }
  } else if(cluster) {
    url += "/clusters/"+cluster;
    if(server) {
      url += "/servers/"+server;
    }
  } else if(server) {
    url += "/servers/"+server;
  }
  return url;
}

function populateDbStatsRow(rowId, planName, cloudName, numObjects, fullSize, fileSize) {
  $("#"+rowId+" .planName").html(planName);
  $("#"+rowId+" .numObjects").html(numObjects);
  $("#"+rowId+" .size").html(fullSize);
  $("#"+rowId+" .fileSize").html(fileSize);
  $("#"+rowId+" .cloudName").html(cloudName);
  $("#"+rowId+" .number").attr("nowrap", true);
  $("#"+rowId+" .loadingDatabase").hide();
  $("#"+rowId+" .loadingDatabaseComplete").show();
  $("#"+rowId+" .number").commas();
}

function populateClusterStatus(clusterId, apiKey, flush) {
  var params = apiQueryParams(apiKey, flush && "flush");
  var url = getRootApiUrl() + "/clusters/" + clusterId + "/status" + serializeUrlParams(params);
  var processResponse =
    function(data) {
      var $statusDiv = $("#"+clusterId+"-status .healthStatusDisplay");
      var $lagDiv = $("#"+clusterId+"-status .replicationLagValue");
      var $planNameDiv = $("#"+clusterId+"-status .clusterPlan");
      var $cloudDiv = $("#"+clusterId+"-status .clusterCloud");
      if(data) {
        var statusValue = data["overallStatus"];
        $statusDiv.html(statusValue);

        // determine CSS class
        var statusStyle = "healthStatus3";
        if(statusValue == "up") {
          statusStyle = "healthStatus1";
        } else if(statusValue == "warning") {
          statusStyle = "healthStatus2";
        } else if(statusValue == "down") {
          statusStyle = "healthStatus0";
        } else if(statusValue == "under construction") {
          statusStyle = "healthStatus4";
        }
        $statusDiv.addClass(statusStyle);

        // calculate repl lag phrase
        var lag = data["replicationLag"];
        if(lag < 0) {
          $lagDiv.addClass("repLag-unrecoverable");
          $lagDiv.html("unrecoverable");
        } else {
          $lagDiv.addClass("repLag-"+data["replicationLagUnit"]);
          $lagDiv.html(data["replicationLagPhrase"]);
        }

        // add plan description
        $planNameDiv.html(data["planDescription"]);

        // add cloud name
        if(data["cloudName"]) {
          $cloudDiv.html(data["cloudName"]);
        }
      } else {
        $statusDiv.addClass("healthStatus4");
        $statusDiv.html("unknown");
        $lagDiv.addClass("repLag-unknown");
        $lagDiv.html("unknown");
        $planNameDiv.addClass("clusterPlanUnknown");
        $planNameDiv.html("unknown");
      }
      $statusDiv.removeClass("healthStatusLoading");
      $lagDiv.removeClass("repLag-loading");
      $planNameDiv.removeClass("clusterPlanLoading");
      $("#"+clusterId+"-status").fadeIn("slow");
    };
  var processFailure =
    function() {
      var $statusDiv = $("#"+clusterId+"-status .healthStatusDisplay");
      var $lagDiv = $("#"+clusterId+"-status .replicationLagValue");
      var $planNameDiv = $("#"+clusterId+"-status .clusterPlan");
      $statusDiv.removeClass("healthStatusLoading");
      $lagDiv.removeClass("repLag-loading");
      $planNameDiv.removeClass("clusterPlanLoading");
      $statusDiv.addClass("healthStatus4");
      $statusDiv.html("unknown");
      $lagDiv.addClass("repLag-unknown");
      $lagDiv.html("unknown");
      $planNameDiv.addClass("clusterPlanUnknown");
      $planNameDiv.html("unknown");
      $("#"+clusterId+"-status").fadeIn("slow");
    };
  getJson(url, processResponse, processFailure);
}

function makeClusterConstructionErrorDialogOpener(clusterId, message) {
  return function() {
    var $body = $("body");
    var dialogId = clusterId+"_deleteError";
    var $dialog = $("#"+dialogId);
    if(!$dialog.length) {
      // build dialog (basically a modified delete dialog)
      $body.append('<form action="/deletecluster" method="POST" id="'+dialogId+'" title="Error" style="display:none;"></form>');
      $dialog = $("#"+dialogId);
      // add dialog content
      $dialog.append(makeConstructionErrorDialogContent(dialogId, message));
      // add hidden fields for delete
      $dialog.append('<input type="hidden" name="cluster" value="'+clusterId+'"/>');
      initMsgDialog("#"+dialogId, 410);
    }
    openDialog("#"+dialogId);
  }
}

function handleClusterConstructionError(clusterId, error) {
  var $completeDiv = $("#"+clusterId+"ConstructionCompleteDiv");
  // change contents of completion div
  $completeDiv.html('<span class="errorData">Error creating cluster.  Click here for more info.</span>');
  // make cluster puck open error dialog
  var $clusterPuck = $("#"+clusterId+"-section");
  var msg = getConstructionErrorMesage(error.message);
  $clusterPuck.click(makeClusterConstructionErrorDialogOpener(clusterId, msg));
  $clusterPuck.addClass("link");
  // show new content
  $("#"+clusterId+"UnderConstructionDiv").hide();
  $completeDiv.show();
}

function makeClusterStatusHandler(clusterId, apiKey) {
  return function(data) {
    if(data && (data["overallStatus"] != "under construction")) {
      stopClusterPolling(clusterId);
      setTimeout(function() { clusterWakeUp(clusterId, apiKey); }, 4000);
    } else {
      var error = getConstructionError(data);
      if(error) {
        handleClusterConstructionError(clusterId, error);
      } else {
        updateClusterLoadingIndicator(clusterId, data);
        setTimeout(function() { pollClusterStatus(clusterId, apiKey); }, 5000);
      }
    }
  }
}

function clusterWakeUp(clusterId, apiKey) {
  linkifyClusterStatus(clusterId);
  //linkifyClusterTitle(clusterId);
  linkifyClusterSection(clusterId);
  populateDatabasesTable(apiKey, clusterId+"-DATABASES", clusterId, null, null, false, true, false, true);
  populateClusterStatus(clusterId, apiKey, true);
}
function pollClusterStatus(clusterId, apiKey) {
  $("#"+clusterId+"UnderConstructionDiv").show();
  $("#"+clusterId+"ConstructionCompleteDiv").hide();
  var url = getRootApiUrl()+"/clusters/"+clusterId+"/status"+serializeUrlParams({"apiKey":apiKey});
  getJson(url, makeClusterStatusHandler(clusterId, apiKey), null);
}

function updateClusterLoadingIndicator(clusterId, data) {
  // update indicator ellipsis
  var $indicator = $("#"+clusterId+"UnderConstructionDiv .loading");
  if($indicator.html().length < 3) {
    $indicator.html($indicator.html()+".");
  } else {
    $indicator.html("");
  }

  // update feedback message
  if(data && data.activity) {
    var activity = data.activity;
    var message = activity[activity.length-1].message;
    var $feedback = $("#"+clusterId+"UnderConstructionDiv .activity");
    if($feedback.html() != message) {
      $feedback.animate({"opacity":0}, 500, function() {
        $feedback.html(message);
        $feedback.animate({"opacity":1}, 500);
      });
    }
  }

}

function linkifyNode(nodeSelector, linkUri) {
  var theNode = $(nodeSelector);
  theNode.addClass("link");
  theNode.click(function () { location.href = linkUri; });
}
function linkifyClusterTitle(clusterId) {
  linkifyNode("#" + clusterId + "-title", "/clusters/" + clusterId);
}
function linkifyClusterSection(clusterId) {
  linkifyNode("#" + clusterId + "-section", "/clusters/" + clusterId);
}
function linkifyClusterStatus(clusterId) {
  linkifyNode("#" + clusterId + "-status", "/clusters/" + clusterId + "#servers");
}

function stopClusterPolling(clusterId) {
  $("#"+clusterId+"UnderConstructionDiv").hide();
  //linkifyClusterTitle(clusterId);
  linkifyClusterSection(clusterId);
  $("#"+clusterId+"ConstructionCompleteDiv").show();
  $("#"+clusterId+"-title").parent().effect("highlight", {color: "#A6CBE1"}, 3000);
}

function fetchCollectionNames(apiKey, success, error) {
  var collectionNamesUrl = getApiUrl("database")+"/collections";
  var params = {"apiKey":apiKey, "mode":"raw"};
  collectionNamesUrl += serializeUrlParams(params);
  getJson(collectionNamesUrl, success, error);
}

function fetchCollectionStats(apiKey, success, error) {
  var collectionNamesUrl = getApiUrl("database")+"/status";
  var params = {"apiKey":apiKey, "mode":"raw", "collectionStats":"true"};
  collectionNamesUrl += serializeUrlParams(params);
  getJson(collectionNamesUrl, success, error);
}

function populateServerStatuses(clusterId, apiKey) {
  var params = apiQueryParams(apiKey);
  params["full"] = "true";
  var url = getRootApiUrl() + "/clusters/" + clusterId + "/status" + serializeUrlParams(params);
  var processResponse =
    function(data) {
      // populate replica set conf
      if(data["rsConf"]) {
        $("#replicaSetConfiguration").html(JSON.stringify(data["rsConf"], null, "  "));
      }
      // populate servers
      var members = data["members"];
      if(members) {
        var footnoteIndex = 1;
        for(var i=0; i < members.length; i++) {
          var member = members[i];
          var $row = $("#"+member["id"]);
          if($row.length && member && member["selfReplStatus"]) {
            // set status CSS class
            var state = member["selfReplStatus"]["state"];
            $row.addClass("replState"+state);

            // populate state column
            var stateStr = member["selfReplStatus"]["stateStr"];
            $row.find(".memberStatus").html(stateStr);

            // populate optime column
            var $optime = $row.find(".memberOptime");
            if(stateStr == "ARBITER") {
              $optime.html("n/a");
            } else {
              $optime.addClass("optime-"+member["optimePhraseUnit"]+"-old");
              $optime.html(member["optimePhrase"]);
              var delay = getSlaveDelay(member);
              if(delay) {
                $optime.append(" <sup>"+footnoteIndex+"</sup>");
                addSlaveDelayFootnote(footnoteIndex, delay);
                footnoteIndex++;
              }
            }

            // populate heartbeat column
            var $heartbeat = $row.find(".memberHeartbeat");
            $heartbeat.addClass("optime-"+member["heartbeatPhraseUnit"]+"-old");
            $heartbeat.html(member["heartbeatPhrase"]);
          }
        }
      } else {
        processFailure();
      }
      $.event.trigger({type: "serverStatusLoaded",
                       message: "server status loaded",
                       time: new Date()});
    };
  var processFailure =
    function() {
      $(".memberStatus").html("");
      $(".memberOptime").html("");
      $(".memberHeartbeat").html("");
    };
  getJson(url, processResponse, processFailure);
}

function getSlaveDelay(member) {
  if(member && member["serverStatus"] && member["serverStatus"]["repl"]) {
    return member["serverStatus"]["repl"]["slaveDelay"];
  }
}

function addSlaveDelayFootnote(index, delay) {
  $("#slaveDelayFootnotes").show();
  $("#slaveDelayFootnotes").append("<div><sup>"+index+"</sup> Server is configured with a slaveDelay of "+delay+" seconds</div>")
}

/******************************************************************************
 * Backups dynamic portal methods
 *****************************************************************************/

function fetchBackupInfo(apiKey, backupId, success, error){
    var statusUrl = BACKUP_API_URL + "/m-get-backup-info";
    var params = {"apiKey":apiKey, "backupId":backupId};
    statusUrl += serializeUrlParams(params);
    getJson(statusUrl, success, error);
}
