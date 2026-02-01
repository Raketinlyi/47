// РђСѓРґРёРѕ-РјРµРЅРµРґР¶РµСЂ РґР»СЏ СЌС„С„РµРєС‚РѕРІ СЃР¶РёРіР°РЅРёСЏ NFT
class BurnAudioManager {
  private static instance: BurnAudioManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isEnabled = true;

  private constructor() {
    this.initAudioContext();
  }

  static getInstance(): BurnAudioManager {
    if (!BurnAudioManager.instance) {
      BurnAudioManager.instance = new BurnAudioManager();
    }
    return BurnAudioManager.instance;
  }

  private async initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
      this.isEnabled = false;
    }
  }

  // РЎРѕР·РґР°РЅРёРµ Р·РІСѓРєР° РїСЂРѕРіСЂР°РјРјРЅРѕ (Р±РµР· С„Р°Р№Р»РѕРІ)
  private createFireCrackleSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5; // 0.5 СЃРµРєСѓРЅРґС‹
    const buffer = this.audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate
    );
    const data = buffer.getChannelData(0);

    // Р“РµРЅРµСЂРёСЂСѓРµРј С€СѓРј СЃ С„РёР»СЊС‚СЂР°С†РёРµР№ РґР»СЏ РёРјРёС‚Р°С†РёРё РїРѕС‚СЂРµСЃРєРёРІР°РЅРёСЏ
    for (let i = 0; i < data.length; i++) {
      const noise = (Math.random() * 2 - 1) * 0.3;
      const envelope = Math.exp(-i / (sampleRate * 0.2)); // Р—Р°С‚СѓС…Р°РЅРёРµ
      const frequency = Math.sin(i * 0.01) * 0.5 + 0.5; // РњРѕРґСѓР»СЏС†РёСЏ
      data[i] = noise * envelope * frequency;
    }

    return buffer;
  }

  private createExplosionSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.8;
    const buffer = this.audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * 0.6;
      const envelope = Math.exp(-t * 3); // Р‘С‹СЃС‚СЂРѕРµ Р·Р°С‚СѓС…Р°РЅРёРµ
      const lowFreq = Math.sin(t * 100 * Math.PI) * 0.4; // РќРёР·РєРёРµ С‡Р°СЃС‚РѕС‚С‹
      data[i] = (noise + lowFreq) * envelope;
    }

    return buffer;
  }

  private createSparkSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * 0.2;
      const envelope = Math.exp(-t * 10); // РћС‡РµРЅСЊ Р±С‹СЃС‚СЂРѕРµ Р·Р°С‚СѓС…Р°РЅРёРµ
      const highFreq = Math.sin(t * 2000 * Math.PI) * 0.3; // Р’С‹СЃРѕРєРёРµ С‡Р°СЃС‚РѕС‚С‹
      data[i] = (noise + highFreq) * envelope;
    }

    return buffer;
  }

  async initSounds() {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      // РЎРѕР·РґР°РµРј Р·РІСѓРєРё РїСЂРѕРіСЂР°РјРјРЅРѕ
      const fireSound = this.createFireCrackleSound();
      const explosionSound = this.createExplosionSound();
      const sparkSound = this.createSparkSound();

      if (fireSound) this.sounds.set('fire', fireSound);
      if (explosionSound) this.sounds.set('explosion', explosionSound);
      if (sparkSound) this.sounds.set('spark', sparkSound);
    } catch (error) {
      console.warn('Failed to create sounds:', error);
      this.isEnabled = false;
    }
  }

  async playSound(soundName: string, volume = 0.3, pitch = 1) {
    if (!this.audioContext || !this.isEnabled) return;

    const buffer = this.sounds.get(soundName);
    if (!buffer) return;

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.playbackRate.value = pitch;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  // РЎРїРµС†РёР°Р»СЊРЅС‹Рµ РјРµС‚РѕРґС‹ РґР»СЏ СЂР°Р·РЅС‹С… СЌС„С„РµРєС‚РѕРІ
  async playFireCrackle(intensity = 1) {
    const volume = Math.min(0.2 * intensity, 0.5);
    const pitch = 0.8 + Math.random() * 0.4; // РЎР»СѓС‡Р°Р№РЅР°СЏ РІС‹СЃРѕС‚Р° С‚РѕРЅР°
    await this.playSound('fire', volume, pitch);
  }

  async playExplosion(intensity = 1) {
    const volume = Math.min(0.4 * intensity, 0.7);
    await this.playSound('explosion', volume, 1);
  }

  async playSpark() {
    const volume = 0.1 + Math.random() * 0.1;
    const pitch = 0.8 + Math.random() * 0.6;
    await this.playSound('spark', volume, pitch);
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  isAudioEnabled(): boolean {
    return this.isEnabled && this.audioContext !== null;
  }
}

export const burnAudio = BurnAudioManager.getInstance();
