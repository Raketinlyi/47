// Standalone script to check NFT #4329 LP - run with: node check-4329-standalone.js
const TOKEN_ID = 4329n;
const CORE = "0x1349aE6aBcB6877eb9b9158E4c52416ea027C15C";
const RPC = "https://monad-mainnet.g.alchemy.com/v2/demo"; // Public RPC

async function main() {
    console.log("\n=== Checking NFT #4329 LP Status ===\n");

    // Use fetch to call JSON-RPC directly
    async function call(method, params) {
        const res = await fetch(RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        return json.result;
    }

    // Encode function calls
    function encodeCall(sig, args) {
        const fnSig = sig.slice(0, sig.indexOf('('));
        const hash = require('crypto').createHash('sha3-256');
        // Simple keccak256 for function selector
        const selector = fnSig; // We'll use pre-computed selectors
        return selector + args;
    }

    // Pre-computed function selectors
    const SELECTORS = {
        nftLP: '0x5a3b7d9a', // nftLP(uint256)
        burnNonce: '0x8da5cb5b', // burnNonce(uint256) - need to verify
        burns: '0x381bf679', // burns(uint256,uint256)
        state: '0xc19d93fb' // state(uint256)
    };

    // Pad number to 32 bytes hex
    const pad = (n) => n.toString(16).padStart(64, '0');
    const formatEther = (hex) => (BigInt(hex) / 10n ** 18n).toString() + '.' + ((BigInt(hex) % 10n ** 18n) / 10n ** 12n).toString().padStart(6, '0');

    // Call nftLP(4329)
    console.log("--- Calling nftLP(4329) ---");
    const nftLPData = await call('eth_call', [{
        to: CORE,
        data: '0x' + '5a3b7d9a' + pad(TOKEN_ID) // nftLP(uint256)
    }, 'latest']);

    console.log("Raw response:", nftLPData);

    // Parse nftLP response (5 return values: address, address, uint256, uint256, uint256)
    if (nftLPData && nftLPData.length > 2) {
        const data = nftLPData.slice(2);
        const helper = '0x' + data.slice(24, 64);
        const pair = '0x' + data.slice(88, 128);
        const lpAmount = BigInt('0x' + data.slice(128, 192));
        const octaDeposited = BigInt('0x' + data.slice(192, 256));
        const pairDeposited = BigInt('0x' + data.slice(256, 320));

        console.log("  helper:", helper);
        console.log("  pair:", pair);
        console.log("  lpAmount:", lpAmount.toString(), "wei");
        console.log("  octaDeposited:", octaDeposited.toString(), "wei");
        console.log("  pairDeposited:", pairDeposited.toString(), "wei (WMON)");
    }

    // Call burnNonce(4329)
    console.log("\n--- Calling burnNonce(4329) ---");
    const nonceData = await call('eth_call', [{
        to: CORE,
        data: '0x' + 'c9f9f5a4' + pad(TOKEN_ID) // burnNonce(uint256)
    }, 'latest']);

    const nonce = BigInt(nonceData || '0x0');
    console.log("  Current nonce:", nonce.toString());

    // Call burns(4329, nonce) for each nonce
    for (let i = 1n; i <= nonce; i++) {
        console.log(`\n--- Calling burns(4329, ${i}) ---`);
        const burnsData = await call('eth_call', [{
            to: CORE,
            data: '0x' + '67da2847' + pad(TOKEN_ID) + pad(i) // burns(uint256,uint256)
        }, 'latest']);

        if (burnsData && burnsData.length > 2) {
            const data = burnsData.slice(2);
            // Parse: owner, totalAmount, claimAt, graveReleaseAt, claimed, waitMinutes, lpAmount, lpPair, lpHelper, snaps...
            const owner = '0x' + data.slice(24, 64);
            const totalAmount = BigInt('0x' + data.slice(64, 128));
            const claimAt = BigInt('0x' + data.slice(128, 192));
            const claimed = BigInt('0x' + data.slice(256, 320)) !== 0n;
            const lpAmount = BigInt('0x' + data.slice(384, 448));
            const lpPair = '0x' + data.slice(472, 512);

            console.log("    owner:", owner);
            console.log("    totalAmount:", totalAmount.toString(), "wei");
            console.log("    claimAt:", new Date(Number(claimAt) * 1000).toISOString());
            console.log("    claimed:", claimed);
            console.log("    lpAmount:", lpAmount.toString(), "wei");
            console.log("    lpPair:", lpPair);
        }
    }

    console.log("\n✅ Done.");
}

main().catch(e => console.error("Error:", e.message));
