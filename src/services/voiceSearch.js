/**
 * Voice Search Service
 *
 * Android: Native Capgo speech recognition.
 * iOS: Existing Web Speech API implementation.
 * Web: Existing Web Speech API implementation.
 */

import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

class VoiceSearchService {
  constructor() {
    this.recognition = null;
    this.isSupported = false;
    this.isStarting = false;
    this.isListening = false;
    this.isStopping = false;
    this.isAndroid = Capacitor.getPlatform() === 'android';

    this.currentCallbacks = null;
    this.lastTranscript = '';
    this.nativeListeners = [];
    this.sessionId = 0;

    if (!this.isAndroid) {
      this.initWebRecognition();
    }
  }

  initWebRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.isSupported = false;
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';
    this.isSupported = true;

    this.recognition.onstart = () => {
      this.isStarting = false;
      this.isListening = true;
      this.currentCallbacks?.onStart?.();
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const text = (finalText || interim).trim();

      if (text) {
        this.currentCallbacks?.onResult?.(
          text,
          Boolean(finalText)
        );
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[VoiceSearch] Web recognition error:', event.error);

      this.currentCallbacks?.onError?.(
        event.error === 'not-allowed'
          ? 'Speech recognition access denied.'
          : event.error
      );

      // Wait for onend to release the session.
    };

    this.recognition.onend = () => {
      this.isStarting = false;
      this.isListening = false;
      this.isStopping = false;

      const callbacks = this.currentCallbacks;
      this.currentCallbacks = null;

      callbacks?.onEnd?.();
    };
  }

  async startListening(callbacks = {}) {
    if (this.isAndroid) {
      return this.startAndroidListening(callbacks);
    }

    return this.startWebListening(callbacks);
  }

  startWebListening(callbacks) {
    if (!this.isSupported || !this.recognition) {
      callbacks.onError?.(
        'Voice search is not supported in this browser.'
      );
      return;
    }

    if (this.isStarting || this.isListening || this.isStopping) {
      // A repeated tap stops the current session instead of
      // calling start() a second time.
      this.stopListening();
      return;
    }

    this.currentCallbacks = callbacks;
    this.isStarting = true;

    try {
      this.recognition.start();
    } catch (error) {
      this.isStarting = false;
      this.currentCallbacks = null;

      console.error('[VoiceSearch] Web start error:', error);

      callbacks.onError?.(error.message);
    }
  }

  async startAndroidListening(callbacks) {
    if (this.isStarting || this.isListening || this.isStopping) {
      // Make a second tap stop the active session.
      await this.stopListening();
      return;
    }

    const id = ++this.sessionId;

    this.currentCallbacks = callbacks;
    this.lastTranscript = '';
    this.isStarting = true;
    this.isStopping = false;

    try {
      const permission = await SpeechRecognition.checkPermissions();

      if (id !== this.sessionId) return;

      if (permission.speechRecognition !== 'granted') {
        const requested =
          await SpeechRecognition.requestPermissions();

        if (id !== this.sessionId) return;

        if (requested.speechRecognition !== 'granted') {
          throw new Error(
            'Speech recognition permission was not granted. ' +
            'Please allow microphone access in Android settings.'
          );
        }
      }

      const availability = await SpeechRecognition.available();

      if (id !== this.sessionId) return;

      if (!availability.available) {
        throw new Error(
          'Speech recognition is unavailable on this device. ' +
          'Check that a speech-recognition service is installed and enabled.'
        );
      }

      // Register listeners before starting recognition.
      await this.removeNativeListeners();

      const partialListener =
        await SpeechRecognition.addListener(
          'partialResults',
          (event) => {
            if (id !== this.sessionId) return;

            const text = (
              event.accumulatedText ||
              event.matches?.[0] ||
              ''
            ).trim();

            if (!text) return;

            this.lastTranscript = text;
            this.currentCallbacks?.onResult?.(text, false);
          }
        );

      this.nativeListeners.push(partialListener);

      const stateListener =
        await SpeechRecognition.addListener(
          'listeningState',
          (event) => {
            if (id !== this.sessionId) return;

            const stopped =
              event.state === 'stopped' ||
              event.status === 'stopped';

            if (stopped) {
              this.finishAndroidSession(id);
            } else if (
              event.state === 'started' ||
              event.status === 'started'
            ) {
              this.isStarting = false;
              this.isListening = true;
              this.currentCallbacks?.onStart?.();
            }
          }
        );

      this.nativeListeners.push(stateListener);

      const errorListener = await SpeechRecognition.addListener(
        'error',
        (event) => {
          if (id !== this.sessionId) return;

          console.error(
            '[VoiceSearch] Native recognition error:',
            event.code,
            event.message
          );

          this.currentCallbacks?.onError?.(
            event.message || event.code || 'Speech recognition failed.'
          );

          this.recoverAndroidSession(id);
        }
      );

      this.nativeListeners.push(errorListener);

      if (id !== this.sessionId) return;

      await SpeechRecognition.start({
        language: 'en-IN',
        maxResults: 5,
        partialResults: true,
        popup: false
      });

      if (id !== this.sessionId) return;

      // Some devices emit listeningState asynchronously.
      // The native state listener will confirm when listening starts.
      this.isStarting = false;
    } catch (error) {
      if (id !== this.sessionId) return;

      console.error('[VoiceSearch] Android start error:', error);

      this.currentCallbacks?.onError?.(
        error.message || 'Unable to start speech recognition.'
      );

      await this.recoverAndroidSession(id);
    }
  }

  async finishAndroidSession(id) {
    if (id !== this.sessionId) return;

    const callbacks = this.currentCallbacks;
    const text = this.lastTranscript.trim();

    this.isStarting = false;
    this.isListening = false;
    this.isStopping = false;
    this.currentCallbacks = null;

    if (text) {
      callbacks?.onResult?.(text, true);
    }

    callbacks?.onEnd?.();

    await this.removeNativeListeners();
  }

  async recoverAndroidSession(id) {
    if (id !== this.sessionId) return;

    // Invalidate callbacks from the old session before cleanup.
    this.sessionId++;

    this.isStarting = false;
    this.isListening = false;
    this.isStopping = false;
    this.currentCallbacks = null;

    try {
      await SpeechRecognition.forceStop({ timeout: 1000 });
    } catch (error) {
      console.warn('[VoiceSearch] Recovery stop:', error);
    }

    await this.removeNativeListeners();
  }

  async removeNativeListeners() {
    const listeners = this.nativeListeners.splice(0);

    await Promise.all(
      listeners.map(async (listener) => {
        try {
          await listener.remove();
        } catch (error) {
          console.warn('[VoiceSearch] Listener cleanup:', error);
        }
      })
    );
  }

  async stopListening() {
    if (this.isAndroid) {
      if (this.isStopping) return;

      if (!this.isStarting && !this.isListening) return;

      this.isStopping = true;

      try {
        await SpeechRecognition.stop();
      } catch (error) {
        console.warn('[VoiceSearch] Native stop error:', error);

        try {
          await SpeechRecognition.forceStop({ timeout: 1000 });
        } catch (recoveryError) {
          console.error(
            '[VoiceSearch] Force stop error:',
            recoveryError
          );

          await this.recoverAndroidSession(this.sessionId);
        }
      }

      return;
    }

    if (this.recognition && (this.isStarting || this.isListening)) {
      this.isStopping = true;

      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('[VoiceSearch] Web stop error:', error);
      }
    }
  }
}

export default new VoiceSearchService();