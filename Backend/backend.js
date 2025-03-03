const express = require('express');
const app = express();
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const haversine = require('haversine-distance');
const turf = require('@turf/turf');
const readline = require('readline');
const net = require('net');
require('dotenv').config();
const csv = require("csv-parser");


const readData = () => {
  try {
      return JSON.parse(fs.readFileSync(process.env.NOACPATH, 'utf8'));
  } catch (error) {
      return []; 
  }
};

const getVehicleType = (id) => {
  if(id < 55) return 'Tram';
  if(id > 60 && id < 100) return 'Trolleybus';
  if(id >= 100) return 'Bus'
}

const writeData = (data) => {
  fs.writeFileSync(process.env.NOACPATH, JSON.stringify(data, null, 2), 'utf8');
};

let tramDataCache = null;

const nonACtypes = ['V3A-93', 'V3A-93M', 'V3A-93 PPC', 'V3A-93 CH-PPC', 'V3A-2010-PPC-CA', 'V3A-93M 2000', 'V3A-2S-93', 'Bucur 1 V2A-T', 'Tatra T4R'];

const hasAC = (vehID, type) => {
  if(new Set(readData()).has(vehID)) {
    return false;
  } else if(nonACtypes.includes(type)){
    return false;
  } else {
    return true;
  }
};

async function loadTramData() {
  if (tramDataCache) return tramDataCache;
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream("tramvaie.csv")
      .pipe(csv({ separator: "," }))
      .on("data", (data) => results.push(data))
      .on("end", () => {
        tramDataCache = results;
        resolve(tramDataCache);
      })
      .on("error", (err) => reject(err));
  });
}

