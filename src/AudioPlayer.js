import { addSignals } from './Signals.js'

class AudioPlayer {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.isMuted = false;
    this.previousVolume = 1.0;
    this.playStartTime = null;
    this.playDuration = 0;
    addSignals(AudioPlayer, 'ended');
  }

  async play(audioFile, speed = 1.0) {
    if (!this.isPlaying && !this.isPaused) {
      this.audio = new Audio(audioFile);
      this.audio.playbackRate = speed;
      this.audio.volume = this.previousVolume;
      this.isPlaying = true;
      this.isPaused = false;
      this.playStartTime = Date.now();
      this.playDuration = 0;
      this.onEndedListener = () => {
        this.isPlaying = false;
        this.updatePlayDuration();
        this.emit('ended');

        // Remove the listener
        this.audio.removeEventListener('ended', this.onEndedListener);
        this.onEndedListener = null;
      };

      this.audio.addEventListener('ended', this.onEndedListener);

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
    if (!this.isPaused && this.audio) {
      this.audio.pause();
      this.isPaused = true;
      this.updatePlayDuration();
    }
  }

  async continue() {
    if (this.isPaused && this.audio) {
      this.isPaused = false;
      this.playStartTime = Date.now();

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
      if (this.onEndedListener) {
        this.audio.removeEventListener('ended', this.onEndedListener);
        this.onEndedListener = null;
      }
      this.isPlaying = false;
      this.isPaused = false;
      this.isMuted = false;
      this.updatePlayDuration();
    }
  }

  updatePlayDuration() {
    if (this.playStartTime) {
      const now = Date.now();
      this.playDuration += now - this.playStartTime;
      this.playStartTime = null;
    }
  }

  getPlayDuration() {
    return this.playDuration;
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

  async silence(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  toggleMute() {
    if (this.audio) {
      if (this.isMuted) {
        this.audio.volume = this.previousVolume;
        this.isMuted = false;
      } else {
        this.previousVolume = this.audio.volume;
        this.audio.volume = 0;
        this.isMuted = true;
      }
    } else {
      console.log("No audio loaded.");
    }
  }
}

export { AudioPlayer }
