import { addSignals } from './Signals.js'

/**
 * Class representing an audio player with playback control capabilities.
 * Supports playing, pausing, resuming, and stopping audio files with volume control
 * and playback speed adjustment.
 */
class AudioPlayer {
  /**
   * Creates an instance of AudioPlayer.
   * Initializes the player with default settings and sets up signal handling for the 'ended' event.
   */
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

  /**
   * Plays an audio file with optional playback speed adjustment.
   * If audio is paused, it will resume playback instead of starting a new file.
   * 
   * @param {string} audioFile - The path or URL to the audio file.
   * @param {number} [speed=1.0] - Playback speed multiplier (1.0 is normal speed).
   * @returns {Promise<void>} Resolves when the audio playback completes.
   */
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

  /**
   * Pauses the currently playing audio.
   * Updates play duration when pausing.
   */
  pause() {
    if (!this.isPaused && this.audio) {
      this.audio.pause();
      this.isPaused = true;
      this.updatePlayDuration();
    }
  }

  /**
   * Resumes playback of a paused audio file.
   * 
   * @returns {Promise<void>} Resolves when the resumed audio playback completes.
   */
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

  /**
   * Stops the current audio playback and resets all player states.
   * Removes event listeners and updates final play duration.
   */
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

  /**
   * Updates the total play duration based on the current session.
   * Called internally when playback is paused, stopped, or ends.
   * @private
   */
  updatePlayDuration() {
    if (this.playStartTime) {
      const now = Date.now();
      this.playDuration += now - this.playStartTime;
      this.playStartTime = null;
    }
  }

  /**
   * Returns the total play duration in milliseconds.
   * 
   * @returns {number} Total play duration in milliseconds.
   */
  getPlayDuration() {
    return this.playDuration;
  }

  /**
   * Sets the audio volume level.
   * 
   * @param {number} volume - Volume level between 0.0 and 1.0.
   */
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

  /**
   * Creates a delay in the execution flow.
   * 
   * @param {number} ms - Number of milliseconds to wait.
   * @returns {Promise<void>} Resolves after the specified delay.
   */
  async silence(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Toggles the mute state of the audio player.
   * Stores the previous volume level when muting and restores it when unmuting.
   */
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