import express from 'express';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import haversine from 'haversine-distance';
import * as turf from '@turf/turf';
import readline from 'readline';
import dotenv from 'dotenv';
import csv from 'csv-parser';
import * as stbApi from './stbApi.js';
import NodeCache from 'node-cache';
import rateLimit from 'express-rate-limit';
import unzipper from 'unzipper';
import cron from 'node-cron';
import crypto from 'crypto';
import https from 'https';
import path from 'path';

dotenv.config();

const app = express();

const cache = new NodeCache();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, 
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);


async function getShapeById(shapeId) {
  const shapesData = await loadShapesData();
  if (!shapesData) return null;
  const routeShape = shapesData
  .filter(row => row.shape_id === shapeId)
  .map(row => [parseFloat(row.shape_pt_lat), parseFloat(row.shape_pt_lon)]);
  return routeShape;
}

const readData = () => {
  try {
      return JSON.parse(fs.readFileSync(process.env.NOACPATH, 'utf8'));
  } catch (error) {
      return []; 
  }
};

const getVehicleType = (id) => {
  const numId = parseInt(id); 
  if (Number.isNaN(numId)) return 'bus'; 
  if (numId < 55) return 'tram';
  if (numId > 60 && numId < 100) return 'trolleybus';
  if (numId >= 100) return 'bus';

  return 'Unknown'; 
};

const writeData = (data) => {
  fs.writeFileSync(process.env.NOACPATH, JSON.stringify(data, null, 2), 'utf8');
};

let tramDataCache = null;
let routesDataCache = null;

const nonACtypes = ['V3A-93', 'V3A-93M', 'V3A-93 PPC', 'V3A-93 CH-PPC', 'V3A-2010-PPC-CA', 'V3A-93M 2000', 'V3A-2S-93', 'Bucur 1 V2A-T', 'Tatra T4R'];

const hasAC = (vehID, type) => {
  if(new Set(readData()).has(String(vehID))) {
    return false;
  } else if(nonACtypes.includes(type)){
    return false;
  } else {
    return true;
  }
};

const loadRoutesData = async () => {
  const cacheKey = 'gtfs_routes';
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  return new Promise((resolve, reject) => {
    const results = Object.create(null);
    fs.createReadStream("routes.txt")
      .pipe(csv({ separator: "," }))
      .on("data", (data) => {
        const key = data.route_short_name;
        const value = {
          id: data.route_id,
          color: data.route_color,
          type: getVehicleType(data.route_short_name)
        };
        results[key] = value;
      })
      .on("end", () => {
        cache.set(cacheKey, results, 300); 
        routesDataCache = results;
        resolve(routesDataCache);
      })
      .on("error", (err) => reject(err));
  });
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
    "4100-4599": ["M-Benz Citaro EURO 3", "https://cdn.cristoi.ro/4661.png"],
    "4600-4999": ["M-Benz Citaro EURO 4", "https://cdn.cristoi.ro/4661.png"],
    "6200-6299": ["M-Benz Citaro EURO 4", "https://cdn.cristoi.ro/4661.png"],
    "5301-5400": ["Irisbus Citelis", "https://cdn.cristoi.ro/Irisbus.png"],
    "5100-5300": ["Ikarus Astra 415T", "https://cdn.cristoi.ro/Ikarus_415T_STB_V.png"],
    "5400-5500": ["Solaris Trollino 12M", "https://cdn.cristoi.ro/Trollino+12.png"],
    "6300-6350": ["Otokar Kent 10m", "https://cdn.cristoi.ro/Otokar+C10.png"],
    "6400-6720": ["Otokar Kent 12m", "https://cdn.cristoi.ro/Otokar+C12.png"],
    "6800-6830": ["Otokar Kent 18m", "https://cdn.cristoi.ro/Otokar+C18.png"],
    "7000-7130": ["M-Benz Citaro Hibrid", "https://cdn.cristoi.ro/O530-D1-1-STB_V.png"],
    "7200-7300": ["ZTE Granton 12m", "https://cdn.cristoi.ro/ZTE-12m.png"],
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
      "V3A-93": "https://cdn.cristoi.ro/BLF-2-3A6-417_STB_V.png",
      "V3A-93M": "https://cdn.cristoi.ro/BLF-2-3A6-417_STB_V.png",
      "V3A-93 PPC": "https://cdn.cristoi.ro/BLF-2-3A6-417_STB_V.png",
      "V3A-93 CH-PPC": "https://cdn.cristoi.ro/V3A-2006-1_STB_V.png",
      "V3A-2010-PPC-CA": "https://cdn.cristoi.ro/V3A-2006-1_STB_V.png",
      "V3A-93M 2000": "https://cdn.cristoi.ro/V3A-2006-1_STB_V.png",
      "V3A-2S-93": "https://cdn.cristoi.ro/V3A-2S-93.png",
      "Astra Imperio Metropolitan": "https://cdn.cristoi.ro/AstraGT8_STB_V.png",
      "Bucur 1 V2A-T": "https://cdn.cristoi.ro/V2AT.png",
      "Bucur LF": "https://cdn.cristoi.ro/BLF-2-3A6-1_g2.png",
      "Tatra T4R": "https://cdn.cristoi.ro/T4-3_STB_V.png",
    };
    return imageMap[tip] || "https://cdn.cristoi.ro/BLFV2.png";
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

