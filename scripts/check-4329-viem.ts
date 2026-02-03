// Check NFT #4329 LP using viem - run with: npx tsx scripts/check-4329-viem.ts
import { createPublicClient, http, parseAbi, formatEther } from 'viem';

const TOKEN_ID = 4329n;
const CORE = '0x1349aE6aBcB6877eb9b9158E4c52416ea027C15C' as const;

// Use env RPC or fallback to real Alchemy
const RPC = 'https://monad-mainnet.g.alchemy.com/v2/XgKXPDCwM8SYsWDPk1yCs';

const abi = parseAbi([
    'function nftLP(uint256 tokenId) view returns (address helper, address pair, uint256 lpAmount, uint256 octaDeposited, uint256 pairDeposited)',
    'function burnNonce(uint256 tokenId) view returns (uint256)',
    'function burns(uint256 tokenId, uint256 nonce) view returns (address owner, uint256 totalAmount, uint256 claimAt, uint256 graveReleaseAt, bool claimed, uint32 waitMinutes, uint256 lpAmount, address lpPair, address lpHelper, uint16 snapPlayerBps, uint16 snapPoolBps, uint16 snapBurnBps, uint16 snapSafetyBps)',
    'function state(uint256 tokenId) view returns (uint48 lastPingTime, uint48 lastBreedTime, uint8 currentStars, uint8 bonusStars, bool isInGraveyard, uint256 lockedOcta)'
]);

async function main() {
    console.log('\n=== Checking NFT #4329 LP Status ===\n');
    console.log('Using RPC:', RPC.slice(0, 50) + '...');

    const client = createPublicClient({
        transport: http(RPC),
    });

    // Check nftLP
    console.log('\n--- nftLP[4329] ---');
    try {
        const lp = await client.readContract({
            address: CORE,
            abi,
            functionName: 'nftLP',
            args: [TOKEN_ID],
        });
        console.log('  helper:', lp[0]);
        console.log('  pair:', lp[1]);
        console.log('  lpAmount:', formatEther(lp[2]), 'LP');
        console.log('  octaDeposited:', formatEther(lp[3]), 'OCTA');
        console.log('  pairDeposited:', formatEther(lp[4]), 'WMON');
    } catch (e) {
        console.log('  Error:', (e as Error).message);
    }

    // Check state
    console.log('\n--- state[4329] ---');
    try {
        const st = await client.readContract({
            address: CORE,
            abi,
            functionName: 'state',
            args: [TOKEN_ID],
        });
        console.log('  lastPingTime:', st[0]);
        console.log('  lastBreedTime:', st[1]);
        console.log('  currentStars:', st[2]);
        console.log('  bonusStars:', st[3]);
        console.log('  isInGraveyard:', st[4]);
        console.log('  lockedOcta:', formatEther(st[5]), 'OCTA');
    } catch (e) {
        console.log('  Error:', (e as Error).message);
    }

    // Check burn nonce
    console.log('\n--- burnNonce[4329] ---');
    let nonce = 0n;
    try {
        nonce = await client.readContract({
            address: CORE,
            abi,
            functionName: 'burnNonce',
            args: [TOKEN_ID],
        });
        console.log('  nonce:', nonce.toString());
    } catch (e) {
        console.log('  Error:', (e as Error).message);
    }

    // Check each burn record
    for (let i = 1n; i <= nonce; i++) {
        console.log(`\n--- burns[4329][${i}] ---`);
        try {
            const burn = await client.readContract({
                address: CORE,
                abi,
                functionName: 'burns',
                args: [TOKEN_ID, i],
            });
            console.log('  owner:', burn[0]);
            console.log('  totalAmount:', formatEther(burn[1]), 'OCTA');
            console.log('  claimAt:', new Date(Number(burn[2]) * 1000).toISOString());
            console.log('  graveReleaseAt:', new Date(Number(burn[3]) * 1000).toISOString());
            console.log('  claimed:', burn[4]);
            console.log('  waitMinutes:', burn[5]);
            console.log('  lpAmount:', formatEther(burn[6]), 'LP');
            console.log('  lpPair:', burn[7]);
            console.log('  lpHelper:', burn[8]);
            console.log('  snapPlayerBps:', burn[9]);
            console.log('  snapPoolBps:', burn[10]);
            console.log('  snapBurnBps:', burn[11]);
        } catch (e) {
            console.log('  Error:', (e as Error).message);
        }
    }

    console.log('\n✅ Done.');
}

main().catch(console.error);
