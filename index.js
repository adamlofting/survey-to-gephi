var csv = require('csv');
var async = require('async');
var json2csv = require('json2csv');
fs = require('fs');

// files to load
var path_msl = "data/msl.csv";
var path_hivenyc = "data/hivenyc.csv";
var path_clubs = "data/clubs.csv";
var path_disambiguation = "data/disambiguation.csv";
var path_staffnames = "data/staffnames.csv";
var path_junknames = "data/junknames.csv";

// datasets to create
var raw_msl = null;
var raw_hivenyc = null;
var raw_clubs = null;

var all_datasets = [];

// data sets to build
var nodes = [];
var nodes_fields = ['Id', 'Label', 'AnsweredSurvey', 'InNetwork', 'IsStaff', 'InterestWebLit', 'InterestDigitalInclusion', 'InterestOnlinePrivacy', 'InterestWalledGardens', 'InterestPlatformHackability', 'InterestGlobalPublicResource', 'Country', 'TimeInNetwork', 'ExplainTheNetwork', 'ExplainMozilla'];

var edges_collab = [];
var edges_resource = [];
var edges_speak = [];
var edges_combined = [];
var edges_fields = ['Source', 'Target', 'Weight'];
var disambiguation = [];
var staffnames = [];
var junknames = [];


/**
 * load the Source CSVs
 */
function loadTheSourceCSVs(callback) {
  async.series([
    function(callback){
        // load the msl data
        fs.readFile(path_msl, 'utf8', function(err, file) {
          csv.parse(file, {columns: true}, function(err, data) {
            raw_msl = data;
            callback(null);
          });
        });
    },
    function(callback){
        // load the hive nyc data
        fs.readFile(path_hivenyc, 'utf8', function(err, file) {
          csv.parse(file, {columns: true}, function(err, data) {
            raw_hivenyc = data;
            callback(null);
          });
        });
    },
    function(callback){
        // load the clubs data
        fs.readFile(path_clubs, 'utf8', function(err, file) {
          csv.parse(file, {columns: true}, function(err, data) {
            raw_clubs = data;
            callback(null);
          });
        });
    },
    function(callback){
        // load the disambiguation list
        fs.readFile(path_disambiguation, 'utf8', function(err, file) {
          csv.parse(file, {columns: true}, function(err, data) {
            disambiguation = data;
            callback(null);
          });
        });
    },
    function(callback){
        // load the staffnames list
        fs.readFile(path_staffnames, 'utf8', function(err, file) {
          csv.parse(file, {columns: true}, function(err, data) {
            staffnames = data;
            callback(null);
          });
        });
    },
    function(callback){
        // load the junknames list
        fs.readFile(path_junknames, 'utf8', function(err, file) {
          csv.parse(file, {columns: true}, function(err, data) {
            junknames = data;
            callback(null);
          });
        });
    }
  ],
  // optional callback
  function(err, results){
      console.log("Loaded the data from source CSV files");
      all_datasets.push(raw_msl);
      all_datasets.push(raw_hivenyc);
      all_datasets.push(raw_clubs);
      callback(null);
  });
}

/**
 * isJunkName
 */
function isJunkName(nameToCheck) {
  for (var i = junknames.length - 1; i >= 0; i--) {
    if (junknames[i].name === nameToCheck) {
      return true;
    }
  }
  return false;
}

/**
 * lowerName
 */
function lowerName(name) {
  if (!name) {
    return "";
  }

  if (isJunkName(name)) {
    return "";
  }


  // to reduce variations in spelling etc
  name = name.toLowerCase();
  name = name.replace(/\s+/g, ''); // remove spaces

  // see if this is a spelling variation we have a correction for
  for (var i = disambiguation.length - 1; i >= 0; i--) {
    if (name == disambiguation[i].variation) {
      name = disambiguation[i].standardized;
    }
  }

  return name;
}

/**
 * addToNodes
 */
function addToNodes(name) {
  if (!name) {
    return;
  }

  var isNew = true;
  for (var i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].Id === name) {
      // this person is already recorded
      isNew = false;
    }
  }
  if (isNew) {
    nodes.push({
      Id: name,
      Label: name,
      AnsweredSurvey: false,
      InNetwork: null,
      InterestWebLit: 'NoAnswer',
      InterestDigitalInclusion: 'NoAnswer',
      InterestOnlinePrivacy: 'NoAnswer',
      InterestWalledGardens: 'NoAnswer',
      InterestPlatformHackability: 'NoAnswer',
      InterestGlobalPublicResource: 'NoAnswer',
      Country: 'NoAnswer',
      TimeInNetwork: 'NoAnswer',
      ExplainTheNetwork: 'NoAnswer',
      ExplainMozilla: 'NoAnswer'
    });
  }
}


