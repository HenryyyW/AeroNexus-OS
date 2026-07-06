import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { CESIUM_CONFIG } from '../config/cesiumConfig';

const HK_CENTER = { lng: 114.1729, lat: 22.2783, alt: 5000 };

function CesiumViewer({ aircraft }) {
  const cesiumContainerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!cesiumContainerRef.current) return;
    if (viewerRef.current) return;

    const initViewer = async () => {
      try {
        if (CESIUM_CONFIG.CESIUM_ION_TOKEN && CESIUM_CONFIG.CESIUM_ION_TOKEN !== 'YOUR_CESIUM_ION_TOKEN_HERE') {
          Cesium.Ion.defaultAccessToken = CESIUM_CONFIG.CESIUM_ION_TOKEN;
        }

        const basemapProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/imagery/WGS84/{z}/{x}/{y}.png',
          credit: "© Map from Lands Department"
        });

        const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
          baseLayer: new Cesium.ImageryLayer(basemapProvider),
          baseLayerPicker: false,
          timeline: false,
          animation: false,
          vrButton: false,
          fullscreenButton: false,
          homeButton: false,
          navigationHelpButton: false,
          geocoder: false,
          sceneModePicker: false,
          infoBox: false,
          selectionIndicator: false,
          requestRenderMode: false,
          imageryProvider: basemapProvider,
        });

        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableLook = true;

        viewer.scene.globe.enableLighting = false;

        viewer.scene.renderError.addEventListener((error) => {
          console.warn('Cesium render error (non-fatal):', error.message);
        });

        viewerRef.current = viewer;

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            HK_CENTER.lng,
            HK_CENTER.lat,
            HK_CENTER.alt
          ),
          duration: 0,
        });

        if (CESIUM_CONFIG.HK_DATA_API_KEY && CESIUM_CONFIG.HK_DATA_API_KEY !== 'YOUR_HK_DATA_API_KEY_HERE') {
          try {
            const infrastructureUrl = `https://data.map.gov.hk/api/3d-data/3dsd/WGS84/infrastructure/tileset.json?key=${CESIUM_CONFIG.HK_DATA_API_KEY}`;
            const infrastructureTileset = await Cesium.Cesium3DTileset.fromUrl(infrastructureUrl);
            if (viewerRef.current && viewerRef.current.scene) {
              viewerRef.current.scene.primitives.add(infrastructureTileset);
              console.log('Infrastructure tileset loaded');
            }
          } catch (e) {
            console.warn('Failed to load infrastructure tileset:', e.message);
          }

          try {
            const buildingUrl = `https://data.map.gov.hk/api/3d-data/3dsd/WGS84/building/tileset.json?key=${CESIUM_CONFIG.HK_DATA_API_KEY}`;
            const buildingTileset = await Cesium.Cesium3DTileset.fromUrl(buildingUrl);
            if (viewerRef.current && viewerRef.current.scene) {
              viewerRef.current.scene.primitives.add(buildingTileset);
              console.log('Building tileset loaded');
            }
          } catch (e) {
            console.warn('Failed to load building tileset:', e.message);
          }
        }
      } catch (e) {
        console.error('Failed to initialize Cesium viewer:', e.message);
      }
    };

    initViewer();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !aircraft?.route || aircraft.route.length < 2) return;

    const viewer = viewerRef.current;

    const startPoint = Cesium.Cartesian3.fromDegrees(114.214374, 22.315202, 400);
    const endPoint = Cesium.Cartesian3.fromDegrees(114.22428750237164, 22.304629162175697, 400);

    const distance = Cesium.Cartesian3.distance(startPoint, endPoint);
    const flightDuration = distance / 25;

    const startTime = Cesium.JulianDate.fromDate(new Date());
    const stopTime = Cesium.JulianDate.addSeconds(startTime, flightDuration, new Cesium.JulianDate());

    const property = new Cesium.SampledPositionProperty();

    let time = Cesium.JulianDate.addSeconds(startTime, 0, new Cesium.JulianDate());
    property.addSample(time, startPoint);

    time = Cesium.JulianDate.addSeconds(startTime, flightDuration, new Cesium.JulianDate());
    property.addSample(time, endPoint);

    property.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
    });

    // 1. Create the base velocity orientation tracker
    const velocityOrientation = new Cesium.VelocityOrientationProperty(property);

    // 2. Define a 90-degree correction around the local Z-axis (up axis)
    // If 90 degrees turns it the wrong way, change 90 to -90
    const rotationCorrection = Cesium.Quaternion.fromAxisAngle(
      Cesium.Cartesian3.UNIT_Z,
      Cesium.Math.toRadians(-90) 
    );

    const entity = viewer.entities.add({
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start: startTime, stop: stopTime }),
      ]),
      position: property,
      
      orientation: new Cesium.CallbackProperty((time, result) => {
        const baseOrientation = velocityOrientation.getValue(time, result);
        if (!Cesium.defined(baseOrientation)) return undefined;
        
        // Multiply the flight direction quaternion by our 3D model correction factor
        return Cesium.Quaternion.multiply(baseOrientation, rotationCorrection, new Cesium.Quaternion());
      }, false),

      model: {
        uri: '/evtol.glb',
        minimumPixelSize: 48,
        scale: 1,
      },

      viewFrom: new Cesium.Cartesian3(0, -120, 80),
    });

    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 1;
    viewer.clock.shouldAnimate = true;

    viewer.scene.screenSpaceCameraController.enableInputs = true;
    viewer.scene.screenSpaceCameraController.enableRotate = true;
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.screenSpaceCameraController.enableTilt = true;
    viewer.scene.screenSpaceCameraController.enableLook = true;

    viewer.trackedEntity = entity;

    let isUserControlled = false;
    const inputHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    
    const releaseCameraControl = () => {
      isUserControlled = true;
    };

    // Listen to mouse actions to immediately hand navigation controls to the user
    inputHandler.setInputAction(releaseCameraControl, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    inputHandler.setInputAction(releaseCameraControl, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    inputHandler.setInputAction(releaseCameraControl, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    inputHandler.setInputAction(releaseCameraControl, Cesium.ScreenSpaceEventType.WHEEL);

    const onUpdate = () => {
      if (!viewer.clock.shouldAnimate) {
        viewer.scene.postUpdate.removeEventListener(onUpdate);
        viewer.entities.remove(entity);
        viewer.clock.clockRange = 0;
        viewer.clock.multiplier = 1;
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            HK_CENTER.lng,
            HK_CENTER.lat,
            HK_CENTER.alt
          ),
          duration: 2,
        });
        return;
      }

      if (!isUserControlled) {
        const position = entity.position.getValue(viewer.clock.currentTime);
        if (!Cesium.defined(position)) return;

        // Calculate reference matrix for current location
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
        
        // Calculate the camera's absolute global coordinates directly (offset behind and above aircraft)
        const localOffset = new Cesium.Cartesian3(0, -120, 80);
        const globalPosition = Cesium.Matrix4.multiplyByPoint(transform, localOffset, new Cesium.Cartesian3());
        
        // Calculate tracking vector pointing straight at the model
        const direction = Cesium.Cartesian3.subtract(position, globalPosition, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(direction, direction);
        
        // Extract the vertical 'up' vector out of the reference matrix (column 2)
        const up = new Cesium.Cartesian3(transform[8], transform[9], transform[10]);

        // Adjust view purely in global world space coordinates
        viewer.camera.setView({
          destination: globalPosition,
          orientation: {
            direction: direction,
            up: up
          }
        });
      }
    };

    viewer.scene.postUpdate.addEventListener(onUpdate);

    return () => {
      try {
        viewer.scene.postUpdate.removeEventListener(onUpdate);
        if (inputHandler && !inputHandler.isDestroyed()) {
          inputHandler.destroy();
        }
        if (!viewer.entities.contains(entity)) return;
        viewer.entities.remove(entity);
        viewer.clock.shouldAnimate = false;
        viewer.clock.clockRange = 0;
        viewer.clock.multiplier = 1;
      } catch (e) {
        console.warn('Error cleaning up animation:', e.message);
      }
    };
  }, [aircraft?.id, aircraft?.route]);

  return (
    <div
      ref={cesiumContainerRef}
      className="relative h-full min-h-[360px] w-full bg-[#07111f] rounded-3xl overflow-hidden"
      style={{ position: 'relative' }}
    />
  );
}

export default CesiumViewer;