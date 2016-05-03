var csv = require('csv');
var async = require('async');
var json2csv = require('json2csv');
fs = require('fs');

// files to load
var path_msl = "data/msl.csv";
var path_hivenyc = "data/hivenyc.csv";
var path_clubs = "data/clubs.csv";

// datasets to create
var raw_msl = null;
var raw_hivenyc = null;
var raw_clubs = null;

var all_datasets = [];

// data sets to build
var nodes = [];
var nodes_fields = ['Id', 'Label', 'AnsweredSurvey', 'PrimaryNetwork', 'MultipleNetwork'];
var edges = [];
var edges_fields = ['Source', 'Target', 'weightCollab', 'weightAdvice', 'weightSpeak', 'weightCombined'];


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


function lowerName(name) {
  if (!name) {
    return "";
  }
  // to reduce variations in spelling etc
  name = name.toLowerCase();
  name = name.replace(/\s+/g, ''); // remove spaces
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
    if (nodes[i].name == name) {
      // this person is already recorded
      isNew = false;
    }
  }
  if (isNew) {
    nodes.push({
      Id: name,
      Label: name,
      AnsweredSurvey: false,
      PrimaryNetwork: '',
      MultipleNetwork: false
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
      if (checkAllNamesInARow(dataset[j], node.Id)) {
        // add dimensions
        node['AnsweredSurvey'] = true;

        // code the network name
        // currently hardcoded to the array id - hacky
        if (i === 0) {
          node['PrimaryNetwork'] = 'MSL';
        } else if (i === 1) {
          node['PrimaryNetwork'] = 'Hive NYC';
        } else {
          node['PrimaryNetwork'] = 'Clubs';
        }
        numberOfDatasetsAppearsIn++;
      }
    }
  }

  if (numberOfDatasetsAppearsIn > 1) {
    node['MultipleNetwork'] = true;
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
function addToEdges(src, tgt, weightCollab, weightAdvice, weightSpeak) {
  if (!src || !tgt) {
    return;
  }

  edges.push({
    Source: src,
    Target: tgt,
    weightCollab: weightCollab,
    weightAdvice: weightAdvice,
    weightSpeak: weightSpeak,
    weightCombined: weightCollab + weightAdvice + weightSpeak
  });

  // todo
  return;
}

/**
 * findNodesInRow
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
    addToEdges(src, tgt1, weightCollab, weightAdvice, weightSpeak);
  }

  if (src && tgt2) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_2']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_2']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_2']);
    addToEdges(src, tgt2, weightCollab, weightAdvice, weightSpeak);
  }

  if (src && tgt3) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_3']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_3']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_3']);
    addToEdges(src, tgt3, weightCollab, weightAdvice, weightSpeak);
  }

  if (src && tgt4) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_4']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_4']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_4']);
    addToEdges(src, tgt4, weightCollab, weightAdvice, weightSpeak);
  }

  if (src && tgt5) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_5']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_5']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_5']);
    addToEdges(src, tgt5, weightCollab, weightAdvice, weightSpeak);
  }

  if (src && tgt6) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_6']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_6']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_6']);
    addToEdges(src, tgt6, weightCollab, weightAdvice, weightSpeak);
  }

  if (src && tgt7) {
    weightCollab = frequencyToWeight(row['Collaborate with?:person_7']);
    weightAdvice = frequencyToWeight(row['Go to for advice or resources?:person_7']);
    weightSpeak = frequencyToWeight(row['Speak with?:person_7']);
    addToEdges(src, tgt7, weightCollab, weightAdvice, weightSpeak);
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

      // write out the data
      json2csv({ data: edges, fields: edges_fields }, function(err, csv) {
        if (err) console.log(err);
        fs.writeFile('export/edges.csv', csv, function(err) {
          if (err) throw err;
          console.log('edges file saved');
          callback(null);
        });
      });

    });
  }
},
function(err, results) {
    console.log("END");
});
