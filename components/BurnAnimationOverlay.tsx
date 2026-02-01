'use client';
import React, { useEffect, useRef } from 'react';
import { burnAudio } from '@/lib/burnAudio';

interface BurnAnimationOverlayProps {
  step: 'idle' | 'approving' | 'burning' | 'exploding';
  intensity?: 1 | 2 | 3 | 4 | 5; // РЈСЂРѕРІРµРЅСЊ РёРЅС‚РµРЅСЃРёРІРЅРѕСЃС‚Рё Р°РЅРёРјР°С†РёРё
}

// A single lightning bolt segment
class Segment {
  constructor(
    public p1: { x: number; y: number },
    public p2: { x: number; y: number },
    public thickness: number
  ) {}
}

// Particle system classes
class Spark {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public size: number;
  public color: string;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 2; // Slight upward bias
    this.life = 0;
    this.maxLife = (30 + Math.random() * 20) * 1.3; // 30% slower
    this.size = 1 + Math.random() * 3;
    this.color = Math.random() > 0.5 ? '#FFD700' : '#FF6B35';
  }

  update(deltaFrames: number) {
    this.x += this.vx * deltaFrames;
    this.y += this.vy * deltaFrames;
    this.vy += 0.1 * deltaFrames; // Gravity
    this.vx *= Math.pow(0.98, deltaFrames); // Air resistance
    this.life += deltaFrames;
    return this.life >= this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = 1 - this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Smoke {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public size: number;
  public rotation: number;
  public rotationSpeed: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = -1 - Math.random() * 2; // Always upward
    this.life = 0;
    this.maxLife = (60 + Math.random() * 40) * 1.3; // 30% slower
    this.size = 5 + Math.random() * 15;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
  }

  update(deltaFrames: number) {
    this.x += this.vx * deltaFrames;
    this.y += this.vy * deltaFrames;
    this.vy *= Math.pow(0.99, deltaFrames); // Slow down over time
    this.size += 0.2 * deltaFrames; // Expand
    this.rotation += this.rotationSpeed * deltaFrames;
    this.life += deltaFrames;
    return this.life >= this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = (1 - this.life / this.maxLife) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#666666';
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Ash {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public size: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1;
    this.vy = 1 + Math.random() * 2; // Falling down
    this.life = 0;
    this.maxLife = (80 + Math.random() * 60) * 1.3; // 30% slower
    this.size = 1 + Math.random() * 2;
  }

  update(deltaFrames: number) {
    this.x += this.vx * deltaFrames;
    this.y += this.vy * deltaFrames;
    this.vx += (Math.random() - 0.5) * 0.1 * deltaFrames; // Random drift
    this.life += deltaFrames;
    return this.life >= this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = 1 - this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// A full lightning bolt effect
class LightningBolt {
  private segments: Segment[] = [];
  public alpha = 1;
  private life = 0;
  private lifeMax = 39; // frames (30% slower)

  constructor(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    thickness: number,
    private branchChance: number
  ) {
    this.createBolt(startX, startY, endX, endY, thickness);
  }

  private createBolt(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    depth: number = 0
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // РЈСЃР»РѕРІРёРµ РІС‹С…РѕРґР°: РµСЃР»Рё СЂР°СЃСЃС‚РѕСЏРЅРёРµ РјР°Р»Рѕ РР›Р РґРѕСЃС‚РёРіРЅСѓС‚Р° РјР°РєСЃРёРјР°Р»СЊРЅР°СЏ РіР»СѓР±РёРЅР° СЂРµРєСѓСЂСЃРёРё
    if (distance < 20 || depth > 8) {
      this.segments.push(
        new Segment({ x: x1, y: y1 }, { x: x2, y: y2 }, thickness)
      );
      return;
    }

    const midX = x1 + dx * 0.5 + (Math.random() - 0.5) * 20;
    const midY = y1 + dy * 0.5 + (Math.random() - 0.5) * 20;

    this.createBolt(x1, y1, midX, midY, thickness, depth + 1);
    this.createBolt(midX, midY, x2, y2, thickness, depth + 1);

    // Branching logic - С‚РѕР»СЊРєРѕ РµСЃР»Рё РЅРµ СЃР»РёС€РєРѕРј РіР»СѓР±РѕРєРѕ
    if (depth < 6 && Math.random() < this.branchChance) {
      const branchAngle = angle + (Math.random() * 1.2 - 0.6); // +/- 30 degrees
      const branchLength = distance * (0.3 + Math.random() * 0.4);
      const branchEndX = midX + Math.cos(branchAngle) * branchLength;
      const branchEndY = midY + Math.sin(branchAngle) * branchLength;
      this.createBolt(
        midX,
        midY,
        branchEndX,
        branchEndY,
        thickness * 0.6,
        depth + 1
      );
    }
  }

  update(deltaFrames: number) {
    this.life += deltaFrames;
    this.alpha = 1 - this.life / this.lifeMax;
    return this.life >= this.lifeMax;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = '#FFD700'; // Gold color
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 20;
    ctx.globalCompositeOperation = 'lighter';

    this.segments.forEach(seg => {
      ctx.beginPath();
      ctx.moveTo(seg.p1.x, seg.p1.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.lineWidth = seg.thickness * this.alpha;
      ctx.stroke();
    });

    ctx.restore();
  }
}

export const BurnAnimationOverlay: React.FC<BurnAnimationOverlayProps> = ({
  step,
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const timersRef = useRef({
    approvingBolt: 0,
    approvingSpark: 0,
    burningBolt: 0,
    burningParticle: 0,
    burningCrackle: 0,
  });
  const explosionTriggeredRef = useRef(false);

  // Simple performance settings for weaker/average PCs
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const adjustedIntensity = isMobile
    ? Math.max(1, Math.floor(intensity / 2))
    : intensity;

  // РњР°СЃСЃРёРІС‹ РґР»СЏ С…СЂР°РЅРµРЅРёСЏ СЌС„С„РµРєС‚РѕРІ
  const bolts = useRef<LightningBolt[]>([]);
  const sparks = useRef<Spark[]>([]);
  const smoke = useRef<Smoke[]>([]);
  const ash = useRef<Ash[]>([]);

  // РћРџРўРРњРР—РђР¦РРЇ: Р›РёРјРёС‚С‹ С‡Р°СЃС‚РёС† РґР»СЏ РїСЂРѕРёР·РІРѕРґРёС‚РµР»СЊРЅРѕСЃС‚Рё
  const MAX_BOLTS = 15; // Р‘С‹Р»Рѕ РЅРµРѕРіСЂР°РЅРёС‡РµРЅРѕ
  const MAX_SPARKS = 50; // Р‘С‹Р»Рѕ РЅРµРѕРіСЂР°РЅРёС‡РµРЅРѕ
  const MAX_SMOKE = 25; // Р‘С‹Р»Рѕ РЅРµРѕРіСЂР°РЅРёС‡РµРЅРѕ
  const MAX_ASH = 30; // Р‘С‹Р»Рѕ РЅРµРѕРіСЂР°РЅРёС‡РµРЅРѕ

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    lastTimestampRef.current = null;
    timersRef.current = {
      approvingBolt: 0,
      approvingSpark: 0,
      burningBolt: 0,
      burningParticle: 0,
      burningCrackle: 0,
    };
    explosionTriggeredRef.current = false;

    const animate = (timestamp: number) => {
      if (!canvasRef.current) {
        animationFrameId.current = null;
        return;
      }

      let deltaSeconds = 0;
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      } else {
        const rawDelta = timestamp - lastTimestampRef.current;
        const clampedDelta = Math.min(Math.max(rawDelta, 0), 100);
        deltaSeconds = clampedDelta / 1000;
        lastTimestampRef.current = timestamp;
      }
      const deltaFrames = deltaSeconds * 60;

      const { width, height } = canvas;

      const hadParticles =
        bolts.current.length > 0 ||
        sparks.current.length > 0 ||
        smoke.current.length > 0 ||
        ash.current.length > 0;
      if (hadParticles) {
        ctx.clearRect(0, 0, width, height);
      }

      const intensityMultiplier = intensity;
      const timers = timersRef.current;
      const frequencyInterval = Math.max(8, 15 - intensity) / 60;
      const approvingSparkInterval = 20 / 60;
      const burningParticleInterval = 13 / 60;
      const burningCrackleInterval = 26 / 60;

      if (step === 'approving') {
        timers.approvingBolt += deltaSeconds;
        while (timers.approvingBolt >= frequencyInterval) {
          timers.approvingBolt -= frequencyInterval;
          const boltCount = Math.min(intensityMultiplier, 2);
          for (
            let i = 0;
            i < boltCount && bolts.current.length < MAX_BOLTS;
            i++
          ) {
            const side = Math.floor(Math.random() * 4);
            let x1 = 0;
            let y1 = 0;
            if (side === 0) {
              x1 = 0;
              y1 = Math.random() * height;
            } else if (side === 1) {
              x1 = width;
              y1 = Math.random() * height;
            } else if (side === 2) {
              x1 = Math.random() * width;
              y1 = 0;
            } else {
              x1 = Math.random() * width;
              y1 = height;
            }

            const thickness = 2 + (intensityMultiplier - 1) * 0.5;
            const branchChance = 0.3 + (intensityMultiplier - 1) * 0.1;
            bolts.current.push(
              new LightningBolt(
                x1,
                y1,
                width / 2,
                height / 2,
                thickness,
                branchChance
              )
            );
          }
        }

        timers.approvingSpark += deltaSeconds;
        while (timers.approvingSpark >= approvingSparkInterval) {
          timers.approvingSpark -= approvingSparkInterval;
          if (sparks.current.length < MAX_SPARKS) {
            const sparkCount = Math.min(intensityMultiplier, 3);
            for (
              let i = 0;
              i < sparkCount && sparks.current.length < MAX_SPARKS;
              i++
            ) {
              sparks.current.push(
                new Spark(
                  width / 2 + (Math.random() - 0.5) * 100,
                  height / 2 + (Math.random() - 0.5) * 100
                )
              );
            }
            if (Math.random() < 0.3) {
              burnAudio.playSpark();
            }
          }
        }
      } else {
        timers.approvingBolt = 0;
        timers.approvingSpark = 0;
      }

      if (step === 'burning') {
        timers.burningBolt += deltaSeconds;
        while (timers.burningBolt >= frequencyInterval) {
          timers.burningBolt -= frequencyInterval;
          const boltCount = Math.min(intensityMultiplier, 3);
          for (
            let i = 0;
            i < boltCount && bolts.current.length < MAX_BOLTS;
            i++
          ) {
            const side = Math.floor(Math.random() * 4);
            let x1 = 0;
            let y1 = 0;
            if (side === 0) {
              x1 = 0;
              y1 = Math.random() * height;
            } else if (side === 1) {
              x1 = width;
              y1 = Math.random() * height;
            } else if (side === 2) {
              x1 = Math.random() * width;
              y1 = 0;
            } else {
              x1 = Math.random() * width;
              y1 = height;
            }

            const thickness = 3.5 + (intensityMultiplier - 1) * 1;
            const branchChance = 0.5 + (intensityMultiplier - 1) * 0.15;
            const randomOffset = 100 + (intensityMultiplier - 1) * 50;
            bolts.current.push(
              new LightningBolt(
                x1,
                y1,
                width / 2 + (Math.random() - 0.5) * randomOffset,
                height / 2 + (Math.random() - 0.5) * randomOffset,
                thickness,
                branchChance
              )
            );
          }
        }

        timers.burningParticle += deltaSeconds;
        while (timers.burningParticle >= burningParticleInterval) {
          timers.burningParticle -= burningParticleInterval;

          const smokeCount = Math.min(intensityMultiplier, 2);
          for (
            let i = 0;
            i < smokeCount && smoke.current.length < MAX_SMOKE;
            i++
          ) {
            smoke.current.push(
              new Smoke(
                width / 2 + (Math.random() - 0.5) * 150,
                height / 2 + (Math.random() - 0.5) * 150
              )
            );
          }

          const sparkCount = Math.min(intensityMultiplier * 2, 5);
          for (
            let i = 0;
            i < sparkCount && sparks.current.length < MAX_SPARKS;
            i++
          ) {
            sparks.current.push(
              new Spark(
                width / 2 + (Math.random() - 0.5) * 200,
                height / 2 + (Math.random() - 0.5) * 200
              )
            );
          }

          if (Math.random() < 0.4) {
            burnAudio.playSpark();
          }
        }

        timers.burningCrackle += deltaSeconds;
        while (timers.burningCrackle >= burningCrackleInterval) {
          timers.burningCrackle -= burningCrackleInterval;
          burnAudio.playFireCrackle(intensityMultiplier);
        }
      } else {
        timers.burningBolt = 0;
        timers.burningParticle = 0;
        timers.burningCrackle = 0;
      }

      if (step === 'exploding' && !explosionTriggeredRef.current) {
        explosionTriggeredRef.current = true;
        const explosionBolts = Math.min(
          15 + (adjustedIntensity - 1) * 5,
          isMobile ? 15 : 25
        );
        for (let i = 0; i < explosionBolts; i++) {
          const angle = (i / explosionBolts) * Math.PI * 2;
          const radius = width / 2 + (adjustedIntensity - 1) * 30;
          const x2 = width / 2 + Math.cos(angle) * radius;
          const y2 = height / 2 + Math.sin(angle) * radius;
          const explosionThickness = 4 + (adjustedIntensity - 1) * 1.5;
          const explosionBranching = 0.6 + (adjustedIntensity - 1) * 0.15;
          bolts.current.push(
            new LightningBolt(
              width / 2,
              height / 2,
              x2,
              y2,
              explosionThickness,
              explosionBranching
            )
          );
        }

        const sparkCount = Math.min(
          25 + adjustedIntensity * 10,
          isMobile ? 20 : 40
        );
        for (let i = 0; i < sparkCount; i++) {
          sparks.current.push(
            new Spark(
              width / 2 + (Math.random() - 0.5) * 50,
              height / 2 + (Math.random() - 0.5) * 50
            )
          );
        }

        const smokeCount = Math.min(
          10 + adjustedIntensity * 5,
          isMobile ? 10 : 20
        );
        for (let i = 0; i < smokeCount; i++) {
          smoke.current.push(
            new Smoke(
              width / 2 + (Math.random() - 0.5) * 100,
              height / 2 + (Math.random() - 0.5) * 100
            )
          );
        }

        const ashCount = Math.min(
          15 + adjustedIntensity * 8,
          isMobile ? 15 : 25
        );
        for (let i = 0; i < ashCount; i++) {
          ash.current.push(
            new Ash(
              width / 2 + (Math.random() - 0.5) * 80,
              height / 2 + (Math.random() - 0.5) * 80
            )
          );
        }

        burnAudio.playExplosion(intensity);
      } else if (step !== 'exploding') {
        explosionTriggeredRef.current = false;
      }

      if (bolts.current.length > MAX_BOLTS) {
        bolts.current = bolts.current.slice(-MAX_BOLTS);
      }
      if (sparks.current.length > MAX_SPARKS) {
        sparks.current = sparks.current.slice(-MAX_SPARKS);
      }
      if (smoke.current.length > MAX_SMOKE) {
        smoke.current = smoke.current.slice(-MAX_SMOKE);
      }
      if (ash.current.length > MAX_ASH) {
        ash.current = ash.current.slice(-MAX_ASH);
      }

      bolts.current = bolts.current.filter(bolt => !bolt.update(deltaFrames));
      bolts.current.forEach(bolt => bolt.draw(ctx));

      sparks.current = sparks.current.filter(
        spark => !spark.update(deltaFrames)
      );
      sparks.current.forEach(spark => spark.draw(ctx));

      smoke.current = smoke.current.filter(
        smokeParticle => !smokeParticle.update(deltaFrames)
      );
      smoke.current.forEach(smokeParticle => smokeParticle.draw(ctx));

      ash.current = ash.current.filter(
        ashParticle => !ashParticle.update(deltaFrames)
      );
      ash.current.forEach(ashParticle => ashParticle.draw(ctx));

      const hasParticlesAfterUpdate =
        bolts.current.length > 0 ||
        sparks.current.length > 0 ||
        smoke.current.length > 0 ||
        ash.current.length > 0;

      if (step === 'idle' && !hasParticlesAfterUpdate) {
        ctx.clearRect(0, 0, width, height);
        animationFrameId.current = null;
        return;
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [step, intensity, adjustedIntensity, isMobile]);

  return (
    <div className='absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden'>
      <canvas ref={canvasRef} className='w-full h-full' />
      {step === 'exploding' && (
        <div
          className='absolute inset-0 bg-white'
          style={{ animation: 'flash-out 0.8s forwards' }}
        />
      )}
      <style jsx>{`
        @keyframes flash-out {
          0% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
