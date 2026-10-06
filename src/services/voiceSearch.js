/**
 * Voice Search Service (Web Speech API + Capacitor Native abstraction)
 */

class VoiceSearchService {
  constructor() {
    this.recognition = null;
    this.isSupported = false;
    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN'; // Indian English / Global English support
        this.isSupported = true;
      }
    }
  }

  /**
   * Start listening for voice input
   * @param {Object} callbacks - { onStart, onResult, onEnd, onError }
   */
  startListening({ onStart, onResult, onEnd, onError }) {
    if (!this.isSupported || !this.recognition) {
      if (onError) onError('Voice search is not supported in this browser or environment.');
      return;
    }

    this.recognition.onstart = () => {
      if (onStart) onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      if (onResult && text) {
        onResult(text.trim(), Boolean(finalTranscript));
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[VoiceSearch] Recognition error:', event.error);
      if (onError) onError(event.error === 'not-allowed' ? 'Microphone permission denied' : event.error);
    };

    this.recognition.onend = () => {
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('[VoiceSearch] Start error:', err.message);
      if (onError) onError(err.message);
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }
}

export default new VoiceSearchService();
