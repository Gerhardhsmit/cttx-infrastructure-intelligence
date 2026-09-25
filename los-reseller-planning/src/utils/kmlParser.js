import { parseStringPromise } from 'xml2js';
import fs from 'fs';

export async function parseKML(filePath) {
  const xmlData = fs.readFileSync(filePath, 'utf-8');
  const parsed = await parseStringPromise(xmlData);

  const document = parsed.kml.Document[0];
  const placemarks = document.Folder[0]?.Placemark || document.Placemark || [];

  return placemarks.map(pm => extractPlacemarkData(pm));
}

function extractPlacemarkData(placemark) {
  const name = placemark.name?.[0] || '';
  const coords = placemark.Point?.[0]?.coordinates?.[0] || '0,0,0';
  const [lon, lat] = coords.split(',').slice(0, 2);

  const extendedData = placemark.ExtendedData?.[0]?.SchemaData?.[0]?.SimpleData || [];
  const data = {};

  extendedData.forEach(field => {
    const name = field.$?.name;
    const value = field._ || field;
    if (name) data[name] = value;
  });

  return {
    name,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    siteId: data.ATOLL_SITE_ID || '',
    siteAtoll: data.ATOLL_NAME || name,
    serviceLevel: data.SERVICE_LEVEL || 'BRONZE',
    bsNumber: parseInt(data.BS_NUMBER) || 0,
    coordinates: {
      type: 'Point',
      coordinates: [parseFloat(lon), parseFloat(lat)]
    }
  };
}

export function toGeoJSON(towers) {
  return {
    type: 'FeatureCollection',
    features: towers.map(tower => ({
      type: 'Feature',
      properties: {
        name: tower.name,
        siteId: tower.siteId,
        siteAtoll: tower.siteAtoll,
        serviceLevel: tower.serviceLevel,
        bsNumber: tower.bsNumber
      },
      geometry: tower.coordinates
    }))
  };
}
