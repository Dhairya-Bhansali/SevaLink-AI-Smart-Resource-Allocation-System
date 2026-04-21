import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Filter valid points and format for leaflet-heat [lat, lng, intensity]
    const validPoints = points
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => [p.lat, p.lng, p.intensity || 0.5]);

    if (layerRef.current) {
      // Remove previous layer if points update
      map.removeLayer(layerRef.current);
    }

    // Add new heatmap layer
    layerRef.current = L.heatLayer(validPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(map);

    return () => {
      // Clean up layer on unmount
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, points]);

  return null;
};

export default HeatmapLayer;
