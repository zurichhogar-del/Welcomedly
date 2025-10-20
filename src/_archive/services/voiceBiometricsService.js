/**
 * Voice Biometrics Service
 * Identificación y verificación por voz enterprise-grade
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { createHash } from 'crypto';

class VoiceBiometricsService extends EventEmitter {
    constructor() {
        super();
        this.voiceprints = new Map(); // userId -> voiceprint data
        this.sessions = new Map(); // sessionId -> session data
        this.enrollmentSessions = new Map(); // userId -> enrollment progress
        this.verificationSessions = new Map(); // sessionId -> verification progress

        this.config = {
            // Configuración de extracción de features
            features: {
                mfcc: {
                    numCoefficients: 13,
                    frameLength: 1024,
                    frameStep: 512,
                    fftSize: 2048,
                    sampleRate: 16000
                },
                pitch: {
                    minPitch: 50,
                    maxPitch: 500,
                    frameStep: 512
                },
                energy: {
                    frameSize: 1024
                },
                spectral: {
                    numBands: 26
                }
            },
            // Configuración de enrollment
            enrollment: {
                minAudioLength: 30, // 30 segundos mínimo
                requiredSamples: 3, // Mínimo 3 muestras de voz
                minSampleLength: 5, // 5 segundos por muestra
                maxSampleLength: 30, // 30 segundos por muestra
                qualityThreshold: 0.7
            },
            // Configuración de verificación
            verification: {
                minAudioLength: 5, // 5 segundos mínimo
                confidenceThreshold: 0.85,
                antiSpoofingEnabled: true,
                livenessDetectionEnabled: true
            },
            // Configuración de seguridad
            security: {
                maxAttempts: 3,
                lockoutDuration: 300000, // 5 minutos
                encryptionKey: process.env.VOICE_BIOMETRICS_KEY || generateEncryptionKey()
            }
        };

        this.storagePath = path.join(process.cwd(), 'data', 'voiceprints');
        this.ensureStorageDirectory();
        this.loadExistingVoiceprints();
    }

    /**
     * Generar clave de encriptación
     */
    function generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Asegurar directorio de almacenamiento
     */
    ensureStorageDirectory() {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    /**
     * Cargar voiceprints existentes
     */
    loadExistingVoiceprints() {
        try {
            const files = fs.readdirSync(this.storagePath);
            let loadedCount = 0;

            for (const file of files) {
                if (file.endsWith('.voiceprint')) {
                    try {
                        const filePath = path.join(this.storagePath, file);
                        const encryptedData = fs.readFileSync(filePath, 'utf8');
                        const decryptedData = this.decryptData(encryptedData);
                        const voiceprint = JSON.parse(decryptedData);

                        this.voiceprints.set(voiceprint.userId, voiceprint);
                        loadedCount++;
                    } catch (error) {
                        console.warn(`Failed to load voiceprint ${file}:`, error.message);
                    }
                }
            }

            console.log(`🔊 Loaded ${loadedCount} voiceprints from storage`);
        } catch (error) {
            console.error('Error loading voiceprints:', error);
        }
    }

    /**
     * Iniciar sesión de enrollment (registro de voz)
     */
    startEnrollment(userId, metadata = {}) {
        try {
            if (this.enrollmentSessions.has(userId)) {
                throw new Error('Enrollment session already exists for this user');
            }

            const sessionId = crypto.randomUUID();
            const enrollmentData = {
                sessionId,
                userId,
                startTime: Date.now(),
                metadata: {
                    agentId: metadata.agentId,
                    deviceInfo: metadata.deviceInfo,
                    ...metadata
                },
                samples: [],
                status: 'in_progress',
                quality: 0,
                requiredSamples: this.config.enrollment.requiredSamples,
                completedSamples: 0
            };

            this.enrollmentSessions.set(userId, enrollmentData);
            this.sessions.set(sessionId, enrollmentData);

            console.log(`🔊 Started voice enrollment for user ${userId} (session: ${sessionId})`);

            this.emit('enrollmentStarted', {
                sessionId,
                userId,
                metadata: enrollmentData.metadata,
                timestamp: new Date().toISOString()
            });

            return {
                sessionId,
                userId,
                requiredSamples: enrollmentData.requiredSamples,
                minSampleLength: this.config.enrollment.minSampleLength,
                maxSampleLength: this.config.enrollment.maxSampleLength
            };

        } catch (error) {
            console.error('Error starting enrollment:', error);
            throw error;
        }
    }

    /**
     * Procesar muestra de audio para enrollment
     */
    async processEnrollmentSample(sessionId, audioBuffer, metadata = {}) {
        try {
            const session = this.findSession(sessionId);
            if (!session || !this.enrollmentSessions.has(session.userId)) {
                throw new Error('Enrollment session not found');
            }

            // Validar audio
            const audioValidation = this.validateAudio(audioBuffer, 'enrollment');
            if (!audioValidation.valid) {
                throw new Error(`Invalid audio: ${audioValidation.reason}`);
            }

            // Extraer features de voz
            const features = await this.extractVoiceFeatures(audioBuffer);
            if (!features || features.length === 0) {
                throw new Error('Failed to extract voice features');
            }

            // Evaluar calidad de la muestra
            const quality = this.evaluateSampleQuality(audioBuffer, features);
            if (quality < this.config.enrollment.qualityThreshold) {
                throw new Error(`Audio quality too low: ${quality.toFixed(2)} < ${this.config.enrollment.qualityThreshold}`);
            }

            // Detectar live speech (anti-spoofing)
            if (this.config.verification.livenessDetectionEnabled) {
                const livenessScore = await this.detectLiveness(audioBuffer, features);
                if (livenessScore < 0.7) {
                    throw new Error(`Liveness detection failed: ${livenessScore.toFixed(2)}`);
                }
            }

            // Agregar muestra a la sesión
            const sampleData = {
                id: crypto.randomUUID(),
                features,
                quality,
                duration: audioValidation.duration,
                timestamp: Date.now(),
                metadata
            };

            session.samples.push(sampleData);
            session.completedSamples = session.samples.length;

            // Calcular calidad promedio del enrollment
            session.quality = session.samples.reduce((sum, s) => sum + s.quality, 0) / session.samples.length;

            this.emit('sampleProcessed', {
                sessionId,
                userId: session.userId,
                sampleId: sampleData.id,
                quality,
                completedSamples: session.completedSamples,
                requiredSamples: session.requiredSamples,
                timestamp: new Date().toISOString()
            });

            // Verificar si el enrollment está completo
            if (session.completedSamples >= session.requiredSamples) {
                return await this.completeEnrollment(sessionId);
            }

            return {
                sessionId,
                completedSamples: session.completedSamples,
                requiredSamples: session.requiredSamples,
                sampleQuality: quality,
                nextStep: 'process_more_samples'
            };

        } catch (error) {
            console.error('Error processing enrollment sample:', error);
            this.emit('enrollmentError', {
                sessionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Completar enrollment y crear voiceprint
     */
    async completeEnrollment(sessionId) {
        try {
            const session = this.findSession(sessionId);
            if (!session) {
                throw new Error('Enrollment session not found');
            }

            // Crear voiceprint combinando todas las muestras
            const voiceprint = await this.createVoiceprint(session);

            // Guardar voiceprint encriptado
            await this.saveVoiceprint(session.userId, voiceprint);

            // Actualizar estado de la sesión
            session.status = 'completed';
            session.completedAt = Date.now();
            session.voiceprintId = voiceprint.id;

            // Limpiar sesión de enrollment
            this.enrollmentSessions.delete(session.userId);

            console.log(`✅ Voice enrollment completed for user ${session.userId}`);

            this.emit('enrollmentCompleted', {
                sessionId,
                userId: session.userId,
                voiceprintId: voiceprint.id,
                quality: session.quality,
                duration: session.completedAt - session.startTime,
                timestamp: new Date().toISOString()
            });

            return {
                sessionId,
                userId: session.userId,
                voiceprintId: voiceprint.id,
                quality: session.quality,
                status: 'completed'
            };

        } catch (error) {
            console.error('Error completing enrollment:', error);
            throw error;
        }
    }

    /**
     * Iniciar verificación de voz
     */
    startVerification(userId, options = {}) {
        try {
            if (!this.voiceprints.has(userId)) {
                throw new Error('No voiceprint found for this user');
            }

            const sessionId = crypto.randomUUID();
            const verificationData = {
                sessionId,
                userId,
                startTime: Date.now(),
                status: 'waiting_for_audio',
                attempts: 0,
                maxAttempts: options.maxAttempts || this.config.verification.maxAttempts,
                confidenceThreshold: options.confidenceThreshold || this.config.verification.confidenceThreshold,
                voiceprintId: this.voiceprints.get(userId).id
            };

            this.verificationSessions.set(sessionId, verificationData);
            this.sessions.set(sessionId, verificationData);

            console.log(`🔊 Started voice verification for user ${userId} (session: ${sessionId})`);

            this.emit('verificationStarted', {
                sessionId,
                userId,
                voiceprintId: verificationData.voiceprintId,
                timestamp: new Date().toISOString()
            });

            return {
                sessionId,
                userId,
                minAudioLength: this.config.verification.minAudioLength,
                maxAttempts: verificationData.maxAttempts
            };

        } catch (error) {
            console.error('Error starting verification:', error);
            throw error;
        }
    }

    /**
     * Procesar audio para verificación
     */
    async processVerification(sessionId, audioBuffer, metadata = {}) {
        try {
            const session = this.verificationSessions.get(sessionId);
            if (!session) {
                throw new Error('Verification session not found');
            }

            if (session.status === 'completed') {
                throw new Error('Verification session already completed');
            }

            if (session.attempts >= session.maxAttempts) {
                throw new Error('Maximum verification attempts exceeded');
            }

            // Validar audio
            const audioValidation = this.validateAudio(audioBuffer, 'verification');
            if (!audioValidation.valid) {
                throw new Error(`Invalid audio: ${audioValidation.reason}`);
            }

            session.attempts++;
            session.status = 'processing';

            // Extraer features
            const features = await this.extractVoiceFeatures(audioBuffer);
            if (!features || features.length === 0) {
                throw new Error('Failed to extract voice features');
            }

            // Detectar liveness (anti-spoofing)
            let livenessScore = 1.0;
            if (this.config.verification.livenessDetectionEnabled) {
                livenessScore = await this.detectLiveness(audioBuffer, features);
                if (livenessScore < 0.6) {
                    session.status = 'failed';
                    session.failureReason = 'Liveness detection failed';
                    session.completedAt = Date.now();

                    this.emit('verificationFailed', {
                        sessionId,
                        userId: session.userId,
                        reason: 'liveness_failed',
                        attempts: session.attempts,
                        livenessScore,
                        timestamp: new Date().toISOString()
                    });

                    return {
                        sessionId,
                        userId: session.userId,
                        success: false,
                        reason: 'liveness_failed',
                        attempts: session.attempts,
                        livenessScore
                    };
                }
            }

            // Obtener voiceprint del usuario
            const storedVoiceprint = this.voiceprints.get(session.userId);
            if (!storedVoiceprint) {
                throw new Error('Voiceprint not found');
            }

            // Comparar voiceprints
            const comparison = await this.compareVoiceprints(
                storedVoiceprint,
                features,
                {
                    confidenceThreshold: session.confidenceThreshold,
                    livenessScore
                }
            );

            session.status = comparison.success ? 'success' : 'failed';
            session.completedAt = Date.now();
            session.confidence = comparison.confidence;
            session.livenessScore = livenessScore;

            if (comparison.success) {
                console.log(`✅ Voice verification successful for user ${session.userId}`);

                this.emit('verificationSuccess', {
                    sessionId,
                    userId: session.userId,
                    confidence: comparison.confidence,
                    attempts: session.attempts,
                    livenessScore,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log(`❌ Voice verification failed for user ${session.userId}`);

                this.emit('verificationFailed', {
                    sessionId,
                    userId: session.userId,
                    reason: comparison.reason,
                    confidence: comparison.confidence,
                    attempts: session.attempts,
                    livenessScore,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                sessionId,
                userId: session.userId,
                success: comparison.success,
                confidence: comparison.confidence,
                attempts: session.attempts,
                livenessScore,
                reason: comparison.reason || (comparison.success ? null : 'Insufficient confidence')
            };

        } catch (error) {
            console.error('Error processing verification:', error);

            const session = this.verificationSessions.get(sessionId);
            if (session) {
                session.status = 'error';
                session.error = error.message;
            }

            this.emit('verificationError', {
                sessionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * Extraer features de voz del audio
     */
    async extractVoiceFeatures(audioBuffer) {
        try {
            // Convertir buffer a formato procesable
            const audioData = this.convertAudioBuffer(audioBuffer);

            // Extraer diferentes tipos de features
            const features = {
                mfcc: await this.extractMFCC(audioData),
                pitch: await this.extractPitchFeatures(audioData),
                energy: await this.extractEnergyFeatures(audioData),
                spectral: await this.extractSpectralFeatures(audioData),
                temporal: await this.extractTemporalFeatures(audioData)
            };

            // Validar features
            if (!this.validateFeatures(features)) {
                throw new Error('Invalid voice features extracted');
            }

            return features;

        } catch (error) {
            console.error('Error extracting voice features:', error);
            return null;
        }
    }

    /**
     * Extraer MFCC (Mel-frequency cepstral coefficients)
     */
    async extractMFCC(audioData) {
        try {
            // Implementación simplificada de MFCC
            const frameLength = this.config.features.mfcc.frameLength;
            const frameStep = this.config.features.mfcc.frameStep;
            const numCoefficients = this.config.features.mfcc.numCoefficients;

            const frames = this.splitIntoFrames(audioData, frameLength, frameStep);
            const mfccCoefficients = [];

            for (const frame of frames) {
                // Aplicar ventana Hamming
                const windowedFrame = this.applyHammingWindow(frame);

                // Calcular FFT
                const spectrum = this.calculateFFT(windowedFrame);

                // Aplicar filtro Mel
                const melSpectrum = this.applyMelFilter(spectrum);

                // Calcular log
                const logMelSpectrum = melSpectrum.map(value => Math.log(value + 1e-10));

                // Aplicar DCT
                const mfccFrame = this.calculateDCT(logMelSpectrum, numCoefficients);

                mfccCoefficients.push(mfccFrame);
            }

            // Calcular estadísticas de los coeficientes
            const mfccStats = this.calculateFeatureStatistics(mfccCoefficients);

            return mfccStats;

        } catch (error) {
            console.error('Error extracting MFCC:', error);
            return null;
        }
    }

    /**
     * Extraer features de pitch (frecuencia fundamental)
     */
    async extractPitchFeatures(audioData) {
        try {
            const frameSize = this.config.features.pitch.frameStep;
            const frames = this.splitIntoFrames(audioData, frameSize, frameSize);
            const pitchValues = [];

            for (const frame of frames) {
                const pitch = this.calculatePitch(frame);
                if (pitch > 0) {
                    pitchValues.push(pitch);
                }
            }

            if (pitchValues.length === 0) {
                return null;
            }

            // Calcular estadísticas de pitch
            const mean = pitchValues.reduce((sum, p) => sum + p, 0) / pitchValues.length;
            const variance = pitchValues.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pitchValues.length;
            const stdDev = Math.sqrt(variance);

            return {
                mean,
                stdDev,
                min: Math.min(...pitchValues),
                max: Math.max(...pitchValues),
                range: Math.max(...pitchValues) - Math.min(...pitchValues),
                contour: this.extractPitchContour(pitchValues)
            };

        } catch (error) {
            console.error('Error extracting pitch features:', error);
            return null;
        }
    }

    /**
     * Extraer features de energía
     */
    async extractEnergyFeatures(audioData) {
        try {
            const frameSize = this.config.features.energy.frameSize;
            const frames = this.splitIntoFrames(audioData, frameSize, frameSize);
            const energyValues = [];

            for (const frame of frames) {
                const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;
                energyValues.push(energy);
            }

            const mean = energyValues.reduce((sum, e) => sum + e, 0) / energyValues.length;
            const variance = energyValues.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energyValues.length;
            const stdDev = Math.sqrt(variance);

            return {
                mean,
                stdDev,
                min: Math.min(...energyValues),
                max: Math.max(...energyValues),
                zeroCrossingRate: this.calculateZeroCrossingRate(audioData)
            };

        } catch (error) {
            console.error('Error extracting energy features:', error);
            return null;
        }
    }

    /**
     * Extraer features espectrales
     */
    async extractSpectralFeatures(audioData) {
        try {
            const frameSize = 1024;
            const frames = this.splitIntoFrames(audioData, frameSize, frameSize);
            const spectralFeatures = [];

            for (const frame of frames) {
                const spectrum = this.calculateFFT(frame);
                const features = this.calculateSpectralFeatures(spectrum);
                spectralFeatures.push(features);
            }

            return this.calculateFeatureStatistics(spectralFeatures);

        } catch (error) {
            console.error('Error extracting spectral features:', error);
            return null;
        }
    }

    /**
     * Extraer features temporales
     */
    async extractTemporalFeatures(audioData) {
        try {
            return {
                duration: audioData.length / this.config.features.mfcc.sampleRate,
                sampleRate: this.config.features.mfcc.sampleRate,
                rms: this.calculateRMS(audioData),
                peakAmplitude: Math.max(...audioData.map(Math.abs)),
                dynamicRange: this.calculateDynamicRange(audioData)
            };

        } catch (error) {
            console.error('Error extracting temporal features:', error);
            return null;
        }
    }

    /**
     * Crear voiceprint a partir de muestras de enrollment
     */
    async createVoiceprint(enrollmentSession) {
        try {
            // Combinar features de todas las muestras
            const allFeatures = enrollmentSession.samples.map(sample => sample.features);

            // Calcular promedio de features
            const averagedFeatures = this.averageFeatures(allFeatures);

            // Crear template de voiceprint
            const voiceprint = {
                id: crypto.randomUUID(),
                userId: enrollmentSession.userId,
                features: averagedFeatures,
                createdAt: new Date().toISOString(),
                enrollmentSessionId: enrollmentSession.sessionId,
                quality: enrollmentSession.quality,
                sampleCount: enrollmentSession.samples.length,
                metadata: enrollmentSession.metadata
            };

            return voiceprint;

        } catch (error) {
            console.error('Error creating voiceprint:', error);
            throw error;
        }
    }

    /**
     * Comparar voiceprints para verificación
     */
    async compareVoiceprints(storedVoiceprint, extractedFeatures, options = {}) {
        try {
            // Calcular similitud entre voiceprints
            const similarity = this.calculateSimilarity(
                storedVoiceprint.features,
                extractedFeatures
            );

            const confidence = similarity.confidence;
            const threshold = options.confidenceThreshold || this.config.verification.confidenceThreshold;

            // Ajustar confianza basado en detección de liveness
            const adjustedConfidence = confidence * (options.livenessScore || 1.0);

            const success = adjustedConfidence >= threshold;

            return {
                success,
                confidence: adjustedConfidence,
                rawConfidence: confidence,
                similarity: similarity.score,
                livenessScore: options.livenessScore,
                threshold,
                reason: success ? null : `Insufficient confidence: ${adjustedConfidence.toFixed(3)} < ${threshold}`
            };

        } catch (error) {
            console.error('Error comparing voiceprints:', error);
            return {
                success: false,
                confidence: 0,
                reason: 'Comparison error: ' + error.message
            };
        }
    }

    /**
     * Calcular similitud entre features de voz
     */
    calculateSimilarity(features1, features2) {
        try {
            let totalScore = 0;
            let weightSum = 0;
            const weights = {
                mfcc: 0.4,
                pitch: 0.2,
                energy: 0.2,
                spectral: 0.15,
                temporal: 0.05
            };

            for (const [featureType, weight] of Object.entries(weights)) {
                if (features1[featureType] && features2[featureType]) {
                    const similarity = this.calculateFeatureSimilarity(
                        features1[featureType],
                        features2[featureType],
                        featureType
                    );
                    totalScore += similarity * weight;
                    weightSum += weight;
                }
            }

            const finalScore = weightSum > 0 ? totalScore / weightSum : 0;
            const confidence = Math.min(Math.max(finalScore, 0), 1);

            return {
                score: finalScore,
                confidence: confidence
            };

        } catch (error) {
            console.error('Error calculating similarity:', error);
            return { score: 0, confidence: 0 };
        }
    }

    /**
     * Calcular similitud entre features específicos
     */
    calculateFeatureSimilarity(feature1, feature2, featureType) {
        try {
            switch (featureType) {
                case 'mfcc':
                case 'spectral':
                    return this.calculateVectorSimilarity(feature1, feature2);

                case 'pitch':
                case 'energy':
                case 'temporal':
                    return this.calculateNumericalSimilarity(feature1, feature2);

                default:
                    return 0.5; // Similaridad neutral
            }
        } catch (error) {
            console.error(`Error calculating ${featureType} similarity:`, error);
            return 0.5;
        }
    }

    /**
     * Calcular similitud entre vectores
     */
    calculateVectorSimilarity(vector1, vector2) {
        try {
            // Convertir a arrays planos
            const flat1 = this.flattenVector(vector1);
            const flat2 = this.flattenVector(vector2);

            if (flat1.length !== flat2.length) {
                return 0.5;
            }

            // Calcular correlación
            const correlation = this.calculateCorrelation(flat1, flat2);
            return Math.max(0, Math.min(1, (correlation + 1) / 2));

        } catch (error) {
            console.error('Error calculating vector similarity:', error);
            return 0.5;
        }
    }

    /**
     * Calcular similitud entre valores numéricos
     */
    calculateNumericalSimilarity(num1, num2) {
        try {
            const keys = Object.keys(num1).filter(key => typeof num1[key] === 'number' && typeof num2[key] === 'number');

            if (keys.length === 0) {
                return 0.5;
            }

            let totalSimilarity = 0;
            for (const key of keys) {
                const diff = Math.abs(num1[key] - num2[key]);
                const range = Math.max(num1[key], num2[key]) - Math.min(num1[key], num2[key]);
                const similarity = range > 0 ? 1 - (diff / range) : 1;
                totalSimilarity += similarity;
            }

            return totalSimilarity / keys.length;

        } catch (error) {
            console.error('Error calculating numerical similarity:', error);
            return 0.5;
        }
    }

    /**
     * Detectar liveness (anti-spoofing)
     */
    async detectLiveness(audioBuffer, features) {
        try {
            // Implementación simplificada de detección de liveness
            let livenessScore = 0.5;

            // 1. Detección de patrones de voz naturales
            if (features.pitch && features.energy) {
                // Variación natural de pitch
                const pitchVariation = features.pitch.stdDev / (features.pitch.mean || 1);
                if (pitchVariation > 0.1 && pitchVariation < 0.5) {
                    livenessScore += 0.2;
                }

                // Variación de energía natural
                const energyVariation = features.energy.stdDev / (features.energy.mean || 1);
                if (energyVariation > 0.1 && energyVariation < 0.8) {
                    livenessScore += 0.2;
                }
            }

            // 2. Detección de ruido de fondo consistente
            const noiseLevel = this.detectBackgroundNoise(audioBuffer);
            if (noiseLevel < 0.3) { // Bajo nivel de ruido
                livenessScore += 0.1;
            }

            // 3. Detección de artefactos de reproducción
            const artifacts = this.detectPlaybackArtifacts(audioBuffer);
            if (artifacts < 0.2) { // Pocos artefactos
                livenessScore += 0.2;
            }

            // 4. Detección de patrones de breathing
            const breathingPatterns = this.detectBreathingPatterns(audioBuffer);
            if (breathingPatterns > 0.3) { // Patrones detectados
                livenessScore += 0.3;
            }

            return Math.min(Math.max(livenessScore, 0), 1);

        } catch (error) {
            console.error('Error detecting liveness:', error);
            return 0.5;
        }
    }

    /**
     * Guardar voiceprint encriptado
     */
    async saveVoiceprint(userId, voiceprint) {
        try {
            const filePath = path.join(this.storagePath, `${userId}.voiceprint`);
            const voiceprintData = JSON.stringify(voiceprint);
            const encryptedData = this.encryptData(voiceprintData);

            fs.writeFileSync(filePath, encryptedData, 'utf8');
            this.voiceprints.set(userId, voiceprint);

            console.log(`💾 Saved voiceprint for user ${userId}`);

        } catch (error) {
            console.error('Error saving voiceprint:', error);
            throw error;
        }
    }

    /**
     * Encriptar datos
     */
    encryptData(data) {
        try {
            const key = Buffer.from(this.config.security.encryptionKey, 'hex');
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', key);
            cipher.setAAD(Buffer.from('voice-biometrics'));

            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return JSON.stringify({
                iv: iv.toString('hex'),
                encryptedData: encrypted,
                authTag: authTag.toString('hex')
            });

        } catch (error) {
            console.error('Error encrypting data:', error);
            throw error;
        }
    }

    /**
     * Desencriptar datos
     */
    decryptData(encryptedData) {
        try {
            const key = Buffer.from(this.config.security.encryptionKey, 'hex');
            const data = JSON.parse(encryptedData);

            const decipher = crypto.createDecipher('aes-256-cbc', key);
            decipher.setAAD(Buffer.from('voice-biometrics'));
            decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

            let decrypted = decipher.update(data.encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;

        } catch (error) {
            console.error('Error decrypting data:', error);
            throw error;
        }
    }

    /**
     * Validar audio
     */
    validateAudio(audioBuffer, type) {
        try {
            if (!audioBuffer || audioBuffer.length === 0) {
                return { valid: false, reason: 'Empty audio buffer' };
            }

            const duration = audioBuffer.length / this.config.features.mfcc.sampleRate;
            const minLength = type === 'enrollment' ?
                this.config.enrollment.minSampleLength :
                this.config.verification.minAudioLength;

            if (duration < minLength) {
                return { valid: false, reason: `Audio too short: ${duration.toFixed(2)}s < ${minLength}s` };
            }

            const maxLength = type === 'enrollment' ?
                this.config.enrollment.maxSampleLength :
                60; // 1 minuto máximo para verificación

            if (duration > maxLength) {
                return { valid: false, reason: `Audio too long: ${duration.toFixed(2)}s > ${maxLength}s` };
            }

            // Verificar calidad del audio
            const quality = this.evaluateAudioQuality(audioBuffer);
            if (quality < 0.3) {
                return { valid: false, reason: `Poor audio quality: ${quality.toFixed(2)}` };
            }

            return { valid: true, duration, quality };

        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    /**
     * Evaluar calidad de muestra
     */
    evaluateSampleQuality(audioBuffer, features) {
        try {
            let quality = 0.5; // Base quality

            // Evaluar características del audio
            const signalToNoiseRatio = this.calculateSNR(audioBuffer);
            if (signalToNoiseRatio > 20) quality += 0.2;
            else if (signalToNoiseRatio > 10) quality += 0.1;

            // Evaluar features de voz
            if (features.pitch && features.pitch.mean > 50 && features.pitch.mean < 500) {
                quality += 0.1;
            }

            if (features.energy && features.energy.stdDev > 0.1) {
                quality += 0.1;
            }

            // Evaluar saturación
            const saturation = this.detectSaturation(audioBuffer);
            if (saturation < 0.1) quality += 0.1;
            else if (saturation > 0.5) quality -= 0.2;

            return Math.min(Math.max(quality, 0), 1);

        } catch (error) {
            console.error('Error evaluating sample quality:', error);
            return 0.5;
        }
    }

    /**
     * Métodos helper simplificados para procesamiento de audio
     */
    convertAudioBuffer(audioBuffer) {
        // Convertir a array de muestras normalizadas
        if (audioBuffer instanceof Buffer) {
            const samples = [];
            for (let i = 0; i < audioBuffer.length - 1; i += 2) {
                const sample = audioBuffer.readInt16LE(i) / 32768.0;
                samples.push(sample);
            }
            return samples;
        }
        return audioBuffer;
    }

    splitIntoFrames(audioData, frameLength, frameStep) {
        const frames = [];
        for (let i = 0; i < audioData.length - frameLength; i += frameStep) {
            frames.push(audioData.slice(i, i + frameLength));
        }
        return frames;
    }

    applyHammingWindow(frame) {
        const windowedFrame = [];
        for (let i = 0; i < frame.length; i++) {
            const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frame.length - 1));
            windowedFrame.push(frame[i] * window);
        }
        return windowedFrame;
    }

    calculateFFT(frame) {
        // Implementación simplificada de FFT
        const N = frame.length;
        const spectrum = new Array(N / 2);

        for (let k = 0; k < N / 2; k++) {
            let real = 0;
            let imag = 0;

            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                real += frame[n] * Math.cos(angle);
                imag += frame[n] * Math.sin(angle);
            }

            spectrum[k] = Math.sqrt(real * real + imag * imag);
        }

        return spectrum;
    }

    calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = sumXY - (sumX * sumY) / n;
        const denominator = Math.sqrt((sumX2 - (sumX * sumX) / n) * (sumY2 - (sumY * sumY) / n));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    flattenVector(vector) {
        const flattened = [];
        const flatten = (obj) => {
            for (const value of Object.values(obj)) {
                if (typeof value === 'number') {
                    flattened.push(value);
                } else if (typeof value === 'object' && value !== null) {
                    flatten(value);
                }
            }
        };
        flatten(vector);
        return flattened;
    }

    averageFeatures(featuresArray) {
        if (featuresArray.length === 0) return null;

        const averaged = {};
        const firstFeatures = featuresArray[0];

        for (const [key, value] of Object.entries(firstFeatures)) {
            if (typeof value === 'number') {
                averaged[key] = featuresArray.reduce((sum, f) => sum + f[key], 0) / featuresArray.length;
            } else if (typeof value === 'object' && value !== null) {
                averaged[key] = this.averageFeatures(featuresArray.map(f => f[key]));
            }
        }

        return averaged;
    }

    calculateFeatureStatistics(features) {
        const stats = {};
        for (const [key, value] of Object.entries(features)) {
            if (typeof value === 'number') {
                stats[key] = value;
            } else if (Array.isArray(value)) {
                stats[key] = {
                    mean: value.reduce((sum, v) => sum + v, 0) / value.length,
                    stdDev: Math.sqrt(value.reduce((sum, v) => sum + Math.pow(v - (value.reduce((s, x) => s + x, 0) / value.length), 2), 0) / value.length),
                    min: Math.min(...value),
                    max: Math.max(...value)
                };
            }
        }
        return stats;
    }

    // Métodos placeholder para funcionalidades avanzadas
    calculatePitch(frame) { return Math.random() * 200 + 100; }
    calculateZeroCrossingRate(audioData) { return Math.random() * 0.1; }
    calculateRMS(audioData) { return Math.sqrt(audioData.reduce((sum, x) => sum + x*x, 0) / audioData.length); }
    calculateDynamicRange(audioData) { return Math.max(...audioData) - Math.min(...audioData); }
    extractPitchContour(pitchValues) { return pitchValues; }
    calculateSpectralFeatures(spectrum) { return { centroid: 1000, bandwidth: 500, rolloff: 2000 }; }
    applyMelFilter(spectrum) { return spectrum; }
    calculateDCT(data, numCoefficients) { return data.slice(0, numCoefficients); }
    detectBackgroundNoise(audioBuffer) { return Math.random() * 0.2; }
    detectPlaybackArtifacts(audioBuffer) { return Math.random() * 0.1; }
    detectBreathingPatterns(audioBuffer) { return Math.random() * 0.5; }
    calculateSNR(audioBuffer) { return 25 + Math.random() * 10; }
    detectSaturation(audioBuffer) { return Math.random() * 0.05; }
    evaluateAudioQuality(audioBuffer) { return 0.7 + Math.random() * 0.2; }
    validateFeatures(features) { return features && Object.keys(features).length > 0; }
    findSession(sessionId) { return this.sessions.get(sessionId); }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            totalVoiceprints: this.voiceprints.size,
            activeEnrollments: this.enrollmentSessions.size,
            activeVerifications: this.verificationSessions.size,
            totalSessions: this.sessions.size,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Eliminar voiceprint de usuario
     */
    async deleteVoiceprint(userId) {
        try {
            if (this.voiceprints.has(userId)) {
                this.voiceprints.delete(userId);

                const filePath = path.join(this.storagePath, `${userId}.voiceprint`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                console.log(`🗑️ Deleted voiceprint for user ${userId}`);
                return true;
            }
            return false;

        } catch (error) {
            console.error('Error deleting voiceprint:', error);
            return false;
        }
    }

    /**
     * Cleanup de sesiones inactivas
     */
    cleanupInactiveSessions(maxAge = 3600000) { // 1 hora
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions) {
            if (now - session.startTime > maxAge) {
                this.sessions.delete(sessionId);
                cleanedCount++;
            }
        }

        for (const [userId, session] of this.enrollmentSessions) {
            if (now - session.startTime > maxAge) {
                this.enrollmentSessions.delete(userId);
                cleanedCount++;
            }
        }

        for (const [sessionId, session] of this.verificationSessions) {
            if (now - session.startTime > maxAge) {
                this.verificationSessions.delete(sessionId);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * Shutdown del servicio
     */
    async shutdown() {
        console.log('🛑 Shutting down Voice Biometrics service...');

        // Limpiar todas las sesiones
        this.sessions.clear();
        this.enrollmentSessions.clear();
        this.verificationSessions.clear();

        console.log('✅ Voice Biometrics service shutdown complete');
    }
}

export default new VoiceBiometricsService();