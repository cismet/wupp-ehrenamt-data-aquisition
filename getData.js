import fetch from 'node-fetch';
import convert from 'xml-js';
import _ from 'lodash';
import fs from 'fs';
import md5 from 'md5';


function simplifyArray(array, field) {
    let ret = [];
    if (Array.isArray(array)) {
        for (let i = 0; i < array.length; ++i) {
            ret.push(array[i][field]);
        }
    } else {
        ret.push(array[field]);
    }
    return ret;
}

function getItem(angebot) {
  return fetch("http://www.lachnit-software.de/query/api/OfferServiceEndpoint.php?&offerId=" + angebot.id + "&agencyId="+process.env.AGENCY+"&accessKey="+process.env.KEY)
    .then(function(res) {
      if (res.status > 200) {
        console.log(angebot.id + " -> " + res.status);
        console.log(res);
      }      
      return res.text();
    }).then(function(body) {
      var result1 = convert.xml2json(body, {
        compact: true,
        spaces: 0
      });
      let object = JSON.parse(result1);
      let fetchedAngebot = object.angebot.angebot_details;

      let fullangebot = {
        id: angebot.id,
        text: angebot.angebotsname || fetchedAngebot.angebotsname._text,
//        beschreibung: angebot.beschreibung,
        geo_x: angebot.geo_breite || fetchedAngebot.geo_x._text,
        geo_y: angebot.geo_laenge || fetchedAngebot.geo_y._text,
        zielgruppen: [],
        globalbereiche: [],
        kenntnisse: [],
      }

      if (!_.isEmpty(fetchedAngebot.zielgruppen)){
        fullangebot.zielgruppen = simplifyArray(fetchedAngebot.zielgruppen.element,"_text");
      }

      if (!_.isEmpty(fetchedAngebot.globalbereiche)){
        fullangebot.globalbereiche = simplifyArray(fetchedAngebot.globalbereiche.element,"_text");

      }
      if (!_.isEmpty(fetchedAngebot.kenntnisse)){
        fullangebot.kenntnisse = simplifyArray(fetchedAngebot.kenntnisse.element,"_text");

      }

      return fullangebot;
    }).catch((e)=> {
        console.error(e)
    });
}
console.log("started");
var total=0;
var counter=0;
let limit=10000;
if (process.env.LIMIT){
    limit=process.env.LIMIT;
}
if (!process.env.AGENCY){
    console.error("Please provide an AGENCY env variable.");
    process.exit(1);
}

if (!process.env.KEY){
    console.error("Please provide an KEY env variable.");
    process.exit(1);
}
fetch("http://www.lachnit-software.de/query/api/MatchingServiceEndpoint.php?&agencyId="+process.env.AGENCY+"&accessKey="+process.env.KEY+"&limit="+limit)
  .then(function(res) {
    return res.text();
  }).then(function(body) {
    let results = convert.xml2json(body, {
      compact: true,
      spaces: 2
    });
    let obj = JSON.parse(results);
    let angebote = obj.angebotsliste.angebot
    total=angebote.length;
    console.log("Anzahl Angebote:" + angebote.length +"\n");
    let angs = [];
    
    for (let i = 0; i < angebote.length; i++) {
      let ang_id = angebote[i]._attributes.angebotsId;
      let angebot={
        id: ang_id,
        angebotsname: angebote[i].angebotsname._text,
        beschreibung: angebote[i].beschreibung._text,
        geo_breite: angebote[i].geo_breite._text,
        geo_laenge: angebote[i].geo_laenge._text,
      }
      //angs.push(ang_id);
      if (angebot.geo_breite && angebot.geo_laenge) {
        angs.push(angebot);
      }
      else {
          console.error("Error during processing of angebot:"+ang_id);
          console.error(JSON.stringify( angebot , null ,2))
      }
      //console.log(angebote[i])
    }
    var current = Promise.resolve();
    Promise.all(angs.map(function(id) {
      current = current.then(function() {
        return getItem(id) // returns promise
      }).then(function(result) {
        counter ++;
        if (process.stdout.isTTY){
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write("Processing " + counter + " / "+ total+"\r");
        }
        
        return result;
      });
      return current;
    })).then(function(results) {
     //console.log(JSON.stringify(results, null, 2))
     let content=JSON.stringify( results , null ,2)
     fs.writeFile( "./out/data.json", content, "utf8" ,()=>{});
     fs.writeFile( "./out/data.json.md5", md5(content), "utf8" ,()=>{});
    })
  });
