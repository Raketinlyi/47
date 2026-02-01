# CrazyOctagon / CrazyCube — Frontend (Monad Mainnet)
*Last updated: 2026-02-01 (V4)*

Фронтенд Web3-игры CrazyOctagon на Monad Mainnet. Сайт работает как интерфейс к смарт-контрактам: отображает NFT, таймеры, награды, статистику и выполняет вызовы контрактов.

## Быстрый старт

```bash
npm install
cp .env.example .env.local
npm run dev
```

Открыть: `http://localhost:3000`

## Основные разделы

- Ping — активация и ежедневные начисления
- Burn — сжигание и формирование награды
- Rewards (Claim) — получение наград после burn
- Graveyard — все сожженные NFT
- Breed — воскрешение (возврат случайного NFT из кладбища)
- Info / Stats — аналитика, параметры контрактов
- Bridge — мост CRAA (ApeChain ⇄ Monad)

## Контракты (Monad Mainnet)

- Core (UUPS Proxy, V4): `0x1349aE6aBcB6877eb9b9158E4c52416ea027C15C`
- NFT (ERC721): `0x10b5C3D4C7EB55e35Ca26be19b600F7F62076Fd9`
- Reader (view-only, V3): `0x54e093a5A186572F22201f8A000ddeF3B120965e`
- OCTAA Token (UUPS Proxy, V14): `0xBB848dAC056e385d2f7c750eC839157dccf4cfF3`
- CRAA OFT (LayerZero): `0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B`

LP Pools:
- OCTA/USDC: `0x370678b17b2dd6c727604adf2669666d1af2fa26`
- OCTA/WMON: `0x0e299144704db07758e25708c2c5b721b38bf01a`

DEX:
- Uniswap Router: `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804`
- WMON: `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`
- USDC: `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`

## Поиск NFT (как устроено)

Используется каскадная схема:
1) Alchemy NFT API
2) OpenSea API (через `/api/opensea/getNfts`)
3) Прокси `/api/alchemy/getNfts` как последний фолбэк

## Burn-Награды

UI показывает burn-награды по адресному `getBurnInfo(tokenId, owner)` и не зависит от `isInGraveyard`. Награды остаются видимыми даже после revive.

## Переменные окружения

Минимальный набор для mainnet:

```bash
NEXT_PUBLIC_MONAD_CHAIN_ID=143
NEXT_PUBLIC_MONAD_RPC=https://rpc.monad.xyz
NEXT_PUBLIC_MONAD_NETWORK_SLUG=monad

NEXT_PUBLIC_CORE_PROXY=0x1349aE6aBcB6877eb9b9158E4c52416ea027C15C
NEXT_PUBLIC_NFT_ADDRESS=0x10b5C3D4C7EB55e35Ca26be19b600F7F62076Fd9
NEXT_PUBLIC_READER_ADDRESS=0x54e093a5A186572F22201f8A000ddeF3B120965e
NEXT_PUBLIC_OCTAA_ADDRESS=0xBB848dAC056e385d2f7c750eC839157dccf4cfF3
NEXT_PUBLIC_PAIR_TOKEN=0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A

# Alchemy keys (ротация)
NEXT_PUBLIC_ALCHEMY_API_KEY_1=...
NEXT_PUBLIC_ALCHEMY_API_KEY_2=...
NEXT_PUBLIC_ALCHEMY_API_KEY_3=...
NEXT_PUBLIC_ALCHEMY_API_KEY_4=...
NEXT_PUBLIC_ALCHEMY_API_KEY_5=...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

Полный список — см. `.env.example`.

## Локальные NFT изображения

Используются локальные файлы из `public/nft/{tokenId}.webp` для быстрой загрузки.

## Команды

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Примечания по производительности

- Тяжелые анимации и эффекты грузятся лениво.
- Запросы к контрактам батчатся через `multicall` где это возможно.
- Кэширование в localStorage для списков наград и graveyard.