/**
 * findNodesInRow
 */
function findNodesInRow(row, callback) {
  addToNodes(lowerName(row['Your Name']));
  addToNodes(lowerName(row['Name:person_1']));
  addToNodes(lowerName(row['Name:person_2']));
  addToNodes(lowerName(row['Name:person_3']));
  addToNodes(lowerName(row['Name:person_4']));
  addToNodes(lowerName(row['Name:person_5']));
  addToNodes(lowerName(row['Name:person_6']));
  addToNodes(lowerName(row['Name:person_7']));
  callback();
}

/**
 * findNodesInRaw
 */
function findNodesInRaw(raw_data, callback) {
  async.each(raw_data, findNodesInRow, function(err){
      callback(null);
  });
}

/**
 * checkAllNamesInARow
 */
function checkAllNamesInARow(row, nameToCheck) {
  if(lowerName(row['Your Name']) === nameToCheck) return true;
  if(lowerName(row['Name:person_1']) === nameToCheck) return true;
  if(lowerName(row['Name:person_2']) === nameToCheck) return true;
  if(lowerName(row['Name:person_3']) === nameToCheck) return true;
  if(lowerName(row['Name:person_4']) === nameToCheck) return true;
  if(lowerName(row['Name:person_5']) === nameToCheck) return true;
  if(lowerName(row['Name:person_6']) === nameToCheck) return true;
  if(lowerName(row['Name:person_7']) === nameToCheck) return true;
  return false;
}

/**
 * checkIfIsStaff
 */
function checkIfIsStaff(nameToCheck) {
  for (var i = staffnames.length - 1; i >= 0; i--) {
    if (staffnames[i].name === nameToCheck) {
      return true;
    }
  }
  return false;
}

/**
 * checkIfAnsweredSurvey
 */
function checkIfAnsweredSurvey(row, nameToCheck) {
  if(lowerName(row['Your Name']) === nameToCheck) return true;
  return false;
}

/**
 * addDimensionsToNode
 */
function addDimensionsToNode(node) {
  // see if this node is someone who answered the survey

  var numberOfDatasetsAppearsIn = 0;

  // by looking through all the datasets
  for (var i = all_datasets.length - 1; i >= 0; i--) {
    // search the individual dataset
    var dataset = all_datasets[i];
    for (var j = dataset.length - 1; j >= 0; j--) {
      // people can show up by answering the survey or by being
      // identified by one or more other people who did answer the survey
      if (checkAllNamesInARow(dataset[j], node.Id)) {
        // add dimensions
        node['AnsweredSurvey'] = checkIfAnsweredSurvey(dataset[j], node.Id);
        if (node['AnsweredSurvey'] === true) {
          // extract values
          node['InterestWebLit'] = dataset[j]['Web Literacy is an important global issue'];
          node['InterestDigitalInclusion'] = dataset[j]['Digital Inclusion is an important global issue'];
          node['InterestOnlinePrivacy'] = dataset[j]['Online Privacy is an important global issue'];
          node['InterestWalledGardens'] = dataset[j]["'Walled Gardens' is an important global issue"];
          node['InterestPlatformHackability'] = dataset[j]['Platform Hackability is an important global issue'];
          node['InterestGlobalPublicResource'] = dataset[j]['The Internet is a global public resource that must remain open and accessible to all'];
          node['Country'] = dataset[j]['Country'];
          node['TimeInNetwork'] = dataset[j]['How long have you been part of the network?'];
          node['ExplainTheNetwork'] = dataset[j]['I could explain the change that the network is trying to bring about to a friend or colleague'];
          node['ExplainMozilla'] = dataset[j]['I could explain the change that Mozilla is trying to bring about to a friend or colleague'];

        }

        node['IsStaff'] = checkIfIsStaff(node.Id);

        // check if network has been set
        if (node['InNetwork'] == null) {
          // this is the first time we're setting a network for this node
          if (i === 0) {
            node['InNetwork'] = 'MSL';
          } else if (i === 1) {
            node['InNetwork'] = 'Hive NYC';
          } else {
            node['InNetwork'] = 'Clubs';
          }
        } else {
          // this node has already been set as being in a network
          // if this is a different network, set this to be in multiple
          if (i === 0) {
            // this appeared in MSL data
            if (node['InNetwork'] !== 'MSL') { node['InNetwork'] = 'Multiple'; }
          } else if (i === 1) {
            // this appeared in Hive NYC data
            if (node['InNetwork'] !== 'Hive NYC') { node['InNetwork'] = 'Multiple'; }
          } else {
            // this appeared in Clubs data
            if (node['InNetwork'] !== 'Clubs') { node['InNetwork'] = 'Multiple'; }
          }
        }

        //TODO
        // if this node already been set, check if this is different
        // if it is different set this to be a node in multiple networks

      }
    }
  }


  return node;
}


