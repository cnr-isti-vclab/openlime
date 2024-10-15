/**
 * The TextToSpeechPlayer class is responsible for text-to-speech functionality in the application.
 * It handles voice selection, speech synthesis, and various audio controls.
 */
class TextToSpeechPlayer {
  /**
   * Creates an TextToSpeechPlayer. Additionally, an object literal with TextToSpeechPlayer `options` can be specified.
   * @param {Object} [options]
   * @param {string} [options.language='it-IT'] The language for speech synthesis.
   * @param {number} [options.rate=1.12] The speech rate.
   * @param {number} [options.volume=1.0] The speech volume.
   * @param {boolean} [options.cleanText=true] Whether to clean the text before speech synthesis.
   * @param {number} [options.voiceSelected=-1] The index of the selected voice.
   */
  constructor(options) {
    Object.assign(this, {
      language: 'it-IT',
      rate: 1.0,
      volume: 1.0,
      cleanText: true,
      voiceSelected: -1
    });
    Object.assign(this, options);

    this.voice = null;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.isOfflineCapable = false;
    this.resumeTimer = null;
    this.timeoutTimer = null;
    this.isPaused = false;
    this.previousVolume = this.volume;
  }

  /**
   * Initializes the TextToSpeechPlayer by loading the voice and checking offline capability.
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.loadVoice();
      this.checkOfflineCapability();
      console.log("TextToSpeechPlayer initialized successfully");
      console.log(`Offline capable: ${this.isOfflineCapable}`);
    } catch (error) {
      console.error("Failed to initialize TextToSpeechPlayer:", error);
      throw error;
    }
    this.setupPageListeners();
  }

  /**
   * Sets up event listeners for page visibility changes and unload events.
   * @private
   */
  setupPageListeners() {
    // For page close/refresh
    window.addEventListener('beforeunload', () => {
      this.stopSpeaking();
    });

    // For page visibility change (e.g., switching tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopSpeaking();
      }
    });
  }

  /**
   * Activates the TextToSpeechPlayer.
   */
  activate() {
    this.isSpeaking = true;
  }

  /**
   * Loads the voice for speech synthesis based on the selected language.
   * @returns {Promise<SpeechSynthesisVoice>}
   * @private
   */
  async loadVoice() {
    console.log(`Loading voice for language: ${this.language}`);
    return new Promise((resolve, reject) => {
      let synth = window.speechSynthesis;

      const setVoice = () => {
        let voices = synth.getVoices();
        if (voices.length === 0) {
          console.warn(`No voices available for this browser`);
          reject(new Error(`No voices available for this browser`));
        }
        if (this.voiceSelected >= 0) {
          this.voice = voices[this.voiceSelected];
        } else {
          const firstTwo = this.language.substring(0, 2);
          this.voice = voices.find(v => v.lang.startsWith(firstTwo));
        }
        if (this.voice) {
          console.log(`Voice loaded: ${this.voice.name}`);
          resolve(this.voice);
        } else {
          console.warn(`No suitable voice found for language: ${this.language}`);
          reject(new Error(`No voice available for ${this.language}`));
        }
      };

      if (synth.getVoices().length > 0) {
        setVoice();
      } else {
        synth.onvoiceschanged = () => {
          setVoice();
          synth.onvoiceschanged = null;
        };
        // Set a timeout in case onvoiceschanged doesn't fire
        setTimeout(() => {
          if (!this.voice) {
            console.warn("Timeout while waiting for voices to load");
            setVoice();
          }
        }, 1000);
      }
    });
  }

  /**
   * Checks if the selected voice is capable of offline speech synthesis.
   * @private
   */
  checkOfflineCapability() {
    if (this.voice) {
      // If a voice is loaded and it's not marked as a network voice, assume it's offline capable
      this.isOfflineCapable = !this.voice.localService;
    } else {
      this.isOfflineCapable = false;
    }
  }

  /**
   * Cleans the input text for speech synthesis by removing HTML tags and escape characters.
   * @param {string} text - The text to clean.
   * @returns {string} The cleaned text.
   * @private
   */
  cleanTextForSpeech(text) {
    // Remove content of any HTML tag with class "omissis" (with or without escaped quotes)
    let cleanedText = text.replace(/<[^>]+class=(\"omissis\"|"omissis")[^>]*>[\s\S]*?<\/[^>]+>/g, "");
    // Substitute <br> tag with whitespace " "
    cleanedText = cleanedText.replace(/<br\s*\/?>/gi, " ");
    // Remove HTML tags
    cleanedText = cleanedText.replace(/<\/?[^>]+(>|$)/g, "");
    // Remove escape characters like \n, \t, etc.
    cleanedText = cleanedText.replace(/\\[nrt]/g, " ");
    // Trim leading and trailing whitespace
    return cleanedText.trim();
  }

  /**
   * Speaks the provided text using speech synthesis.
   * @param {string} text - The text to speak.
   * @returns {Promise<void>}
   */
  async speakText(text) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;

    if (!this.voice) {
      console.error("Voice not loaded. Please initialize TextToSpeechPlayer first.");
      return;
    }

    if (!this.isOfflineCapable && !navigator.onLine) {
      console.error("No internet connection and offline speech is not available.");
      return;
    }

    this.isSpeaking = true;
    let cleanedText = text;
    if (this.cleanText)
      cleanedText = this.cleanTextForSpeech(text);
    console.log("Attempting to speak:", cleanedText);

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    let synth = window.speechSynthesis;
    this.currentUtterance = new SpeechSynthesisUtterance(cleanedText);
    this.currentUtterance.lang = this.language;
    this.currentUtterance.voice = this.voice;
    this.currentUtterance.rate = this.rate;
    this.currentUtterance.volume = this.volume;

    try {
      await new Promise((resolve, reject) => {
        this.currentUtterance.onend = () => {
          resolve();
        };
        this.currentUtterance.onerror = (event) => {
          console.error("Speech error:", event);
          reject(event);
        };

        synth.speak(this.currentUtterance);
        // Timeout to prevent speech from running indefinitely if it takes too long
        let maxSpeechTime = cleanedText.length * 800;
        this.timeoutTimer = setTimeout(() => {
          if (synth.speaking && this.isSpeaking) {
            console.warn("Speech synthesis taking too long. Resetting...");
            synth.cancel();
            clearInterval(this.resumeTimer);
            reject(new Error("Speech synthesis timeout"));
          }
        }, maxSpeechTime);
        // Workaround to resume speech every 10 seconds
        this.resumeTimer = setInterval(() => {
          console.log(speechSynthesis.speaking);
          if (!speechSynthesis.speaking) {
            clearInterval(this.resumeTimer);
          } else if (!this.isPaused) { // Only pause and resume if not manually paused
            speechSynthesis.pause();
            speechSynthesis.resume();
          }
        }, 10000);
      });
    } catch (error) {
      console.error("Error during speech:", error);
    }
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
    clearInterval(this.resumeTimer);
    this.resumeTimer = null;
    this.currentUtterance = null;
  }

  /**
   * Pauses or resumes the current speech synthesis.
   * @param {boolean} enable - True to pause, false to resume.
   */
  pauseSpeaking(enable) {
    if (!this.currentUtterance) {
      console.log("No speech in progress to pause/resume");
      return;
    }
    if (enable && !this.isPaused) {
      window.speechSynthesis.pause();
      this.isPaused = true;
      clearInterval(this.resumeTimer); // Clear the resume timer when pausing
    } else if (!enable && this.isPaused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
      // Restart the resume timer
      this.resumeTimer = setInterval(() => {
        if (!speechSynthesis.speaking) {
          clearInterval(this.resumeTimer);
        } else {
          speechSynthesis.pause();
          speechSynthesis.resume();
        }
      }, 10000);
    }
  }

  /**
   * Mutes or unmutes the audio playback.
   * @param {boolean} enable - True to mute, false to unmute.
   */
  mute(enable) {
    if (enable) {
      this.previousVolume = this.volume;
      this.volume = 0;
    } else {
      this.volume = this.previousVolume;
    }
  }

  /**
   * Stops the current speech synthesis.
   */
  stopSpeaking() {
    if (this.isSpeaking) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      this.currentUtterance = null;
      clearInterval(this.resumeTimer);
      this.resumeTimer = null;
    }
    this.isSpeaking = false;
  }
}

export { TextToSpeechPlayer }