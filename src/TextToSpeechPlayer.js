/**
 * @typedef {Object} TextToSpeechOptions
 * @property {string} [language='it-IT'] - Language code for speech synthesis (e.g., 'en-US', 'it-IT')
 * @property {number} [rate=1.0] - Speech rate (0.1 to 10)
 * @property {number} [volume=1.0] - Speech volume (0 to 1)
 * @property {boolean} [cleanText=true] - Whether to remove HTML tags and format text
 * @property {number} [voiceSelected=-1] - Index of preferred voice (-1 for auto-selection)
 */

/**
 * 
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
 * 
 *
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
    // Default configuration
    this.config = {
      language: 'it-IT',
      rate: 1.0,
      volume: 1.0,
      cleanText: true,
      voiceSelected: -1
    };
    
    // Apply user options
    if (options) {
      Object.assign(this.config, options);
    }

    // State properties
    this.voice = null;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.isOfflineCapable = false;
    this.resumeTimer = null;
    this.timeoutTimer = null;
    this.isPaused = false;
    this.previousVolume = this.config.volume;
    this.intentionalStop = false;
    this._resolveCurrentSpeech = null;
    
    // Check if Speech Synthesis API is supported
    if (!window.speechSynthesis) {
      console.error("Speech Synthesis API is not supported in this browser");
    }
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
      // Ensure Speech Synthesis API is available
      if (!window.speechSynthesis) {
        throw new Error("Speech Synthesis API is not supported in this browser");
      }
      
      // Pre-warm the speech synthesis engine with a silent utterance
      // This solves the "first click does nothing" issue in some browsers
      await this.warmUpSpeechSynthesis();
      
      await this.loadVoice();
      this.checkOfflineCapability();
      this.setupPageListeners();
      console.log("TextToSpeechPlayer initialized successfully");
      console.log(`Offline capable: ${this.isOfflineCapable}`);
      return true;
    } catch (error) {
      console.error("Failed to initialize TextToSpeechPlayer:", error);
      throw error;
    }
  }
  
  /**
   * Warms up the speech synthesis engine with a silent utterance.
   * This helps with the first-time initialization in some browsers.
   * @private
   */
  async warmUpSpeechSynthesis() {
    return new Promise((resolve) => {
      try {
        // Create a silent utterance (space character with zero volume)
        const emptyUtterance = new SpeechSynthesisUtterance(" ");
        emptyUtterance.volume = 0;
        
        // Ensure it completes quickly
        emptyUtterance.rate = 2;
        
        emptyUtterance.onend = () => {
          resolve();
        };
        
        emptyUtterance.onerror = () => {
          // Even if there's an error, we should continue
          resolve();
        };
        
        // Set a timeout in case the event doesn't fire
        setTimeout(resolve, 500);
        
        // Speak the empty utterance
        window.speechSynthesis.speak(emptyUtterance);
      } catch (e) {
        console.warn("Failed to warm up speech synthesis", e);
        resolve();
      }
    });
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
   * Loads and selects appropriate voice for synthesis.
   * 
   * @returns {Promise<SpeechSynthesisVoice>}
   * @throws {Error} If no suitable voice is found
   * @private
   */
  async loadVoice() {
    console.log(`Loading voice for language: ${this.config.language}`);
    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      
      // Function to set voice based on available voices
      const setVoice = () => {
        let voices = synth.getVoices();
        
        if (voices.length === 0) {
          console.warn("No voices available for this browser");
          reject(new Error("No voices available for this browser"));
          return;
        }
        
        // Select voice based on index if provided
        if (this.config.voiceSelected >= 0 && this.config.voiceSelected < voices.length) {
          this.voice = voices[this.config.voiceSelected];
        } else {
          // Otherwise select by language
          const firstTwo = this.config.language.substring(0, 2);
          this.voice = voices.find(v => v.lang.startsWith(firstTwo));
        }
        
        if (this.voice) {
          console.log(`Voice loaded: ${this.voice.name}`);
          resolve(this.voice);
        } else {
          console.warn(`No suitable voice found for language: ${this.config.language}`);
          reject(new Error(`No voice available for ${this.config.language}`));
        }
      };

      // Try to set voice immediately if already available
      if (synth.getVoices().length > 0) {
        setVoice();
      } else {
        // Otherwise wait for voices to load
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
   * 
   * @private
   */
  checkOfflineCapability() {
    if (this.voice) {
      // A voice is offline capable if localService is true (not false as in original code)
      this.isOfflineCapable = this.voice.localService;
    } else {
      this.isOfflineCapable = false;
    }
  }

  /**
   * Cleans text by removing HTML tags and formatting.
   * 
   * Cleaning steps:
   * 1. Removes 'omissis' class content
   * 2. Converts <br> to spaces
   * 3. Strips HTML tags
   * 4. Removes escape characters
   * 5. Trims whitespace
   * 
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   * @private
   */
  cleanTextForSpeech(text) {
    if (!text) return "";
    
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
    // First stop any current speech
    this.stopSpeaking();
    
    if (!text) {
      console.warn("No text provided to speak");
      return;
    }

    if (!this.voice) {
      console.error("Voice not loaded. Please initialize TextToSpeechPlayer first.");
      return;
    }

    if (!this.isOfflineCapable && !navigator.onLine) {
      console.error("No internet connection and offline speech is not available.");
      return;
    }

    // Set speaking state
    this.isSpeaking = true;
    this.isPaused = false;
    
    // Process text if needed
    let cleanedText = text;
    if (this.config.cleanText) {
      cleanedText = this.cleanTextForSpeech(text);
    }
    
    if (!cleanedText) {
      console.warn("Text is empty after cleaning");
      this.isSpeaking = false;
      return;
    }
    
    console.log("Attempting to speak:", cleanedText);

    const synth = window.speechSynthesis;
    
    // Ensure the synthesis system is active (fixes Chrome/Firefox first-time issues)
    synth.cancel();
    
    // Store whether we intentionally cancelled speech
    this.intentionalStop = false;
    
    try {
      // Create new utterance
      this.currentUtterance = new SpeechSynthesisUtterance(cleanedText);
      this.currentUtterance.lang = this.config.language;
      this.currentUtterance.voice = this.voice;
      this.currentUtterance.rate = this.config.rate;
      this.currentUtterance.volume = this.config.volume;

      // Handle speaking process
      await new Promise((resolve, reject) => {
        // Store the resolve function so we can call it from stopSpeaking
        this._resolveCurrentSpeech = resolve;
        
        this.currentUtterance.onend = () => {
          resolve('completed');
        };
        
        this.currentUtterance.onerror = (event) => {
          // Don't treat intentional stops as errors
          if (this.intentionalStop && event.error === 'interrupted') {
            console.log("Speech intentionally interrupted");
            resolve('interrupted');
          } else {
            console.error("Speech error:", event);
            reject(event);
          }
        };

        // Start speaking
        synth.speak(this.currentUtterance);
        
        // Force Chrome to start speaking immediately (fixes first-play issues)
        if (!this.isPaused && synth.speaking) {
          synth.pause();
          synth.resume();
        }
        
        // Timeout to prevent speech from running indefinitely
        const maxSpeechTime = Math.max(5000, cleanedText.length * 100); // At least 5 seconds
        this.timeoutTimer = setTimeout(() => {
          if (synth.speaking && this.isSpeaking) {
            console.warn("Speech synthesis taking too long. Resetting...");
            this.intentionalStop = true;
            this.stopSpeaking();
            resolve('timeout');
          }
        }, maxSpeechTime);
        
        // Workaround for Chrome bug - resume speech every 10 seconds
        this.resumeTimer = setInterval(() => {
          if (!synth.speaking) {
            clearInterval(this.resumeTimer);
            this.resumeTimer = null;
          } else if (!this.isPaused) {
            // Only pause and resume if not manually paused
            synth.pause();
            synth.resume();
          }
        }, 10000);
      });
    } catch (error) {
      // Only log errors that aren't related to intentional stopping
      if (!(this.intentionalStop && error.error === 'interrupted')) {
        console.error("Error during speech:", error);
      }
    } finally {
      // Clean up regardless of outcome
      if (this.isSpeaking) {
        this.stopSpeaking();
      }
    }
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
    if (!window.speechSynthesis || !this.isSpeaking) {
      console.log("No speech in progress to pause/resume");
      return;
    }
    
    const synth = window.speechSynthesis;
    
    if (enable && !this.isPaused) {
      // Pause speech
      synth.pause();
      this.isPaused = true;
      
      // Clear the resume timer when pausing
      if (this.resumeTimer) {
        clearInterval(this.resumeTimer);
        this.resumeTimer = null;
      }
    } else if (!enable && this.isPaused) {
      // Resume speech
      synth.resume();
      this.isPaused = false;
      
      // Restart the resume timer for Chrome bug workaround
      this.resumeTimer = setInterval(() => {
        if (!synth.speaking) {
          clearInterval(this.resumeTimer);
          this.resumeTimer = null;
        } else {
          synth.pause();
          synth.resume();
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
      this.previousVolume = this.config.volume;
      this.config.volume = 0;
    } else {
      this.config.volume = this.previousVolume;
    }
    
    // Update current utterance if speaking
    if (this.currentUtterance) {
      this.currentUtterance.volume = this.config.volume;
    }
  }

  /**
   * Stops current speech synthesis
   * Cleans up resources and resets state
   */
  stopSpeaking() {
    const synth = window.speechSynthesis;
    
    // Mark that we're intentionally stopping speech to handle the error properly
    this.intentionalStop = true;
    
    // Cancel speech if speaking
    if (synth && synth.speaking) {
      try {
        synth.cancel();
      } catch (e) {
        console.error("Error cancelling speech:", e);
      }
    }
    
    // Clear timers
    if (this.resumeTimer) {
      clearInterval(this.resumeTimer);
      this.resumeTimer = null;
    }
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    
    // Resolve any pending promise to prevent unhandled rejections
    if (this._resolveCurrentSpeech) {
      this._resolveCurrentSpeech('stopped');
      this._resolveCurrentSpeech = null;
    }
    
    // Reset state
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
  }
}

export { TextToSpeechPlayer }