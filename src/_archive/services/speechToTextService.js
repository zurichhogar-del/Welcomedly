/**
 * Speech-to-Text Real-time Service
 * Enterprise-grade STT con Google Cloud Speech y streaming
 */

import speech from '@google-cloud/speech';
import { Transform } from 'stream';
import WebSocket from 'ws';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';

class SpeechToTextService extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.activeStreams = new Map(); // sessionId -> stream info
        this.config = {
            encoding: 'MULAW',
            sampleRateHertz: 8000,
            languageCode: 'es-ES',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: true,
            enableSpeakerDiarization: true,
            diarizationConfig: {
                enableSpeakerDiarization: true,
                minSpeakerCount: 1,
                maxSpeakerCount: 2
            },
            model: 'phone_call',
            useEnhanced: true,
            profanityFilter: false,
            adaptation: {
                customClasses: [
                    {
                        name: 'call_center_phrases',
                        phrases: [
                            'Buenos días', 'Buenas tardes', '¿En qué puedo ayudarle?',
                            '¿Puedo darle su nombre?', 'Confirmo sus datos',
                            'Muchas gracias', 'Hasta pronto', '¿Alguna otra consulta?',
                            'welcomedly', 'campaña', 'venta', 'cotización'
                        ]
                    }
                ]
            }
        };

        this.initializeClient();
        this.setupStats();
    }

    /**
     * Inicializar cliente de Google Cloud Speech
     */
    async initializeClient() {
        try {
            // Configurar credenciales
            const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                path.join(process.cwd(), 'config', 'google-credentials.json');

            if (fs.existsSync(keyFile)) {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;
            }

            this.client = new speech.SpeechClient({
                projectId: process.env.GOOGLE_PROJECT_ID || 'welcomedly-stt',
                keyFilename: keyFile
            });

            console.log('🎤 Google Cloud Speech client initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Speech client:', error);
            // Fallback to mock service for development
            this.client = this.createMockClient();
        }
    }

    /**
     * Crear cliente mock para desarrollo
     */
    createMockClient() {
        console.log('🔧 Using mock Speech-to-Text client (development mode)');

        return {
            streamingRecognize: () => this.createMockStream()
        };
    }

    /**
     * Configurar estadísticas
     */
    setupStats() {
        this.stats = {
            totalSessions: 0,
            activeSessions: 0,
            totalAudioProcessed: 0,
            averageLatency: 0,
            errorCount: 0,
            lastProcessed: null
        };
    }

    /**
     * Iniciar sesión de transcripción en tiempo real
     */
    async startTranscription(sessionId, options = {}) {
        try {
            console.log(`🎙️ Starting transcription session: ${sessionId}`);

            // Configurar opciones específicas de la sesión
            const sessionConfig = {
                ...this.config,
                ...options
            };

            const request = {
                config: sessionConfig,
                interimResults: options.interimResults !== false,
                singleUtterance: options.singleUtterance || false
            };

            // Crear stream de reconocimiento
            const recognizeStream = this.client.streamingRecognize(request);

            // Crear stream wrapper
            const streamWrapper = this.createStreamWrapper(sessionId, recognizeStream);

            // Almacenar información de la sesión
            this.activeStreams.set(sessionId, {
                stream: streamWrapper,
                config: sessionConfig,
                startTime: Date.now(),
                audioChunks: 0,
                lastActivity: Date.now(),
                transcript: [],
                currentInterim: '',
                speakers: new Map(),
                wordTimings: []
            });

            this.stats.totalSessions++;
            this.stats.activeSessions++;

            // Emitir evento de inicio
            this.emit('sessionStarted', {
                sessionId,
                config: sessionConfig,
                timestamp: new Date().toISOString()
            });

            return streamWrapper;

        } catch (error) {
            console.error('❌ Failed to start transcription:', error);
            this.stats.errorCount++;
            throw error;
        }
    }

    /**
     * Crear wrapper para stream de transcripción
     */
    createStreamWrapper(sessionId, recognizeStream) {
        const session = this.activeStreams.get(sessionId);

        const wrapper = new Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                try {
                    // Procesar chunk de audio
                    session.audioChunks++;
                    session.lastActivity = Date.now();
                    this.stats.totalAudioProcessed += chunk.length;

                    // Enviar al stream de Google
                    recognizeStream.write(chunk);
                    callback();

                } catch (error) {
                    console.error('Error processing audio chunk:', error);
                    callback(error);
                }
            }
        });

        // Manejar eventos del stream de Google
        recognizeStream.on('data', (data) => {
            this.handleTranscriptionData(sessionId, data);
        });

        recognizeStream.on('error', (error) => {
            console.error('Stream error:', error);
            this.stats.errorCount++;
            this.emit('sessionError', { sessionId, error });
        });

        recognizeStream.on('end', () => {
            this.endSession(sessionId);
        });

        // Mantener referencia para limpieza
        wrapper.recognizeStream = recognizeStream;

        return wrapper;
    }

    /**
     * Manejar datos de transcripción
     */
    handleTranscriptionData(sessionId, data) {
        const session = this.activeStreams.get(sessionId);
        if (!session) return;

        const startTime = Date.now();
        const latency = startTime - session.startTime;

        try {
            // Procesar resultados
            for (const result of data.results) {
                const transcript = result.alternatives[0].transcript;
                const isFinal = result.isFinal;
                const confidence = result.alternatives[0].confidence;
                const stability = result.stability;

                // Actualizar información de speakers
                if (result.alternatives[0].words) {
                    this.processWordTimings(sessionId, result.alternatives[0].words);
                }

                const transcriptData = {
                    sessionId,
                    transcript: transcript.trim(),
                    isFinal,
                    confidence,
                    stability,
                    timestamp: new Date().toISOString(),
                    latency,
                    speaker: this.getCurrentSpeaker(sessionId, result.alternatives[0].words)
                };

                if (isFinal) {
                    // Transcripción final
                    session.transcript.push(transcriptData);
                    session.currentInterim = '';

                    this.emit('finalTranscript', transcriptData);

                    // Detectar final de conversación
                    if (this.isConversationEnd(transcriptData.transcript)) {
                        this.emit('conversationEnd', {
                            sessionId,
                            finalTranscript: transcriptData
                        });
                    }

                } else {
                    // Transcripción interina
                    session.currentInterim = transcriptData.transcript;
                    this.emit('interimTranscript', transcriptData);
                }
            }

            // Actualizar estadísticas
            this.updateAverageLatency(latency);
            this.stats.lastProcessed = new Date().toISOString();

        } catch (error) {
            console.error('Error processing transcription data:', error);
            this.stats.errorCount++;
        }
    }

    /**
     * Procesar timings de palabras
     */
    processWordTimings(sessionId, words) {
        const session = this.activeStreams.get(sessionId);
        if (!session) return;

        for (const word of words) {
            const wordData = {
                word: word.word,
                startTime: word.startTime,
                endTime: word.endTime,
                speakerTag: word.speakerTag
            };

            session.wordTimings.push(wordData);

            // Actualizar speakers
            if (word.speakerTag) {
                if (!session.speakers.has(word.speakerTag)) {
                    session.speakers.set(word.speakerTag, {
                        tag: word.speakerTag,
                        wordCount: 0,
                        speakingTime: 0
                    });
                }

                const speaker = session.speakers.get(word.speakerTag);
                speaker.wordCount++;
                speaker.speakingTime += (word.endTime.seconds - word.startTime.seconds);
            }
        }
    }

    /**
     * Obtener speaker actual
     */
    getCurrentSpeaker(sessionId, words) {
        if (!words || words.length === 0) return null;

        // Usar el último speaker tag disponible
        const lastWord = words[words.length - 1];
        return lastWord.speakerTag || null;
    }

    /**
     * Detectar si es el fin de la conversación
     */
    isConversationEnd(transcript) {
        const endPhrases = [
            'adiós', 'hasta luego', 'muchas gracias y adiós',
            'que tenga buen día', 'nos vemos', 'gracias por todo',
            'goodbye', 'thank you goodbye', 'have a nice day'
        ];

        const normalized = transcript.toLowerCase().trim();
        return endPhrases.some(phrase => normalized.includes(phrase));
    }

    /**
     * Procesar audio desde archivo
     */
    async transcribeFile(filePath, options = {}) {
        try {
            console.log(`📁 Transcribing file: ${filePath}`);

            const fileContent = fs.readFileSync(filePath);
            const audioBytes = fileContent.toString('base64');

            const request = {
                config: {
                    ...this.config,
                    ...options
                },
                audio: {
                    content: audioBytes
                }
            };

            const [response] = await this.client.recognize(request);

            const transcription = {
                sessionId: `file_${Date.now()}`,
                transcript: response.results
                    .map(result => result.alternatives[0].transcript)
                    .join('\n'),
                confidence: response.results
                    .reduce((sum, result) => sum + result.alternatives[0].confidence, 0) /
                    response.results.length,
                timestamp: new Date().toISOString(),
                filePath
            };

            this.emit('fileTranscribed', transcription);
            return transcription;

        } catch (error) {
            console.error('❌ File transcription failed:', error);
            this.stats.errorCount++;
            throw error;
        }
    }

    /**
     * Actualizar latencia promedio
     */
    updateAverageLatency(newLatency) {
        const current = this.stats.averageLatency;
        this.stats.averageLatency = (current + newLatency) / 2;
    }

    /**
     * Finalizar sesión
     */
    endSession(sessionId) {
        const session = this.activeStreams.get(sessionId);
        if (!session) return;

        try {
            // Cerrar stream
            if (session.stream && session.stream.recognizeStream) {
                session.stream.recognizeStream.end();
            }

            // Calcular estadísticas de la sesión
            const sessionStats = {
                sessionId,
                duration: Date.now() - session.startTime,
                audioChunks: session.audioChunks,
                wordCount: session.wordTimings.length,
                speakersCount: session.speakers.size,
                transcriptLength: session.transcript.length
            };

            // Limpiar sesión
            this.activeStreams.delete(sessionId);
            this.stats.activeSessions--;

            // Emitir evento de fin
            this.emit('sessionEnded', {
                sessionId,
                stats: sessionStats,
                finalTranscript: session.transcript,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Session ${sessionId} ended:`, sessionStats);

        } catch (error) {
            console.error('Error ending session:', error);
        }
    }

    /**
     * Obtener transcript actual de una sesión
     */
    getSessionTranscript(sessionId) {
        const session = this.activeStreams.get(sessionId);
        if (!session) return null;

        return {
            sessionId,
            finalTranscript: session.transcript,
            currentInterim: session.currentInterim,
            speakers: Array.from(session.speakers.values()),
            wordTimings: session.wordTimings,
            duration: Date.now() - session.startTime
        };
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            ...this.stats,
            activeSessions: this.activeStreams.size,
            sessionDetails: Array.from(this.activeStreams.entries()).map(([id, session]) => ({
                sessionId: id,
                duration: Date.now() - session.startTime,
                audioChunks: session.audioChunks,
                lastActivity: session.lastActivity
            }))
        };
    }

    /**
     * Limpiar sesiones inactivas
     */
    cleanupInactiveSessions(timeoutMs = 300000) { // 5 minutos
        const now = Date.now();
        const inactiveSessions = [];

        for (const [sessionId, session] of this.activeStreams) {
            if (now - session.lastActivity > timeoutMs) {
                inactiveSessions.push(sessionId);
            }
        }

        for (const sessionId of inactiveSessions) {
            console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
            this.endSession(sessionId);
        }

        return inactiveSessions.length;
    }

    /**
     * Crear stream mock para desarrollo
     */
    createMockStream() {
        const mockStream = new Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                // Simular procesamiento con delay
                setTimeout(() => {
                    callback();
                }, Math.random() * 500);
            }
        });

        // Simular resultados de transcripción
        let mockTranscriptIndex = 0;
        const mockTranscripts = [
            'Buenos días, bienvenido a Welcomedly',
            '¿En qué puedo ayudarle hoy?',
            'Mi nombre es Juan y quiero información',
            'Claro Juan, con gusto le ayudo'
        ];

        const interval = setInterval(() => {
            if (mockStream.destroyed) {
                clearInterval(interval);
                return;
            }

            const mockResult = {
                results: [{
                    alternatives: [{
                        transcript: mockTranscripts[mockTranscriptIndex % mockTranscripts.length],
                        confidence: 0.95 + Math.random() * 0.05,
                        words: []
                    }],
                    isFinal: Math.random() > 0.3,
                    stability: Math.random()
                }]
            };

            mockStream.emit('data', mockResult);
            mockTranscriptIndex++;
        }, 2000);

        mockStream.on('close', () => {
            clearInterval(interval);
        });

        return mockStream;
    }

    /**
     * Método para grabar conversación
     */
    async startRecording(sessionId, recordingPath) {
        const session = this.activeStreams.get(sessionId);
        if (!session) throw new Error('Session not found');

        session.recordingPath = recordingPath;
        session.recordingStream = fs.createWriteStream(recordingPath);

        console.log(`🎙️ Recording session ${sessionId} to: ${recordingPath}`);
    }

    /**
     * Detener grabación
     */
    async stopRecording(sessionId) {
        const session = this.activeStreams.get(sessionId);
        if (!session || !session.recordingStream) return;

        session.recordingStream.end();
        console.log(`⏹️ Recording stopped for session: ${sessionId}`);
    }

    /**
     * Shutdown del servicio
     */
    async shutdown() {
        console.log('🛑 Shutting down Speech-to-Text service...');

        // Finalizar todas las sesiones activas
        const sessionIds = Array.from(this.activeStreams.keys());
        for (const sessionId of sessionIds) {
            this.endSession(sessionId);
        }

        console.log('✅ Speech-to-Text service shutdown complete');
    }
}

export default new SpeechToTextService();