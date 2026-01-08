import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";

function App() {
  /* =======================
     STATE
  ======================= */
  const [originalSongs, setOriginalSongs] = useState([]);
  const [songs, setSongs] = useState([]);
  const [playedSongs, setPlayedSongs] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [autoCut, setAutoCut] = useState(true);
  
  const [autoCutSeconds, setAutoCutSeconds] = useState(60);
  const [fullScreenPlayer, setFullScreenPlayer] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);

  /* =======================
     REFS
  ======================= */
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const cutTimeoutRef = useRef(null);

  /* =======================
     LOAD CSV
  ======================= */
  const REQUIRED_COLUMNS = ["Num", "Title", "Artist", "Year"];
  const MEDIA_COLUMNS = ["Audio", "Video","YouTube"];
  const STRICT_CSV_MODE = true;
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvValid, setCsvValid] = useState(true);

  function validateAndNormalizeSongs(rows) {
    const validSongs = [];
    const errors = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 per header CSV
      const currentErrors = errors.length;

      // Camps obligatoris
      for (const col of REQUIRED_COLUMNS) {
        if (!row[col] || !row[col].toString().trim()) {
          errors.push(`Fila ${rowNumber}: falta la columna "${col}"`);
        }
      }

      // com a mínim UNA font vàlida
      if (!row.Video && !row.Audio && !row.YouTube) {
        errors.push(
          `Fila ${rowNumber}: Cal indicar Video, Audio o YouTube`
        );
      }

      if (row.YouTube && 
        !row.YouTube.includes("youtube.com") && 
        !row.YouTube.includes("youtu.be")) {
        errors.push(
          `Fila ${rowNumber}: Enllaç de YouTube no vàlid`
        );
      }

      // Start
      let start = 0;
      if (row.Start && row.Start.toString().trim() !== "") {
        const parsed = Number(row.Start);
        if (isNaN(parsed) || parsed < 0) {
          errors.push(
            `Fila ${rowNumber}: "Start" no és un número vàlid`
          );
        }
        start = parsed;
      }

      // Normalitzar
      if (errors.length == currentErrors) {
        validSongs.push({
          Num: row.Num.trim(),
          Title: row.Title.trim(),
          Artist: row.Artist.trim(),
          Year: row.Year.trim(),
          Audio: row.Audio?.trim() || "",
          Video: row.Video?.trim() || "",
          YouTube: row.YouTube?.trim() || "",
          Start: start,
        });
      }
    });

    return { validSongs, errors };
  }

  useEffect(() => {
    fetch("/songs.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });

        const { validSongs, errors } =
          validateAndNormalizeSongs(parsed.data);

        if (errors.length) {
          console.group("❌ Errors al CSV");
          errors.forEach((e) => console.error(e));
          console.groupEnd();

          setCsvErrors(errors);
          setCsvValid(false);

          if (STRICT_CSV_MODE) {
            return; // ❌ NO carregar cançons
          }
        }

        setCsvErrors([]);
        setCsvValid(true);
        setSongs(validSongs);
        setOriginalSongs(validSongs);
      })
      .catch((err) => {
        setCsvErrors(["No s'ha pogut carregar el fitxer CSV"]);
        setCsvValid(false);
        console.error(err);
      });
  }, []);

  const getYouTubeEmbedUrl = (url, start = 0) => {
    let videoId = null;

    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1];
    } else if (url.includes("watch?v=")) {
      videoId = new URL(url).searchParams.get("v");
    }

    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&start=${start}`;
  }

  const getSongSource = (song) => {
    if (song?.Video?.trim().length > 0 && !audioOnly) {
      return { 
        type: "video", 
        src: `/video/${song.Video}` 
      };
    }

    if (song?.Audio?.trim().length > 0) {
      return { 
        type: "audio", 
        src: `/audio/${song.Audio}` 
      };
    }

    if (song?.YouTube?.trim().length > 0) {
      return {
        type: "youtube",
        src: getYouTubeEmbedUrl(song.YouTube, song.Start || 0),
      };
    }

    return null;
  }

  const currentSong = getSongSource(songs[currentIndex]);
  
  /* =======================
     START
  ======================= */
  const startAt = Math.max(
    0,
    Number(currentSong?.Start ?? 0)
  );

  useEffect(() => {
    if (!mediaRef.current) return;

    const media = mediaRef.current;

    const seekToStart = () => {
      try {
        media.currentTime = startAt;
      } catch {
        /* ignore */
      }
    };

    // Si ja està carregat
    if (media.readyState >= 1) {
      seekToStart();
    } else {
      // Esperar que carregui metadata
      media.addEventListener("loadedmetadata", seekToStart, {
        once: true,
      });
    }
  }, [currentIndex, startAt]);

  /* =======================
     AUTO CUT 
  ======================= */
  const handleAutoCut = () => {
    clearAutoCut();
    if (!autoCut) return;
    //const seconds = Math.floor(Math.random() * 16) + 30;
    cutTimeoutRef.current = window.setTimeout(nextSong, autoCutSeconds * 1000);
  };

  const clearAutoCut = () => {
    if (cutTimeoutRef.current) {
      clearTimeout(cutTimeoutRef.current);
      cutTimeoutRef.current = null;
    }
  };

  /* =======================
     CONTROLS
  ======================= */
  useEffect(() => {
    if (currentSong?.type === "audio" || currentSong?.type === "video") {
      // 🔊 AUDIO / 🎬 VIDEO
      if (!mediaRef.current) return;
      mediaRef.current.volume = volume;
      if (isPlaying) {
        mediaRef.current.play().catch(() => {});
      } else {
        mediaRef.current.pause();
      }
    }
    // 🔊 AUDIO / 🎬 VIDEO / YOUTUBE
    if (isPlaying) {
      handleAutoCut();
    } else {
      clearAutoCut();
    }
    return clearAutoCut;
  }, [currentIndex, isPlaying, volume]);

  const playPause = () => setIsPlaying((p) => !p);

  const nextSong = () => {
    clearAutoCut();
    markAsPlayed(currentIndex);
    setCurrentIndex((i) => (i + 1) % songs.length);
    setIsPlaying(true);
  };

  const prevSong = () => {
    clearAutoCut();
    markAsPlayed(currentIndex);
    setCurrentIndex((i) =>
      i === 0 ? songs.length - 1 : i - 1
    );
    setIsPlaying(true);
  };

  /* =======================
     SHUFFLE
  ======================= */
  const shuffleSongs = () => {
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSongs(shuffled);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  /* =======================
     PLAYED SONGS
  ======================= */
  const markAsPlayed = (index) => {
    setPlayedSongs((prev) => new Set(prev).add(index));
  };

  const toggleAsPlayed = (index) => {
    setPlayedSongs((prev) => {
      const copy = new Set(prev);
      copy.has(index)
        ? copy.delete(index)
        : copy.add(index);
      return copy;
    });
  }
  
  /* =======================
     FULLSCREEN
  ======================= */
  const togglePlayerFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setFullScreenPlayer(true);
    } else {
      document.exitFullscreen();
      setFullScreenPlayer(false);
    }
  };

  const handleFullScreenPlayer = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      setFullScreenPlayer(true);
    } else {
      setFullScreenPlayer(false);
    }
  }

  /* Maintain fullscreen on song change */
  useEffect(() => {
    const current = containerRef.current;
    if (current) {
      current.addEventListener('fullscreenchange', handleFullScreenPlayer);
    }
    return () => {
      if (current) {
        current.removeEventListener('fullscreenchange', handleFullScreenPlayer);
      }
    };
  }, [currentIndex]);

  /* =======================
     RENDER
  ======================= */
  const totalSongs = songs.length;
  const playedCount = playedSongs.size;
  const remainingCount = totalSongs - playedCount;

  if (!csvValid) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4 className="alert-heading">❌ Error en el CSV</h4>
          <p>
            El fitxer <strong>songs.csv</strong> conté errors i no es pot carregar.
          </p>

          <ul className="mb-0">
            {csvErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>

          {!STRICT_CSV_MODE && (
            <p className="mt-3 text-warning">
              ⚠️ Mode no estricte: s'han carregat només les cançons vàlides
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!currentSong) {
    return <div className="p-4">Carregant…</div>;
  }

  return (
  <>
    <header className="p-4 sticky-top bg-white">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <picture>
            <source
              srcSet="/logo-dark.png"
              media="(prefers-color-scheme: dark)"
            />
            <img
              src="/logo-light.png"
              alt="Bingo Musical"
              width={48}
              height={48}
            />
          </picture>
          <h1 className="mb-0">Bingo Musical</h1>
        </div>
        <button
          className="btn btn-dark"
          onClick={togglePlayerFullScreen}
        >
          📺 Pantalla completa
        </button>
      </div>
    </header>    
    <div className="row mx-4">
      <main id="player" ref={containerRef} 
        className={`container pb-4 col-lg-6 ${fullScreenPlayer ? "text-white" : ""}`}>
        {/* PLAYER */}
        {currentSong?.type === "video" && (
          <video
            ref={(el) => (mediaRef.current = el)}
            src={currentSong.src}
            width="100%"
            className={fullScreenPlayer ? "h-75" : "h-50"}
            controls 
            onClick={playPause}
            onError={() => {
              console.warn(`⚠️ Video no compatible: ${currentSong.Video}`);
              //TODO setUseAudio(true);
            }}
          />
        )}
        {currentSong?.type === "audio" && (
          <div className="d-flex align-items-center justify-content-center">
            <audio
              ref={(el) => (mediaRef.current = el)}
              src={currentSong.src}
              controls 
            />
          </div>
        )}
        {currentSong?.type === "youtube" && isPlaying && (
          <iframe
            key={currentIndex} // 🔥 força reload
            src={currentSong.src} 
            width="100%"
            className={fullScreenPlayer ? "h-75" : "h-50"}
            allow="autoplay; encrypted-media"
          />
        )}

        {/* INFO */}
        {/*
        <h4 className="my-4 text-center">
          {currentSong.Num}. {currentSong.Title} - <strong>{currentSong.Artist.toUpperCase()}</strong> ({currentSong.Year})
        </h4>
        */}
        <h2 className="text-center my-4">
          <span className="fw-bold">⏳ {playedCount} / {totalSongs}</span> ({remainingCount} pendents)
        </h2>
        {/* CONTROLS */}
        <div className="d-flex flex-wrap gap-2 mb-4 align-items-center justify-content-center">
          <button className="btn btn-warning" onClick={shuffleSongs}>
            🔀
          </button>
          <button className="btn btn-secondary" onClick={prevSong}>
            ⏮
          </button>
          <button
            className={isPlaying ? "btn btn-primary" : "btn btn-success"}
            onClick={playPause}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="btn btn-secondary" onClick={nextSong}>
            ⏭
          </button>
          <button className="btn btn-dark" onClick={togglePlayerFullScreen}>
            📺  
          </button>
        </div>
        {/* OPTIONS */}
        <div className="w-50 mx-auto text-center">
          <div className="form-check mb-2 d-flex gap-2 align-items-center justify-content-center">
            <input
              className="form-check-input"
              type="checkbox"
              checked={autoCut}
              onChange={(e) => setAutoCut(e.target.checked)}
              id="autoCut"
            />
            <label className="form-check-label" htmlFor="autoCut">
              ✂️ 
            </label>
            <input
              type="number"
              min="15"
              max="180"
              step="15"
              value={autoCutSeconds}
              onChange={(e) => setAutoCutSeconds(Number(e.target.value))}
              id="autoCutSeconds"
            /> segons
          </div>
          <div className="form-check mb-2">
            <label className="form-label">
              🔊 Volum: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              className="form-range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </div>
          <div className="form-check mb-2 d-flex gap-2 align-items-center justify-content-center">
            <input
              className="form-check-input"
              type="checkbox"
              id="audioOnly"
              checked={audioOnly}
              onChange={(e) => setAudioOnly(e.target.checked)}
            />
            <label className="form-check-label fw-bold" htmlFor="audioOnly">
              🎧 Només àudio
            </label>
          </div>
        </div>
      </main>
      <aside className="col-lg-6 vh-100">
        {/* PLAYLIST */}
        <ul className="list-group h-75 overflow-auto">
          {songs.map((song, index) => (
            <li
              key={index}
              className={`list-group-item d-flex justify-content-between align-items-center
                ${index === currentIndex ? "active" : ""}
                ${playedSongs.has(index) ? "list-group-item-success opacity-75" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setCurrentIndex(index);
                setIsPlaying(true);
              }}
            >
              <span>
                {song.Num}. {song.Title} - {song.Artist}
              </span>
              {/* LOCUTOR CHECK */}
              <div className="form-check mt-2 d-flex align-items-center gap-2"
                onClick={(event) => event.stopPropagation()}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={playedSongs.has(index)}
                  onChange={()=>{toggleAsPlayed(index)}}
                  id={`playedCheck${index}`}
                />
                <label className="form-check-label fw-bold" htmlFor={`playedCheck${index}`}>🎤</label>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  </>
  );
}

export default App
