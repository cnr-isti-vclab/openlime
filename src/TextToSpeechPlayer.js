/**
 * @typedef {Object} TextToSpeechOptions
 * @property {string} [language='it-IT'] - Language code for speech synthesis (e.g., 'en-US', 'it-IT')
 * @property {number} [rate=1.0] - Speech rate (0.1 to 10)
 * @property {number} [volume=1.0] - Speech volume (0 to 1)
 * @property {boolean} [cleanText=true] - Whether to remove HTML tags and format text
 * @property {number} [voiceSelected=-1] - Index of preferred voice (-1 for auto-selection)
 */

/**
 * @class
 * TextToSpeechPlayer provides text-to-speech functionality with extensive control options.
 * Handles voice selection, speech synthesis, text cleaning, and playback control.
 * 
 * Features:
 * - Multiple language support
 * - Automatic voice selection
 * - Text cleaning and formatting
 * - Playback controls (pause, resume, stop)
 * - Volume control with mute option
 * - Offline capability detection
 * - Chrome speech bug workarounds
 * - Page visibility handling
 * 
 * Browser Compatibility:
 * - Uses Web Speech API
 * - Implements Chrome-specific fixes
 * - Handles browser tab switching
 * - Manages page unload events
 */
class TextToSpeechPlayer {
  /**
   * Creates a new TextToSpeechPlayer instance
   * @param {TextToSpeechOptions} [options] - Configuration options
   * 
   * @example
   * ```javascript
   * const tts = new TextToSpeechPlayer({
   *     language: 'en-US',
   *     rate: 1.2,
   *     volume: 0.8,
   *     cleanText: true
   * });
   * ```
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
   * Initializes the player by loading voices and checking capabilities
   * @returns {Promise<void>}
   * @throws {Error} If voice loading fails or no suitable voices found
   * 
   * Initialization steps:
   * 1. Loads available voices
   * 2. Selects appropriate voice
   * 3. Checks offline capability
   * 4. Sets up page listeners
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
   * @private
   * Loads and selects appropriate voice for synthesis
   * @returns {Promise<SpeechSynthesisVoice>}
   * @throws {Error} If no suitable voice is found
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
   * @private
   * Cleans text by removing HTML tags and formatting
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   * 
   * Cleaning steps:
   * 1. Removes 'omissis' class content
   * 2. Converts <br> to spaces
   * 3. Strips HTML tags
   * 4. Removes escape characters
   * 5. Trims whitespace
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
   * Speaks the provided text
   * @param {string} text - Text to be spoken
   * @returns {Promise<void>}
   * @throws {Error} If speech synthesis fails or times out
   * 
   * Processing steps:
   * 1. Cancels any ongoing speech
   * 2. Cleans input text if enabled
   * 3. Creates utterance with current settings
   * 4. Handles speech synthesis
   * 5. Manages timeouts and Chrome workarounds
   * 
   * @example
   * ```javascript
   * await tts.speakText("Hello, world!");
   * ```
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
   * Pauses or resumes speech synthesis
   * @param {boolean} enable - True to pause, false to resume
   * 
   * @example
   * ```javascript
   * // Pause speech
   * tts.pauseSpeaking(true);
   * 
   * // Resume speech
   * tts.pauseSpeaking(false);
   * ```
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
   * Mutes or unmutes audio output
   * @param {boolean} enable - True to mute, false to unmute
   * 
   * @example
   * ```javascript
   * // Mute audio
   * tts.mute(true);
   * 
   * // Restore previous volume
   * tts.mute(false);
   * ```
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
   * Stops current speech synthesis
   * Cleans up resources and resets state
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

/**
 * Implementation Details
 * 
 * Chrome Bug Workarounds:
 * - Implements periodic pause/resume to prevent Chrome from stopping
 * - Uses timeout to prevent indefinite speech
 * - Handles voice loading race conditions
 * 
 * State Management:
 * ```javascript
 * {
 *     isSpeaking: boolean,    // Current speech state
 *     isPaused: boolean,      // Pause state
 *     voice: SpeechSynthesisVoice, // Selected voice
 *     isOfflineCapable: boolean,   // Offline support
 *     volume: number,         // Current volume
 *     previousVolume: number  // Pre-mute volume
 * }
 * ```
 * 
 * Event Handling:
 * - beforeunload: Stops speech on page close
 * - visibilitychange: Handles tab switching
 * - voiceschanged: Manages voice loading
 * - utterance events: Tracks speech progress
 */

export { TextToSpeechPlayer }