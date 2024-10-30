import { addSignals } from './Signals.js'

class AudioPlayer {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.isMuted = false;
    this.previousVolume = 1.0; // Volume di default
    addSignals(AudioPlayer, 'ended');
  }

  async play(audioFile, speed = 1.0) {
    if (!this.isPlaying && !this.isPaused) {
      this.audio = new Audio(audioFile);
      this.audio.volume = this.previousVolume; // Imposta il volume iniziale
      this.isPlaying = true;
      this.isPaused = false;

      this.onEndedListener = () => {
        this.isPlaying = false;
        this.emit('ended');

        // Remove the listener
        this.audio.removeEventListener('ended', this.onEndedListener);
        this.onEndedListener = null;
      };

      this.audio.addEventListener('ended', this.onEndedListener);

      this.audio.play();
      this.audio.pause();
      this.audio.playbackRate = speed;
      await this.audio.play();

      return new Promise((resolve) => {
        this.audio.onended = () => {
          this.isPlaying = false;
          resolve();
        };
      });
    } else if (this.isPaused) {
      await this.continue();
    }
  }

  pause() {
    if (this.isPlaying && this.audio) {
      this.audio.pause();
      this.isPlaying = false;
      this.isPaused = true;
    }
  }

  async continue() {
    if (this.isPaused && this.audio) {
      this.isPlaying = true;
      this.isPaused = false;

      await this.audio.play();

      return new Promise((resolve) => {
        this.audio.onended = () => {
          this.isPlaying = false;
          resolve();
        };
      });
    } else {
      console.log("No paused audio to continue.");
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.isMuted = false;
    }
  }

  setVolume(volume) {
    if (this.audio) {
      if (volume >= 0 && volume <= 1) {
        this.audio.volume = volume;
        this.previousVolume = volume;
      } else {
        console.log("Volume must be between 0.0 and 1.0");
      }
    } else {
      console.log("No audio loaded.");
    }
  }

  async silence(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  toggleMute() {
    if (this.audio) {
      if (this.isMuted) {
        this.audio.volume = this.previousVolume;
        this.isMuted = false;
      } else {
        this.previousVolume = this.audio.volume; // Salva il volume attuale
        this.audio.volume = 0;
        this.isMuted = true;
      }
    } else {
      console.log("No audio loaded.");
    }
  }
}

export { AudioPlayer }