const isTimestampRecent = (timestamp) => {
    const now = new Date(); 
    const givenTime = new Date(timestamp * 1000); 

    const diffInSeconds = (now - givenTime) / 1000;
    return  diffInSeconds <= process.env.LINE_CHECK_COOLDOWN; 
};

app.use(express.json());

app.use((req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  if (clientKey !== process.env.API_KEY) {
      return res.status(403).json({ error: "Unauthorized" });
  }
  next();
});


app.get('/api', async (req, res) => {
  const stationID = req.query.stationID;
  let allTrams, stationInfo, allDatasets, nextArrivals;
  try {
    [allTrams, stationInfo, allDatasets, nextArrivals] = await Promise.all([
      fetch(process.env.CORS_MOBI_BUS_DATA).then(r => r.json()),
      fetch(`${process.env.CORS_MOBI_NEXT_ARRIVALS}${stationID}`).then(r => r.json()),
      fetch(process.env.CORS_MOBI_DATASET).then(r => r.json()),
      fetch(`${process.env.CORS_MOBI_NEXT_ARRIVALS}${stationID}`).then(r => r.json())
    ]);
  } catch (err) {
    return res.status(503).json({ error: 'Service Unavailable' });
  }
  const datasetByPlate = new Map();
  for (const entry of allDatasets) {
    if (entry.vehicle && entry.vehicle.vehicle && entry.vehicle.vehicle.license_plate) {
      datasetByPlate.set(entry.vehicle.vehicle.license_plate, entry);
    }
  }

  const finalObject = {
    name: stationInfo.name,
    address: stationInfo.address,
    lines: {}
  };

  for (const line of stationInfo.lines.sort((a, b) => a.name.localeCompare(b.name))) {
    const COOLDOWN = 5000;
    let filteredTrams = [];
    let nextArrivalTime = null;
    if (Array.isArray(nextArrivals.lines)) {
      const arrivalLine = nextArrivals.lines.find(l => String(l.id) === String(line.id));
      if (arrivalLine && arrivalLine.arrivingTime !== undefined) {
        nextArrivalTime = arrivalLine.arrivingTime;
      }
    }

    do {
      filteredTrams = allTrams.filter(veh =>
        veh &&
        veh.vehicle &&
        veh.vehicle.trip &&
        veh.vehicle.vehicle &&
        veh.vehicle.trip.routeId == line.id &&
        veh.vehicle.trip.directionId != null &&
        Number(veh.vehicle.trip.directionId) === Number(line.direction)
      );

      if (filteredTrams.every(tram => isTimestampRecent(tram.vehicle.timestamp))) break;
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
      let datasetVeh = datasetByPlate.get(orderedIDs[i].plate);
      if (datasetVeh && datasetVeh.vehicle && datasetVeh.vehicle.vehicle) {
        orderedIDs[i].on_board = datasetVeh.vehicle.passenger_info?.on_board ?? null;
        orderedIDs[i].id = datasetVeh.vehicle.vehicle.th_id;
      } else {
        orderedIDs[i].on_board = null;
        orderedIDs[i].id = null;
      }
    }

    for (let i = 1; i <= orderedIDs.length; i++) {
      try {
        if(orderedIDs[i - 1].id == 0 || orderedIDs[i - 1].id == null) {
          orderedIDs[i - 1].ac = false;
          orderedIDs[i - 1].type = getVehicleType(parseInt(line.name));
          orderedIDs[i - 1].image ='https://cdn.cristoi.ro/unknown.png';
        } else {
          const typeAndImg = await getTipById(orderedIDs[i - 1].id);
          orderedIDs[i - 1].ac = hasAC(orderedIDs[i - 1].id, typeAndImg[0]);
          orderedIDs[i - 1].type = typeAndImg[0];
          orderedIDs[i - 1].image = typeAndImg[1];
        }
      } catch (err) {
        orderedIDs[i - 1].type = "Unknown";
      }

      if (i === 1) {
        if (nextArrivalTime !== null && !isNaN(nextArrivalTime)) {
          const minutes = Math.ceil(Number(nextArrivalTime) / 60);
          orderedIDs[i - 1].time = minutes;
        } else {
          orderedIDs[i - 1].time = process.env.MORE_THAN_SVTN_MINUTES_TEXT;
        }
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
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.get('/api/routes', async (req, res) => {
  try {
  let data = await loadRoutesData();
  return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
})

app.get('/api/routeShape', async (req, res) => {
  try {
    const shapeID = req.query.shapeId;
    const routeName = req.query.name;

    if (!shapeID) return res.status(400).json({ error: "PROVIDE_ADD_DETAILS" });

    const tour = `${shapeID}0`;
    const retour = `${shapeID}1`;

    const [tourShape, retourShape] = await Promise.all([
      getShapeById(tour),
      getShapeById(retour),
    ]);

    const busData = await fetch(process.env.CORS_MOBI_BUS_DATA).then(r => r.json());
    const allVeh = await fetch(process.env.CORS_MOBI_DATASET).then(r => r.json());

    const datasetByPlate = new Map();
    for (const v of allVeh) {
      if (v.vehicle && v.vehicle.vehicle && v.vehicle.vehicle.license_plate) {
        datasetByPlate.set(v.vehicle.vehicle.license_plate, v);
      }
    }

    const groupedVehicles = { tour: [], retour: [] };

    for (const v of busData) {
      if (!v.vehicle || !v.vehicle.trip || !v.vehicle.vehicle) continue;
      if (String(v.vehicle.trip.routeId) !== String(shapeID)) continue;

      const plate = v.vehicle.vehicle.licensePlate;
      const datasetEntry = plate ? datasetByPlate.get(plate) : null;

      const vehLat = v.vehicle.position.latitude;
      const vehLon = v.vehicle.position.longitude;
      const vehCoords = [vehLat, vehLon];

      const routeShape = v.vehicle.trip.directionId === 0 ? tourShape : retourShape;
      let minDist = Infinity;

      for (let i = 0; i < routeShape.length - 1; i++) {
        const segmentStart = routeShape[i];
        const segmentEnd = routeShape[i + 1];
        const projectedPoint = projectPointOntoSegment(vehCoords, segmentStart, segmentEnd);
        const dist = haversineDistance(vehCoords, projectedPoint);

        if (dist < minDist) {
          minDist = dist;
        }
      }

      if (minDist > 10) continue;

      let id = null;
      let type = 'Unknown', img = 'https://cdn.cristoi.ro/unknown.png', on_board = null, licensePlate = null;

      if (datasetEntry && datasetEntry.vehicle && datasetEntry.vehicle.vehicle) {
        id = datasetEntry.vehicle.vehicle.th_id ?? v.vehicle.vehicle.th_id ?? null;
        on_board = datasetEntry.vehicle.passenger_info?.on_board ?? null;
      } else if (v.vehicle.vehicle.th_id) {
        id = v.vehicle.vehicle.th_id;
      }

      licensePlate = v.vehicle.vehicle.licensePlate ?? null;

      if (id) {
        const vhInfo = await getTipById(id);
        type = vhInfo[0];
        img = vhInfo[1];
        if (type === 'Unknown') {
          if (routeName) {
            type = getVehicleType(routeName);
          } else if (v.vehicle.trip && v.vehicle.trip.routeId) {
            type = getVehicleType(v.vehicle.trip.routeId);
          }
        }
      } else {
        if (routeName) {
          type = getVehicleType(routeName);
        } else if (v.vehicle.trip && v.vehicle.trip.routeId) {
          type = getVehicleType(v.vehicle.trip.routeId);
        }
      }

      groupedVehicles[v.vehicle.trip.directionId === 0 ? 'tour' : 'retour'].push({
        ...v,
        id,
        type,
        img,
        on_board,
        licensePlate,
        position: {
          latitude: vehLat,
          longitude: vehLon
        }
      });
    }

    return res.status(200).json({
      tour: { shape: tourShape, vehicles: groupedVehicles.tour },
      retour: { shape: retourShape, vehicles: groupedVehicles.retour },
    });
  } catch (error) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.get('/api/alerts', async (req, res) => {
  const cacheKey = 'alerts';
  const cached = cache.get(cacheKey);
  if (cached) return res.status(200).json(cached);
  while (true) {
    try {
      const alerts = await stbApi.getAlerts();
      cache.set(cacheKey, alerts, 60); 
      return res.status(200).json(alerts);
    } catch (e) {
      // Log and retry indefinitely
      await new Promise(res => setTimeout(res, 1000));
    }
  }
});

const STOPS_ZIP_URL = 'https://gtfs.tpbi.ro/regional/BUCHAREST-REGION.zip';
const STOPS_JSON_PATH = 'assets/data/stops.json';

async function fileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => resolve(null)); 
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function downloadFile(url, destPath) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (typeof fetch === 'function') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    const ab = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(ab));
    return;
  }
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
      file.on('error', (err) => {
        fs.unlink(destPath, () => reject(err));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

async function downloadAndExtractStops() {
  try {
    const tmpDownloadPath = './BUCHAREST-REGION.zip.tmp';
    const finalZipPath = './BUCHAREST-REGION.zip';
    const stopsTxtPath = './stops.txt';
    const stopsJsonPath = './assets/data/stops.json';

    await downloadFile(STOPS_ZIP_URL, tmpDownloadPath);

    const newHash = await fileHash(tmpDownloadPath);
    const oldHash = await fileHash(finalZipPath);
    if (newHash && oldHash && newHash === oldHash) {
      fs.unlinkSync(tmpDownloadPath);
      console.log('[STOPS] ZIP unchanged, skipping extraction and conversion.');
      return;
    }
    fs.renameSync(tmpDownloadPath, finalZipPath);

    const filesToExtract = ['stops.txt', 'routes.txt', 'shapes.txt'];
    const extracted = { stops: false, routes: false, shapes: false };
    await new Promise((resolve, reject) => {
      fs.createReadStream(finalZipPath)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
          const name = entry.path;
          if (filesToExtract.includes(name)) {
            const outPath = `./${name}`;
            const out = fs.createWriteStream(outPath);
            entry.pipe(out);
            out.on('finish', () => {
              if (name === 'stops.txt') extracted.stops = true;
              if (name === 'routes.txt') extracted.routes = true;
              if (name === 'shapes.txt') extracted.shapes = true;
              if (Object.values(extracted).every(Boolean)) resolve();
            });
            out.on('error', reject);
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => {
          if (extracted.stops) resolve();
          else reject(new Error('stops.txt not found in ZIP'));
        })
        .on('error', reject);
    });

    const stopsTxtRaw = fs.readFileSync(stopsTxtPath, 'utf8');
    const stops = parse(stopsTxtRaw, { columns: true, skip_empty_lines: true });
    for (const stop of stops) {
      if (stop.stop_id && /^\d+$/.test(stop.stop_id)) stop.stop_id = parseInt(stop.stop_id, 10);
      if (stop.stop_lat) stop.stop_lat = stop.stop_lat === '' ? null : parseFloat(stop.stop_lat);
      if (stop.stop_lon) stop.stop_lon = stop.stop_lon === '' ? null : parseFloat(stop.stop_lon);
    }
    const stopsDir = path.dirname(stopsJsonPath);
    if (!fs.existsSync(stopsDir)) {
      fs.mkdirSync(stopsDir, { recursive: true });
    }
    fs.writeFileSync(stopsJsonPath, JSON.stringify(stops, null, 2), 'utf8');
    console.log('[STOPS] Downloaded and converted stops.txt to JSON.');
  } catch (err) {
    console.error('[STOPS] Error downloading or processing stops:', err);
  }
}

await downloadAndExtractStops();
cron.schedule('0 3 * * *', downloadAndExtractStops);

app.get('/api/getstops', (req, res) => {
  try {
    const stops = JSON.parse(fs.readFileSync(STOPS_JSON_PATH, 'utf8'));
    res.status(200).json(stops);
  } catch (err) {
    res.status(500).json({ error: 'Could not load stops data.' });
  }
});

app.listen(process.env.APP_PORT, () => {
    console.log(`NEXTB API is running at http://localhost:${process.env.APP_PORT}`);
});