/**
 * addDimensionsToNodes
 */
function addDimensionsToNodes() {
  var node;
  // look through all the nodes
  for (var i = nodes.length - 1; i >= 0; i--) {
    node = nodes[i];
    node = addDimensionsToNode(node);
  }
}


/**
 * findNodesInAll
 */
function findNodesInAll(callback) {
  async.each(all_datasets, findNodesInRaw, function(err){
      addDimensionsToNodes();
      callback(null);
  });
}


/**
 * frequencyToWeight
 */
function frequencyToWeight(value) {
  if (!value) {
    return 0;
  }
  if (value == "Rarely") {
    return 1;
  }
  if (value == "Sometimes") {
    return 3;
  }
  if (value == "Often") {
    return 5;
  }
  return 0;
}


/**
 * addToEdges
 */
function addToEdges(type, src, tgt, weight) {
  if (!src || !tgt) {
    return;
  }

  if(type === 'collab') {
    edges_collab.push({
      Source: src,
      Target: tgt,
      Weight: weight
    });
  }

  if(type === 'resource') {
    edges_resource.push({
      Source: src,
      Target: tgt,
      Weight: weight
    });
  }

  if(type === 'speak') {
    edges_speak.push({
      Source: src,
      Target: tgt,
      Weight: weight
    });
  }

  if(type === 'combined') {
    edges_combined.push({
      Source: src,
      Target: tgt,
      Weight: weight
    });
  }




  // todo
  return;
}

/**
 * findEdgesInRow
 */
function findEdgesInRow(row, callback) {
  var src = lowerName(row['Your Name']);
  var tgt1 = lowerName(row['Name:person_1']);
  var tgt2 = lowerName(row['Name:person_2']);
  var tgt3 = lowerName(row['Name:person_3']);
  var tgt4 = lowerName(row['Name:person_4']);
  var tgt5 = lowerName(row['Name:person_5']);
  var tgt6 = lowerName(row['Name:person_6']);
  var tgt7 = lowerName(row['Name:person_7']);

  var weightCollab;
  var weightAdvice;
  var weightSpeak;

  if (src && tgt1) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_1']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_1']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_1']);
    addToEdges('collab', src, tgt1, weightCollab);
    addToEdges('resource', src, tgt1, weightAdvice);
    addToEdges('speak', src, tgt1, weightSpeak);
    addToEdges('combined', src, tgt1, weightCollab + weightAdvice + weightSpeak);
  }

  if (src && tgt2) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_2']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_2']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_2']);
    addToEdges('collab', src, tgt2, weightCollab);
    addToEdges('resource', src, tgt2, weightAdvice);
    addToEdges('speak', src, tgt2, weightSpeak);
    addToEdges('combined', src, tgt2, weightCollab + weightAdvice + weightSpeak);
  }

  if (src && tgt3) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_3']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_3']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_3']);
    addToEdges('collab', src, tgt3, weightCollab);
    addToEdges('resource', src, tgt3, weightAdvice);
    addToEdges('speak', src, tgt3, weightSpeak);
    addToEdges('combined', src, tgt3, weightCollab + weightAdvice + weightSpeak);
  }

  if (src && tgt4) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_4']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_4']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_4']);
    addToEdges('collab', src, tgt4, weightCollab);
    addToEdges('resource', src, tgt4, weightAdvice);
    addToEdges('speak', src, tgt4, weightSpeak);
    addToEdges('combined', src, tgt4, weightCollab + weightAdvice + weightSpeak);
  }

  if (src && tgt5) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_5']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_5']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_5']);
    addToEdges('collab', src, tgt5, weightCollab);
    addToEdges('resource', src, tgt5, weightAdvice);
    addToEdges('speak', src, tgt5, weightSpeak);
    addToEdges('combined', src, tgt5, weightCollab + weightAdvice + weightSpeak);
  }

  if (src && tgt6) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_6']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_6']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_6']);
    addToEdges('collab', src, tgt6, weightCollab);
    addToEdges('resource', src, tgt6, weightAdvice);
    addToEdges('speak', src, tgt6, weightSpeak);
    addToEdges('combined', src, tgt6, weightCollab + weightAdvice + weightSpeak);
  }

  if (src && tgt7) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_7']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_7']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_7']);
    addToEdges('collab', src, tgt7, weightCollab);
    addToEdges('resource', src, tgt7, weightAdvice);
    addToEdges('speak', src, tgt7, weightSpeak);
    addToEdges('combined', src, tgt7, weightCollab + weightAdvice + weightSpeak);
  }

  callback();
}


