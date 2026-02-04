import { useEffect, useRef, useState } from "react";
import BingoCsvLoader from "./BingoCsvLoader";
import UnifiedPlayer from "./components/UnifiedPlayer";
import logoLight from './assets/logo-light.png'
import logoDark from './assets/logo-dark.png'
import "bootstrap/dist/css/bootstrap.min.css";
import { useI18n } from "./i18n/I18nContext"
import I18nLanguageSelector from "./i18n/I18nLanguageSelector"

function App() {
  /* =======================
     STATE
  ======================= */
  const [songs, setSongs] = useState([]);
  const [playedSongs, setPlayedSongs] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [autoCut, setAutoCut] = useState(true);
  const [autoCutSeconds, setAutoCutSeconds] = useState(30);
  const [audioOnly, setAudioOnly] = useState(false);
  const [fullScreenPlayer, setFullScreenPlayer] = useState(false);

  /* =======================
     REFS
  ======================= */
  const containerRef = useRef(null);

  /* =======================
     CONTROLS
  ======================= */
  const playPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const nextSong = () => {
    markAsPlayed(currentIndex);
    setCurrentIndex((prev) => (prev + 1) % songs.length);
    setIsPlaying(true);
  };

  const prevSong = () => {
    markAsPlayed(currentIndex);
    setCurrentIndex((prev) =>
      prev === 0 ? songs.length - 1 : prev - 1
    );
    setIsPlaying(true);
  };

  /* =======================
     PLAYED SONGS
  ======================= */
  const markAsPlayed = (index) => {
    setPlayedSongs((prev) => new Set(prev).add(index));
  };

  const resetSongs = (newSongs) => {
    setSongs(newSongs);
    setPlayedSongs(new Set());
    setCurrentIndex(0);
    setIsPlaying(false);
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
  
  const currentSong = songs[currentIndex];
  const totalSongs = songs.length;
  const playedCount = playedSongs.size;
  const remainingCount = totalSongs - playedCount;

  const { t, loading } = useI18n();

  return (
    <>
    {loading 
    ? <div className="text-center mt-5">🌍 Loading language...</div>
    : <BingoCsvLoader songs={songs} resetSongs={resetSongs}>
      <header className="p-4 sticky-top bg-white">
        <div className="d-flex justify-content-between align-items-center">
          {/* LEFT */}
          <div className="d-flex align-items-center gap-3">
            <picture title={t("title")  }>
              <source
                srcSet={logoDark}
                media="(prefers-color-scheme: dark)"
              />
              <img
                src={logoLight}
                alt="Bingo Musical"
                width={48}
                height={48}
              />
            </picture>
            <h1 className="mb-0">{t("title")}</h1>
          </div>

          {/* RIGHT */}
          <div className="d-flex align-items-center gap-3">
            <div>
              <div className="input-group">
                <span className="input-group-text">💬</span>
                <I18nLanguageSelector/>
              </div>
            </div>
            <BingoCsvLoader.ClearButton>
              ⬆️ {t("csvUpload")}
            </BingoCsvLoader.ClearButton>
          </div>
        </div>
      </header>
      <div className="row mx-4">
        {/* CSV LOADER */}
        <BingoCsvLoader.Loader 
          title={t("csvTitle")}
          buttonText={t("csvLoad")}
          warningMessage={t("csvWarning")}
        />

        {/* PLAYER */}
        {songs.length && (
        <>
          <main id="player" ref={containerRef} 
            className={`container pb-4 col-lg-6 ${fullScreenPlayer ? "text-white" : ""}`}>
            
            <UnifiedPlayer
              song={currentSong}
              playing={isPlaying}
              volume={volume}
              audioOnly={audioOnly}
              className={fullScreenPlayer ? "h-75" : "h-50"}
              autoCutEnabled={autoCut}
              autoCutSeconds={autoCutSeconds}
              onPlay={() => setIsPlaying(true)}
              onEnded={nextSong}
            />

            {/* SONG INFO */}
            {/* 
            <h4 className="my-4 text-center">
              {currentSong.num}. {currentSong.title} - <strong>{currentSong.artist.toUpperCase()}</strong> ({currentSong.year})
            </h4>
            */}
            <h2 className="text-center my-4">
              <span className="fw-bold">⏳ {playedCount} / {totalSongs}</span> ({t("remaining",{"count":remainingCount})})
            </h2>
            
            {/* CONTROLS */}
            <div className="d-flex justify-content-center gap-3 mb-4">
              <button className="btn btn-warning" onClick={shuffleSongs} title={t("shuffle")}>
                🔀
              </button>
              <button className="btn btn-secondary" onClick={prevSong} title={t("prev")}>
                ⏮
              </button>
              <button className={isPlaying ? "btn btn-primary" : "btn btn-success"} onClick={playPause} title={isPlaying ? t("pause") : t("play")}>
                {isPlaying ? "⏸" : "▶️"}
              </button>
              <button className="btn btn-secondary" onClick={nextSong} title={t("next")}>
                ⏭
                </button>
              <button className="btn btn-dark" onClick={togglePlayerFullScreen} title={t("shuffle")}>
                📺
              </button>
            </div>

            {/* OPTIONS */}
            <div className="row align-items-center mb-4">
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={autoCut}
                    onChange={(e) => setAutoCut(e.target.checked)}
                    id="autoCut"
                  />
                  <label className="form-check-label" htmlFor="autoCut" title={t("autoCut")}>
                    ✂️ 
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    step="5"
                    value={autoCutSeconds}
                    onChange={(e) => setAutoCutSeconds(Number(e.target.value))}
                    id="autoCutSeconds"
                  /> {t("seconds")}
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="volume" title={t("volume")}>
                  🔊 {t("volume")}: {Math.round(volume * 100)}%
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  id="volume"
                />
              </div>
              <div className="col-md-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="audioOnly"
                  checked={audioOnly}
                  onChange={(e) => setAudioOnly(e.target.checked)}
                />
                <label className="form-check-label fw-bold" htmlFor="audioOnly" title={t("audioOnly")}>
                  🎧 {t("audioOnly")}
                </label>
              </div>            
            </div>
          </main>

          {/* PLAYLIST */}
          <aside className="col-lg-6 vh-100">
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
                  {song.num}. {song.title} - {song.artist} ({song.year})
                </li>
              ))}
            </ul>
          </aside>
        </>
        )}
      </div>
    </BingoCsvLoader>
    }
    </>
  );
}

export default App;