async function getTipById(id) {
  if (!id || id === 0) return ["Unknown", null];

  const tramData = await loadTramData();

  if (id > 0 && id <= 4100) {
    const tram = tramData.find((row) => row["Nr parc"] === id.toString());
    if (tram) {
      const tip = tram["Tip"];
      const img = getImageByTip(tip);
      return [tip, img];
    }
  }

  const tramTypeMap = {
    "4100-4599": ["M-Benz Citaro EURO 3", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/4661.png"],
    "4600-4999": ["M-Benz Citaro EURO 4", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/4661.png"],
    "6200-6299": ["M-Benz Citaro EURO 4", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/4661.png"],
    "5301-5400": ["Irisbus Citelis", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/Untitled_design-removebg-preview.png"],
    "5100-5300": ["Ikarus Astra 415T", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/Ikarus_415T_STB_V.png"],
    "5400-5500": ["Solaris Trollino 12M", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/Trollino+12.png"],
    "6300-6350": ["Otokar Kent 10m", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/Otokar+C10.png"],
    "6400-6720": ["Otokar Kent 12m", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/Otokar+C12.png"],
    "6800-6830": ["Otokar Kent 18m", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/Otokar+C18.png"],
    "7000-7130": ["M-Benz Citaro Hibrid", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/O530-D1-1-STB_V.png"],
    "7200-7300": ["ZTE Granton 12m", "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/ZTE-12m.png"],
  };

  for (const [range, value] of Object.entries(tramTypeMap)) {
    const [min, max] = range.split("-").map(Number);
    if (id >= min && id <= max) {
      return value;
    }
  }

  return ["Unknown", null];
}

function getImageByTip(tip) {
  const imageMap = {
    "V3A-93": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/BLF-2-3A6-417_STB_V.png",
    "V3A-93M": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/BLF-2-3A6-417_STB_V.png",
    "V3A-93 PPC": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/BLF-2-3A6-417_STB_V.png",
    "V3A-93 CH-PPC": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/V3A-2006-1_STB_V.png",
    "V3A-2010-PPC-CA": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/V3A-2006-1_STB_V.png",
    "V3A-93M 2000": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/V3A-2006-1_STB_V.png",
    "V3A-2S-93": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/OIP-removebg-preview.png",
    "Astra Imperio Metropolitan": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/AstraGT8_STB_V.png",
    "Bucur 1 V2A-T": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/V2AT.png",
    "Bucur LF": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/BLF-2-3A6-1_g2.png",
    "Tatra T4R": "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/T4-3_STB_V.png",
  };
  return imageMap[tip] || "https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/BLF-2-3A6-1.png";
}


function isServerReachable(host, port, timeout = 3000) {
  return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(timeout);
      socket.on('connect', () => {
          resolve(true);
          socket.destroy();
      });

      socket.on('error', () => {
          resolve(false);
      });

      socket.on('timeout', () => {
          resolve(false);
          socket.destroy();
      });

      socket.connect(port, host);
  });
}

let stopsDataCache = null;

async function loadStopsData() {
  if (stopsDataCache) return stopsDataCache;
  const fileStream = fs.createReadStream(process.env.GTFS_STOPS_FILE, 'utf-8');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  const results = [];
  let isHeader = true;
  return new Promise((resolve, reject) => {
    rl.on('line', (line) => {
      if (isHeader) {
        isHeader = false;
        return;
      }
      const columns = line.split(',');
      results.push({
        stop_id: columns[0].trim(),
        stop_lat: parseFloat(columns[4]),
        stop_lon: parseFloat(columns[5])
      });
    });
    rl.on('close', () => {
      stopsDataCache = results;
      resolve(stopsDataCache);
    });
    rl.on('error', (err) => reject(err));
  });
}

async function parseStationLocation(stationID) {
  const stopsData = await loadStopsData();
  const station = stopsData.find((stop) => stop.stop_id === stationID.toString());
  if (station) {
    return { stop_lat: station.stop_lat, stop_lon: station.stop_lon };
  }
  throw new Error(`Station ID ${stationID} not found in the stops.txt file.`);
}

function haversineDistance(point1, point2) {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    const distance = haversine({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 });
    return distance;
}

function projectPointOntoSegment(point, segmentStart, segmentEnd) {
    const line = turf.lineString([segmentStart, segmentEnd]);
    const pt = turf.point(point);
    const snapped = turf.nearestPointOnLine(line, pt);
    return snapped.geometry.coordinates;
}

let shapesDataCache = null;

async function loadShapesData() {
  if (shapesDataCache) return shapesDataCache;
  const filePath = process.env.GTFS_SHAPES_FILE;
  const data = fs.readFileSync(filePath, 'utf-8');
  shapesDataCache = parse(data, { columns: true });
  return shapesDataCache;
}

async function calculateTramToStationDistance(tramPos, stationPos, shapeId) {
  const thresholdDistance = 500;
  const shapesData = await loadShapesData();
  const routeShape = shapesData
    .filter(row => row.shape_id === shapeId)
    .map(row => [parseFloat(row.shape_pt_lat), parseFloat(row.shape_pt_lon)]);

  let tramProjection = null;
  let stationProjection = null;
  let minTramDistance = Infinity;
  let minStationDistance = Infinity;
  const cumulativeDistances = [0];
  let tramSegmentIndex = null;
  let stationSegmentIndex = null;

  for (let i = 1; i < routeShape.length; i++) {
    const dist = haversineDistance(routeShape[i - 1], routeShape[i]);
    cumulativeDistances.push(cumulativeDistances[i - 1] + dist);
  }

  for (let i = 0; i < routeShape.length - 1; i++) {
    const segmentStart = routeShape[i];
    const segmentEnd = routeShape[i + 1];

    const tramProj = projectPointOntoSegment(tramPos, segmentStart, segmentEnd);
    const stationProj = projectPointOntoSegment(stationPos, segmentStart, segmentEnd);

    const tramDist = haversineDistance(tramPos, tramProj);
    const stationDist = haversineDistance(stationPos, stationProj);

    if (tramDist < thresholdDistance && tramDist < minTramDistance) {
      minTramDistance = tramDist;
      tramProjection = tramProj;
      tramSegmentIndex = i;
    }

    if (stationDist < minStationDistance) {
      minStationDistance = stationDist;
      stationProjection = stationProj;
      stationSegmentIndex = i;
    }
  }

  if (tramSegmentIndex === null) return 'past';

  if (tramSegmentIndex < stationSegmentIndex) {
    let distance = cumulativeDistances[stationSegmentIndex] - cumulativeDistances[tramSegmentIndex];
    distance += haversineDistance(routeShape[tramSegmentIndex], tramProjection);
    distance += haversineDistance(routeShape[stationSegmentIndex], stationProjection);
    return distance;
  } else if (tramSegmentIndex === stationSegmentIndex) {
    return 0;
  } else {
    return 'past';
  }
}

const getThreeTimes = async (stopID, lineID) => {
    const r = await fetch(`http://${process.env.STB_UNOFF_API_IP}:${process.env.STB_UNOFF_API_PORT}/api/time/all/${stopID}/${lineID}`)
    const times = await r.json();
    return times;
}

const isTimestampRecent = (timestamp) => {
    const now = new Date(); 
    const givenTime = new Date(timestamp * 1000); 

    const diffInSeconds = (now - givenTime) / 1000;
    return  diffInSeconds <= process.env.LINE_CHECK_COOLDOWN; 
};

app.use(express.json());




app.get('/api', async (req, res) => {
  const stationID = req.query.stationID;

  const reachableServerCheck = await isServerReachable(process.env.STB_UNOFF_API_IP, process.env.STB_UNOFF_API_PORT);
  if (!reachableServerCheck) {
    console.log('⚠️ STB API SERVER IS DOWN!');
    return res.status(500).json({ error: "Failed to fetch transport data" });
  }

  const [allTrams, stationInfo, allDatasets] = await Promise.all([
    fetch(process.env.CORS_MOBI_BUS_DATA).then(r => r.json()),
    fetch(`${process.env.CORS_MOBI_NEXT_ARRIVALS}${stationID}`).then(r => r.json()),
    fetch(process.env.CORS_MOBI_DATASET).then(r => r.json())
  ]);

  const finalObject = {
    name: stationInfo.name,
    address: stationInfo.address,
    lines: {}
  };

  for (const line of stationInfo.lines.sort((a, b) => a.name.localeCompare(b.name))) {
    const COOLDOWN = 5000;
    let filteredTrams = [];

      const fetchWithRetry = async (stationID, lineID, max = 5, delayMs = 3000) => {
        for (let i = 0; i < max; i++) try { return await getThreeTimes(stationID, lineID); } 
        catch { if (i < max - 1) await new Promise(res => setTimeout(res, delayMs)); }
        throw new Error("Max retries reached - STB Server may not be reachable!");
    };
    times = await fetchWithRetry(stationID, line.id);
  
    do {
      filteredTrams = allTrams.filter(veh =>
        veh.vehicle.trip.routeId == line.id &&
        veh.vehicle.trip.directionId != null &&
        Number(veh.vehicle.trip.directionId) === Number(line.direction)
      );

      if (filteredTrams.every(tram => isTimestampRecent(tram.vehicle.timestamp))) break;
      console.log(`Cooldown for ${COOLDOWN / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, COOLDOWN));
    } while (true);

    const distAndIdPromises = filteredTrams.map(async (tram) => {
      const tramLat = tram.vehicle.position.latitude;
      const tramLong = tram.vehicle.position.longitude;
      const tramID = tram.vehicle.vehicle.th_id;
      const plate = tram.vehicle.vehicle.licensePlate;
      const stationPos = await parseStationLocation(stationID);
      let shapeID = "" + line.id + line.direction;
      const dist = await calculateTramToStationDistance([tramLat, tramLong], [stationPos.stop_lat, stationPos.stop_lon], shapeID);
      if (dist !== 'past') {
        return { id: tramID, distance: dist, position: [tramLat, tramLong], plate: plate };
      }
      return null;
    });

    const distAndId = (await Promise.all(distAndIdPromises)).filter(item => item !== null);
    let orderedIDs = distAndId.sort((a, b) => a.distance - b.distance);

    for (let i = 0; i < orderedIDs.length; i++) {
      let datasetVeh = allDatasets.find(dataset => dataset.vehicle.vehicle.license_plate == orderedIDs[i].plate);
      if (datasetVeh) {
        orderedIDs[i].on_board = datasetVeh.vehicle.passenger_info.on_board;
        orderedIDs[i].id = datasetVeh.vehicle.vehicle.th_id;
      }
    }

    for (let i = 1; i <= orderedIDs.length; i++) {
      try {
        if(orderedIDs[i - 1].id == 0 || orderedIDs[i - 1].id == null) {
          orderedIDs[i - 1].ac = false;
          orderedIDs[i - 1].type = getVehicleType(parseInt(line.name));
          orderedIDs[i - 1].image ='https://foam-data.lon1.cdn.digitaloceanspaces.com/stb/unknown.png';
        } else {
          const typeAndImg = await getTipById(orderedIDs[i - 1].id);
          orderedIDs[i - 1].ac = hasAC(orderedIDs[i - 1].id, typeAndImg[0]);
          orderedIDs[i - 1].type = typeAndImg[0];
          orderedIDs[i - 1].image = typeAndImg[1];
        }
        
      } catch (err) {
        console.error(err.message);
        orderedIDs[i - 1].type = "Unknown";
      }

      if (i <= 3) {
        orderedIDs[i - 1].time = times[i - 1] == 'm' ? process.env.MORE_THAN_SVTN_MINUTES_TEXT : times[i - 1];
      }
    }

    finalObject.lines[line.name] = orderedIDs;
  }

  res.json(finalObject);
});

app.post('/api/vehicle/add', (req, res) => {
  const { vehicleNumber } = req.body; 
  const vehicles = readData();
  const vehNum = parseInt(vehicleNumber);

  if (!vehNum || vehNum <= 0 || vehNum >= 9000) {
    return res.status(400).json({ error: "MALFORMED_REQUEST" });
  }
  if (vehicles.includes(vehicleNumber)) {
    return res.status(400).json({ error: "Vehicle already exists in the list!" });
  }

  try {
    vehicles.push(vehicleNumber);
    writeData(vehicles);
    return res.status(200).json({ message: "Vehicle added successfully" });
  } catch (error) {
    console.log('Error adding vehicle:', error);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});


app.post('/api/vehicle/remove', (req, res) => {
  const { vehicleNumber } = req.body; 
  const vehicles = readData();
  const vehNum = parseInt(vehicleNumber);

  if (!vehNum || vehNum <= 0 || vehNum >= 9000) {
    return res.status(400).json({ error: "MALFORMED_REQUEST" });
  }
  if (!vehicles.includes(vehicleNumber)) {
    return res.status(404).json({ error: "The vehicle is not on the list!" });
  }

  try {
    const updatedVehicles = vehicles.filter(veh => veh !== vehicleNumber);
    writeData(updatedVehicles);
    return res.status(200).json({ message: "Vehicle removed successfully" });
  } catch (error) {
    console.log('Error removing vehicle:', error);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});


app.listen(process.env.APP_PORT, () => {
    console.log(`NEXTB API is running at http://localhost:${process.env.APP_PORT}`);
});