/**
 * findEdgesInRaw
 */
function findEdgesInRaw(raw_data, callback) {
  async.each(raw_data, findEdgesInRow, function(err){
      callback(null);
  });
}

/**
 * findEdgesInAll
 */
function findEdgesInAll(callback) {
  async.each(all_datasets, findEdgesInRaw, function(err){
      callback(null);
  });
}



/**
 * This is the flow of the ETL
 */
async.series({
  loadCSVs: function(callback){
    loadTheSourceCSVs(function(err, results) {
      callback(null);
    });
  },
  findNodes: function(callback){
    findNodesInAll(function(err, results) {

      // write out the data
      json2csv({ data: nodes, fields: nodes_fields }, function(err, csv) {
        if (err) console.log(err);
        fs.writeFile('export/nodes.csv', csv, function(err) {
          if (err) throw err;
          console.log('nodes file saved');
          callback(null);
        });
      });

    });
  },
  findEdges: function(callback){
    findEdgesInAll(function(err, results) {
      callback(null);
    });
  },
  writeEdgesCollab: function(callback){
    // write out the edges data
    json2csv({ data: edges_collab, fields: edges_fields }, function(err, csv) {
      if (err) console.log(err);
      fs.writeFile('export/edges_collab.csv', csv, function(err) {
        if (err) throw err;
        console.log('edges collab file saved');
        callback(null);
      });
    });
  },
  writeEdgesResource: function(callback){
    // write out the edges data
    json2csv({ data: edges_resource, fields: edges_fields }, function(err, csv) {
      if (err) console.log(err);
      fs.writeFile('export/edges_resource.csv', csv, function(err) {
        if (err) throw err;
        console.log('edges resource file saved');
        callback(null);
      });
    });
  },
  writeEdgesSpeak: function(callback){
    // write out the speak edges data
    json2csv({ data: edges_speak, fields: edges_fields }, function(err, csv) {
      if (err) console.log(err);
      fs.writeFile('export/edges_speak.csv', csv, function(err) {
        if (err) throw err;
        console.log('edges speak file saved');
        callback(null);
      });
    });
  },
  writeEdgesCombined: function(callback){
      // write out the combined edges data
      json2csv({ data: edges_combined, fields: edges_fields }, function(err, csv) {
        if (err) console.log(err);
        fs.writeFile('export/edges_combined.csv', csv, function(err) {
          if (err) throw err;
          console.log('edges combined file saved');
          callback(null);
        });
      });
  }
},
function(err, results) {
    // write out the nodes to look for duplicate names
    console.log("");
    console.log("------------------------------");
    console.log("All nodes:");
    console.log("------------------------------");
    nodes.sort(function(a,b) {
      if (a.Id > b.Id) {
        return 1;
      } else if (a.Id < b.Id) {
        return -1;
      } else {
        return 0;
      }
    });
    for (var i = nodes.length - 1; i >= 0; i--) {
      console.log(nodes[i].Id);
    }

    // console.log("------------------------------");
    // console.log("Short names:");
    // console.log("Try to identify");
    // console.log("------------------------------");
    // for (var i = nodes.length - 1; i >= 0; i--) {
    //   if (nodes[i].Id.length < 10) {
    //     console.log(nodes[i].Id);
    //   }
    // }

    // END
    console.log("END");
});
