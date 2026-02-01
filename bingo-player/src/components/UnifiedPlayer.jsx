import { useEffect, useRef } from "react";

export default function UnifiedPlayer({
  song,
  playing,
  volume = 1,
  audioOnly = false,
  className = "",
  autoCutEnabled = false,
  autoCutSeconds = 0,
  onPlay,
  onEnded,
}) {
  /* =======================
     REFS
  ======================= */  
  const mediaRef = useRef(null);
  const autoCutRef = useRef(null);

  /* =======================
     MEDIA TYPE
  ======================= */  
  const hasVideo = !!song.video;
  const hasAudio = !!song.audio;
  const hasYoutube = !!song.youtube;

  const type = hasVideo && !audioOnly
    ? "video"
    : hasAudio
    ? "audio"
    : hasYoutube && playing
    ? "youtube"
    : null;
    
  /* ============================
     AUTO CUT
  ============================ */

  useEffect(() => {
    clearTimeout(autoCutRef.current);

    if (!playing || !autoCutEnabled || !autoCutSeconds) return;

    autoCutRef.current = setTimeout(() => {
      onEnded();
    }, autoCutSeconds * 1000);

    return () => clearTimeout(autoCutRef.current);
  }, [playing, autoCutEnabled, autoCutSeconds, song]);

  /* ============================
     HTML5 AUDIO / VIDEO
  ============================ */

  useEffect(() => {
    if (!mediaRef.current) return;
    if (type !== "audio" && type !== "video") return;

    mediaRef.current.volume = volume;

    if (playing) {
      mediaRef.current.play().catch(() => {});
    } else {
      mediaRef.current.pause();
    }
  }, [playing, volume, type, song]);
  
  /* =======================
     START AT 
  ======================= */

  const handleLoadedMetadata = (e) => {
    e.currentTarget.currentTime = song.start || 0;
  };

  /* ============================
     RENDER
  ============================ */
  if (!type) return null;

  if (type === "audio") {
    return (
      <audio
        ref={mediaRef}
        src={song.audio}
        controls
        className={className}
        onPlay={onPlay}
        onEnded={onEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />
    );
  }

  if (type === "video") {
    return (
      <video
        ref={mediaRef}
        src={song.video}
        controls
        width="100%"
        className={className}
        onPlay={onPlay}
        onEnded={onEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />
    );
  }

  if (type === "youtube") {
    return (
      <iframe
        key={`${song.youtube}-${song.start}-${playing}`}
        src={song.youtube}
        width="100%"
        className={className}
        title="YouTube player"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  return null;
}
