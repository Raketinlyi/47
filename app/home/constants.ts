export const createId = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

export const DIAGONAL_CRACKS = [
    {
        id: 'diag-1',
        left: '12%',
        baseRotate: 25,
        tiltFactor: 0.6,
        height: '65%',
        delay: 0.25,
    },
    {
        id: 'diag-2',
        left: '25%',
        baseRotate: 15,
        tiltFactor: 1,
        height: '60%',
        delay: 0.35,
    },
    {
        id: 'diag-3',
        left: '38%',
        baseRotate: 5,
        tiltFactor: 1.2,
        height: '75%',
        delay: 0.45,
    },
    {
        id: 'diag-4',
        left: '52%',
        baseRotate: -5,
        tiltFactor: 1.5,
        height: '70%',
        delay: 0.55,
    },
    {
        id: 'diag-5',
        left: '65%',
        baseRotate: -15,
        tiltFactor: 1.3,
        height: '65%',
        delay: 0.75,
    },
    {
        id: 'diag-6',
        left: '75%',
        baseRotate: -25,
        tiltFactor: 0.9,
        height: '60%',
        delay: 0.85,
    },
    {
        id: 'diag-7',
        left: '85%',
        baseRotate: -15,
        tiltFactor: 1,
        height: '55%',
        delay: 0.95,
    },
    {
        id: 'diag-8',
        left: '95%',
        baseRotate: -32,
        tiltFactor: 0.4,
        height: '45%',
        delay: 1.05,
    },
] as const;

export const HORIZONTAL_CRACKS = [
    { id: 'horiz-1', top: '18%', width: '28%', left: '15%', delay: 0.9 },
    { id: 'horiz-2', top: '25%', width: '40%', left: '10%', delay: 1.0 },
    { id: 'horiz-3', top: '38%', width: '32%', left: '60%', delay: 1.1 },
    { id: 'horiz-4', top: '50%', width: '45%', left: '40%', delay: 1.2 },
    { id: 'horiz-5', top: '62%', width: '30%', left: '25%', delay: 1.3 },
    { id: 'horiz-6', top: '75%', width: '30%', left: '20%', delay: 1.4 },
    { id: 'horiz-7', top: '85%', width: '26%', left: '50%', delay: 1.5 },
] as const;

export interface SmallCrackConfig {
    id: string;
    left: number;
    bottom: number;
    direction: 1 | -1;
    baseAngle: number;
    height: number;
    delay: number;
}

export const SMALL_CRACKS: ReadonlyArray<SmallCrackConfig> = Array.from(
    { length: 14 },
    (_, index) => ({
        id: `small-${index}`,
        left: 20 + index * 12,
        bottom: 10 + index * 8,
        direction: index % 2 === 0 ? 1 : -1,
        baseAngle: 30 + index * 5,
        height: 15 + (index % 4) * 5,
        delay: 1.0 + index * 0.1,
    })
);

export const MONAD_PARTICLE_COLORS = [
    'bg-purple-500/30',
    'bg-indigo-500/30',
    'bg-violet-500/30',
    'bg-fuchsia-500/40',
];

export const FOOTER_PARTICLE_COLORS = [
    'bg-purple-500/20',
    'bg-violet-500/20',
    'bg-blue-500/20',
];
