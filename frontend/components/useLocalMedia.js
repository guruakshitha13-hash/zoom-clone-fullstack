"use client";
import { useCallback, useEffect, useRef, useState } from "react";

function describe(err, what) {
  if (!err) return "";
  if (err.name === "NotAllowedError" || err.name === "SecurityError") return `${what} permission was denied. You can still use the meeting.`;
  if (err.name === "NotFoundError" || err.name === "OverconstrainedError") return `No ${what.toLowerCase()} was found on this device.`;
  if (err.name === "NotReadableError") return `Your ${what.toLowerCase()} is being used by another app.`;
  return `Couldn't access ${what.toLowerCase()}.`;
}

const supported = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

// Manages camera, microphone and screen-share tracks with real browser APIs.
export default function useLocalMedia() {
  const [camStream, setCamStream] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [notice, setNotice] = useState("");
  const micTrack = useRef(null);
  const camTrack = useRef(null);
  const screenRef = useRef(null);

  const rebuildCam = (track) => setCamStream(track ? new MediaStream([track]) : null);

  const startCamera = useCallback(async () => {
    if (!supported()) { setNotice("Camera isn't supported in this browser (a secure http://localhost or https page is required)."); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      camTrack.current = s.getVideoTracks()[0];
      rebuildCam(camTrack.current);
      setCamOn(true);
    } catch (e) {
      setNotice(describe(e, "Camera"));
      setCamOn(false);
    }
  }, []);

  const startMic = useCallback(async () => {
    if (!supported()) { setNotice("Microphone isn't supported in this browser."); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      micTrack.current = s.getAudioTracks()[0];
      setMicOn(true);
    } catch (e) {
      setNotice(describe(e, "Microphone"));
      setMicOn(false);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (camTrack.current) {
      camTrack.current.stop();
      camTrack.current = null;
      rebuildCam(null);
      setCamOn(false);
    } else {
      await startCamera();
    }
  }, [startCamera]);

  const toggleMic = useCallback(async () => {
    if (micTrack.current) {
      micTrack.current.enabled = !micTrack.current.enabled;
      setMicOn(micTrack.current.enabled);
    } else {
      await startMic();
    }
  }, [startMic]);

  const stopScreen = useCallback(() => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreenStream(null);
  }, []);

  const toggleScreen = useCallback(async () => {
    if (screenRef.current) { stopScreen(); return; }
    if (!navigator.mediaDevices?.getDisplayMedia) { setNotice("Screen sharing isn't supported on this device or browser."); return; }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      s.getVideoTracks()[0].addEventListener("ended", stopScreen);
      screenRef.current = s;
      setScreenStream(s);
    } catch (e) {
      if (e.name !== "NotAllowedError" && e.name !== "AbortError") setNotice("Couldn't start screen sharing.");
    }
  }, [stopScreen]);

  const stopAll = useCallback(() => {
    micTrack.current?.stop();
    camTrack.current?.stop();
    screenRef.current?.getTracks().forEach((t) => t.stop());
    micTrack.current = camTrack.current = screenRef.current = null;
  }, []);

  useEffect(() => stopAll, [stopAll]);

  return { camStream, camOn, micOn, screenStream, notice, setNotice, toggleCamera, toggleMic, toggleScreen, startCamera, startMic, stopAll };
}
